const RAMP = ' .:-=+*#%@';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const PRINT = 600;
const tap = matchMedia('(hover: none)').matches ? 'tap' : 'click';

export function setupImgcat({ list, block, photos, first, prompt, still, onPhoto = () => {} }) {
  const line = block.querySelector('.ln'), link = block.querySelector('.frame'), cap = block.querySelector('.cap');
  const canvas = link.querySelector('canvas');
  let current = photos.find((p) => p.file === first) || photos[0];
  let token = 0, raf = 0, typing = 0, started = false, shown = null;

  const url = (p) => `assets/astro/${p.file}`;
  const cmdOf = (p) => `imgcat ~/astro/${p.file}`;
  const showCmd = (text, n, cur) => {
    line.innerHTML = `<span class="ps">${esc(prompt)}</span> <span class="cmd">${esc(text.slice(0, n))}</span>` + (cur ? '<span class="caret solid"></span>' : '');
  };
  const point = (p) => {
    link.href = url(p);
    link.setAttribute('aria-label', `${p.title}, ${p.y}: open the photograph in a new tab`);
  };

  list.innerHTML = photos
    .map((p) => `<li><button type="button" data-file="${esc(p.file)}" title="${esc(p.title)}, ${esc(p.y)}">${esc(p.file)}</button></li>`)
    .join('');
  const mark = () => { for (const b of list.querySelectorAll('button')) b.setAttribute('aria-current', String(b.dataset.file === current.file)); };
  mark();
  point(current);
  showCmd(cmdOf(current), Infinity, false);
  cap.textContent = `${current.file}  ${current.y}  ${current.title}`;

  list.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    run(photos.find((p) => p.file === b.dataset.file));
    block.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'nearest' });
  });

  function run(p) {
    current = p;
    mark();
    point(p);
    const my = ++token;
    cancelAnimationFrame(raf);
    clearInterval(typing);
    const text = cmdOf(p);
    if (still) { showCmd(text, Infinity, false); draw(p, my); return; }
    let n = 0;
    showCmd(text, 0, true);
    typing = setInterval(() => {
      showCmd(text, ++n, n < text.length);
      if (n >= text.length) { clearInterval(typing); draw(p, my); }
    }, 18);
  }

  async function draw(p, my) {
    cap.textContent = `${p.file}  loading...`;
    const pic = new Image();
    pic.src = url(p);
    try { await pic.decode(); } catch { if (my === token) cap.textContent = `imgcat: ${p.file}: cannot open`; return; }
    if (my !== token) return;
    cap.textContent = `${p.file}  ${pic.naturalWidth}x${pic.naturalHeight}  ${p.y}  ${p.title}\n${tap} the image to open the photograph`;
    try { onPhoto(pic, p); } catch (err) { console.error(err); }
    paint(p, pic, my, !still);
  }

  function paint(p, pic, my, animate) {
    cancelAnimationFrame(raf);
    shown = { p, pic };
    const r = link.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    const s = Math.min(W / pic.naturalWidth, H / pic.naturalHeight);
    const iw = pic.naturalWidth * s, ih = pic.naturalHeight * s, ix = (W - iw) / 2, iy = (H - ih) / 2;
    const cellW = (innerWidth < 600 ? 4.5 : 5.5) * dpr;
    const cols = Math.max(8, Math.round(iw / cellW)), rows = Math.max(4, Math.round(ih / (cellW / 0.6)));
    const cw = iw / cols, ch = ih / rows;

    const small = document.createElement('canvas');
    small.width = cols;
    small.height = rows;
    const sg = small.getContext('2d', { willReadFrequently: true });
    sg.drawImage(pic, 0, 0, cols, rows);
    const px = sg.getImageData(0, 0, cols, rows).data;
    const lum = new Float32Array(cols * rows);
    for (let i = 0; i < lum.length; i++) lum[i] = (0.2126 * px[4 * i] + 0.7152 * px[4 * i + 1] + 0.0722 * px[4 * i + 2]) / 255;
    const sorted = Float32Array.from(lum).sort();
    const lo = sorted[Math.floor(sorted.length * 0.3)], hi = Math.max(lo + 0.02, sorted[Math.floor(sorted.length * 0.995)]);

    const bg = getComputedStyle(document.body).backgroundColor;
    const art = document.createElement('canvas');
    art.width = W;
    art.height = H;
    const ag = art.getContext('2d');
    ag.fillStyle = bg;
    ag.fillRect(0, 0, W, H);
    ag.font = `${(ch * 0.95).toFixed(1)}px "Courier Prime", monospace`;
    ag.textBaseline = 'top';
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = 4 * (y * cols + x), R = px[i], G = px[i + 1], B = px[i + 2];
        const v = Math.min(1, Math.max(0, (lum[y * cols + x] - lo) / (hi - lo)));
        const k = Math.min(RAMP.length - 1, Math.floor(Math.pow(v, 0.75) * RAMP.length));
        if (!k) continue;
        const f = Math.min(3, 210 / Math.max(R, G, B, 1));
        ag.fillStyle = `rgb(${Math.min(255, R * f) | 0},${Math.min(255, G * f) | 0},${Math.min(255, B * f) | 0})`;
        ag.fillText(RAMP[k], ix + x * cw, iy + y * ch);
      }

    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    if (!animate) { g.drawImage(art, 0, 0); return; }
    const t0 = performance.now();
    const frame = (now) => {
      if (my !== token) return;
      const e = now - t0, yv = e >= PRINT ? H : iy + ch * Math.floor((rows * e) / PRINT);
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      if (yv > 0) g.drawImage(art, 0, 0, W, yv, 0, 0, W, yv);
      if (e < PRINT) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  let rz = 0;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (shown) paint(shown.p, shown.pic, token, false); }, 150);
  });

  return {
    start() {
      if (started) return;
      started = true;
      draw(current, ++token);
    },
  };
}
