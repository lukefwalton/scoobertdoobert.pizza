// shoot:gifs — prove our hand-rolled GIF89a encoder is SPEC-correct, not merely
// self-consistent. The unit test (gif89a.test.mjs) round-trips the encoder against
// our own decoder; that can't catch a bug both share (e.g. an LZW code-width off-
// by-one that desyncs a real decoder at the first width bump). So this smoke loads
// every shipped /gifs/*.gif into a REAL browser (Chromium's decoder = the oracle)
// and asserts the whole image decoded.
//
// Killer assertion: our GIFs are fully OPAQUE, so every pixel must read back alpha
// 255 — the width-bump bug left the undecoded remainder transparent. We also check
// every frame's pixels off disk, and — since headless can't animate a GIF and its
// WebCodecs ImageDecoder is disabled — we still get Chromium to validate EVERY later
// frame by rewrapping that frame's VERBATIM bytes as a standalone single-frame GIF
// and decoding THAT. Real browser, real per-frame bytes, no animation timing.
import { readFileSync } from 'node:fs';
import { lzwDecode } from './lib/gif89a.mjs';
import { startSmoke } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';

// Each shipped GIF: expected dimensions (guards the LSD header) + frame count.
const GIFS = [
  { name: 'dancing-pizza.gif', w: 64, h: 64, frames: 10 },
  { name: 'dancing-pizza-static.gif', w: 64, h: 64, frames: 1 },
  { name: 'construction.gif', w: 104, h: 26, frames: 6 },
  { name: 'construction-static.gif', w: 104, h: 26, frames: 1 },
  { name: 'rainbow-rule.gif', w: 168, h: 8, frames: 7 },
  { name: 'rainbow-rule-static.gif', w: 168, h: 8, frames: 1 },
  { name: 'wallpaper.gif', w: 48, h: 48, frames: 1 },
  { name: 'new-badge.gif', w: 56, h: 22, frames: 2 },
  { name: 'new-badge-static.gif', w: 56, h: 22, frames: 1 },
  { name: 'atmail.gif', w: 44, h: 34, frames: 6 },
  { name: 'atmail-static.gif', w: 44, h: 34, frames: 1 },
  { name: 'trophy.gif', w: 48, h: 56, frames: 10 },
  { name: 'trophy-static.gif', w: 48, h: 56, frames: 1 },
  { name: 'flames.gif', w: 120, h: 28, frames: 8 },
  { name: 'flames-static.gif', w: 120, h: 28, frames: 1 },
  { name: 'coins.gif', w: 64, h: 48, frames: 8 },
  { name: 'coins-static.gif', w: 64, h: 48, frames: 1 },
  { name: 'globe.gif', w: 48, h: 48, frames: 12 },
  { name: 'globe-static.gif', w: 48, h: 48, frames: 1 },
];

// Pull a GIF apart into its header / LSD / global color table and each frame's
// VERBATIM image-data bytes ([min-code-size .. sub-blocks .. 0x00]). Decoding the
// pixels here (lzwDecode) catches a corrupt later frame off disk; keeping the raw
// bytes lets us rewrap a frame for the browser to decode (below).
function parseGif(bytes) {
  const header = bytes.slice(0, 6);
  const lsd = bytes.slice(6, 13); // w(2) h(2) packed bg aspect
  const packed = bytes[10];
  const gctLen = packed & 0x80 ? 3 * (1 << ((packed & 7) + 1)) : 0;
  const gct = bytes.slice(13, 13 + gctLen);
  let p = 13 + gctLen;
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
      const start = p; // the min-code-size byte
      const mcs = bytes[p++];
      const data = []; // DE-CHUNKED lzw stream (sub-block length prefixes stripped)
      let s;
      while ((s = bytes[p++]) !== 0) for (let i = 0; i < s; i++) data.push(bytes[p++]);
      const raw = bytes.slice(start, p); // verbatim [mcs .. sub-blocks .. 0x00] for rewrapping
      frames.push({ raw, pixels: lzwDecode(mcs, data) });
    } else break;
  }
  return { header, lsd, gct, frames };
}

