import { readFileSync, writeFileSync } from 'node:fs';
import { contentHTML } from '../js/render.js';

const [src = 'index.html', out = src] = process.argv.slice(2);
let html = readFileSync(src, 'utf8');
for (const [id, inner] of Object.entries(contentHTML())) {
  const re = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\bid="${id}"[^>]*>)(</\\2>)`);
  if (!re.test(html)) throw new Error(`#${id}: no empty element with that id in ${src}`);
  html = html.replace(re, (_, open, _tag, close) => open + inner + close);
}
writeFileSync(out, html);
console.log(`${out}: ${Object.keys(contentHTML()).length} blocks of content written in`);
