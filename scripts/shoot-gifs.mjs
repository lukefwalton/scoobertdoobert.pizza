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
import { lzwDecode } from './lib/gif89a.mjs';

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

// Walk the GIF block structure and LZW-DECODE every frame's pixels. Decoding all
// frames (not just counting descriptors) means a later-frame corruption can't hide
// behind a correct frame count: lzwDecode throws on a malformed stream, and a frame
// that decoded short fails the pixel-count check. (Chromium can't help here — its
// WebCodecs ImageDecoder is disabled in this build and headless doesn't advance
// in-DOM GIFs — so the per-frame decode is done in node; Chromium still proves the
// LZW algorithm itself on frame 0, and the encoder runs the same path every frame.)
function decodeFrames(bytes) {
  let p = 6 + 4; // 'GIF89a' + width/height
  const packed = bytes[p];
  p += 3; // packed, background, aspect
  if (packed & 0x80) p += 3 * (1 << ((packed & 7) + 1)); // global color table
  const frames = [];
  while (p < bytes.length) {
    const b = bytes[p++];
    if (b === 0x3b) break; // trailer
    if (b === 0x21) {
      p++; // extension label
      let s;
      while ((s = bytes[p++]) !== 0) p += s; // sub-blocks
    } else if (b === 0x2c) {
      p += 8; // left, top, w, h
      const ip = bytes[p++];
      if (ip & 0x80) p += 3 * (1 << ((ip & 7) + 1)); // local color table (we emit none)
      const mcs = bytes[p++]; // min code size
      const data = [];
      let s;
      while ((s = bytes[p++]) !== 0) for (let i = 0; i < s; i++) data.push(bytes[p++]);
      frames.push(lzwDecode(mcs, data));
    } else break;
  }
  return frames;
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
  // Decode EVERY frame off disk: the count must match, each frame must decode to a
  // full w*h of pixels (a corrupt later frame throws or comes up short), and an
  // animation must actually MOVE — some frame differs from frame 0 — so a generation
  // bug that collapsed the frames can't pass on frame count alone.
  let frames;
  try {
    frames = decodeFrames(readFileSync(`public/gifs/${g.name}`));
  } catch (e) {
    fail(`${g.name}: a frame failed to decode — ${e.message}`);
    continue;
  }
  if (frames.length !== g.frames)
    fail(`${g.name}: ${frames.length} frames, expected ${g.frames} (animation lost?)`);
  for (const fr of frames)
    if (fr.length !== g.w * g.h)
      fail(`${g.name}: a frame decoded to ${fr.length}px, expected ${g.w * g.h}`);
  if (g.frames > 1) {
    const f0 = frames[0].join(',');
    if (!frames.slice(1).some((fr) => fr.join(',') !== f0))
      fail(`${g.name}: all ${g.frames} frames identical — animation didn't survive generation`);
  }

  // Chromium decode of the served file — the spec oracle for the LZW algorithm
  // (frame-identical, so a correct frame 0 means correct later frames too).
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
    `  ${g.name}: ${res.w}x${res.h}, ${frames.length}f, ${res.distinct} colors, ${res.transparent} transp`,
  );
}

await browser.close();
console.log(`gifs: checked ${GIFS.length} | errors=${errors}`);
process.exit(errors ? 1 : 0);
