// Capture the 3D world (entered via the ?world debug trigger). Logs page
// console errors + exceptions so shader/WebGL failures surface here.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
  } catch {
    /* ignore */
  }
});
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') console.log('PAGE ERR:', m.text());
});
page.on('pageerror', (e) => console.log('PAGE EXC:', e.message));

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
await page.waitForTimeout(4000); // lazy three chunk + WebGL warmup + frames
await page.screenshot({ path: '.shots/world.png' });
await page.waitForTimeout(1600);
await page.screenshot({ path: '.shots/world2.png' });
await browser.close();
console.log('world shots done');
