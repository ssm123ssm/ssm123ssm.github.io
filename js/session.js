// The page as a terminal session.
//
// playSession: the opening. The visitor's ssh command is typed out, the connection takes a
// moment, then the server's welcome message prints (the name as a banner, row by row, and the
// tagline), followed by the last-login line. Then onDone hands the terminal on (to fig. 1's
// commands, in main.js). Any scroll, key, click or touch skips to the end, and so does reduced
// motion or a page opened part-way down.
//
// typeOnArrival: every later section opens with a prompt. As it comes into view its command is
// typed, then the section prints below as the command's output (its figure too, on phones),
// block by block, top to bottom as they sit on screen. Each block's text streams in fast behind
// a cursor, in uneven chunks with the odd stall, as a program's output does. (The prompt line is
// the section's sticky heading, see style.css, so scrolling fast does not carry it away.)
//
// Either way, everything is laid out from the start and only hidden, so nothing on the page
// moves while it plays.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const NBSP = ' ';
const cursor = (ch, blink) => `<span class="cur${blink ? ' blink' : ''}">${esc(ch || NBSP)}</span>`;
// text with its first n characters shown; the rest keeps its place but is hidden, with the
// cursor (if any) on the next character, as a block cursor in a terminal sits
function part(text, n, cur, blink = false) {
  if (n >= text.length && !cur) return esc(text);
  return esc(text.slice(0, n)) + (cur ? cursor(text[n], blink) : '') +
    `<span class="hide">${esc(text.slice(cur ? n + 1 : n))}</span>`;
}
// the date as `last` prints it: "Sat Nov 14 21:04:12 2026"
function ctime(d) {
  const p = (v) => String(v).padStart(2, '0');
  const f = (o) => d.toLocaleString('en-US', o);
  return `${f({ weekday: 'short' })} ${f({ month: 'short' })} ${String(d.getDate()).padStart(2, ' ')} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${d.getFullYear()}`;
}

export function playSession({ hero, ssh, gap, rows, line, last, local, command, tagline, still, onCommand, onDone }) {
  const sshHTML = (n, cur, blink) => `<span class="ps">${esc(local)}</span> <span class="cmd">${part(command, n, cur, blink)}</span>`;

  // the starting state: a prompt with a blinking cursor, everything else laid out but hidden
  hero.classList.add('boot');
  ssh.innerHTML = sshHTML(0, true, true);
  gap.innerHTML = '';
  rows.forEach((r) => r.classList.add('hide'));
  line.innerHTML = part(tagline, 0, false);
  last.textContent = `Last login: ${ctime(new Date(Date.now() - (3 + 20 * Math.random()) * 3600e3))}`;
  last.classList.add('hide');

  // keystrokes at an uneven pace, a little slower after a space
  const keys = [];
  let at = 0;
  for (const ch of command) keys.push((at += 38 + 52 * Math.random() + (ch === ' ' ? 70 : 0)));

  // the timeline: each step gets the time since it began (Infinity: draw its end state)
  const steps = [];
  let T = 0;
  const step = (dur, draw) => { steps.push({ start: T, end: T + dur, draw }); T += dur; };
  const ROW = 30, CHAR = 7; // ms per banner row, per tagline character
  step(450, () => {}); // the prompt waits
  step(at, (t) => { ssh.innerHTML = sshHTML(keys.filter((k) => k <= t).length, true); });
  step(240, () => { ssh.innerHTML = sshHTML(command.length, true); }); // then Enter
  step(0, () => onCommand?.()); // Enter submits ssh, including when the timeline is skipped
  step(520, () => { ssh.innerHTML = sshHTML(command.length, false); gap.innerHTML = cursor('', true); }); // connecting
  step(rows.length * ROW, (t) => {
    gap.innerHTML = '';
    const k = Math.min(rows.length, Math.floor(t / ROW) + 1);
    rows.forEach((r, i) => r.classList.toggle('hide', i >= k));
  });
  step(tagline.length * CHAR, (t) => {
    const n = Math.min(tagline.length, Math.floor(t / CHAR));
    line.innerHTML = part(tagline, n, n < tagline.length);
  });
  step(170, () => { line.textContent = tagline; });
  step(110, () => { last.classList.remove('hide'); });
  step(120, () => {}); // a beat before the prompt

  let i = 0, t0 = 0, raf = 0, done = false;
  const SKIP = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'scroll'];
  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    while (i < steps.length) steps[i++].draw(Infinity);
    SKIP.forEach((type) => removeEventListener(type, finish, true));
    hero.classList.remove('boot');
    onDone?.();
  };
  const tick = (now) => {
    t0 ||= now;
    const t = now - t0;
    while (i < steps.length && t >= steps[i].end) steps[i++].draw(Infinity);
    if (i >= steps.length) return finish();
    if (t >= steps[i].start) steps[i].draw(t - steps[i].start);
    raf = requestAnimationFrame(tick);
  };
  if (still || scrollY > 0) return finish();
  SKIP.forEach((type) => addEventListener(type, finish, { capture: true, passive: true }));
  raf = requestAnimationFrame(tick);
}

