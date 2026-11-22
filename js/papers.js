// Scenes for the Papers section (fig. 3), one per topic tab. Epidemics keeps the virion
// (buildVirion in ascii.js); All (a simulated outbreak on a turning Earth), Bayesian,
// Language models (a Swiss roll unrolling) and Clinical are here.

import { N, makeShape, put, park, fib, rng32 } from "./ascii.js";
import { isLand } from "./land.js";

const pad2 = (n) => String(n).padStart(2, "0");
const pad3 = (n) => String(n).padStart(3, "0");

// ---------------------------------------------------------------- all: outbreaks around the world
// A simulated outbreak on a turning Earth. Land and sea come from js/land.js (Natural Earth,
// 1 degree). The outbreak spreads over land between neighbouring points (each point's 6 nearest
// land neighbours, so it stops at coastlines): each day an infected point infects each
// susceptible neighbour with probability SPREAD and recovers with probability GAMMA. Now and
// then, more often the more is infected, it is carried by air to a city not yet reached: a red
// arc flies there and a new focus starts. Infected land glows red and stands up; recovered land
// is darker. When it has burnt out, a new outbreak starts in another city.
export function buildWorld() {
  const S = makeShape();
  const R = 0.8; // globe radius
  const ARCS = 3; // flights in the air at once, at most
  const ARCPTS = 400;
  const M = N - ARCS * ARCPTS; // points on the globe
  const SPREAD = 0.3, GAMMA = 0.08;
  const RATE = 5; // days per second
  const FLIGHT = 1.6; // seconds in the air
  const HOLD = 2; // seconds a finished outbreak stays
  const CITIES = [
    ["Colombo", 6.93, 79.85], ["Montreal", 45.5, -73.57], ["London", 51.51, -0.13], ["Lagos", 6.52, 3.38],
    ["Cairo", 30.04, 31.24], ["Mumbai", 19.08, 72.88], ["Jakarta", -6.21, 106.85], ["Tokyo", 35.68, 139.69],
    ["Sydney", -33.87, 151.21], ["Sao Paulo", -23.55, -46.63], ["Mexico City", 19.43, -99.13], ["Nairobi", -1.29, 36.82],
    ["Moscow", 55.76, 37.62], ["Los Angeles", 34.05, -118.24], ["Johannesburg", -26.2, 28.05], ["Bangkok", 13.76, 100.5],
    ["Lima", -12.05, -77.04], ["Beijing", 39.9, 116.4],
  ];
  const rnd = rng32(77);
  const xyz = (lat, lon) => {
    const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180;
    return [Math.cos(p) * Math.cos(l), Math.sin(p), Math.cos(p) * Math.sin(l)];
  };
  // the globe's points, and which are land
  const pt = new Float32Array(M * 3);
  const isL = new Uint8Array(M);
  const landIdx = [];
  for (let i = 0; i < M; i++) {
    const d = fib(i, M);
    pt.set(d, i * 3);
    const lat = (Math.asin(d[1]) * 180) / Math.PI;
    const lon = (Math.atan2(d[2], d[0]) * 180) / Math.PI;
    if (isLand(lat, lon)) {
      isL[i] = 1;
      landIdx.push(i);
    }
  }
  const L = landIdx.length;
  const pos = new Float32Array(L * 3);
  landIdx.forEach((i, k) => pos.set(pt.subarray(i * 3, i * 3 + 3), k * 3));
  // 6 nearest land neighbours of each land point, through a coarse grid
  const NB = 6;
  const nbr = new Int32Array(L * NB);
  {
    const C = 0.05;
    const cell = (a, b, c) => ((a + 64) * 128 + (b + 64)) * 128 + (c + 64);
    const grid = new Map();
    for (let k = 0; k < L; k++) {
      const key = cell(Math.floor(pos[k * 3] / C), Math.floor(pos[k * 3 + 1] / C), Math.floor(pos[k * 3 + 2] / C));
      (grid.get(key) || grid.set(key, []).get(key)).push(k);
    }
    for (let k = 0; k < L; k++) {
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
      const cx = Math.floor(x / C), cy = Math.floor(y / C), cz = Math.floor(z / C);
      const near = [];
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++)
          for (let c = -1; c <= 1; c++)
            for (const j of grid.get(cell(cx + a, cy + b, cz + c)) || [])
              if (j !== k) near.push([(pos[j * 3] - x) ** 2 + (pos[j * 3 + 1] - y) ** 2 + (pos[j * 3 + 2] - z) ** 2, j]);
      near.sort((p, q) => p[0] - q[0]);
      for (let n = 0; n < NB; n++) nbr[k * NB + n] = near[n] ? near[n][1] : k;
    }
  }
  // each city's nearest land point
  const cityAt = CITIES.map(([, lat, lon]) => {
    const [x, y, z] = xyz(lat, lon);
    let best = 0, bd = Infinity;
    for (let k = 0; k < L; k++) {
      const d = (pos[k * 3] - x) ** 2 + (pos[k * 3 + 1] - y) ** 2 + (pos[k * 3 + 2] - z) ** 2;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  });

  const st = new Uint8Array(L), nx = new Uint8Array(L);
  const shI = new Float32Array(L), shR = new Float32Array(L), tI = new Float32Array(L), tR = new Float32Array(L);
  const lift = new Float32Array(L);
  let day = 0, acc = 0, hold = 0, nI = 0, reached = [], latest = "", flights = [];
  const seedCity = (c) => {
    const k = cityAt[c];
    st[k] = 1;
    for (let n = 0; n < NB; n++) if (st[nbr[k * NB + n]] === 0) st[nbr[k * NB + n]] = 1;
    reached.push(c);
    latest = CITIES[c][0];
  };
  const newOutbreak = () => {
    st.fill(0);
    reached = [];
    flights = [];
    day = 0;
    hold = 0;
    seedCity(Math.floor(rnd() * CITIES.length));
    nI = 1;
  };
  const step = () => {
    nx.set(st);
    nI = 0;
    for (let k = 0; k < L; k++) {
      if (st[k] !== 1) continue;
      for (let n = 0; n < NB; n++) {
        const j = nbr[k * NB + n];
        if (st[j] === 0 && nx[j] === 0 && rnd() < SPREAD) nx[j] = 1;
      }
      if (rnd() < GAMMA) nx[k] = 2;
    }
    st.set(nx);
    for (let k = 0; k < L; k++) if (st[k] === 1) nI++;
    day++;
    // air travel: the more infected, the likelier a flight to a city not yet reached
    const todo = CITIES.map((_, c) => c).filter((c) => !reached.includes(c) && !flights.some((f) => f.to === c));
    if (todo.length && flights.length < ARCS && rnd() < Math.min(0.12, nI / 900)) {
      const from = reached[Math.floor(rnd() * reached.length)];
      const to = todo[Math.floor(rnd() * todo.length)];
      flights.push({ from, to, t: 0 });
    }
  };
  newOutbreak();

  S.update = (t, dt = 0) => {
    if (nI === 0 && !flights.length) {
      hold += dt;
      if (hold > HOLD) newOutbreak();
    } else {
      acc += dt * RATE;
      while (acc >= 1) {
        acc -= 1;
        step();
      }
    }
    for (const f of flights) {
      f.t += dt / FLIGHT;
      if (f.t >= 1) seedCity(f.to);
    }
    flights = flights.filter((f) => f.t < 1);
    // local shares of infected and recovered, smoothed twice over neighbours
    for (let k = 0; k < L; k++) {
      tI[k] = st[k] === 1 ? 1 : 0;
      tR[k] = st[k] === 2 ? 1 : 0;
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < L; k++) {
        let a = tI[k], b = tR[k];
        for (let n = 0; n < NB; n++) {
          a += tI[nbr[k * NB + n]];
          b += tR[nbr[k * NB + n]];
        }
        shI[k] = a / (NB + 1);
        shR[k] = b / (NB + 1);
      }
      tI.set(shI);
      tR.set(shR);
    }
    let idx = 0, k = 0;
    for (let i = 0; i < M; i++) {
      const d0 = pt[i * 3], d1 = pt[i * 3 + 1], d2 = pt[i * 3 + 2];
      if (!isL[i]) {
        put(S, idx++, d0 * R * 0.985, d1 * R * 0.985, d2 * R * 0.985, d0, d1, d2, 0.08, 2); // sea: faint dots
        continue;
      }
      lift[k] += (0.06 * shI[k] - lift[k]) * Math.min(1, dt * 4);
      const r = R * (1.012 + lift[k]);
      const s = shI[k] > 0.2 ? 1 : shR[k] > 0.5 ? 2 : 0;
      put(S, idx++, d0 * r, d1 * r, d2 * r, d0, d1, d2, s === 1 ? -1.25 : s === 2 ? -0.6 : -1.05, s === 1 ? 1 : 0);
      k++;
    }
    // flights: a raised great-circle arc growing from one city to the other
    for (let a = 0; a < ARCS; a++) {
      const f = flights[a];
      if (!f) {
        park(S, idx, 0, 0, 0);
        idx += ARCPTS;
        continue;
      }
      const A = pos.subarray(cityAt[f.from] * 3, cityAt[f.from] * 3 + 3);
      const B = pos.subarray(cityAt[f.to] * 3, cityAt[f.to] * 3 + 3);
      const om = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])) || 1e-6;
      for (let j = 0; j < ARCPTS; j++) {
        const u = (j / (ARCPTS - 1)) * f.t;
        const wa = Math.sin((1 - u) * om) / Math.sin(om), wb = Math.sin(u * om) / Math.sin(om);
        const h = R * (1.03 + 0.28 * Math.sin(Math.PI * u));
        put(S, idx++, (A[0] * wa + B[0] * wb) * h, (A[1] * wa + B[1] * wb) * h, (A[2] * wa + B[2] * wb) * h, 0, 0, 0, 0.45 + 0.5 * (j / ARCPTS), 1);
      }
    }
  };
  S.caption = () =>
    `a simulated outbreak spreading between cities   day ${pad3(day)}   ${reached.length} ${reached.length === 1 ? "city" : "cities"}, latest ${latest}`;
  S.view = { spin: 0.12, yaw0: 0, sway: 0, pitch: 0.3, zoom: 1 };
  for (let k = 0; k < 40; k++) S.update(0, 0.1); // open with the outbreak under way
  return S;
}

