// fig. 5: a telescope under the night sky. A refractor on a tripod slews slowly across a sky
// of stars that twinkle and wheel about a pole, with a Milky Way band, while meteors streak
// across now and then. When a photograph is chosen in the Astrophotography section
// (setPhoto), the sky's points move to draw that photo behind the telescope, and the tube
// turns to it.

import { N, makeShape, put, park, rng32 } from "./ascii.js";

export function buildNightSky() {
  const S = makeShape();
  const rnd = rng32(41);
  const GROUND = -0.95;
  const PIVOT = [0.05, 0.22, 0.1]; // where the tube turns, on top of the mount
  const LEN = 1.35, RAD = 0.1; // the optical tube

  // ---------------------------------------------------------- the sky: a curved backdrop of stars
  const STARS = 3200;
  const sky = [];
  for (let i = 0; i < STARS; i++) {
    // a third of the stars crowd into a Milky Way band running diagonally
    let u = rnd(), v = rnd();
    if (i % 3 === 0) {
      const a = rnd();
      u = a;
      v = 0.25 + 0.6 * a + 0.09 * (rnd() + rnd() + rnd() - 1.5);
    }
    const bright = rnd() ** 6; // most are faint, a few bright
    sky.push({ u, v, b: 0.12 + 0.85 * bright, ph: rnd() * 6.28, layer: bright > 0.35 ? 0 : 2 });
  }
  // backdrop: x across (kept to the figure's side, clear of the text), y up, pushed back and
  // curved so it wraps behind the telescope
  const skyAt = (u, v, rot) => {
    // turn about a pole near the top left, slowly, like the sky over a night
    const px = 0.15, py = 0.95;
    const c = Math.cos(rot), s = Math.sin(rot);
    const du = u - px, dv = v - py;
    const uu = px + du * c - dv * s, vv = py + du * s + dv * c;
    const x = -1.5 + uu * 4.4;
    const y = -0.6 + vv * 3.6;
    const z = 2.4 - 0.1 * (x - 0.7) ** 2;
    return [x, y, z];
  };

  // ---------------------------------------------------------- the sky's points
  // POOL points draw the sky: the stars (the extras sit on stars), or a photograph (the extras
  // double up on its bright cells), so every one of them is always on something visible.
  const POOL = 5400;
  const MORPH = 1.6; // s, from one sky to the next
  // where a photograph hangs: centre, and the largest width and height (scene units)
  const PHOTO_X = 0.4, PHOTO_Y = 1.0, PHOTO_W = 3.0, PHOTO_H = 2.3;
  const cur = { x: new Float32Array(POOL), y: new Float32Array(POOL), z: new Float32Array(POOL), b: new Float32Array(POOL), l: new Uint8Array(POOL) };
  const jit = new Float32Array(POOL * 3).map(() => (rnd() * 2 - 1) * 0.3); // a little scatter mid-way
  let from = null, to = null, t0 = 0, pending = null, title = '';
  let azFrom = 0, altFrom = 0, azTo = 0, altTo = 0;

  // A photo's bright cells as points on the sky: brightness from the photo, colour from its hue
  // (the renderer's photo layers, see ascii.js; greys are white or dim by brightness), the dark
  // sky left empty.
  const HUES = [[0, 3], [30, 4], [55, 1], [165, 5], [215, 6], [265, 7], [320, 8], [360, 3]]; // [hue, layer]
  function layerOf(R, G, B, n) {
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    if (!mx || (mx - mn) / mx < 0.12) return n > 0.35 ? 0 : 2; // grey enough: no hue
    const d = mx - mn;
    let h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
    let best = HUES[0];
    for (const e of HUES) if (Math.abs(e[0] - h) < Math.abs(best[0] - h)) best = e;
    return best[1];
  }
  function photoTargets(pic) {
    const aspect = pic.naturalWidth / pic.naturalHeight;
    const cols = Math.max(8, Math.round(Math.sqrt(POOL * aspect))), rows = Math.max(8, Math.round(POOL / cols));
    const c = document.createElement('canvas');
    c.width = cols;
    c.height = rows;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(pic, 0, 0, cols, rows);
    const d = g.getImageData(0, 0, cols, rows).data;
    let w = PHOTO_W, h = w / aspect;
    if (h > PHOTO_H) { h = PHOTO_H; w = h * aspect; }
    const v = new Float32Array(cols * rows);
    for (let i = 0; i < v.length; i++) v[i] = Math.pow((0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2]) / 255, 0.55);
    const sorted = Float32Array.from(v).sort();
    const lo = Math.max(0.22, sorted[Math.floor(sorted.length * 0.55)]), hi = Math.max(lo + 0.05, sorted[sorted.length - 1]);
    const cells = [];
    for (let r = 0; r < rows; r++)
      for (let q = 0; q < cols; q++) {
        const n = (v[r * cols + q] - lo) / (hi - lo);
        if (n <= 0) continue;
        const x = PHOTO_X - w / 2 + ((q + 0.5) / cols) * w, y = PHOTO_Y + h / 2 - ((r + 0.5) / rows) * h;
        const o = 4 * (r * cols + q);
        cells.push([x, y, 2.4 - 0.1 * (x - 0.7) ** 2, 0.1 + 0.85 * Math.min(1, n), layerOf(d[o], d[o + 1], d[o + 2], n)]);
      }
    if (!cells.length) cells.push([PHOTO_X, PHOTO_Y, 2.4, 0.1, 2]);
    const T = { x: new Float32Array(POOL), y: new Float32Array(POOL), z: new Float32Array(POOL), b: new Float32Array(POOL), l: new Uint8Array(POOL) };
    for (let j = 0; j < POOL; j++) {
      const k = cells[j % cells.length];
      T.x[j] = k[0]; T.y[j] = k[1]; T.z[j] = k[2]; T.b[j] = k[3]; T.l[j] = k[4];
    }
    return T;
  }
  // instant: no morph (animation off)
  S.setPhoto = (pic, name, instant = false) => { pending = { pic, name, instant }; };

  // ---------------------------------------------------------- meteors
  const METEORS = 3, TRAIL = 320;
  const meteors = [];
  let nextMeteor = 1.2, count = 0;
  const launch = (t) => {
    // start high in the sky and fall away from the side they start on
    const x = -1 + 3.4 * rnd(), y = 1.3 + 1.2 * rnd();
    const ang = x > 0.7 ? Math.PI + 0.35 + 0.45 * rnd() : -0.35 - 0.45 * rnd();
    meteors.push({ t0: t, x, y, dx: Math.cos(ang), dy: Math.sin(ang), speed: 1.5 + 1.1 * rnd(), life: 1.1 + 0.6 * rnd(), len: 0.7 + 0.5 * rnd() });
    count++;
  };

  // ---------------------------------------------------------- the telescope, built from surfaces
  const pts = []; // [x, y, z, nx, ny, nz, fl, layer] in the frame where the tube lies along +z
  const cyl = (z0, z1, r, n, fl, layer, ox = 0, oy = 0) => {
    const along = Math.max(2, Math.round(Math.sqrt((n * (z1 - z0)) / (2 * Math.PI * r))));
    const round = Math.max(6, Math.round(n / along));
    for (let a = 0; a < along; a++)
      for (let k = 0; k < round; k++) {
        const ph = (2 * Math.PI * (k + 0.5 * (a % 2))) / round;
        const c = Math.cos(ph), s = Math.sin(ph);
        pts.push([ox + r * c, oy + r * s, z0 + ((z1 - z0) * (a + 0.5)) / along, c, s, 0, fl, layer]);
      }
  };
  const disk = (z, r, n, nz, fl, layer, ox = 0, oy = 0) => {
    for (let k = 0; k < n; k++) {
      const rr = r * Math.sqrt((k + 0.5) / n), ph = k * 2.399963229728653;
      pts.push([ox + rr * Math.cos(ph), oy + rr * Math.sin(ph), z, 0, 0, nz, fl, layer]);
    }
  };
  const back = -0.42 * LEN, front = 0.58 * LEN;
  cyl(back, front - 0.24, RAD, 3600, 0, 0); // the tube
  cyl(front - 0.26, front, RAD * 1.18, 1100, 0, 0); // dew shield
  disk(front - 0.02, RAD * 1.12, 500, 1, 0.12, 2); // the lens, dark inside the shield
  disk(back, RAD, 350, -1, 0, 0); // back cap
  cyl(back - 0.14, back, 0.045, 300, 0, 0); // focuser
  // eyepiece: standing up from the back of the focuser, as on a star diagonal
  for (let a = 0; a < 10; a++)
    for (let k = 0; k < 22; k++) {
      const ph = (2 * Math.PI * k) / 22, c = Math.cos(ph), s = Math.sin(ph);
      pts.push([0.035 * c, 0.03 + (0.13 * (a + 0.5)) / 10, back - 0.1 + 0.035 * s, c, 0, s, 0, 0]);
    }
  cyl(back + 0.25, back + 0.62, 0.032, 420, 0, 0, 0, RAD + 0.075); // finder
  disk(back + 0.62, 0.03, 40, 1, 0.12, 2, 0, RAD + 0.075);
  cyl(-0.06, 0.06, 0.03, 120, 0, 0, 0, RAD + 0.03); // finder bracket
  const TUBE_END = pts.length;
  // mount head and tripod, fixed in the scene frame
  const fixed = [];
  const box = (cx, cy, cz, hx, hy, hz, n) => {
    const faces = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]];
    for (const [ax, sg] of faces) {
      const u = (ax + 1) % 3, v = (ax + 2) % 3, half = [hx, hy, hz];
      const m = Math.round(Math.sqrt(n / 6));
      for (let a = 0; a < m; a++)
        for (let b = 0; b < m; b++) {
          const p = [cx, cy, cz], nrm = [0, 0, 0];
          p[ax] += sg * half[ax];
          p[u] += half[u] * (2 * (a + 0.5) / m - 1);
          p[v] += half[v] * (2 * (b + 0.5) / m - 1);
          nrm[ax] = sg;
          fixed.push([...p, ...nrm, 0, 0]);
        }
    }
  };
  box(PIVOT[0], PIVOT[1] - 0.1, PIVOT[2], 0.07, 0.07, 0.07, 600); // mount head
  const top = [PIVOT[0], PIVOT[1] - 0.18, PIVOT[2]];
  const feet = [0.4, 2.5, 4.6].map((a) => [PIVOT[0] + 0.55 * Math.cos(a), GROUND, PIVOT[2] + 0.55 * Math.sin(a)]);
  const leg = (a, b, r, n) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d);
    const w = d.map((c) => c / L);
    const e1 = Math.abs(w[1]) < 0.9 ? [w[2], 0, -w[0]] : [1, 0, 0];
    const l1 = Math.hypot(...e1), u = e1.map((c) => c / l1);
    const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
    const along = Math.round(n / 8);
    for (let k = 0; k < along; k++)
      for (let j = 0; j < 8; j++) {
        const ph = (2 * Math.PI * j) / 8, c = Math.cos(ph), s = Math.sin(ph), f = (k + 0.5) / along;
        const nn = [u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s];
        fixed.push([a[0] + d[0] * f + r * nn[0], a[1] + d[1] * f + r * nn[1], a[2] + d[2] * f + r * nn[2], ...nn, 0, 0]);
      }
  };
  for (const f of feet) leg(top, f, 0.022, 440);
  // spreader: short struts joining the legs a third of the way down
  const mid = feet.map((f) => [top[0] + (f[0] - top[0]) * 0.4, top[1] + (f[1] - top[1]) * 0.4, top[2] + (f[2] - top[2]) * 0.4]);
  for (let k = 0; k < 3; k++) leg(mid[k], [top[0], mid[k][1], top[2]], 0.012, 120);
  // ground: a faint field of dots around the feet, thinning with distance
  for (let k = 0; k < 500; k++) {
    const r = 0.2 + 1.5 * Math.sqrt(rnd()), a = rnd() * 6.28;
    fixed.push([PIVOT[0] + r * Math.cos(a) * 1.3, GROUND, PIVOT[2] + r * Math.sin(a) * 0.6, 0, 1, 0, 0.12 + 0.1 * rnd(), 2]);
  }

  let az = 0, alt = 0;
  S.update = (t) => {
    // a photograph was chosen: from what is drawn now, head for it, and turn the tube to it
    if (pending) {
      from = { x: cur.x.slice(), y: cur.y.slice(), z: cur.z.slice(), b: cur.b.slice(), l: cur.l.slice() };
      to = photoTargets(pending.pic);
      title = pending.name;
      t0 = pending.instant ? -Infinity : t;
      azFrom = az; altFrom = alt;
      const dx = PHOTO_X - PIVOT[0], dy = PHOTO_Y - PIVOT[1], dz = 2.4 - PIVOT[2];
      azTo = Math.atan2(dx, dz); altTo = Math.atan2(dy, Math.hypot(dx, dz));
      pending = null;
    }
    const k = to ? Math.min(1, (t - t0) / MORPH) : 0;
    const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2, bump = Math.sin(Math.PI * k);
    if (to) { // the tube on the photo
      az = azFrom + (azTo - azFrom) * e;
      alt = altFrom + (altTo - altFrom) * e;
    } else { // the tube slews slowly, scanning the sky
      az = 0.95 + 0.38 * Math.sin(0.13 * t);
      alt = 0.62 + 0.16 * Math.sin(0.09 * t + 1);
    }
    const ca = Math.cos(az), sa = Math.sin(az), cl = Math.cos(alt), sl = Math.sin(alt);
    // tube frame: forward f, sideways r (horizontal), up u
    const f = [cl * sa, sl, cl * ca], r = [ca, 0, -sa], u = [-sl * sa, cl, -sl * ca];
    let idx = 0;
    for (let i = 0; i < TUBE_END; i++) {
      const [x, y, z, nx, ny, nz, fl, layer] = pts[i];
      const wx = PIVOT[0] + r[0] * x + u[0] * y + f[0] * z;
      const wy = PIVOT[1] + r[1] * x + u[1] * y + f[1] * z;
      const wz = PIVOT[2] + r[2] * x + u[2] * y + f[2] * z;
      put(S, idx++, wx, wy, wz, r[0] * nx + u[0] * ny + f[0] * nz, r[1] * nx + u[1] * ny + f[1] * nz, r[2] * nx + u[2] * ny + f[2] * nz, fl, layer);
    }
    for (const p of fixed) put(S, idx++, p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]);
    // the sky: stars, twinkling and wheeling; or the photograph; or on the way between
    const rot = 0.012 * t;
    for (let j = 0; j < POOL; j++) {
      let x, y, z, b, l;
      if (!to) {
        const st = sky[j % STARS];
        [x, y, z] = skyAt(st.u, st.v, rot);
        b = st.b * (0.75 + 0.25 * Math.sin(2.1 * t + st.ph));
        l = st.layer;
      } else if (k >= 1) {
        x = to.x[j]; y = to.y[j]; z = to.z[j]; b = to.b[j]; l = to.l[j];
      } else {
        x = from.x[j] + (to.x[j] - from.x[j]) * e + jit[3 * j] * bump;
        y = from.y[j] + (to.y[j] - from.y[j]) * e + jit[3 * j + 1] * bump;
        z = from.z[j] + (to.z[j] - from.z[j]) * e + jit[3 * j + 2] * bump * 0.3;
        b = from.b[j] + (to.b[j] - from.b[j]) * e;
        l = k < 0.5 ? from.l[j] : to.l[j];
      }
      cur.x[j] = x; cur.y[j] = y; cur.z[j] = z; cur.b[j] = b; cur.l[j] = l;
      put(S, idx++, x, y, z, 0, 0, 0, b, l);
    }
    // meteors: a bright head with a fading tail
    if (t >= nextMeteor) {
      if (meteors.length < METEORS) launch(t);
      nextMeteor = t + 0.9 + 1.8 * rnd();
    }
    for (let m = meteors.length - 1; m >= 0; m--) if (t - meteors[m].t0 > meteors[m].life) meteors.splice(m, 1);
    for (let m = 0; m < METEORS; m++) {
      const me = meteors[m];
      if (!me) {
        // an idle slot waits on the sky's first point, which is drawn first and so stays on top
        for (let q = 0; q < TRAIL; q++) put(S, idx++, cur.x[0], cur.y[0], cur.z[0], 0, 0, 0, 0.02, 2);
        continue;
      }
      const age = t - me.t0, fade = Math.min(1, age / 0.12) * Math.min(1, (me.life - age) / 0.25);
      const hx = me.x + me.dx * me.speed * age, hy = me.y + me.dy * me.speed * age;
      const tail = Math.min(me.len, me.speed * age);
      for (let k = 0; k < TRAIL; k++) {
        const f = k / (TRAIL - 1);
        put(S, idx++, hx - me.dx * tail * f, hy - me.dy * tail * f, 1.7, 0, 0, 0, Math.max(0.05, fade * (1 - 0.85 * f) ** 1.3), f < 0.6 ? 1 : 2);
      }
    }
    S.used = idx; // points drawn (must stay within N)
    park(S, idx, PIVOT[0], PIVOT[1] - 0.1, PIVOT[2]);
  };
  S.caption = () => `astrophotography   ${title ? `tracking: ${title}` : 'a refractor under the night sky'}   meteors: ${count}`;
  S.view = { spin: 0, yaw0: -0.35, sway: 0.12, pitch: 0.06, zoom: 1.08 };
  S.update(0);
  return S;
}
