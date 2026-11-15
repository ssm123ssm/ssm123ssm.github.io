import { Renderer, makeShape, buildVirion, buildCube, N, put, rng32 } from './ascii.js';
import { buildNightSky } from './astro.js';
import { buildCondense } from './particle-filter.js';
import { buildSpread } from './sir.js';
import { buildWorld, buildPosterior, buildSwissRoll, buildBloodCells } from './papers.js';
import { playSession, typeOnArrival } from './session.js';
import { setupMail } from './mail.js';
import { setupImgcat } from './imgcat.js';
import { profile, spotlight, stages, stageShell, commands, filterNote, sirNote, themes, pubs, tagNames, projects, awards, contact, astro } from './content.js';

const $ = (id) => document.getElementById(id);
const PAPERS = 2;
let paperTag = 'all', sceneIndex = 0;
let shell = null;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ext = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

function renderContent() {
  const cols = Math.max(...profile.banner.map((r) => r.length));
  $('name').innerHTML = `<span class="sr-only">${esc(profile.name)}</span>` +
    `<span class="banner" aria-hidden="true" style="--cols:${cols}">` +
    profile.banner.map((r) => `<span>${esc(r)}</span>`).join('') + '</span>';
  $('line').textContent = profile.line;
  const links = profile.links.map((l) => ext(l.url, l.label)).join('');
  $('links2').innerHTML = links;

  const sp = spotlight;
  $('spot').innerHTML =
    `<p class="tag">${esc(sp.label)}</p><h2 class="spot-title">${esc(sp.title)}</h2>` +
    `<p class="m">${esc(sp.authors)}<br>${esc(sp.venue)}</p>` +
    (sp.prize ? `<p class="prize"><span class="mark" aria-hidden="true">*</span>${ext(sp.prize.url, sp.prize.label)}<br><span class="m">${esc(sp.prize.note)}</span></p>` : '') +
    `<p>${esc(sp.text)}</p>` +
    `<p class="links">${sp.links.map((l) => ext(l.url, l.label)).join('')}</p>`;

  const note = (n) => `<span class="fig-text">${esc(n.text)}${n.touch ? ' ' + esc(n.touch) : ''}</span> ${n.links.map((l) => ext(l.url, l.label)).join(' ')}`;
  $('filterNote').innerHTML = note(filterNote);
  $('sirNote').innerHTML = note(sirNote);

  $('themes').innerHTML = themes
    .map((t) => `<div class="theme"><h3>${esc(t.title)}</h3>${t.fields ? `<p class="fields">${t.fields.map(esc).join(' / ')}</p>` : ''}<p>${esc(t.text)}</p></div>`)
    .join('');

  const tags = ['all', ...new Set(pubs.map((p) => p.tag))];
  $('filters').innerHTML = tags
    .map((t) => `<button type="button" data-tag="${t}" aria-pressed="${t === 'all'}">${esc(tagNames[t] || t)}</button>`)
    .join('');
  const drawPubs = (tag) => {
    $('pubs').innerHTML = pubs
      .filter((p) => tag === 'all' || p.tag === tag)
      .map((p) => {
        const url = p.url || `https://scholar.google.com/scholar?q=${encodeURIComponent('"' + p.t + '"')}`;
        const c = p.cites ? ` / <span class="c">cited ${p.cites}</span>` : '';
        return `<li><span class="y">${p.y}</span><div><a class="t" href="${esc(url)}" target="_blank" rel="noopener">${esc(p.t)}</a><span class="m">${esc(p.a)}<br>${esc(p.v)}${c}</span></div></li>`;
      })
      .join('');
  };
  drawPubs('all');
  $('filters').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    for (const x of $('filters').children) x.setAttribute('aria-pressed', x === b);
    drawPubs(b.dataset.tag);
    paperTag = b.dataset.tag;
    shell?.retype('papers', commands.papers + (paperTag === 'all' ? '' : paperTag + '/'));
    if (sceneIndex === PAPERS) setScene(PAPERS);
  });

  $('projectList').innerHTML = projects
    .map((p) => {
      const go = [p.live && ext(p.live, 'Live site'), p.code && ext(p.code, 'Source'), ...(p.links || []).map((l) => ext(l.url, l.label))].filter(Boolean).join('');
      return `<li><div class="head"><h3>${esc(p.name)}</h3><span class="stack">${esc(p.stack)}</span></div><p>${esc(p.text)}</p><div class="go links">${go}</div></li>`;
    })
    .join('');

  $('awardList').innerHTML = awards
    .map((a) => `<li><span class="y">${esc(a.y)}</span><div>${a.url ? `<a class="t" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>` : `<span class="t">${esc(a.name)}</span>`}<span class="m">${esc(a.by)}</span></div></li>`)
    .join('');

  $('aboutText').innerHTML = esc(profile.about).replace('{lab}', ext(profile.lab.url, profile.lab.label));
  $('background').textContent = profile.background;
  $('mailIntro').textContent = contact.intro;
  setupMail($('mailForm'), $('mailStatus'), contact);
  $('hobby').innerHTML = esc(profile.hobby).replace(/\{([^}]+)\}/, '<a href="#astro">$1</a>');
}
renderContent();

