import { N, CAM_D, makeShape, rng32, fib } from "./ascii.js";

export const SEED = 71;

const R0 = 0.7;
const RB = 0.06;
const ST0 = R0;
const ST1 = 1 - RB;
const NSPIKE = 38;
const SIG = 0.012;
const INV2 = 1 / (2 * SIG * SIG);
const D = new Float64Array(NSPIKE * 3);
for (let k = 0; k < NSPIKE; k++) D.set(fib(k, NSPIKE), k * 3);

const PTS_SPH = 11000;
const PTS_STEM = 40;
const PTS_BULB = 80;
const PTS = PTS_SPH + NSPIKE * (PTS_STEM + PTS_BULB);
const S2 = SIG * SIG;
const shellZ = (a) => 4 * Math.PI * Math.sqrt(2 * Math.PI) * SIG * (a * a + S2);
const tubeZ = (len) => len * 2 * Math.PI * S2 + Math.pow(2 * Math.PI * S2, 1.5);
const C_SPH = Math.log(PTS_SPH / PTS) - Math.log(shellZ(R0));
const C_STEM = Math.log(PTS_STEM / PTS) - Math.log(tubeZ(ST1 - ST0));
const C_BULB = Math.log(PTS_BULB / PTS) - Math.log(shellZ(RB));
export const WEIGHTS = {
  sphere: PTS_SPH / PTS,
  stem: (NSPIKE * PTS_STEM) / PTS,
  bulb: (NSPIKE * PTS_BULB) / PTS,
};
export const PARTS = { R0, RB, ST0, ST1, SIG, D };

export function logL(x, y, z) {
  const r2 = x * x + y * y + z * z;
  const r = Math.sqrt(r2);
  let m = C_SPH - (r - R0) * (r - R0) * INV2;
  let s = 1;
  for (let j = 0; j < NSPIKE * 3; j += 3) {
    const p = x * D[j] + y * D[j + 1] + z * D[j + 2];
    const t = p < ST0 ? ST0 : p > ST1 ? ST1 : p;
    const ds = r2 + t * t - 2 * t * p;
    let l = C_STEM - (ds > 0 ? ds : 0) * INV2;
    if (l > m) {
      s = s * Math.exp(m - l) + 1;
      m = l;
    } else if (l > m - 40) s += Math.exp(l - m);
    const q = r2 + 1 - 2 * p;
    const db = Math.sqrt(q > 0 ? q : 0) - RB;
    l = C_BULB - db * db * INV2;
    if (l > m) {
      s = s * Math.exp(m - l) + 1;
      m = l;
    } else if (l > m - 40) s += Math.exp(l - m);
  }
  return m + Math.log(s);
}

export function nearestPart(x, y, z, out) {
  const r2 = x * x + y * y + z * z;
  const r = Math.sqrt(r2) || 1e-9;
  let best = C_SPH - (r - R0) * (r - R0) * INV2;
  let part = 0;
  let d = Math.abs(r - R0);
  let nx = x / r;
  let ny = y / r;
  let nz = z / r;
  for (let j = 0; j < NSPIKE * 3; j += 3) {
    const p = x * D[j] + y * D[j + 1] + z * D[j + 2];
    const t = p < ST0 ? ST0 : p > ST1 ? ST1 : p;
    const ds = Math.max(0, r2 + t * t - 2 * t * p);
    const ls = C_STEM - ds * INV2;
    if (ls > best) {
      best = ls;
      part = 1;
      d = Math.sqrt(ds);
      nx = ny = nz = 0;
    }
    const q = Math.max(1e-18, r2 + 1 - 2 * p);
    const dq = Math.sqrt(q);
    const lb = C_BULB - (dq - RB) * (dq - RB) * INV2;
    if (lb > best) {
      best = lb;
      part = 2;
      d = Math.abs(dq - RB);
      nx = (x - D[j]) / dq;
      ny = (y - D[j + 1]) / dq;
      nz = (z - D[j + 2]) / dq;
    }
  }
  out[0] = part;
  out[1] = d;
  out[2] = nx;
  out[3] = ny;
  out[4] = nz;
  return out;
}

const ZD = 1.25;
const MIN_HALF = 1.3;
export function priorBox(bounds) {
  const [l, r, b, t] = bounds;
  return [
    Math.min(l, -MIN_HALF),
    Math.max(r, MIN_HALF),
    Math.min(b, -MIN_HALF),
    Math.max(t, MIN_HALF),
  ];
}
function inPrior(box, x, y, z) {
  if (z < -ZD || z > ZD) return false;
  const g = (CAM_D + z) / CAM_D;
  const u = x / g;
  const v = y / g;
  return u >= box[0] && u <= box[1] && v >= box[2] && v <= box[3];
}
function samplePrior(box, rnd, X) {
  const a = Math.pow(CAM_D - ZD, 3);
  const b = Math.pow(CAM_D + ZD, 3);
  for (let i = 0; i < X.length; i += 3) {
    const z = Math.cbrt(a + rnd() * (b - a)) - CAM_D;
    const g = (CAM_D + z) / CAM_D;
    X[i] = g * (box[0] + (box[1] - box[0]) * rnd());
    X[i + 1] = g * (box[2] + (box[3] - box[2]) * rnd());
    X[i + 2] = z;
  }
}

