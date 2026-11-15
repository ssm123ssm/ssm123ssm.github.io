import { Renderer, buildVirion, buildCube } from '../js/ascii.js';
import { buildSpread } from '../js/sir.js';
import { buildCondense } from '../js/particle-filter.js';

const cols = +process.argv[2] || 110, rows = +process.argv[3] || 44;
const R = new Renderer();
R.resize(cols, rows);
const hero = buildCondense();
const hb = cols / 2 / (rows * 0.4 * 2), vb = rows / 2 / (rows * 0.4);
hero.setBounds(-hb, hb, -vb, vb);
hero.setProgress(1);
hero.snap();
const shapes = [hero, buildSpread(), buildVirion(), buildCube()];
for (const S of shapes) {
  for (let t = 0; t < 8; t += 0.1) S.update(t, 0.1);
  const v = S.view;
  R.render(S, S, 1, { yaw: v.yaw0 + 0.4 * (v.spin ? 1 : 0), pitch: v.pitch, cx: cols / 2, cy: rows / 2, scale: rows * 0.4, aspect: 2 });
  const [a, b, c] = R.toStrings();
  let merged = '';
  for (let i = 0; i < a.length; i++) merged += a[i] !== ' ' ? a[i] : b[i] !== ' ' ? b[i] : c[i];
  console.log(merged);
  console.log(S.caption());
  console.log('accent cells:', [...b].filter((x) => x !== ' ' && x !== '\n').length);
}