// Rewrap one frame's verbatim image data as a standalone single-frame GIF (reusing
// the original header / LSD / global color table). Chromium decoding THIS is a real-
// browser decode of the original later frame's actual bytes — not a re-encode.
function wrapFrame(parsed, w, h, frameRaw) {
  const desc = [0x2c, 0, 0, 0, 0, w & 0xff, w >> 8, h & 0xff, h >> 8, 0x00];
  return Uint8Array.from([
    ...parsed.header,
    ...parsed.lsd,
    ...parsed.gct,
    ...desc,
    ...frameRaw,
    0x3b,
  ]);
}

// Decode an image src (served URL or a data: URI) in the page and read back the
// canvas: dimensions, transparent-pixel count, distinct colors.
async function decodeInBrowser(page, src) {
  return page.evaluate(async (s) => {
    const img = new Image();
    img.src = s;
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
  }, src);
}

const { page, fail, finish, failures } = await startSmoke();
await page.goto(base, { waitUntil: 'commit' });

for (const g of GIFS) {
  // Parse + decode EVERY frame off disk: count must match, each frame must decode to
  // a full w*h of pixels (a corrupt later frame throws or comes up short), and an
  // animation must actually MOVE — some frame differs from frame 0.
  let parsed;
  try {
    parsed = parseGif(readFileSync(`public/gifs/${g.name}`));
  } catch (e) {
    fail(`${g.name}: a frame failed to decode — ${e.message}`);
    continue;
  }
  const frames = parsed.frames;
  if (frames.length !== g.frames)
    fail(`${g.name}: ${frames.length} frames, expected ${g.frames} (animation lost?)`);
  for (const fr of frames)
    if (fr.pixels.length !== g.w * g.h)
      fail(`${g.name}: a frame decoded to ${fr.pixels.length}px, expected ${g.w * g.h}`);
  if (g.frames > 1) {
    const f0 = frames[0].pixels.join(',');
    if (!frames.slice(1).some((fr) => fr.pixels.join(',') !== f0))
      fail(`${g.name}: all ${g.frames} frames identical — animation didn't survive generation`);
  }

  // Frame 0 through the real browser decoder (the served file) — the spec oracle.
  const res = await decodeInBrowser(page, `${base}/gifs/${g.name}`);
  if (res.error) {
    fail(`${g.name}: ${res.error}`);
    continue;
  }
  if (res.w !== g.w || res.h !== g.h)
    fail(`${g.name}: decoded ${res.w}x${res.h}, expected ${g.w}x${g.h}`);
  // Our GIFs are fully opaque, so ANY transparent pixel means the decode desynced.
  if (res.transparent > 0)
    fail(`${g.name}: ${res.transparent}/${res.pixels} px decoded transparent — encoder desync`);
  if (res.distinct < 3)
    fail(`${g.name}: only ${res.distinct} distinct colors — art did not decode (blank fill?)`);

  // EVERY later frame through the real browser decoder too: rewrap each (frame 0 is
  // already covered by the served file above) and decode it as a standalone GIF — so
  // an interior frame with a browser-only decode quirk can't hide behind first+last.
  let browserFrames = 1; // frame 0, via the served file
  for (let i = 1; i < frames.length; i++) {
    const wrapped = wrapFrame(parsed, g.w, g.h, frames[i].raw);
    const lf = await decodeInBrowser(
      page,
      `data:image/gif;base64,${Buffer.from(wrapped).toString('base64')}`,
    );
    const ok =
      !lf.error && lf.w === g.w && lf.h === g.h && lf.transparent === 0 && lf.distinct >= 2;
    if (ok) browserFrames++;
    else fail(`${g.name}: frame ${i} failed real-browser decode — ${JSON.stringify(lf)}`);
  }

  console.log(
    `  ${g.name}: ${res.w}x${res.h}, ${frames.length}f (${browserFrames} browser-ok), ${res.distinct} colors, ${res.transparent} transp`,
  );
}

console.log(`gifs: checked ${GIFS.length} | errors=${failures()}`);
await finish();