// ---------------------------------------------------------------- bayesian: posterior surface
// Sequential Bayesian updating: as observations accumulate, a posterior density over two
// parameters narrows onto its mode and a competing mode fades.
export function buildPosterior() {
  const S = makeShape();
  const G = 126;
  const T = 16;
  let nObs = 0;
  S.update = (t) => {
    const u = (t % T) / T;
    const n = 60 * Math.min(1, u * 1.3);
    nObs = Math.floor(n);
    const sig = 0.75 / Math.sqrt(1 + n / 5);
    const peak = 0.18 / sig;
    const w = n / (n + 4);
    const mx = 0.3 * w;
    const mz = -0.25 * w;
    const a2 = 0.3 * Math.exp(-n / 12);
    const s2 = 0.3;
    const m2x = -0.5;
    const m2z = 0.45;
    const i1 = 1 / (2 * sig * sig);
    const i2 = 1 / (2 * s2 * s2);
    let idx = 0;
    for (let a = 0; a < G; a++) {
      const x = -1.1 + (2.2 * a) / (G - 1);
      for (let b = 0; b < G; b++) {
        const z = -1.1 + (2.2 * b) / (G - 1);
        const g1 = peak * Math.exp(-((x - mx) ** 2 + (z - mz) ** 2) * i1);
        const g2 = a2 * Math.exp(-((x - m2x) ** 2 + (z - m2z) ** 2) * i2);
        const dx = -(x - mx) * 2 * i1 * g1 - (x - m2x) * 2 * i2 * g2;
        const dz = -(z - mz) * 2 * i1 * g1 - (z - m2z) * 2 * i2 * g2;
        const l = Math.hypot(dx, 1, dz);
        const line = a % 9 === 0 || b % 9 === 0;
        put(S, idx++, x, g1 + g2 - 0.45, z, -dx / l, 1 / l, -dz / l, line ? -1 : -0.6, g1 > 0.5 * peak ? 1 : 0);
      }
    }
    for (let i = idx; i < N; i++) put(S, i, -1.1, -0.45, -1.1, 0, 1, 0, -0.6, 0);
  };
  S.caption = () =>
    `sequential Bayesian updating   n = ${pad3(nObs)}   high-density region marked`;
  S.view = { spin: 0.12, yaw0: 0.6, sway: 0, pitch: 0.55, zoom: 0.6 };
  S.update(6);
  return S;
}