const pres = document.querySelectorAll('#scene pre');
const PRE_LAYER = [2, 0, 1, 3, 4, 5, 6, 7, 8];
const captionEl = $('caption');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = new Renderer();
const shapes = [buildCondense(), buildSpread(), buildVirion(), buildCube(), buildNightSky()];
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

let A = shapes[0], B = shapes[0], e = 1;
let t = 0, last = 0, raf = 0;
let cw = 7, chh = 14, wide = true;
let mx = 0, my = 0, smx = 0, smy = 0;
let dragYaw = 0, dragPitch = 0, dragging = false, relax = false, lastX = 0, lastY = 0;
let press = null, dragMoved = false;
const cur = { yaw: 0, pitch: 0.25, zoom: 1 };

const navEl = document.querySelector('.nav'), barEl = $('motd');
let motd = 0;
function measureBar() {
  const navH = navEl.offsetHeight;
  motd = navH + (getComputedStyle(barEl).position === 'sticky' ? barEl.offsetHeight : 0);
  document.documentElement.style.setProperty('--nav-h', navH + 'px');
  document.documentElement.style.setProperty('--motd', motd + 'px');
}
const sceneEl = $('scene'), track = $('top');
const winOf = new Map([...document.querySelectorAll('section[data-scene]')].map((s) => [s, s.querySelector('.fig-window')]));
let host = track;
const CAPTION_STRIP = 20;
function placeScene() {
  const into = wide ? null : winOf.get(host);
  if (into) { if (sceneEl.parentNode !== into) into.append(sceneEl, captionEl); }
  else if (sceneEl.parentNode !== document.body) { document.body.prepend(sceneEl); document.body.append(captionEl); }
}
function shown(sec) {
  const w = winOf.get(sec);
  if (!w.offsetHeight) return -1;
  const r = w.getBoundingClientRect();
  return Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
}
const dust = makeShape();
{
  const rnd = rng32(7);
  for (let i = 0; i < N; i++) put(dust, i, (rnd() * 2 - 1) * 2.6, (rnd() * 2 - 1) * 1.9, (rnd() * 2 - 1) * 1.6, 0, 0, 0, 0.05 + 0.12 * rnd(), 2);
}
function assemble(sec) {
  if (wide || still || shown(sec) <= 0) return;
  if (host !== sec) { host = sec; measure(); }
  setScene(+sec.dataset.scene);
  dust.view = { ...B.view };
  A = dust;
  e = 0;
  draw();
}
function pickWindow() {
  let best = host, most = shown(host);
  for (const sec of winOf.keys()) { const h = shown(sec); if (h > most + 40) { best = sec; most = h; } }
  if (best === host || most <= 0) return;
  host = best;
  measure();
  setScene(+best.dataset.scene);
  draw();
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
  if (wide) {
    const g = geom(hero.view.zoom);
    hero.setBounds(-g.cx / (g.scale * g.aspect), (R.cols - g.cx) / (g.scale * g.aspect), -(R.rows - g.cy) / g.scale, g.cy / g.scale);
  } else {
    const rows = (winOf.get(track).offsetHeight - CAPTION_STRIP) / chh, g = geom(hero.view.zoom, rows);
    hero.setBounds(-R.cols / 2 / (g.scale * g.aspect), R.cols / 2 / (g.scale * g.aspect), -rows / 2 / g.scale, rows / 2 / g.scale);
  }
}

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
  const text = R.toStrings();
  for (let k = 0; k < pres.length; k++) {
    const t = text[PRE_LAYER[k]];
    if (t || pres[k].firstChild) pres[k].textContent = t;
  }
  const cap = B.caption();
  if (captionEl.textContent !== cap) captionEl.textContent = cap;
  syncStory();
  syncTip();
}

