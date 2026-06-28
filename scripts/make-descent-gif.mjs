// Build the README hero: an animated GIF of the descent (1996 storefront → 1999 →
// 2000 → SGI machine room → the PS1 3D world), encoded with the repo's OWN
// dependency-free GIF89a encoder (scripts/lib/gif89a.mjs). The encoder takes a
// single global palette + indexed frames and has no quantizer, so this script
// adds the missing piece: it downscales the captured screenshots (in headless
// Chromium, which decodes the PNGs for us), builds a 256-color palette by
// median-cut over all frames, and maps each pixel to the nearest palette entry.
// The reduced palette is crunchy — which is exactly the house style.
//
//   npm run build && npm run preview &
//   node scripts/make-readme-shots.mjs   # produces the source frames
//   node scripts/make-descent-gif.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, renameSync, statSync, existsSync } from 'node:fs';
import { encodeGif } from './lib/gif89a.mjs';

const MEDIA = '.github/media';
const W = 600;
const H = 375; // 1.6:1, the source 1280×800 scaled down

// The descent, in order, with per-frame hold (centiseconds). The world beats
// linger a touch longer so the payoff reads before it loops back to 1996.
const FRAMES = [
  { file: '01-storefront.png', delay: 140 },
  { file: '02-1999.png', delay: 130 },
  { file: '03-2000.png', delay: 130 },
  { file: '04-machine-room.png', delay: 160 },
  { file: '05-world-shop.png', delay: 230 },
  { file: '06-jukebox.png', delay: 230 },
];

// Preflight: a clear message beats a generic ENOENT mid-run if a source frame is
// missing (run make-readme-shots.mjs first).
const missing = FRAMES.map((f) => f.file).filter((f) => !existsSync(`${MEDIA}/${f}`));
if (missing.length) {
  console.error(
    `missing README source frame(s): ${missing.join(', ')} — run make-readme-shots.mjs first.`,
  );
  process.exit(1);
}

// 1. Decode + downscale each PNG to W×H RGBA (Chromium does the PNG decode + scale).
const browser = await chromium.launch();
const rgbaFrames = [];
// try/finally so a decode/evaluate throw still closes Chromium (no orphan process).
try {
  const page = await browser.newPage();
  for (const f of FRAMES) {
    const b64 = readFileSync(`${MEDIA}/${f.file}`).toString('base64');
    const data = await page.evaluate(
      async ({ b64, W, H }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + b64;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const cx = c.getContext('2d');
        cx.imageSmoothingEnabled = true;
        cx.drawImage(img, 0, 0, W, H);
        return Array.from(cx.getImageData(0, 0, W, H).data);
      },
      { b64, W, H },
    );
    rgbaFrames.push(Uint8ClampedArray.from(data));
    console.log(`decoded ${f.file}`);
  }
} finally {
  await browser.close().catch(() => {});
}

// 2. Median-cut a 256-color global palette over a sample of all frames' pixels.
const samples = [];
for (const rgba of rgbaFrames) {
  for (let p = 0; p < rgba.length; p += 4 * 3) samples.push([rgba[p], rgba[p + 1], rgba[p + 2]]);
}
function rangeOf(box) {
  const lo = [255, 255, 255];
  const hi = [0, 0, 0];
  for (const p of box)
    for (let c = 0; c < 3; c++) {
      if (p[c] < lo[c]) lo[c] = p[c];
      if (p[c] > hi[c]) hi[c] = p[c];
    }
  return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
}
function medianCut(pixels, n) {
  const boxes = [pixels];
  while (boxes.length < n) {
    let bi = -1;
    let bestRange = -1;
    let ch = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const r = rangeOf(boxes[i]);
      const m = Math.max(r[0], r[1], r[2]);
      if (m > bestRange) {
        bestRange = m;
        bi = i;
        ch = r[0] >= r[1] && r[0] >= r[2] ? 0 : r[1] >= r[2] ? 1 : 2;
      }
    }
    if (bi < 0) break; // every box is a single color — done
    const box = boxes[bi];
    box.sort((a, b) => a[ch] - b[ch]);
    const mid = box.length >> 1;
    boxes.splice(bi, 1, box.slice(0, mid), box.slice(mid));
  }
  return boxes.map((box) => {
    const s = [0, 0, 0];
    for (const p of box) {
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
    }
    const k = box.length || 1;
    return [Math.round(s[0] / k), Math.round(s[1] / k), Math.round(s[2] / k)];
  });
}
const palette = medianCut(samples, 256);
console.log(`palette: ${palette.length} colors`);

// 3. Map each frame's pixels to the nearest palette index (cached by 15-bit color key).
const cache = new Map();
const nearest = (r, g, b) => {
  const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const dr = r - palette[i][0];
    const dg = g - palette[i][1];
    const db = b - palette[i][2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  cache.set(key, best);
  return best;
};
const frames = rgbaFrames.map((rgba, fi) => {
  const indices = new Array(W * H);
  for (let p = 0, i = 0; i < W * H; p += 4, i++)
    indices[i] = nearest(rgba[p], rgba[p + 1], rgba[p + 2]);
  return { indices, delay: FRAMES[fi].delay };
});

// 4. Encode + write (to a temp file, then rename — so an interrupted write never
// leaves a half-encoded GIF in place; symmetry with the screenshot generator).
const gif = encodeGif({ width: W, height: H, palette, frames, loop: 0 });
const out = `${MEDIA}/descent.gif`;
const tmp = `${out}.tmp`;
writeFileSync(tmp, gif);
renameSync(tmp, out);
console.log(
  `wrote ${out} (${W}×${H}, ${frames.length} frames, ${(statSync(out).size / 1024).toFixed(0)} KB)`,
);
