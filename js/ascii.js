export const N = 16000;
const RAMP = " .:-=+*#%@";
const LIGHT = norm3(-0.45, 0.65, -0.62);
export const CAM_D = 3.2;

function norm3(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

export function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LAYERS = 9;
export function makeShape() {
  return {
    pos: new Float32Array(N * 3),
    nrm: new Float32Array(N * 3),
    fl: new Float32Array(N),
    layer: new Uint8Array(N),
    view: { spin: 0.25, yaw0: 0, sway: 0, pitch: 0.3, zoom: 1 },
    update() {},
    caption() {
      return "";
    },
  };
}

export function fib(i, k) {
  const y = 1 - (2 * (i + 0.5)) / k;
  const r = Math.sqrt(1 - y * y);
  const a = i * 2.399963229728653;
  return [Math.cos(a) * r, y, Math.sin(a) * r];
}

export function put(S, i, x, y, z, nx, ny, nz, fl, layer) {
  const j = i * 3;
  S.pos[j] = x;
  S.pos[j + 1] = y;
  S.pos[j + 2] = z;
  S.nrm[j] = nx;
  S.nrm[j + 1] = ny;
  S.nrm[j + 2] = nz;
  S.fl[i] = fl;
  S.layer[i] = layer;
}

export function park(S, from, x, y, z) {
  for (let i = from; i < N; i++) put(S, i, x, y, z, 0, 0, 0, 0.02, 2);
}

const pad3 = (n) => String(n).padStart(3, "0");
const pad2 = (n) => String(n).padStart(2, "0");

export function buildVirion() {
  const S = makeShape();
  const NS = 11000,
    K = 38,
    STEM = 40,
    BULB = 80;
  for (let i = 0; i < NS; i++) {
    const d = fib(i, NS);
    put(S, i, d[0] * 0.7, d[1] * 0.7, d[2] * 0.7, d[0], d[1], d[2], 0, 0);
  }
  let idx = NS;
  for (let k = 0; k < K; k++) {
    const d = fib(k, K);
    for (let s = 0; s < STEM; s++) {
      const r = 0.7 + (0.26 * s) / STEM;
      put(S, idx++, d[0] * r, d[1] * r, d[2] * r, 0, 0, 0, 0.45, 0);
    }
    for (let b = 0; b < BULB; b++) {
      const e = fib(b, BULB);
      put(
        S,
        idx++,
        d[0] + e[0] * 0.06,
        d[1] + e[1] * 0.06,
        d[2] + e[2] * 0.06,
        e[0],
        e[1],
        e[2],
        0,
        1,
      );
    }
  }
  park(S, idx, 0, 0, 0);
  S.caption = () =>
    "fig. 3  SARS-CoV-2   transmissibility of variants of concern, Virol J 2023";
  S.view = { spin: 0.3, yaw0: 0, sway: 0, pitch: 0.2, zoom: 1 };
  return S;
}

export function buildCube() {
  const S = makeShape();
  const SIZE = 0.3;
  const TILE = 0.86;
  const MOVES = 20;
  const TURN = 0.45;
  const PAUSE = 0.08;
  const REST = 1.6;
  const LAYER = [2, 2, 1, 1, 0, 0];
  const rnd = rng32(23);
  const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const cubes = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        if (!x && !y && !z) continue;
        const stickers = [];
        [[x, 1, 0], [x, -1, 1], [y, 1, 2], [y, -1, 3], [z, 1, 4], [z, -1, 5]].forEach(([v, s, face]) => {
          if (v === s) stickers.push(face);
        });
        cubes.push({ p: [x, y, z], R: [1, 0, 0, 0, 1, 0, 0, 0, 1], stickers });
      }
  const nStickers = cubes.reduce((n, c) => n + c.stickers.length, 0);
  const G = Math.floor(Math.sqrt(N / nStickers));
  const tile = (face) => {
    const ax = face >> 1, sg = face & 1 ? -1 : 1;
    const u = (ax + 1) % 3, v = (ax + 2) % 3;
    const pts = [];
    for (let a = 0; a < G; a++)
      for (let b = 0; b < G; b++) {
        const q = [0, 0, 0];
        q[ax] = 0.5 * sg + 0.004 * sg;
        q[u] = TILE * ((a + 0.5) / G - 0.5);
        q[v] = TILE * ((b + 0.5) / G - 0.5);
        pts.push(q);
      }
    const n = [0, 0, 0];
    n[ax] = sg;
    return { pts, n, layer: LAYER[face] };
  };
  const tiles = [0, 1, 2, 3, 4, 5].map(tile);
  const mul = (R, q) => [R[0] * q[0] + R[1] * q[1] + R[2] * q[2], R[3] * q[0] + R[4] * q[1] + R[5] * q[2], R[6] * q[0] + R[7] * q[1] + R[8] * q[2]];
  const mulM = (A, B) => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]));
  const rot = (axis, th) => {
    const c = Math.cos(th), s = Math.sin(th);
    if (axis === 0) return [1, 0, 0, 0, c, -s, 0, s, c];
    if (axis === 1) return [c, 0, s, 0, 1, 0, -s, 0, c];
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  };
  const quarter = (axis, dir) => rot(axis, (dir * Math.PI) / 2).map((v) => Math.round(v));

  let script = [], step = 0, clock = 0;
  const newScript = () => {
    const moves = [];
    while (moves.length < MOVES) {
      const m = { axis: Math.floor(rnd() * 3), layer: Math.floor(rnd() * 3) - 1, dir: rnd() < 0.5 ? 1 : -1 };
      const last = moves[moves.length - 1];
      if (last && last.axis === m.axis && last.layer === m.layer) continue;
      moves.push(m);
    }
    script = [...moves, ...moves.slice().reverse().map((m) => ({ ...m, dir: -m.dir }))];
    step = 0;
    clock = 0;
  };
  newScript();

  let phase = "scrambling";
  S.update = (t, dt = 0) => {
    clock += dt;
    let moving = null, th = 0;
    if (step < script.length) {
      const m = script[step];
      const u = clock / TURN;
      if (u >= 1 + PAUSE / TURN) {
        const Q = quarter(m.axis, m.dir);
        for (const c of cubes)
          if (c.p[m.axis] === m.layer) {
            c.p = mul(Q, c.p).map((v) => Math.round(v));
            c.R = mulM(Q, c.R).map((v) => Math.round(v));
          }
        step++;
        clock = 0;
      } else {
        moving = m;
        th = (m.dir * Math.PI * sm(u)) / 2;
      }
      phase = step < MOVES ? "scrambling" : "solving";
    } else {
      phase = "solved";
      if (clock > REST) newScript();
    }
    const T = moving ? rot(moving.axis, th) : null;
    let idx = 0;
    for (const c of cubes) {
      const turning = moving && c.p[moving.axis] === moving.layer;
      const M = turning ? mulM(T, c.R) : c.R;
      const base = turning ? mul(T, c.p) : c.p;
      for (const face of c.stickers) {
        const tl = tiles[face];
        const n = mul(M, tl.n);
        for (const q of tl.pts) {
          const w = mul(M, q);
          put(S, idx++, (base[0] + w[0]) * SIZE, (base[1] + w[1]) * SIZE, (base[2] + w[2]) * SIZE, n[0], n[1], n[2], 0, tl.layer);
        }
      }
    }
    park(S, idx, 0, 0, 0);
  };
  S.caption = () => {
    const k = phase === "scrambling" ? step + 1 : step - MOVES + 1;
    return `fig. 4  things built   a 3 x 3 x 3 cube puzzle, ${phase === "solved" ? "solved" : `${phase}: turn ${pad2(Math.min(k, MOVES))} of ${MOVES}`}`;
  };
  S.view = { spin: 0.15, yaw0: 0.6, sway: 0, pitch: 0.5, zoom: 1 };
  S.update(0, 0);
  return S;
}

