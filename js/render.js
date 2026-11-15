import { profile, spotlight, filterNote, sirNote, themes, pubs, tagNames, projects, awards, contact, astro } from './content.js';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const ext = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

const note = (n) => `<span class="fig-text">${esc(n.text)}${n.touch ? ' ' + esc(n.touch) : ''}</span> ${n.links.map((l) => ext(l.url, l.label)).join(' ')}`;

export function pubsHTML(tag = 'all') {
  return pubs
    .filter((p) => tag === 'all' || p.tag === tag)
    .map((p) => {
      const url = p.url || `https://scholar.google.com/scholar?q=${encodeURIComponent('"' + p.t + '"')}`;
      const c = p.cites ? ` / <span class="c">cited ${p.cites}</span>` : '';
      return `<li><span class="y">${p.y}</span><div><a class="t" href="${esc(url)}" target="_blank" rel="noopener">${esc(p.t)}</a><span class="m">${esc(p.a)}<br>${esc(p.v)}${c}</span></div></li>`;
    })
    .join('');
}

export function astroListHTML(photos = astro) {
  return photos
    .map((p) => `<li><button type="button" data-file="${esc(p.file)}" title="${esc(p.title)}, ${esc(p.y)}">${esc(p.file)}</button></li>`)
    .join('');
}

export function contentHTML() {
  const sp = spotlight;
  const cols = Math.max(...profile.banner.map((r) => r.length));
  const tags = ['all', ...new Set(pubs.map((p) => p.tag))];
  return {
    name: `<span class="sr-only">${esc(profile.name)}</span><span class="banner" aria-hidden="true" style="--cols:${cols}">` +
      profile.banner.map((r) => `<span>${esc(r)}</span>`).join('') + '</span>',
    line: esc(profile.line),
    filterNote: note(filterNote),
    spot: `<p class="tag">${esc(sp.label)}</p><h2 class="spot-title">${esc(sp.title)}</h2>` +
      `<p class="m">${esc(sp.authors)}<br>${esc(sp.venue)}</p>` +
      (sp.prize ? `<p class="prize"><span class="mark" aria-hidden="true">*</span>${ext(sp.prize.url, sp.prize.label)}<br><span class="m">${esc(sp.prize.note)}</span></p>` : '') +
      `<p>${esc(sp.text)}</p><p class="links">${sp.links.map((l) => ext(l.url, l.label)).join('')}</p>`,
    themes: themes
      .map((t) => `<div class="theme"><h3>${esc(t.title)}</h3>${t.fields ? `<p class="fields">${t.fields.map(esc).join(' / ')}</p>` : ''}<p>${esc(t.text)}</p></div>`)
      .join(''),
    sirNote: note(sirNote),
    filters: tags.map((t) => `<button type="button" data-tag="${t}" aria-pressed="${t === 'all'}">${esc(tagNames[t] || t)}</button>`).join(''),
    pubs: pubsHTML('all'),
    projectList: projects
      .map((p) => {
        const go = [p.live && ext(p.live, 'Live site'), p.code && ext(p.code, 'Source'), ...(p.links || []).map((l) => ext(l.url, l.label))].filter(Boolean).join('');
        return `<li><div class="head"><h3>${esc(p.name)}</h3><span class="stack">${esc(p.stack)}</span></div><p>${esc(p.text)}</p><div class="go links">${go}</div></li>`;
      })
      .join(''),
    awardList: awards
      .map((a) => `<li><span class="y">${esc(a.y)}</span><div>${a.url ? `<a class="t" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>` : `<span class="t">${esc(a.name)}</span>`}<span class="m">${esc(a.by)}</span></div></li>`)
      .join(''),
    aboutText: esc(profile.about).replace('{lab}', ext(profile.lab.url, profile.lab.label)),
    background: esc(profile.background),
    hobby: esc(profile.hobby).replace(/\{([^}]+)\}/, '<a href="#astro">$1</a>'),
    links2: profile.links.map((l) => ext(l.url, l.label)).join(''),
    astroList: astroListHTML(),
    mailIntro: esc(contact.intro),
  };
}