// ---------------------------------------------------------------- language models: manifold learning
// A Swiss roll, the classic test surface of manifold learning: a sheet wound into a spiral
// that slowly unrolls flat and winds back up, as dimensionality-reduction methods flatten data
// lying on a curled surface. The sheet's cross-section is a curve whose tangent angle is
// (1 - lambda) times that of the rolled spiral (an Archimedean spiral r = a theta): lambda = 0
// is the roll, lambda = 1 a flat sheet, and in between it uncoils from both ends. Red stripes
// across the sheet wind round with it and lie evenly spaced when it is flat.
export function buildSwissRoll() {
  const S = makeShape();
  const TH0 = Math.PI, TH1 = 3.5 * Math.PI; // the spiral's angular range (1.25 turns)
  const LEN = 2.4; // length of the sheet
  const WIDE = 0.85; // its width, along the roll's axis
  const NU = 240, NV = 64; // samples along and across
  const STRIPES = 6;
  const ROLL = 4, FLAT = 1.5; // seconds to unroll (and to roll), and to rest at each end
  const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  // tangent angle of the rolled spiral at NU equal steps of arc length
  const FINE = 4000;
  const a = 1; // the spiral's scale; arc length is rescaled to LEN below
  const sx = [], sy = [];
  for (let k = 0; k <= FINE; k++) {
    const th = TH0 + ((TH1 - TH0) * k) / FINE;
    sx.push(a * th * Math.cos(th));
    sy.push(a * th * Math.sin(th));
  }
  const cum = [0];
  for (let k = 1; k <= FINE; k++) cum.push(cum[k - 1] + Math.hypot(sx[k] - sx[k - 1], sy[k] - sy[k - 1]));
  const total = cum[FINE];
  const phi = new Float64Array(NU); // unwrapped tangent angle at each sample
  {
    let k = 1, prev = null, turn = 0;
    for (let i = 0; i < NU; i++) {
      const target = (total * i) / (NU - 1);
      while (k < FINE && cum[k] < target) k++;
      let ang = Math.atan2(sy[k] - sy[k - 1], sx[k] - sx[k - 1]);
      if (prev !== null) {
        while (ang + turn - prev > Math.PI) turn -= 2 * Math.PI;
        while (ang + turn - prev < -Math.PI) turn += 2 * Math.PI;
      }
      phi[i] = ang + turn;
      prev = phi[i];
    }
  }
  const mid = phi[NU >> 1];
  const ds = LEN / (NU - 1);
  const cx = new Float64Array(NU), cy = new Float64Array(NU), ang = new Float64Array(NU);
  let lambda = 0, winding = false;

  S.update = (t) => {
    const cyc = 2 * (ROLL + FLAT);
    const u = t % cyc;
    winding = u >= ROLL + FLAT && u < 2 * ROLL + FLAT;
    lambda = u < ROLL ? sm(u / ROLL) : u < ROLL + FLAT ? 1 : u < 2 * ROLL + FLAT ? 1 - sm((u - ROLL - FLAT) / ROLL) : 0;
    // the cross-section, built out from its middle
    for (let i = 0; i < NU; i++) ang[i] = (1 - lambda) * (phi[i] - mid);
    const m = NU >> 1;
    cx[m] = 0;
    cy[m] = 0;
    for (let i = m + 1; i < NU; i++) {
      const g = 0.5 * (ang[i] + ang[i - 1]);
      cx[i] = cx[i - 1] + ds * Math.cos(g);
      cy[i] = cy[i - 1] + ds * Math.sin(g);
    }
    for (let i = m - 1; i >= 0; i--) {
      const g = 0.5 * (ang[i] + ang[i + 1]);
      cx[i] = cx[i + 1] - ds * Math.cos(g);
      cy[i] = cy[i + 1] - ds * Math.sin(g);
    }
    let mx = 0, my = 0;
    for (let i = 0; i < NU; i++) {
      mx += cx[i];
      my += cy[i];
    }
    mx /= NU;
    my /= NU;
    let idx = 0;
    for (let i = 0; i < NU; i++) {
      const f = i / (NU - 1);
      const stripe = (f * STRIPES) % 1 < 0.07 || f > 0.99;
      const nx = -Math.sin(ang[i]), ny = Math.cos(ang[i]);
      const fl = -(0.7 + 0.55 * f); // brighter towards the outer end
      for (let j = 0; j < NV; j++) {
        const z = -WIDE / 2 + (WIDE * (j + 0.5)) / NV;
        const edge = j === 0 || j === NV - 1; // the end edges trace the spiral
        put(S, idx++, cx[i] - mx, cy[i] - my - 0.05, z, nx, ny, 0, edge ? 0.95 : fl, stripe ? 1 : 0);
      }
    }
    park(S, idx, cx[NU >> 1] - mx, cy[NU >> 1] - my - 0.05, 0);
    S.view.zoom = 1.05 - 0.25 * lambda; // closer on the roll, back for the flat sheet
  };
  S.caption = () =>
    `manifold learning   a Swiss roll ${lambda > 0.98 ? "unrolled flat" : lambda < 0.02 ? "rolled up" : winding ? "rolling up" : "unrolling"}: neighbours on the sheet stay neighbours`;
  S.view = { spin: 0, yaw0: 0.3, sway: 0.2, pitch: 0.38, zoom: 1.05 };
  S.twoSided = true; // a thin sheet: light whichever face is toward us
  S.update(1.2);
  return S;
}