const BLUR = [Infinity, 0.5, 0.15, 0.06, 0.025, SIG];
export const BETA = BLUR.map((s) => (SIG / s) ** 2);
export const STEPS = BLUR.length - 1;
const SWEEPS = [0, 5, 5, 6, 8, 12];
const ROT = 0.35;
const INK = 3 * SIG;

export function runFilter(bounds, seed = SEED, n = N) {
  const box = priorBox(bounds);
  const rnd = rng32(seed);
  let spare = NaN;
  const gauss = () => {
    if (spare === spare) {
      const g = spare;
      spare = NaN;
      return g;
    }
    const u = 1 - rnd();
    const v = rnd();
    const rad = Math.sqrt(-2 * Math.log(u));
    spare = rad * Math.sin(2 * Math.PI * v);
    return rad * Math.cos(2 * Math.PI * v);
  };

  let X = new Float64Array(n * 3);
  samplePrior(box, rnd, X);
  let LL = new Float64Array(n);
  for (let i = 0; i < n; i++) LL[i] = logL(X[i * 3], X[i * 3 + 1], X[i * 3 + 2]);

  const dimRnd = rng32(seed + 1);
  const dim = new Float32Array(n);
  for (let i = 0; i < n; i++) dim[i] = 0.25 + 0.7 * dimRnd();

  const stages = [snapshot(X, n, dim, null)];
  const stats = [];
  const w = new Float64Array(n);
  const cnt = new Int32Array(n);
  for (let k = 1; k <= STEPS; k++) {
    const beta = BETA[k];
    const db = beta - BETA[k - 1];

    let mx = -Infinity;
    for (let i = 0; i < n; i++) mx = Math.max(mx, db * LL[i]);
    let sw = 0;
    for (let i = 0; i < n; i++) sw += w[i] = Math.exp(db * LL[i] - mx);
    let sw2 = 0;
    for (let i = 0; i < n; i++) {
      w[i] /= sw;
      sw2 += w[i] * w[i];
    }
    const ess = 1 / sw2;

    cnt.fill(0);
    const u0 = rnd() / n;
    let c = w[0];
    for (let j = 0, i = 0; j < n; j++) {
      const u = u0 + j / n;
      while (u > c && i < n - 1) c += w[++i];
      cnt[i]++;
    }
    const anc = new Int32Array(n);
    const drop = new Uint8Array(n);
    let unique = 0;
    let free = 0;
    for (let i = 0; i < n; i++) {
      if (cnt[i] > 0) {
        anc[i] = i;
        unique++;
      } else drop[i] = 1;
    }
    for (let i = 0; i < n; i++) {
      for (let extra = cnt[i] - 1; extra > 0; extra--) {
        while (!drop[free]) free++;
        anc[free++] = i;
      }
    }
    const X2 = new Float64Array(n * 3);
    const LL2 = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const a = anc[i];
      X2[i * 3] = X[a * 3];
      X2[i * 3 + 1] = X[a * 3 + 1];
      X2[i * 3 + 2] = X[a * 3 + 2];
      LL2[i] = LL[a];
    }
    X = X2;
    LL = LL2;

    const step = Math.min(0.45, 1.2 * BLUR[k]);
    let tried = 0;
    let moved = 0;
    for (let sweep = 0; sweep < SWEEPS[k]; sweep++) {
      const rotate = k >= 3 && sweep % 2 === 1;
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        let x = X[j];
        let y = X[j + 1];
        let z = X[j + 2];
        if (rotate) {
          let ax = gauss();
          let ay = gauss();
          let az = gauss();
          const al = Math.hypot(ax, ay, az) || 1;
          ax /= al;
          ay /= al;
          az /= al;
          const th = ROT * gauss();
          const co = Math.cos(th);
          const si = Math.sin(th);
          const dot = (ax * x + ay * y + az * z) * (1 - co);
          const cx = ay * z - az * y;
          const cy = az * x - ax * z;
          const cz = ax * y - ay * x;
          x = x * co + cx * si + ax * dot;
          y = y * co + cy * si + ay * dot;
          z = z * co + cz * si + az * dot;
        } else {
          x += step * gauss();
          y += step * gauss();
          z += step * gauss();
        }
        tried++;
        if (!inPrior(box, x, y, z)) continue;
        const l = logL(x, y, z);
        if (Math.log(1 - rnd()) < beta * (l - LL[i])) {
          X[j] = x;
          X[j + 1] = y;
          X[j + 2] = z;
          LL[i] = l;
          moved++;
        }
      }
    }
    stages.push(snapshot(X, n, dim, drop));
    stats.push({ beta, ess, unique, accept: tried ? moved / tried : 0 });
  }
  return { stages, stats, box };
}