let shownStage = -1;
function syncStory() {
  const s = hero.state();
  if (s.stage === shownStage) return;
  shownStage = s.stage;
  syncTerm(s.stage, s.total);
  const bar = `[${'#'.repeat(s.stage)}${'.'.repeat(s.total - s.stage)}]`;
  $('stageHint').textContent = s.resolved ? `${bar}  resolved` : `${bar}  scroll to resample`;
}
const termEl = $('term');
let termStage = -1, typeTimer = 0, termReady = false;
const PS = `<span class="ps">${esc(profile.prompt)}</span> `;
const cmdOf = (s, total) => [s === 0 ? stageShell.first : stageShell.next, `# stage ${s + 1}/${total + 1}`];
const cmdLength = (s, total) => { const [cmd, note] = cmdOf(s, total); return cmd.length + 2 + note.length; };
const outOf = (s) => `<p class="out">${esc(stages[Math.min(s, stages.length - 1)])}</p>`;
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
  termEl.scrollTop = termEl.scrollHeight;
  termEl.classList.toggle('scrolled', termEl.scrollTop > 0);
}
function syncTerm(s, total) {
  $('stageLive').textContent = `Stage ${s + 1} of ${total + 1}. ${stages[Math.min(s, stages.length - 1)]}`;
  if (!termReady || s === termStage) return;
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
const spread = shapes[1];
const niceCeil = (v) => {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 5, 10].find((m) => m * p >= v) * p;
};
const short = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v));
function histHTML({ day, days, inc }) {
  const WEEK = 7, ROWS = 6, bw = 1;
  const weeks = Math.ceil(days / WEEK);
  const bins = new Array(weeks).fill(0);
  for (let d = 0; d <= day; d++) bins[d && Math.floor((d - 1) / WEEK)] += inc[d];
  const now = day > 0 ? Math.floor((day - 1) / WEEK) : -1;
  const top = niceCeil(Math.max(100, ...bins));
  const lines = ['new infections per week'];
  for (let r = ROWS; r >= 1; r--) {
    let row = '';
    for (let w = 0; w < weeks; w++) {
      const v = (bins[w] / top) * ROWS;
      const ch = (v >= r ? '#' : v >= r - 0.5 ? ':' : r === 1 && bins[w] > 0 ? '.' : ' ').repeat(bw);
      row += ch.trim() ? `<span class="${w === now ? 'now' : 'bar'}">${ch}</span>` : ch;
    }
    lines.push(`${(r === ROWS ? short(top) : '').padStart(4)} |${row}`);
  }
  lines.push(`   0 +${'-'.repeat(weeks * bw)}`);
  const axis = Array(weeks * bw + 10).fill(' ');
  for (const [d, text] of [[0, '0'], [100, '100'], [days, `${days} days`]]) {
    const at = Math.round((d / WEEK) * bw);
    for (let k = 0; k < text.length; k++) axis[at + k] = text[k];
  }
  lines.push(`      ${axis.join('').trimEnd()}`);
  return lines.join('\n');
}

function syncScroll() {
  if (wide) {
    const span = track.offsetHeight - innerHeight + motd, r = track.getBoundingClientRect();
    hero.setProgress(span > 0 ? (motd - r.top) / span : 1, still);
  } else {
    if (still) hero.setProgress(1, true);
    pickWindow();
  }
  if (still && B === hero) { hero.snap(); hero.update(t, 0); draw(); }
}

