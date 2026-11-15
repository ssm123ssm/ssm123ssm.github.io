import { makeShape, put, park, rng32 } from "./ascii.js";

export const PARAMS = { G: 120, P: 0.1, GAMMA: 0.15, JUMP: 0.0015, SEEDS: 3, DAYS: 200 };

export function createSIR({ G, P, GAMMA, JUMP, SEEDS, DAYS } = PARAMS) {
  const NG = G * G;
  const state = new Uint8Array(NG);
  const next = new Uint8Array(NG);
  const inc = new Int32Array(DAYS + 1);
  let rnd = Math.random;
  const sim = { G, DAYS, state, inc, run: 0, day: 0, S: NG, I: 0, R: 0 };

  const count = () => {
    sim.S = sim.I = sim.R = 0;
    for (let i = 0; i < NG; i++) {
      if (state[i] === 0) sim.S++;
      else if (state[i] === 1) sim.I++;
      else sim.R++;
    }
  };

  sim.seed = (at) => {
    rnd = rng32(2024 + sim.run++);
    state.fill(0);
    inc.fill(0);
    sim.day = 0;
    if (at === undefined) {
      for (let k = 0; k < SEEDS; k++) state[Math.floor(rnd() * NG)] = 1;
    } else {
      const a = (at / G) | 0;
      const b = at - a * G;
      for (let aa = Math.max(0, a - 1); aa <= Math.min(G - 1, a + 1); aa++)
        for (let bb = Math.max(0, b - 1); bb <= Math.min(G - 1, b + 1); bb++) state[aa * G + bb] = 1;
    }
    count();
    inc[0] = sim.I;
  };

  sim.step = () => {
    next.set(state);
    let fresh = 0;
    for (let i = 0; i < NG; i++) {
      if (state[i] !== 1) continue;
      const a = (i / G) | 0;
      const b = i - a * G;
      for (let da = -1; da <= 1; da++) {
        const aa = a + da;
        if (aa < 0 || aa >= G) continue;
        for (let db = -1; db <= 1; db++) {
          const bb = b + db;
          if ((!da && !db) || bb < 0 || bb >= G) continue;
          const j = aa * G + bb;
          if (state[j] === 0 && next[j] === 0 && rnd() < P) {
            next[j] = 1;
            fresh++;
          }
        }
      }
      if (rnd() < JUMP) {
        const j = Math.floor(rnd() * NG);
        if (state[j] === 0 && next[j] === 0) {
          next[j] = 1;
          fresh++;
        }
      }
      if (rnd() < GAMMA) next[i] = 2;
    }
    state.set(next);
    sim.day++;
    inc[sim.day] = fresh;
    count();
  };

  sim.over = () => sim.I === 0 || sim.day >= DAYS;
  sim.seed();
  return sim;
}

export function buildSpread() {
  const S = makeShape();
  const sim = createSIR();
  const { G, DAYS, state, inc } = sim;
  const NG = G * G;
  const RATE = 16;
  const HOLD = 2.5;
  const BASE = -0.45;
  const RISE = 0.9;
  const DIP = 0.1;
  const SHOW_I = 0.12;
  const SHOW_R = 0.5;
  const BLUR = 4;
  const HALF = 1.1;
  const STEPX = (2 * HALF) / (G - 1);
  const shareI = new Float32Array(NG);
  const shareR = new Float32Array(NG);
  const tmp = new Float32Array(NG);
  const height = new Float32Array(NG);
  let acc = 0;
  let hold = 0;

  const share = (v, out) => {
    const w = 1 / (2 * BLUR + 1);
    for (let a = 0; a < G; a++) {
      let s = 0;
      const o = a * G;
      for (let b = -BLUR; b <= BLUR; b++) s += b >= 0 && b < G && state[o + b] === v ? 1 : 0;
      for (let b = 0; b < G; b++) {
        tmp[o + b] = s * w;
        const add = b + BLUR + 1;
        const sub = b - BLUR;
        if (add < G && state[o + add] === v) s++;
        if (sub >= 0 && state[o + sub] === v) s--;
      }
    }
    for (let b = 0; b < G; b++) {
      let s = 0;
      for (let a = -BLUR; a <= BLUR; a++) if (a >= 0 && a < G) s += tmp[a * G + b];
      for (let a = 0; a < G; a++) {
        out[a * G + b] = s * w;
        const add = a + BLUR + 1;
        const sub = a - BLUR;
        if (add < G) s += tmp[add * G + b];
        if (sub >= 0) s -= tmp[sub * G + b];
      }
    }
  };
  const draw = (ease) => {
    share(1, shareI);
    share(2, shareR);
    for (let i = 0; i < NG; i++) height[i] += (RISE * shareI[i] - DIP * shareR[i] - height[i]) * ease;
    for (let a = 0; a < G; a++) {
      const z = -HALF + a * STEPX;
      for (let b = 0; b < G; b++) {
        const i = a * G + b;
        const h = height[i];
        const dx = (height[b < G - 1 ? i + 1 : i] - height[b > 0 ? i - 1 : i]) / (2 * STEPX);
        const dz = (height[a < G - 1 ? i + G : i] - height[a > 0 ? i - G : i]) / (2 * STEPX);
        const l = Math.hypot(dx, 1, dz);
        const st = shareI[i] > SHOW_I ? 1 : shareR[i] > SHOW_R ? 2 : 0;
        const edge = a === 0 || b === 0 || a === G - 1 || b === G - 1;
        put(
          S,
          i,
          -HALF + b * STEPX,
          BASE + h,
          z,
          -dx / l,
          1 / l,
          -dz / l,
          edge ? 0.75 : st === 1 ? -1.15 : st === 2 ? -0.75 : -0.6,
          edge ? 0 : st === 1 ? 1 : st === 2 ? 2 : 0,
        );
      }
    }
  };

  S.update = (t, dt) => {
    if (sim.over()) {
      hold += dt;
      if (hold > (sim.R < NG * 0.02 ? 0.6 : HOLD)) {
        sim.seed();
        acc = 0;
        hold = 0;
      }
    } else {
      acc += dt * RATE;
      while (acc >= 1 && !sim.over()) {
        acc -= 1;
        sim.step();
      }
    }
    draw(Math.min(1, dt * 8));
  };
  S.seedAt = (i, ahead = 0) => {
    if (!(i >= 0 && i < NG)) return false;
    sim.seed(i);
    acc = 0;
    hold = 0;
    for (let k = 0; k < ahead && !sim.over(); k++) sim.step();
    draw(ahead ? 1 : 0);
    return true;
  };
  const pad3 = (n) => String(n).padStart(3, "0");
  const n5 = (n) => String(n).padStart(5, " ");
  S.history = () => ({ run: sim.run, day: sim.day, days: DAYS, inc });
  S.caption = () =>
    `fig. 2  stochastic SIR on a ${G} x ${G} grid   day ${pad3(sim.day)}   S ${n5(sim.S)}  I ${n5(sim.I)}  R ${n5(sim.R)}`;
  S.view = { spin: 0, yaw0: 0.3, sway: 0.2, pitch: 0.5, zoom: 0.62 };
  while (sim.day < 45 && sim.I > 0) sim.step();
  if (sim.I === 0) {
    sim.seed();
    while (sim.day < 45 && sim.I > 0) sim.step();
  }
  park(S, NG, 0, BASE - 0.1, 0);
  draw(1);
  return S;
}
