import { Renderer, makeShape, buildVirion, buildCube, N, put, rng32 } from './ascii.js';
import { buildNightSky } from './astro.js';
import { buildCondense } from './particle-filter.js';
import { buildSpread } from './sir.js';
import { buildWorld, buildPosterior, buildSwissRoll, buildBloodCells } from './papers.js';
import { playSession, typeOnArrival } from './session.js';
import { setupMail } from './mail.js';
import { setupImgcat } from './imgcat.js';
import { profile, stages, stageShell, commands, contact, astro, sirNote, filterNote } from './content.js';
import { esc, contentHTML, pubsHTML } from './render.js';

// ------------------------------------------------------------ content
const $ = (id) => document.getElementById(id);
const firstSection = document.querySelector('section[data-scene]');
const filterOpensPage = firstSection.id === 'top';
const PAPERS = 2; // the Papers section's scene index
let paperTag = 'all', sceneIndex = Number(firstSection.dataset.scene); // the papers tab shown, and which section owns the scene
let shell = null; // the later sections' commands (see the end of this file)

function renderContent() {
  // the content (render.js; index.html already carries it when built by tools/build.mjs)
  for (const [id, html] of Object.entries(contentHTML())) $(id).innerHTML = html;
  setupMail($('mailForm'), $('mailStatus'), contact);
  $('filters').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    for (const x of $('filters').children) x.setAttribute('aria-pressed', x === b);
    $('pubs').innerHTML = pubsHTML(b.dataset.tag);
    paperTag = b.dataset.tag; // fig. 3 follows the tab
    shell?.retype('papers', commands.papers + (paperTag === 'all' ? '' : paperTag + '/'));
    if (sceneIndex === PAPERS) setScene(PAPERS);
  });
}
renderContent();

// ------------------------------------------------------------ scene
const pres = document.querySelectorAll('#scene pre'); // dim, base, accent, then the photo hues
const PRE_LAYER = [2, 0, 1, 3, 4, 5, 6, 7, 8]; // the renderer's layer each <pre> shows
const captionEl = $('caption');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = new Renderer();
const shapes = [buildCondense(), buildSpread(), buildVirion(), buildCube(), buildNightSky()];
// The Papers section (scene 2, fig. 3) shows a different scene for each topic tab.
const paperScenes = {
  all: buildWorld(),
  epi: shapes[2],
  bayes: buildPosterior(),
  ai: buildSwissRoll(),
  clin: buildBloodCells(),
};
const sceneFor = (i) => (i === PAPERS ? paperScenes[paperTag] || shapes[i] : shapes[i]);
const hero = shapes[0];
const scratch = makeShape();

let A = shapes[sceneIndex], B = A, e = 1;
let t = 0, last = 0, raf = 0;
let cw = 7, chh = 14, wide = true;
let mx = 0, my = 0, smx = 0, smy = 0;
let dragYaw = 0, dragPitch = 0, dragging = false, relax = false, lastX = 0, lastY = 0;
let press = null, dragMoved = false; // where the current press began; whether it has become a drag
const cur = { yaw: 0, pitch: 0.25, zoom: 1 };