// ---- streaming a block's text. Each text node becomes: what has printed, the cursor on the next
// character, and the rest (laid out, hidden), so the block keeps its shape; unwrap puts the
// original nodes back, links and all.
function wrapText(el) {
  const nodes = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) nodes.push(walk.currentNode);
  return nodes.map((t) => {
    const done = document.createTextNode(''), cur = document.createElement('span'), rest = document.createElement('span');
    cur.className = 'tw-cur';
    rest.className = 'tw-rest';
    rest.textContent = t.data;
    t.replaceWith(done, cur, rest);
    return { t, s: t.data, done, cur, rest };
  });
}
function showChars(parts, n) {
  let left = n; // characters still to show, from this node on
  for (const p of parts) {
    const k = Math.max(0, Math.min(p.s.length, left)), here = left >= 0 && left < p.s.length;
    p.done.data = p.s.slice(0, k);
    p.cur.textContent = here ? p.s[k] : '';
    p.rest.textContent = p.s.slice(here ? k + 1 : k);
    left -= p.s.length;
  }
}
function unwrap(parts) {
  for (const p of parts) { p.done.replaceWith(p.t); p.cur.remove(); p.rest.remove(); }
}
// When each block starts and how its text comes: chunks of 20-90 characters at RATE, now and then
// a stall inside a block, often a pause between blocks; a long section is sped up to fit CAP.
const RATE = 1.6, CAP = 2400; // characters per ms; ms for a whole section
// the text a block streams: none for a figure's window (on phones it holds the scene, whose
// characters are the figure's, not text)
const textOf = (u) => (u.classList.contains('fig-window') ? '' : u.textContent);
function schedule(blocks) {
  const plan = [];
  let T = 0;
  for (const u of blocks) {
    const len = textOf(u).length, pts = [[T, 0]]; // (time, characters shown)
    for (let c = 0; c < len; ) {
      const n = Math.min(len - c, 20 + Math.floor(70 * Math.random()));
      T += n / RATE;
      c += n;
      pts.push([T, c]);
      if (c < len && Math.random() < 0.3) { T += 30 + 110 * Math.random(); pts.push([T, c]); }
    }
    plan.push({ u, start: pts[0][0], pts });
    T += Math.random() < 0.45 ? 50 + 210 * Math.random() : 8;
  }
  const k = T > CAP ? CAP / T : 1;
  for (const b of plan) { b.start *= k; for (const q of b.pts) q[0] *= k; }
  return { plan, total: T * k };
}
function charsAt(pts, t) {
  for (let i = 1; i < pts.length; i++)
    if (t < pts[i][0]) { const [t0, c0] = pts[i - 1], [t1, c1] = pts[i]; return Math.floor(c0 + ((c1 - c0) * (t - t0)) / (t1 - t0)); }
  return pts[pts.length - 1][1];
}

