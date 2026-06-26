// shoot:gifs — prove our hand-rolled GIF89a encoder is SPEC-correct, not merely
// self-consistent. The unit test (gif89a.test.mjs) round-trips the encoder against
// our own decoder; that can't catch a bug both share (e.g. an LZW code-width off-
// by-one that desyncs a real decoder at the first width bump). So this smoke loads
// every shipped /gifs/*.gif into a REAL browser (Chromium's decoder = the oracle),
// draws it to a canvas, and asserts the whole image decoded.
//
// Killer assertion: our GIFs are fully OPAQUE, so every pixel must read back alpha
// 255. The width-bump bug left the undecoded remainder transparent — exactly what
// this catches. We also assert the frame isn't a flat fill (real art decoded).
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:4173';

// Each shipped GIF + its expected dimensions (also guards the LSD header).
const GIFS = [
  { url: '/gifs/dancing-pizza.gif', w: 64, h: 64 },
  { url: '/gifs/dancing-pizza-static.gif', w: 64, h: 64 },
  { url: '/gifs/construction.gif', w: 104, h: 26 },
  { url: '/gifs/construction-static.gif', w: 104, h: 26 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};
await page.goto(base, { waitUntil: 'commit' });

for (const g of GIFS) {
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
  }, base + g.url);

  if (res.error) {
    fail(`${g.url}: ${res.error}`);
    continue;
  }
  if (res.w !== g.w || res.h !== g.h) {
    fail(`${g.url}: decoded ${res.w}x${res.h}, expected ${g.w}x${g.h}`);
  }
  // The bug signature: a real spec decoder bails partway and leaves the rest
  // transparent. Our GIFs are fully opaque, so ANY transparent pixel means the
  // decode desynced (or the encoder regressed).
  if (res.transparent > 0) {
    fail(`${g.url}: ${res.transparent}/${res.pixels} px decoded transparent — encoder desync`);
  }
  if (res.distinct < 3) {
    fail(`${g.url}: only ${res.distinct} distinct colors — art did not decode (blank fill?)`);
  }
  console.log(
    `  ${g.url}: ${res.w}x${res.h}, ${res.distinct} colors, ${res.transparent} transparent px`,
  );
}

await browser.close();
console.log(`gifs: checked ${GIFS.length} | errors=${errors}`);
process.exit(errors ? 1 : 0);