// The fixed banner: the nav's height and where the banner ends, for the layout (CSS) and for
// the hero's scroll track. With the banner not fixed (phones, short screens), only the nav is.
const navEl = document.querySelector('.nav'), barEl = $('motd');
let motd = 0;
function measureBar() {
  const navH = navEl.offsetHeight;
  motd = navH + (getComputedStyle(barEl).position === 'sticky' ? barEl.offsetHeight : 0);
  document.documentElement.style.setProperty('--nav-h', navH + 'px');
  document.documentElement.style.setProperty('--motd', motd + 'px');
}
// Phones share one sticky figure. Its scene follows the section entering the
// reading area just below it. Wide screens draw the same scene beside the text.
const sceneEl = $('scene'), track = $('top'), mobileFigure = $('mobileFigure');
const sections = [...document.querySelectorAll('section[data-scene]')];
// Adjacent sections can share a figure. A new appearance later in the page
// gets the next number, including a return to an earlier scene.
const figureNumbers = new Map();
let figureNumber = 1;
sections.forEach((section, i) => {
  if (i && section.dataset.scene !== sections[i - 1].dataset.scene) figureNumber++;
  figureNumbers.set(section, figureNumber);
});
figureNumber = 1;
const navLinks = [...document.querySelectorAll('.nav nav a')];
const CAPTION_STRIP = 20;
function placeScene() {
  if (!wide) {
    if (sceneEl.parentNode !== mobileFigure) mobileFigure.append(sceneEl, captionEl);
  } else if (sceneEl.parentNode !== document.body) {
    document.body.prepend(sceneEl);
    document.body.append(captionEl);
  }
}
const dust = makeShape();
{
  const rnd = rng32(7);
  // wider than the window, so much of it flies in from outside; faint, so it reads as loose dots
  for (let i = 0; i < N; i++) put(dust, i, (rnd() * 2 - 1) * 2.6, (rnd() * 2 - 1) * 1.9, (rnd() * 2 - 1) * 1.6, 0, 0, 0, 0.05 + 0.12 * rnd(), 2);
}
// Keep the opening field on screen until the terminal submits ssh.
let awaitingTelescope = firstSection.id === 'about' && !still && scrollY === 0;
if (awaitingTelescope) {
  dust.view = { ...shapes[4].view };
  A = B = dust;
}
function syncMobileScene() {
  const edge = mobileFigure.getBoundingClientRect().bottom;
  let active = firstSection;
  for (const section of sections) {
    if (section.getBoundingClientRect().top > edge + 1) break;
    active = section;
  }
  showSection(active);
}
function measure() {
  measureBar();
  wide = innerWidth >= 900;
  placeScene();
  const probe = document.createElement('span');
  probe.textContent = 'M'.repeat(100);
  pres[0].appendChild(probe);
  const r = probe.getBoundingClientRect();
  cw = r.width / 100 || 7;
  chh = parseFloat(getComputedStyle(pres[0]).lineHeight) || 14;
  probe.remove();
  const w = wide ? innerWidth : sceneEl.clientWidth, h = wide ? innerHeight : sceneEl.clientHeight;
  R.resize(Math.max(20, Math.ceil(w / cw)), Math.max(10, Math.ceil(h / chh)));
  // Tell the hero how far the viewport extends, in its own units, so it can scatter across all of
  // it (narrow screens: across its window).
  if (!filterOpensPage && !termReady) return;
  if (wide) {
    const g = geom(hero.view.zoom);
    hero.setBounds(-g.cx / (g.scale * g.aspect), (R.cols - g.cx) / (g.scale * g.aspect), -(R.rows - g.cy) / g.scale, g.cy / g.scale);
  } else {
    const rows = (mobileFigure.offsetHeight - CAPTION_STRIP) / chh, g = geom(hero.view.zoom, rows);
    hero.setBounds(-R.cols / 2 / (g.scale * g.aspect), R.cols / 2 / (g.scale * g.aspect), -rows / 2 / g.scale, rows / 2 / g.scale);
  }
}

// Where the figure goes and how big: beside the text on wide screens; on narrow ones, centred in
// its window (the renderer is the window's size; rows: the height to fit, if not the renderer's).
function geom(zoom, rows = R.rows) {
  const aspect = chh / cw;
  if (wide) return { aspect, scale: Math.min(R.rows * 0.37, (R.cols * 0.23) / aspect) * zoom, cx: R.cols * 0.69, cy: R.rows * 0.5 };
  return { aspect, scale: Math.min(rows * 0.37, (R.cols * 0.46) / aspect) * zoom, cx: R.cols * 0.5, cy: R.rows * 0.5 };
}

const yawOf = (S) => S.view.yaw0 + S.view.spin * t + S.view.sway * Math.sin(t * 0.35);