// ---------------------------------------------------------------- clinical: red blood cells
// Red blood cells tumbling. Each is the biconcave disc of Evans & Fung (1972): at distance r
// from the axis, as a fraction of the cell radius, the half-thickness is
//   (R / 2) sqrt(1 - r^2) (C0 + C1 r^2 + C2 r^4),  C0 = 0.2072, C1 = 2.0026, C2 = -1.1228,
// thin at the centre (the dimple) and thickest near the rim.
export function buildBloodCells() {
  const S = makeShape();
  const CELLS = 7;
  const R = 0.3;
  const PER = Math.floor(N / CELLS);
  const HALF = PER >> 1;
  const C0 = 0.2072;
  const C1 = 2.0026;
  const C2 = -1.1228;
  // one cell in its own frame: surface points and normals, top face then bottom face
  const base = new Float32Array(PER * 3);
  const bnrm = new Float32Array(PER * 3);
  for (let j = 0; j < HALF; j++) {
    const r = Math.min(0.995, Math.sqrt((j + 0.5) / HALF)); // even over the face
    const a = j * 2.399963229728653;
    const s = Math.sqrt(1 - r * r);
    const poly = C0 + C1 * r * r + C2 * r ** 4;
    const h = (R / 2) * s * poly;
    const dh = (1 / 2) * ((-r / s) * poly + s * (2 * C1 * r + 4 * C2 * r ** 3)); // dh / d(distance)
    for (const side of [1, -1]) {
      const i = (side === 1 ? j : HALF + j) * 3;
      const l = Math.hypot(dh, 1);
      base[i] = R * r * Math.cos(a);
      base[i + 1] = side * h;
      base[i + 2] = R * r * Math.sin(a);
      bnrm[i] = (-side * dh * Math.cos(a)) / l;
      bnrm[i + 1] = side / l;
      bnrm[i + 2] = (-side * dh * Math.sin(a)) / l;
    }
  }
  const rnd = rng32(17);
  const cells = Array.from({ length: CELLS }, (_, c) => {
    const d = fib(c, CELLS);
    const ax = fib(Math.floor(rnd() * 97), 97);
    return {
      at: [d[0] * 0.75, d[1] * 0.6, d[2] * 0.75],
      axis: ax,
      w: 0.25 + 0.35 * rnd(),
      a0: rnd() * 6.28,
      bob: rnd() * 6.28,
    };
  });

  S.update = (t) => {
    let idx = 0;
    for (const cell of cells) {
      const [ux, uy, uz] = cell.axis;
      const th = cell.a0 + cell.w * t;
      const co = Math.cos(th);
      const si = Math.sin(th);
      const ox = cell.at[0];
      const oy = cell.at[1] + 0.04 * Math.sin(0.7 * t + cell.bob);
      const oz = cell.at[2];
      // rotation about the cell's axis (Rodrigues), as a matrix applied to points and normals
      const c1 = 1 - co;
      const m00 = co + ux * ux * c1, m01 = ux * uy * c1 - uz * si, m02 = ux * uz * c1 + uy * si;
      const m10 = uy * ux * c1 + uz * si, m11 = co + uy * uy * c1, m12 = uy * uz * c1 - ux * si;
      const m20 = uz * ux * c1 - uy * si, m21 = uz * uy * c1 + ux * si, m22 = co + uz * uz * c1;
      for (let j = 0, i = 0; j < PER; j++, i += 3) {
        const x = base[i], y = base[i + 1], z = base[i + 2];
        const a = bnrm[i], b = bnrm[i + 1], c = bnrm[i + 2];
        put(
          S,
          idx++,
          ox + m00 * x + m01 * y + m02 * z,
          oy + m10 * x + m11 * y + m12 * z,
          oz + m20 * x + m21 * y + m22 * z,
          m00 * a + m01 * b + m02 * c,
          m10 * a + m11 * b + m12 * c,
          m20 * a + m21 * b + m22 * c,
          -1,
          1,
        );
      }
    }
    park(S, idx, cells[0].at[0], cells[0].at[1], cells[0].at[2]);
  };
  S.caption = () => "red blood cells, Evans-Fung shape   haemoglobin deferral of blood donors, Vox Sang 2026";
  S.view = { spin: 0.08, yaw0: 0, sway: 0, pitch: 0.15, zoom: 0.9 };
  S.update(0);
  return S;
}
