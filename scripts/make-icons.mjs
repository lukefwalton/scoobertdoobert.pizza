// Derive the square app icons from the brand pizza mark (public/PIZZA.png).
//
// The manifest / apple-touch icons must be SQUARE for browsers' installability +
// home-screen behavior, but the source mark is 479×470 (near-square, not square).
// So we letterbox it onto white square canvases (the storefront's background, and
// the manifest background_color) at the sizes install prompts expect: 192, 512, and
// a 180 apple-touch. Re-run after the mark changes:  node scripts/make-icons.mjs
//
// Content note: PIZZA.png is Scoobert's brand art (© Luke F. Walton, ARR) — these are
// just resized derivatives of an asset already shipped in public/, not new content.
import sharp from 'sharp';

const SRC = 'public/PIZZA.png';
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// A little breathing room so the round mark isn't jammed to the edges of the tile.
async function makeIcon(size, out, pad = 0.86) {
  const inner = Math.round(size * pad);
  const mark = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: WHITE })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(out);
  console.log(`  wrote ${out} (${size}×${size})`);
}

await makeIcon(192, 'public/icon-192.png');
await makeIcon(512, 'public/icon-512.png');
await makeIcon(180, 'public/apple-touch-icon.png');
console.log('icons done.');
