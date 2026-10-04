// One-time helper: downloads the remote (Stitch-hosted) images referenced in
// src/pages/*.html, converts them to responsive WebP and rewrites the HTML to
// point at the local copies. Stitch image URLs expire, so the site must not
// depend on them.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const PAGES = 'src/pages';
const OUT = 'src/assets/images';
mkdirSync(OUT, { recursive: true });

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 7).join('-') || 'image';

const urlRe = /https:\/\/lh3\.googleusercontent\.com\/[^"')\s]+/g;
const names = new Map();

for (const file of readdirSync(PAGES).filter((f) => f.endsWith('.html'))) {
  const path = join(PAGES, file);
  let html = readFileSync(path, 'utf8');
  const urls = [...new Set(html.match(urlRe) || [])];

  for (const url of urls) {
    if (!names.has(url)) {
      // Name the file after the alt text of the first <img> that uses it.
      const esc = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const alt = html.match(new RegExp(`alt="([^"]*)"[^>]*src="${esc}"`))?.[1]
        || html.match(new RegExp(`src="${esc}"[^>]*alt="([^"]*)"`))?.[1]
        || 'image';
      let base = slug(alt);
      let n = 1;
      while ([...names.values()].includes(base)) base = `${slug(alt)}-${++n}`;
      names.set(url, base);

      const res = await fetch(`${url.split('=')[0]}=w1920`);
      if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      for (const w of [640, 1280, 1920]) {
        const out = join(OUT, `${base}-${w}.webp`);
        if (!existsSync(out)) {
          await sharp(buf).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out);
        }
      }
      console.log(`✓ ${base}`);
    }
    html = html.split(url).join(`assets/images/${names.get(url)}-1280.webp`);
  }
  writeFileSync(path, html);
}
console.log(`Localized ${names.size} images.`);
