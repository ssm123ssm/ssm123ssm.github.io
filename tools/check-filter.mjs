import { N, rng32 } from "../js/ascii.js";
import { runFilter, nearestPart, WEIGHTS, PARTS, STEPS } from "../js/particle-filter.js";

const bounds = [-3.15, 1.4, -1.43, 1.43];

const t0 = performance.now();
const run = runFilter(bounds);
const ms = performance.now() - t0;
console.log(`run: ${N} particles, ${STEPS} steps, ${ms.toFixed(0)} ms`);
for (const [k, s] of run.stats.entries())
  console.log(
    `  step ${k + 1}: beta ${s.beta.toExponential(2)}  ESS ${(s.ess / N * 100).toFixed(0)}%` +
      `  unique after resampling ${(s.unique / N * 100).toFixed(0)}%  MH acceptance ${(s.accept * 100).toFixed(0)}%`,
  );

const { R0, RB, ST0, ST1, SIG, D } = PARTS;
const rnd = rng32(12345);
const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const unit = () => {
  const v = [gauss(), gauss(), gauss()];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};
const shellR = (a) => {
  for (;;) {
    const r = a + SIG * gauss();
    if (r > 0 && rnd() < Math.min(1, (r / (a + 6 * SIG)) ** 2)) return r;
  }
};
const LEN = ST1 - ST0;
const TUBE = LEN * 2 * Math.PI * SIG * SIG;
const CAPS = Math.pow(2 * Math.PI * SIG * SIG, 1.5);
function exactSample(n) {
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rnd();
    let p;
    if (u < WEIGHTS.sphere) {
      const d = unit();
      const r = shellR(R0);
      p = d.map((c) => c * r);
    } else {
      const k = Math.floor(rnd() * 38);
      const dk = [D[k * 3], D[k * 3 + 1], D[k * 3 + 2]];
      if (u < WEIGHTS.sphere + WEIGHTS.stem) {
        if (rnd() < TUBE / (TUBE + CAPS)) {
          const t = ST0 + LEN * rnd();
          const g = [gauss() * SIG, gauss() * SIG, gauss() * SIG];
          const ax = g[0] * dk[0] + g[1] * dk[1] + g[2] * dk[2];
          p = dk.map((c, m) => c * t + g[m] - ax * c);
        } else {
          const inner = rnd() < 0.5;
          const g = [gauss() * SIG, gauss() * SIG, gauss() * SIG];
          let ax = g[0] * dk[0] + g[1] * dk[1] + g[2] * dk[2];
          if (inner ? ax > 0 : ax < 0) ax = -2 * ax;
          else ax = 0;
          const e = inner ? ST0 : ST1;
          p = dk.map((c, m) => c * e + g[m] + ax * c);
        }
      } else {
        const d = unit();
        const r = shellR(RB);
        p = dk.map((c, m) => c + d[m] * r);
      }
    }
    out.set(p, i * 3);
  }
  return out;
}

const fin = run.stages[STEPS].pos;
const A = exactSample(N);
const B = exactSample(N);
const tv = (h1, h2, n) => {
  let s = 0;
  for (const k of new Set([...h1.keys(), ...h2.keys()])) s += Math.abs((h1.get(k) || 0) - (h2.get(k) || 0));
  return s / (2 * n);
};
const hist = (X, key) => {
  const h = new Map();
  for (let i = 0; i < X.length; i += 3) {
    const k = key(X[i], X[i + 1], X[i + 2]);
    h.set(k, (h.get(k) || 0) + 1);
  }
  return h;
};
const o = [0, 0, 0, 0, 0];
const part = (x, y, z) => nearestPart(x, y, z, o)[0];
const radial = (x, y, z) => Math.floor(Math.hypot(x, y, z) / 0.01);
const spike = (x, y, z) => {
  let best = -2, b = 0;
  for (let k = 0; k < 38; k++) {
    const p = x * D[k * 3] + y * D[k * 3 + 1] + z * D[k * 3 + 2];
    if (p > best) (best = p), (b = k);
  }
  return b;
};
const proj = (x, y) => `${Math.floor(x / 0.05)},${Math.floor(y / 0.05)}`;
const vox = (x, y, z) => `${Math.floor(x / 0.1)},${Math.floor(y / 0.1)},${Math.floor(z / 0.1)}`;

const share = (X) => {
  const h = hist(X, part);
  return [0, 1, 2].map((p) => ((h.get(p) || 0) / N * 100).toFixed(1) + "%").join(" / ");
};
console.log("\nshare on sphere / stems / bulbs");
console.log(`  target weights   ${[WEIGHTS.sphere, WEIGHTS.stem, WEIGHTS.bulb].map((w) => (w * 100).toFixed(1) + "%").join(" / ")}`);
console.log(`  exact sample     ${share(A)}`);
console.log(`  particle filter  ${share(fin)}`);

console.log("\ntotal variation distance (lower is closer; 'floor' = exact vs exact)");
for (const [name, key] of [
  ["radius, 0.01 bins", radial],
  ["direction, 38 spike sectors", spike],
  ["x-y projection, 0.05 bins", proj],
  ["3D voxels, 0.1 bins", vox],
]) {
  const hf = hist(fin, key), ha = hist(A, key), hb = hist(B, key);
  console.log(`  ${name.padEnd(30)} filter ${tv(hf, ha, N).toFixed(3)}   floor ${tv(hb, ha, N).toFixed(3)}`);
}

const prof = (X) => {
  let s = 0, s2 = 0, c = 0;
  for (let i = 0; i < X.length; i += 3) {
    if (part(X[i], X[i + 1], X[i + 2]) !== 0) continue;
    const e = (Math.hypot(X[i], X[i + 1], X[i + 2]) - R0) / SIG;
    s += e; s2 += e * e; c++;
  }
  const m = s / c;
  return `mean ${m.toFixed(3)}  sd ${Math.sqrt(s2 / c - m * m).toFixed(3)}`;
};
console.log(`\nsphere shell (r - 0.7) / SIG   exact: ${prof(A)}   filter: ${prof(fin)}`);
