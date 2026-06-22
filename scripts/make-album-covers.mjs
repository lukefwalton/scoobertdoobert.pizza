// Degrade Luke's album covers into web-light derivatives for the in-world PAINTINGS
// (CoverArt.tsx). Source art lives in media/album-art/ (Luke's copyright — only
// degraded/web-sized derivatives ship, never the originals). Covers are GALLERY art
// (the SM64 painting-portals), so they're exempt from the ≤128px PS1 texture rule —
// but kept small: 512² webp. Also emits src/data/albums.json (the catalog the
// paintings reference by slug), so adding a cover = drop art in + re-run this.
//
//   node scripts/make-album-covers.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';

const SRC = 'media/album-art';
const MOON = 'media/album-art/moonlight beach album art';
const OUT = 'public/brand/albums';
const CATALOG = 'src/data/albums.json';

mkdirSync(OUT, { recursive: true });

// strip diacritics, lowercase, non-alphanumeric → hyphen
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// human title from a source filename
function titleFromTopLevel(f) {
  return f
    .replace(/\.[^.]+$/, '')
    .replace(/[_\s]*album\s*art[_\s]*/i, '')
    .replace(/_/g, ' ')
    .trim();
}
function titleFromMoon(f) {
  return f
    .replace(/\.[^.]+$/, '')
    .replace(/^gg_ScoobertDoobert_/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // de-camel
    .replace(/\bcopy\b/i, '')
    .trim();
}

const sources = [];
for (const f of readdirSync(SRC)
  .filter((f) => /\.jpe?g$/i.test(f))
  .sort()) {
  sources.push({ path: `${SRC}/${f}`, title: titleFromTopLevel(f) });
}
for (const f of readdirSync(MOON)
  .filter((f) => /\.jpe?g$/i.test(f) && !/copy/i.test(f)) // skip the dupe
  .sort()) {
  sources.push({ path: `${MOON}/${f}`, title: titleFromMoon(f) });
}

const catalog = [];
const seen = new Set();
for (const { path, title } of sources) {
  let slug = slugify(title) || slugify(path);
  while (seen.has(slug)) slug += '-x';
  seen.add(slug);
  const out = `${OUT}/${slug}.webp`;
  await sharp(path).resize(512, 512, { fit: 'cover' }).webp({ quality: 82 }).toFile(out);
  catalog.push({ slug, title, art: `/brand/albums/${slug}.webp` });
  console.log('wrote', out, `← ${path.split('/').pop()}`);
}

catalog.sort((a, b) => a.title.localeCompare(b.title));
writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n');
console.log(`done — ${catalog.length} covers; catalog → ${CATALOG}`);