function draw() {
  const k = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
  const ya = yawOf(A), yb = yawOf(B);
  const d = ((((yb - ya + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  cur.yaw = ya + d * k;
  cur.pitch = A.view.pitch + (B.view.pitch - A.view.pitch) * k;
  cur.zoom = A.view.zoom + (B.view.zoom - A.view.zoom) * k;
  const g = geom(cur.zoom), par = B.view.par ?? 1;
  R.render(A, B, e, { yaw: cur.yaw + (smx * 0.35 + dragYaw) * par, pitch: cur.pitch + (smy * 0.2 + dragPitch) * par, cx: g.cx, cy: g.cy, scale: g.scale, aspect: g.aspect });
  // one <pre> per colour layer: dim, ink and accent first, then the photo hues (see ascii.js)
  const text = R.toStrings();
  for (let k = 0; k < pres.length; k++) {
    const t = text[PRE_LAYER[k]];
    if (t || pres[k].firstChild) pres[k].textContent = t;
  }
  const description = B.caption();
  const cap = description ? `fig. ${figureNumber}  ${description}` : '';
  if (captionEl.textContent !== cap) captionEl.textContent = cap;
  syncStory();
  syncTip();
}

// ---- hero interaction: scrolling through the #top track (track, above) runs the particle filter
let shownStage = -1;
function syncStory() {
  const s = hero.state();
  if (s.stage === shownStage) return;
  shownStage = s.stage;
  syncTerm(s.stage, s.total);
  const bar = `[${'#'.repeat(s.stage)}${'.'.repeat(s.total - s.stage)}]`;
  $('stageHint').textContent = s.resolved ? `${bar}  resolved` : `${bar}  scroll to resample`;
}
// ---- fig. 1 in the hero's terminal: after the login (see the end of this file), each stage
// is a command, with its stage number as a comment, whose output is the stage text, and the
// prompt waits for the next. Moving forward types the new command out; moving back rewinds at
// once. The screen has a fixed height and keeps its newest lines in view, so earlier commands
// scroll up and fade as in a terminal. Screen readers get the plain text instead.
const termEl = $('term');
let termStage = -1, typeTimer = 0, termReady = false;
const PS = `<span class="ps">${esc(profile.prompt)}</span> `;
const cmdOf = (s, total) => [s === 0 ? stageShell.first : stageShell.next, `# stage ${s + 1}/${total + 1}`];
const cmdLength = (s, total) => { const [cmd, note] = cmdOf(s, total); return cmd.length + 2 + note.length; };
const outOf = (s) => `<p class="out">${esc(stages[Math.min(s, stages.length - 1)])}</p>`;
// One command line with its first n characters typed (Infinity: all of it).
function cmdRow(s, total, n) {
  const [cmd, note] = cmdOf(s, total);
  const shown = n - cmd.length - 2;
  const typing = n < cmdLength(s, total);
  return `<p class="ln">${PS}<span class="cmd">${esc(cmd.slice(0, n))}</span>` +
    (shown > 0 ? `  <span class="cm">${esc(note.slice(0, shown))}</span>` : '') +
    (typing ? '<span class="caret solid"></span>' : '') + '</p>';
}
function termHTML(s, total, n) {
  let html = '';
  for (let k = 0; k < s; k++) html += `<div class="old">${cmdRow(k, total, Infinity)}${outOf(k)}</div>`;
  html += cmdRow(s, total, n);
  if (n >= cmdLength(s, total)) html += outOf(s) + `<p class="ln">${PS}<span class="caret"></span></p>`;
  return html;
}
function showTerm(html) {
  termEl.innerHTML = html;
  termEl.scrollTop = termEl.scrollHeight; // keep the newest lines in view
  termEl.classList.toggle('scrolled', termEl.scrollTop > 0);
}
function syncTerm(s, total) {
  if (!termReady) return;
  $('stageLive').textContent = `Stage ${s + 1} of ${total + 1}. ${stages[Math.min(s, stages.length - 1)]}`;
  if (s === termStage) return;
  const forward = s > termStage;
  termStage = s;
  clearInterval(typeTimer);
  if (!forward || still) { showTerm(termHTML(s, total, Infinity)); return; }
  let n = 0;
  const len = cmdLength(s, total);
  showTerm(termHTML(s, total, 0));
  typeTimer = setInterval(() => {
    showTerm(termHTML(s, total, ++n));
    if (n >= len) clearInterval(typeTimer);
  }, 32);
}
// ---- fig. 2's epidemic curve: a text histogram of new infections per week, shown in the
// hover note over fig. 2 (see syncTip).
const spread = shapes[1];
const niceCeil = (v) => {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 5, 10].find((m) => m * p >= v) * p;
};
const short = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v));
function histHTML({ day, days, inc }) {
  const WEEK = 7, ROWS = 6, bw = 1; // bw: characters per bar (1 keeps the note compact)
  const weeks = Math.ceil(days / WEEK);
  const bins = new Array(weeks).fill(0);
  // day 0 holds the starting cases; they count in week 1, so the bars add up to I + R
  for (let d = 0; d <= day; d++) bins[d && Math.floor((d - 1) / WEEK)] += inc[d];
  const now = day > 0 ? Math.floor((day - 1) / WEEK) : -1;
  const top = niceCeil(Math.max(100, ...bins));
  const lines = ['new infections per week'];
  for (let r = ROWS; r >= 1; r--) {
    let row = '';
    for (let w = 0; w < weeks; w++) {
      const v = (bins[w] / top) * ROWS;
      // '#' full row, ':' half; any week with new infections shows at least a '.'
      const ch = (v >= r ? '#' : v >= r - 0.5 ? ':' : r === 1 && bins[w] > 0 ? '.' : ' ').repeat(bw);
      row += ch.trim() ? `<span class="${w === now ? 'now' : 'bar'}">${ch}</span>` : ch;
    }
    lines.push(`${(r === ROWS ? short(top) : '').padStart(4)} |${row}`);
  }
  lines.push(`   0 +${'-'.repeat(weeks * bw)}`);
  // day labels under the axis, placed by column
  const axis = Array(weeks * bw + 10).fill(' ');
  for (const [d, text] of [[0, '0'], [100, '100'], [days, `${days} days`]]) {
    const at = Math.round((d / WEEK) * bw);
    for (let k = 0; k < text.length; k++) axis[at + k] = text[k];
  }
  lines.push(`      ${axis.join('').trimEnd()}`);
  return lines.join('\n');
}

function syncScroll() {
  // the panel is pinned from when the track's top reaches the banner until its bottom leaves
  // (phones have no track: there the filter plays by itself, see autoplay)
  if (wide) {
    const span = track.offsetHeight - innerHeight + motd, r = track.getBoundingClientRect();
    hero.setProgress(span > 0 ? (motd - r.top) / span : 1, still);
  } else {
    if (still) hero.setProgress(1, true);
    syncMobileScene();
  }
  if (still && B === hero) { hero.snap(); hero.update(t, 0); draw(); }
}

// ---- hover note: over a figure's particles, a note appears (mouse only). Over fig. 1 it is
// the filter note, beside the cursor; over fig. 2, the model note and the epidemic curve so
// far, redrawn as days pass and docked beside the figure (without a mouse, the panels show
// the notes). It shows within a few cells of a drawn particle,
// outside the text, and lingers briefly so gaps in a sparse field do not make it flicker.
const tip = $('tip');
const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
let tipX = -1, tipY = -1, tipOn = false, tipHit = 0, tipKey = '';
function nearParticles(x, y) {
  const c0 = Math.floor(x / cw), r0 = Math.floor(y / chh);
  for (let r = Math.max(0, r0 - 1); r <= Math.min(R.rows - 1, r0 + 1); r++)
    for (let c = Math.max(0, c0 - 3); c <= Math.min(R.cols - 1, c0 + 3); c++) if (R.ch[r * R.cols + c]) return true;
  return false;
}
// The point drawn at (x, y), or at the nearest drawn cell a little around it; -1 if none.
function pointAt(x, y) {
  const o = sceneEl.getBoundingClientRect();
  const c0 = Math.floor((x - o.left) / cw), r0 = Math.floor((y - o.top) / chh);
  let best = -1, bd = Infinity;
  for (let r = Math.max(0, r0 - 1); r <= Math.min(R.rows - 1, r0 + 1); r++)
    for (let c = Math.max(0, c0 - 2); c <= Math.min(R.cols - 1, c0 + 2); c++) {
      const k = r * R.cols + c, d = (c - c0) ** 2 + (2 * (r - r0)) ** 2;
      if (R.ch[k] && d < bd) { bd = d; best = R.id[k]; }
    }
  return best;
}
// A click (or tap) on fig. 2 starts a new epidemic from the person there. With animation
// off, the frame shows it 45 days on.
function seedFrom(x, y) {
  if (B !== spread || e < 1) return;
  if (spread.seedAt(pointAt(x, y), still ? 45 : 0) && still) draw();
}
function syncTip() {
  const fig = B === hero ? 'pf' : B === spread ? 'sir' : '';
  let hit = false;
  if (canHover && tipX >= 0 && !(dragging && dragMoved) && fig && e >= 1) {
    const el = document.elementFromPoint(tipX, tipY);
    hit = !!el && !el.closest('.panel, .nav') && nearParticles(tipX, tipY);
  }
  const now = performance.now();
  if (hit) tipHit = now;
  const on = hit || (tipOn && now - tipHit < 250);
  if (on !== tipOn) { tipOn = on; tip.classList.toggle('on', on); }
  document.body.classList.toggle('seed', on && fig === 'sir');
  if (!on) { dock = -1; return; } // the next hover chooses its spot afresh
  const curve = fig === 'sir' && spread.history();
  const key = curve ? `sir:${curve.run}:${curve.day}` : 'pf';
  if (key !== tipKey) {
    tipKey = key;
    tip.classList.toggle('chart', !!curve);
    if (curve) tip.innerHTML = `<p class="tip-text">${esc(sirNote.text)}</p><pre class="tip-chart">${histHTML(curve)}</pre><p class="tip-hint">${esc(sirNote.hint)}</p>`;
    else tip.textContent = filterNote.text;
  }
  const w = tip.offsetWidth, h = tip.offsetHeight;
  // fig. 2's note is large, so it docks where it hides the least of the figure; fig. 1's
  // sits beside the cursor, flipped to the other side near the right and bottom edges
  const [x, y] = (curve && dockSpot(w, h)) || [
    Math.max(8, tipX + 16 + w > innerWidth - 8 ? tipX - 12 - w : tipX + 16),
    Math.max(8, tipY + 20 + h > innerHeight - 8 ? tipY - 12 - h : tipY + 20),
  ];
  tip.style.transform = `translate(${x}px, ${y}px)`;
}
// Docking: try spots around the figure and in the right-hand corners, and take the one
// covering the fewest drawn cells (covering the text panel rules a spot out). The current
// spot is kept unless another is clearly better, so the note does not hop as the figure sways.
const NAV_H = 52, CAPTION_H = 36; // room kept clear for the nav and the caption
let dock = -1;
function dockSpot(w, h) {
  const box = drawnBox();
  if (!box) return null;
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  const maxX = innerWidth - w - 8, maxY = innerHeight - CAPTION_H - h;
  const fit = ([x, y]) => [Math.min(maxX, Math.max(8, x)), Math.min(maxY, Math.max(NAV_H, y))];
  const spots = [
    [cx - w / 2, box.y0 - h - 14], [cx - w / 2, box.y1 + 14], // above, below
    [box.x1 + 14, cy - h / 2], [box.x0 - w - 14, cy - h / 2], // right, left
    [maxX, NAV_H], [maxX, maxY], // top-right and bottom-right corners
  ].map(fit);
  const panels = [...document.querySelectorAll('.panel')].map((p) => p.getBoundingClientRect())
    .filter((r) => r.bottom > 0 && r.top < innerHeight);
  const cost = ([x, y]) => covered(x, y, w, h) +
    (panels.some((r) => x < r.right && x + w > r.left && y < r.bottom && y + h > r.top) ? 1e6 : 0);
  const costs = spots.map(cost);
  let best = costs.indexOf(Math.min(...costs));
  if (dock >= 0 && costs[dock] <= costs[best] + 20) best = dock;
  dock = best;
  return spots[best];
}
// Drawn scene cells inside a screen rectangle (px).
function covered(x, y, w, h) {
  let n = 0;
  const c1 = Math.min(R.cols - 1, Math.floor((x + w) / cw)), r1 = Math.min(R.rows - 1, Math.floor((y + h) / chh));
  for (let r = Math.max(0, Math.floor(y / chh)); r <= r1; r++)
    for (let c = Math.max(0, Math.floor(x / cw)); c <= c1; c++) if (R.ch[r * R.cols + c]) n++;
  return n;
}
// Screen box (px) around everything drawn in the scene this frame.
function drawnBox() {
  let c0 = R.cols, c1 = -1, r0 = R.rows, r1 = -1;
  for (let r = 0; r < R.rows; r++)
    for (let c = 0, k = r * R.cols; c < R.cols; c++, k++)
      if (R.ch[k]) { if (c < c0) c0 = c; if (c > c1) c1 = c; if (r < r0) r0 = r; if (r > r1) r1 = r; }
  return c1 < 0 ? null : { x0: c0 * cw, x1: (c1 + 1) * cw, y0: r0 * chh, y1: (r1 + 1) * chh };
}
addEventListener('pointermove', (ev) => {
  if (ev.pointerType === 'touch') return;
  tipX = ev.clientX; tipY = ev.clientY;
  syncTip();
}, { passive: true });
document.addEventListener('mouseout', (ev) => { if (!ev.relatedTarget) { tipX = -1; syncTip(); } });

function setScene(i) {
  sceneIndex = i;
  document.body.classList.toggle('night', i === 4); // night falls at the bottom of the page, under fig. 5
  if (awaitingTelescope && i === 4) return;
  awaitingTelescope = false;
  const next = sceneFor(i);
  if (!next || next === B) return;
  relax = true; // each new scene starts from its own default angle
  if (still) { dragYaw = dragPitch = 0; }
  if (still) { A = B = next; e = 1; draw(); return; }
  if (e < 1) {
    R.snapshot(A, B, e, scratch);
    scratch.view = { spin: 0, sway: 0, yaw0: cur.yaw, pitch: cur.pitch, zoom: cur.zoom };
    A = scratch;
  } else {
    A = B;
  }
  B = next;
  e = 0;
}

// Phones: the filter resolves over 10 s, holds, rewinds and starts again, counting from the end
// of the login (playFrom).
let playFrom = Infinity;
function autoplay(t) {
  const F = 10, H = 5, B = 2.5, REST = 1.5, x = t % (F + H + B + REST);
  return x < F ? x / F : x < F + H ? 1 : x < F + H + B ? 1 - (x - F - H) / B : 0;
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (now - last < 32) return; // ~30 fps is plenty for characters
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  t += dt;
  if (e < 1) e = Math.min(1, e + dt / 1.4);
  if (!wide && termReady) hero.setProgress(autoplay(t - playFrom), false); // scattered until the login is over
  smx += (mx - smx) * 0.08;
  smy += (my - smy) * 0.08;
  if (relax && !dragging) { dragYaw *= 0.88; dragPitch *= 0.88; if (Math.abs(dragYaw) + Math.abs(dragPitch) < 0.002) { dragYaw = dragPitch = 0; relax = false; } }
  B.update(t, dt);
  if (e < 1 && A !== scratch) A.update(t, dt);
  draw();
}

function start() { if (!still && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
function stop() { cancelAnimationFrame(raf); raf = 0; }

measure();
syncScroll();
// The filter runs in a worker; with animation off, nothing else would show its result.
hero.onready = () => { if (still && B === hero) { hero.update(t, 0); draw(); } };
hero.snap(); // a reload part-way down the page should not replay the filter from scratch
hero.update(t, 0);
draw();
start();

let rz = 0;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { measure(); syncScroll(); draw(); }, 80); });
addEventListener('scroll', syncScroll, { passive: true });
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
addEventListener('pointermove', (ev) => {
  mx = (ev.clientX / innerWidth) * 2 - 1;
  my = (ev.clientY / innerHeight) * 2 - 1;
}, { passive: true });
// Drag on empty space (anywhere outside the text and nav) to rotate the model.
// A press that ends within a few pixels of where it began is a click (see seedFrom); one
// that moves further is a drag. Touch drags rotate only in a figure's window (phones), and
// only sideways: the window leaves vertical swipes to the page (touch-action: pan-y), which
// then cancels the drag. Elsewhere a touch only taps and a touch drag scrolls.
addEventListener('pointerdown', (ev) => {
  const inWindow = !!ev.target.closest('.fig-window');
  if (ev.button !== 0 || (ev.target.closest('.panel, .nav') && !inWindow)) return;
  press = { x: ev.clientX, y: ev.clientY, t: performance.now() };
  if (ev.pointerType === 'touch' && !inWindow) return;
  dragging = true; dragMoved = false; relax = false; lastX = ev.clientX; lastY = ev.clientY;
  document.body.classList.add('dragging');
  ev.preventDefault();
});
addEventListener('pointermove', (ev) => {
  if (!dragging) return;
  if (press && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > 5) dragMoved = true;
  dragYaw -= (ev.clientX - lastX) * 0.008;
  dragPitch = Math.max(-1.3, Math.min(1.3, dragPitch + (ev.clientY - lastY) * 0.008));
  lastX = ev.clientX; lastY = ev.clientY;
  if (still) draw();
});
const endDrag = (ev) => {
  const click = ev.type === 'pointerup' && press && performance.now() - press.t < 600 &&
    Math.hypot(ev.clientX - press.x, ev.clientY - press.y) <= 5;
  dragging = false; dragMoved = false; press = null;
  document.body.classList.remove('dragging');
  if (click) seedFrom(ev.clientX, ev.clientY);
};
addEventListener('pointerup', endDrag);
addEventListener('pointercancel', endDrag);

