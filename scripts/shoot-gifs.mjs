// shoot:gifs — prove our hand-rolled GIF89a encoder is SPEC-correct, not merely
// self-consistent. The unit test (gif89a.test.mjs) round-trips the encoder against
// our own decoder; that can't catch a bug both share (e.g. an LZW code-width off-
// by-one that desyncs a real decoder at the first width bump). So this smoke loads
// every shipped /gifs/*.gif into a REAL browser (Chromium's decoder = the oracle),
// draws it to a canvas, and asserts the whole image decoded.
//
// Killer assertion: our GIFs are fully OPAQUE, so every pixel must read back alpha
// 255. The width-bump bug left the undecoded remainder transparent — exactly what
// this catches. We also assert the frame isn't a flat fill (real art decoded), and
// that each animation kept its expected FRAME COUNT (animation survived generation
// — counted off the GIF block structure, independent of LZW so it can't share a bug).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';

// Each shipped GIF: expected dimensions (guards the LSD header) + frame count
// (statics are 1 frame; animations keep all theirs).
const GIFS = [
  { name: 'dancing-pizza.gif', w: 64, h: 64, frames: 10 },
  { name: 'dancing-pizza-static.gif', w: 64, h: 64, frames: 1 },
  { name: 'construction.gif', w: 104, h: 26, frames: 6 },
  { name: 'construction-static.gif', w: 104, h: 26, frames: 1 },
  { name: 'rainbow-rule.gif', w: 168, h: 8, frames: 7 },
  { name: 'rainbow-rule-static.gif', w: 168, h: 8, frames: 1 },
  { name: 'wallpaper.gif', w: 48, h: 48, frames: 1 },
];

// Walk the GIF block structure and count image descriptors (0x2C) — pure framing,
// no LZW, so it's a frame count an encoder LZW bug can't fake.
function frameCount(bytes) {
  let p = 6 + 4; // 'GIF89a' + width/height
  const packed = bytes[p];
  p += 3; // packed, background, aspect
  if (packed & 0x80) p += 3 * (1 << ((packed & 7) + 1)); // global color table
  let n = 0;
  while (p < bytes.length) {
    const b = bytes[p++];
    if (b === 0x3b) break; // trailer
    if (b === 0x21) {
      p++; // extension label
      let s;
      while ((s = bytes[p++]) !== 0) p += s; // sub-blocks
    } else if (b === 0x2c) {
      n++;
      p += 8; // left, top, w, h
      const ip = bytes[p++];
      if (ip & 0x80) p += 3 * (1 << ((ip & 7) + 1)); // local color table (we emit none)
      p++; // min code size
      let s;
      while ((s = bytes[p++]) !== 0) p += s; // image data sub-blocks
    } else break;
  }
  return n;
}

const browser = await chromium.launch();
const page = await browser.newPage();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};
await page.goto(base, { waitUntil: 'commit' });

for (const g of GIFS) {
  // Structural frame count, straight off disk (independent of the LZW decode).
  const fc = frameCount(readFileSync(`public/gifs/${g.name}`));
  if (fc !== g.frames) fail(`${g.name}: ${fc} frames, expected ${g.frames} (animation lost?)`);

  // Chromium decode of the served file — the spec oracle.
  const res = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch (e) {
      return { error: `decode failed: ${e.message}` };
    }
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, cv.width, cv.height);
    let transparent = 0;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 255) transparent++;
      colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    }
    return {
      w: img.naturalWidth,
      h: img.naturalHeight,
      pixels: data.length / 4,
      transparent,
      distinct: colors.size,
    };
  }, `${base}/gifs/${g.name}`);

  if (res.error) {
    fail(`${g.name}: ${res.error}`);
    continue;
  }
  if (res.w !== g.w || res.h !== g.h) {
    fail(`${g.name}: decoded ${res.w}x${res.h}, expected ${g.w}x${g.h}`);
  }
  // The bug signature: a real spec decoder bails partway and leaves the rest
  // transparent. Our GIFs are fully opaque, so ANY transparent pixel means desync.
  if (res.transparent > 0) {
    fail(`${g.name}: ${res.transparent}/${res.pixels} px decoded transparent — encoder desync`);
  }
  if (res.distinct < 3) {
    fail(`${g.name}: only ${res.distinct} distinct colors — art did not decode (blank fill?)`);
  }
  console.log(
    `  ${g.name}: ${res.w}x${res.h}, ${fc}f, ${res.distinct} colors, ${res.transparent} transp`,
  );
}

await browser.close();
console.log(`gifs: checked ${GIFS.length} | errors=${errors}`);
process.exit(errors ? 1 : 0);
