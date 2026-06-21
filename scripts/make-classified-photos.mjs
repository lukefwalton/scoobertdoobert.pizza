// Degrade a spread of the masked-Scoobert photos into tiny PS1-grade textures for
// the classified room's "rejected demos" surveillance wall. Source is Luke's own
// photos (his copyright — fine to ship degraded/web-sized derivatives, never the
// originals). 128px square, low-quality JPEG — crunchy on purpose, and small.
//
//   node scripts/make-classified-photos.mjs
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';

const SRC = ['media/photos/Mask 1', 'media/photos/Mask 2'];
const OUT = 'public/textures/classified';
const COUNT = 8;

mkdirSync(OUT, { recursive: true });

const files = [];
for (const dir of SRC) {
  for (const f of readdirSync(dir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()) {
    files.push(`${dir}/${f}`);
  }
}
// Even spread across the set (deterministic), capped at COUNT.
const step = Math.max(1, Math.floor(files.length / COUNT));
const pick = files.filter((_, i) => i % step === 0).slice(0, COUNT);

// Fail fast if the source folders ever drift below COUNT — ClassifiedRoom.tsx
// requests exactly COUNT fixed texture URLs, so emitting fewer would 404 in-world.
if (pick.length !== COUNT) {
  console.error(
    `make-classified-photos: need ${COUNT} photos but found ${pick.length} usable in ${SRC.join(', ')}`,
  );
  process.exit(1);
}

let n = 1;
for (const f of pick) {
  const out = `${OUT}/photo-${n}.jpg`;
  await sharp(f)
    .resize(128, 128, { fit: 'cover', position: 'top' }) // bias to the head/mask
    .modulate({ saturation: 0.8 })
    .jpeg({ quality: 56 })
    .toFile(out);
  console.log('wrote', out, `(${f.split('/').slice(-2).join('/')})`);
  n++;
}
console.log(`done — ${n - 1} textures.`);