const tip = $('tip');
const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
let tipX = -1, tipY = -1, tipOn = false, tipHit = 0, tipKey = '';
function nearParticles(x, y) {
  const c0 = Math.floor(x / cw), r0 = Math.floor(y / chh);
  for (let r = Math.max(0, r0 - 1); r <= Math.min(R.rows - 1, r0 + 1); r++)
    for (let c = Math.max(0, c0 - 3); c <= Math.min(R.cols - 1, c0 + 3); c++) if (R.ch[r * R.cols + c]) return true;
  return false;
}
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
  if (!on) { dock = -1; return; }
  const curve = fig === 'sir' && spread.history();
  const key = curve ? `sir:${curve.run}:${curve.day}` : 'pf';
  if (key !== tipKey) {
    tipKey = key;
    tip.classList.toggle('chart', !!curve);
    if (curve) tip.innerHTML = `<p class="tip-text">${esc(sirNote.text)}</p><pre class="tip-chart">${histHTML(curve)}</pre><p class="tip-hint">${esc(sirNote.hint)}</p>`;
    else tip.textContent = filterNote.text;
  }
  const w = tip.offsetWidth, h = tip.offsetHeight;
  const [x, y] = (curve && dockSpot(w, h)) || [
    Math.max(8, tipX + 16 + w > innerWidth - 8 ? tipX - 12 - w : tipX + 16),
    Math.max(8, tipY + 20 + h > innerHeight - 8 ? tipY - 12 - h : tipY + 20),
  ];
  tip.style.transform = `translate(${x}px, ${y}px)`;
}
const NAV_H = 52, CAPTION_H = 36;
let dock = -1;
function dockSpot(w, h) {
  const box = drawnBox();
  if (!box) return null;
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  const maxX = innerWidth - w - 8, maxY = innerHeight - CAPTION_H - h;
  const fit = ([x, y]) => [Math.min(maxX, Math.max(8, x)), Math.min(maxY, Math.max(NAV_H, y))];
  const spots = [
    [cx - w / 2, box.y0 - h - 14], [cx - w / 2, box.y1 + 14],
    [box.x1 + 14, cy - h / 2], [box.x0 - w - 14, cy - h / 2],
    [maxX, NAV_H], [maxX, maxY],
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
function covered(x, y, w, h) {
  let n = 0;
  const c1 = Math.min(R.cols - 1, Math.floor((x + w) / cw)), r1 = Math.min(R.rows - 1, Math.floor((y + h) / chh));
  for (let r = Math.max(0, Math.floor(y / chh)); r <= r1; r++)
    for (let c = Math.max(0, Math.floor(x / cw)); c <= c1; c++) if (R.ch[r * R.cols + c]) n++;
  return n;
}
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
  document.body.classList.toggle('night', i === 4);
  const next = sceneFor(i);
  if (!next || next === B) return;
  relax = true;
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

let playFrom = Infinity;
function autoplay(t) {
  const F = 10, H = 5, B = 2.5, REST = 1.5, x = t % (F + H + B + REST);
  return x < F ? x / F : x < F + H ? 1 : x < F + H + B ? 1 - (x - F - H) / B : 0;
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (now - last < 32) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  t += dt;
  if (e < 1) e = Math.min(1, e + dt / 1.4);
  if (!wide) hero.setProgress(autoplay(t - playFrom), false);
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
hero.onready = () => { if (still && B === hero) { hero.update(t, 0); draw(); } };
hero.snap();
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

playSession({
  hero: document.querySelector('.hero'),
  ssh: $('sshLine'), gap: $('sshGap'), rows: [...document.querySelectorAll('#name .banner > span')],
  line: $('line'), last: $('lastLogin'),
  local: profile.login.local, command: profile.login.command, tagline: profile.line,
  still,
  onDone: () => {
    termReady = true;
    playFrom = t;
    const s = hero.state();
    syncTerm(s.stage, s.total);
  },
});

const nightSky = shapes[4];
const imgcat = setupImgcat({
  list: $('astroList'), block: $('imgcat'), photos: astro, first: 'moon-hdr.jpg', prompt: profile.prompt, still,
  onPhoto: (pic, p) => {
    if (!nightSky.setPhoto) return;
    nightSky.setPhoto(pic, p.title, still);
    if (still && B === nightSky) { nightSky.update(t, 0); draw(); }
  },
});

shell = typeOnArrival({
  items: [...document.querySelectorAll('.cmdline')].map((line) => ({
    key: line.dataset.cmd, section: line.closest('section'), line, command: commands[line.dataset.cmd],
  })),
  prompt: profile.prompt,
  still,
  onShow: (el) => {
    if (el.classList.contains('fig-window')) assemble(el.closest('section'));
    if (el.id === 'imgcat') imgcat.start();
  },
});

const navLinks = [...document.querySelectorAll('.nav nav a')];
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    if (wide) setScene(+en.target.dataset.scene);
    for (const a of navLinks) a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id);
  }
}, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
document.querySelectorAll('section[data-scene]').forEach((s) => io.observe(s));