const ease = (e) => (e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2);

export class Renderer {
  constructor() {
    this.cols = 0;
    this.rows = 0;
    const rnd = rng32(99);
    this.jit = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) this.jit[i] = rnd() * 2 - 1;
  }

  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.zb = new Float32Array(cols * rows);
    this.ch = new Uint8Array(cols * rows);
    this.ly = new Uint8Array(cols * rows);
    this.id = new Int32Array(cols * rows);
    this.line = new Uint16Array(cols);
  }

  snapshot(A, B, e, into) {
    const k = ease(e),
      sw = Math.sin(Math.PI * e) * 0.45,
      jit = this.jit;
    for (let i = 0; i < N * 3; i++) {
      into.pos[i] = A.pos[i] + (B.pos[i] - A.pos[i]) * k + jit[i] * sw;
      into.nrm[i] = A.nrm[i] + (B.nrm[i] - A.nrm[i]) * k;
    }
    const src = e < 0.5 ? A : B;
    into.fl.set(src.fl);
    into.layer.set(src.layer);
  }

  render(A, B, e, view) {
    const { cols, rows, zb, ch, ly, id, jit } = this;
    zb.fill(0);
    ch.fill(0);
    const k = ease(e),
      sw = Math.sin(Math.PI * e) * 0.45;
    const src = e < 0.5 ? A : B;
    const two = !!src.twoSided;
    const cy = Math.cos(view.yaw),
      sy = Math.sin(view.yaw);
    const cp = Math.cos(view.pitch),
      sp = Math.sin(view.pitch);
    const sx = view.scale * view.aspect,
      sc = view.scale;
    const top = RAMP.length - 1;
    const ap = A.pos,
      bp = B.pos,
      an = A.nrm,
      bn = B.nrm;
    for (let i = 0, j = 0; i < N; i++, j += 3) {
      const x = ap[j] + (bp[j] - ap[j]) * k + jit[j] * sw;
      const y = ap[j + 1] + (bp[j + 1] - ap[j + 1]) * k + jit[j + 1] * sw;
      const z = ap[j + 2] + (bp[j + 2] - ap[j + 2]) * k + jit[j + 2] * sw;
      const x1 = x * cy + z * sy,
        z1 = -x * sy + z * cy;
      const y2 = y * cp + z1 * sp,
        z2 = -y * sp + z1 * cp;
      const dz = z2 + CAM_D;
      if (dz < 0.3) continue;
      const s = CAM_D / dz;
      const px = Math.floor(view.cx + x1 * s * sx);
      const py = Math.floor(view.cy - y2 * s * sc);
      if (px < 0 || px >= cols || py < 0 || py >= rows) continue;
      const c = py * cols + px;
      if (s <= zb[c]) continue;
      zb[c] = s;
      id[c] = i;
      let b = src.fl[i];
      if (b <= 0) {
        const nx = an[j] + (bn[j] - an[j]) * k;
        const ny = an[j + 1] + (bn[j + 1] - an[j + 1]) * k;
        const nz = an[j + 2] + (bn[j + 2] - an[j + 2]) * k;
        const nx1 = nx * cy + nz * sy,
          nz1 = -nx * sy + nz * cy;
        const ny2 = ny * cp + nz1 * sp,
          nz2 = -ny * sp + nz1 * cp;
        let d = nx1 * LIGHT[0] + ny2 * LIGHT[1] + nz2 * LIGHT[2];
        if (two && d < 0) d = -d;
        b = (0.14 + 0.86 * (d > 0 ? d : 0)) * (b < 0 ? -b : 1);
      }
      b *= 1.0 - 0.22 * z2;
      let q = 1 + Math.floor(b * top);
      if (q < 1) q = 1;
      else if (q > top) q = top;
      ch[c] = q;
      ly[c] = src.layer[i];
    }
  }

  toStrings() {
    const { cols, rows, ch, ly, line } = this;
    let used = 0;
    for (let c = 0; c < cols * rows; c++) if (ch[c]) used |= 1 << ly[c];
    const out = [];
    for (let L = 0; L < LAYERS; L++) {
      if (!(used & (1 << L))) { out.push(""); continue; }
      const parts = new Array(rows);
      for (let r = 0; r < rows; r++) {
        const o = r * cols;
        for (let c = 0; c < cols; c++) {
          const q = ch[o + c];
          line[c] = q && ly[o + c] === L ? RAMP.charCodeAt(q) : 32;
        }
        parts[r] = String.fromCharCode.apply(null, line);
      }
      out.push(parts.join("\n"));
    }
    return out;
  }
}