if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); draw(); });

// ---- the astrophotographs: ls -l, then imgcat (js/imgcat.js), drawn when the section prints
// The photo on show also hangs on fig. 5's sky, behind the telescope.
const nightSky = shapes[4];
const imgcat = setupImgcat({
  list: $('astroList'), block: $('imgcat'), photos: astro, first: 'moon-hdr.jpg', prompt: profile.prompt, still,
  onPhoto: (pic, p) => {
    if (!nightSky.setPhoto) return; // an older astro.js (a stale cache)
    nightSky.setPhoto(pic, p.title, still);
    if (still && B === nightSky) { nightSky.update(t, 0); draw(); }
  },
});

// ---- the later sections: each types its command as it comes into view, then prints.
shell = typeOnArrival({
  items: [...document.querySelectorAll('.cmdline')].map((line) => ({
    key: line.dataset.cmd, section: line.closest('section'), line, command: commands[line.dataset.cmd],
  })),
  prompt: profile.prompt,
  still,
  onShow: (el) => {
    if (el.id === 'imgcat') imgcat.start();
  },
});

function startFilter() {
  termReady = true;
  if (!filterOpensPage) measure();
  playFrom = t;
  const s = hero.state();
  syncTerm(s.stage, s.total);
}

playSession({
  hero: filterOpensPage ? track.querySelector('.hero') : firstSection,
  ssh: $('sshLine'), gap: $('sshGap'), rows: [...document.querySelectorAll('#name .banner > span')],
  line: $('line'), last: $('lastLogin'),
  local: profile.login.local, command: profile.login.command, tagline: profile.line,
  still,
  onCommand: () => {
    if (!awaitingTelescope) return;
    awaitingTelescope = false;
    setScene(4);
  },
  onDone: () => {
    shell.observeArrivals();
    if (filterOpensPage) {
      startFilter();
    } else {
      const arrival = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        arrival.disconnect();
        startFilter();
      }, { rootMargin: '0px 0px -30% 0px' });
      arrival.observe(track);
    }
  },
});

function showSection(section) {
  figureNumber = figureNumbers.get(section);
  setScene(Number(section.dataset.scene));
  for (const link of navLinks) link.classList.toggle('on', link.hash === '#' + section.id);
}

// Wide screens follow the section at mid-screen. Phones use the sticky figure's lower edge.
const io = new IntersectionObserver((entries) => {
  if (!wide) return;
  for (const entry of entries) if (entry.isIntersecting) showSection(entry.target);
}, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
sections.forEach((section) => io.observe(section));