function snapshot(X, n, dim, drop) {
  const pos = Float32Array.from(X);
  const nrm = new Float32Array(n * 3);
  const fl = new Float32Array(n);
  const layer = new Uint8Array(n);
  const o = [0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const j = i * 3;
    nearestPart(X[j], X[j + 1], X[j + 2], o);
    if (o[1] < INK) {
      fl[i] = o[0] === 1 ? 0.45 : 0;
      nrm[j] = o[2];
      nrm[j + 1] = o[3];
      nrm[j + 2] = o[4];
    } else {
      fl[i] = dim[i];
      layer[i] = 2;
    }
  }
  return { pos, nrm, fl, layer, drop };
}

export function priorStage(bounds, seed = SEED, n = N) {
  const X = new Float64Array(n * 3);
  samplePrior(priorBox(bounds), rng32(seed), X);
  const dimRnd = rng32(seed + 1);
  const dim = new Float32Array(n);
  for (let i = 0; i < n; i++) dim[i] = 0.25 + 0.7 * dimRnd();
  return snapshot(X, n, dim, null);
}

export function buildCondense() {
  const S = makeShape();
  const K = STEPS;
  const FLAG = 0.28;
  const MOVE = 0.62;
  const DUR = FLAG + MOVE;
  const SPIN = 0.05;
  const sm = (u) => {
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    return u * u * (3 - 2 * u);
  };
  let stages = [priorStage([-4, 2, -1.4, 1.4])];
  let key = "";
  let job = 0;
  let worker = null;
  let catchUp = false;
  let goal = 0;
  let stage = 0;
  let level = 0;
  let settle = 0;

  const receive = (id, run) => {
    if (id !== job) return;
    stages = run.stages;
    if (catchUp) {
      level = goal;
      settle = level >= K ? 1 : 0;
      catchUp = false;
    }
    if (S.onready) S.onready();
  };
  S.setBounds = (l, r, b, t) => {
    const bounds = [l, r, b, t];
    const next = bounds.map((v) => v.toFixed(3)).join();
    if (next === key) return;
    key = next;
    const id = ++job;
    if (stages.length <= K) stages = [priorStage(bounds)];
    const local = () => receive(id, runFilter(bounds));
    if (typeof Worker === "undefined") return local();
    try {
      worker ||= new Worker(new URL("./filter-worker.js", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (e) => receive(e.data.id, e.data.run);
      worker.onerror = () => {
        worker = null;
        local();
      };
      worker.postMessage({ id, bounds });
    } catch {
      local();
    }
  };
  S.setProgress = (p, discrete) => {
    const x = Math.min(1, Math.max(0, p)) * (K + 1) - 0.5;
    const n = Math.floor(x);
    stage = Math.min(K, Math.max(0, Math.round(x)));
    goal = discrete
      ? stage
      : Math.min(K, Math.max(0, n + sm((x - n - 0.2) / 0.6)));
  };
  S.snap = () => {
    level = goal;
    settle = level >= K ? 1 : 0;
    if (stages.length <= K) catchUp = true;
  };
  S.state = () => ({ stage, total: K, resolved: stage >= K });

  S.update = (t, dt) => {
    const top = stages.length - 1;
    const g = Math.min(goal, top);
    level += (g - level) * Math.min(1, dt * 6);
    if (Math.abs(g - level) < 1e-3) level = g;
    if (level > top) level = top;
    const done = level >= K;
    settle = Math.min(1, Math.max(0, settle + (done ? dt / 1.5 : -dt / 0.5)));
    S.view.pitch = 0.2 * sm(settle);
    S.view.par = 0.12 + 0.88 * sm(settle);
    const k = Math.min(top, Math.floor(level));
    const ph = level - k;
    const A = stages[k];
    if (!(ph > 0) || k >= top) {
      S.pos.set(A.pos);
      S.nrm.set(A.nrm);
      S.fl.set(A.fl);
      S.layer.set(A.layer);
      return;
    }
    const B = stages[k + 1];
    const drop = B.drop;
    const m = sm((ph * DUR - FLAG) / MOVE);
    const C = m > 0.5 ? B : A;
    for (let i = 0, j = 0; i < N; i++, j += 3) {
      S.pos[j] = A.pos[j] + (B.pos[j] - A.pos[j]) * m;
      S.pos[j + 1] = A.pos[j + 1] + (B.pos[j + 1] - A.pos[j + 1]) * m;
      S.pos[j + 2] = A.pos[j + 2] + (B.pos[j + 2] - A.pos[j + 2]) * m;
      if (drop[i]) {
        S.nrm[j] = S.nrm[j + 1] = S.nrm[j + 2] = 0;
        S.fl[i] = 0.6;
        S.layer[i] = 1;
      } else {
        S.nrm[j] = C.nrm[j];
        S.nrm[j + 1] = C.nrm[j + 1];
        S.nrm[j + 2] = C.nrm[j + 2];
        S.fl[i] = C.fl[i];
        S.layer[i] = C.layer[i];
      }
    }
  };
  S.caption = () =>
    stage >= K
      ? "fig. 1  particle filter   resolved"
      : `fig. 1  particle filter   resampling step ${stage} of ${K}`;
  S.view = { spin: SPIN, yaw0: 0, sway: 0, pitch: 0, zoom: 0.95, par: 0.12 };
  S.update(0, 0);
  return S;
}