export function typeOnArrival({ items, prompt, still, onShow = () => {} }) {
  // onShow(el): told as each block prints (main.js assembles a figure when its window does)
  // items: [{ key, section, line, command }]; line is the section's prompt line
  const PS = `<span class="ps">${esc(prompt)}</span> `;
  const draw = (it, n, cur) => { it.line.innerHTML = PS + `<span class="cmd">${part(it.command, n, cur, cur && n === 0)}</span>`; };
  // what prints: the blocks of the section, with lists (and the featured piece) a block per
  // entry, in the order they sit on screen (phones move a figure's note up under the figure)
  const units = (it) => [...it.line.parentElement.children].flatMap((c) =>
    c === it.line || c.classList.contains('sr-only') ? [] : c.matches('ol, ul, article, #themes') ? [...c.children] : [c]);
  const inOrder = (els) => els.filter((el) => el.getClientRects().length) // laid out (not display: none)
    .map((el) => [el.getBoundingClientRect().top, el]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const finish = (it) => {
    cancelAnimationFrame(it.raf);
    if (it.parts) { unwrap(it.parts); it.parts = null; }
    draw(it, it.command.length, false);
    for (const u of units(it)) if (u.classList.contains('pending')) { u.classList.remove('pending'); onShow(u); }
    it.state = 'done';
  };
  const play = (it, fast = false) => {
    if (it.state !== 'waiting') return;
    it.state = 'playing';
    const keys = [];
    let at = 0;
    for (const ch of it.command) keys.push((at += fast ? 16 : 38 + 52 * Math.random() + (ch === ' ' ? 60 : 0)));
    const out = inOrder(units(it).filter((u) => u.classList.contains('pending'))); // what is still to print
    const startOut = at + (fast ? 60 : 200); // Enter, then the output
    const { plan, total } = schedule(out);
    let t0 = 0, typed = -1, b = -1, shownChars = -1;
    const tick = (now) => {
      t0 ||= now;
      const t = now - t0;
      if (t < startOut) {
        const n = keys.filter((k) => k <= t).length;
        if (n !== typed) draw(it, (typed = n), true);
      } else {
        if (typed <= it.command.length) { draw(it, it.command.length, false); typed = Infinity; }
        const to = t - startOut;
        // start each block whose time has come (the one before it is then complete)
        while (b + 1 < plan.length && to >= plan[b + 1].start) {
          if (it.parts) unwrap(it.parts);
          const u = plan[++b].u;
          it.parts = textOf(u).trim() ? wrapText(u) : null;
          if (it.parts) showChars(it.parts, 0);
          shownChars = 0;
          u.classList.remove('pending');
          onShow(u);
        }
        if (it.parts) { const n = charsAt(plan[b].pts, to); if (n !== shownChars) showChars(it.parts, (shownChars = n)); }
        if (to >= total) return finish(it);
      }
      it.raf = requestAnimationFrame(tick);
    };
    it.raf = requestAnimationFrame(tick);
  };
  // listsOnly: hide just the list entries (a new command in a section that has printed: its
  // figure and the rest stay, and the figure changes with its usual morph)
  const reset = (it, listsOnly = false) => {
    cancelAnimationFrame(it.raf);
    it.state = 'waiting';
    it.line.replaceChildren();
    for (const u of units(it)) if (!listsOnly || u.parentElement.matches('ol, ul')) u.classList.add('pending');
  };

  for (const it of items) {
    reset(it);
    // keyboard users tabbing into a section that has not printed yet get it at once
    it.section.addEventListener('focusin', () => { if (it.state !== 'done') finish(it); });
  }
  // A section plays once any of it is in the top 70% of the screen: scrolling down, when its
  // prompt gets there; scrolling up (a page opened part-way down), as soon as it shows.
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) {
      io.unobserve(en.target);
      const it = items.find((it) => it.section === en.target);
      if (still) finish(it);
      else play(it);
    }
  }, { rootMargin: '0px 0px -30% 0px' });

  // Run a new command in a section that has printed (a Papers tab): type it fast, print its list again.
  return {
    observeArrivals() {
      for (const it of items) io.observe(it.section);
    },
    retype(key, command) {
      const it = items.find((x) => x.key === key);
      if (!it) return;
      if (it.state === 'playing') finish(it); // complete what was printing, then print the new list
      const was = it.state;
      it.command = command;
      reset(it, was !== 'waiting');
      if (was !== 'waiting') { if (still) finish(it); else play(it, true); }
    },
  };
}
