// Tiny image resizer built on the Playwright Chromium we already have (no
// sharp/convert in this env). Loads a source image into a headless page, draws
// it to a canvas at a target size, and writes the JPEG back out.
//
//   node scripts/resize-image.mjs <src> <dst> <size> [quality] [mode]
//
// size  = longest edge in px (square sources stay square)
// mode  = 'fit' (default, preserve aspect) | 'cover:WxH' (center-crop to WxH)
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const [, , src, dst, sizeArg, qualityArg = '0.85', mode = 'fit'] = process.argv;
if (!src || !dst || !sizeArg) {
  console.error('usage: resize-image.mjs <src> <dst> <size> [quality] [fit|cover:WxH]');
  process.exit(1);
}
const quality = Number(qualityArg);
const srcB64 = `data:image/jpeg;base64,${readFileSync(src).toString('base64')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const out = await page.evaluate(
  async ({ srcB64, size, quality, mode }) => {
    const img = new Image();
    img.src = srcB64;
    await img.decode();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';

    if (mode.startsWith('cover:')) {
      const [tw, th] = mode.slice(6).split('x').map(Number);
      canvas.width = tw;
      canvas.height = th;
      const scale = Math.max(tw / img.width, th / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (tw - dw) / 2, (th - dh) / 2, dw, dh);
    } else {
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    return canvas.toDataURL('image/jpeg', quality);
  },
  { srcB64, size: Number(sizeArg), quality, mode },
);
await browser.close();

const b64 = out.split(',')[1];
writeFileSync(dst, Buffer.from(b64, 'base64'));
console.log(`wrote ${dst}`);
