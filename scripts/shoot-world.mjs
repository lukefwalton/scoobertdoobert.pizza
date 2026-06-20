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
let errors = 0;
page.on('console', (m) => {
  if (m.type() === 'error') {
    errors++;
    console.log('PAGE ERR:', m.text());
  }
});
page.on('pageerror', (e) => {
  errors++;
  console.log('PAGE EXC:', e.message);
});

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
// Positive assertion: the world actually mounted (don't trust a quiet page).
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.world-exit', { timeout: 12000 });
} catch (e) {
  errors++;
  console.log('WORLD DID NOT MOUNT:', e.message);
}
await page.waitForTimeout(3000); // WebGL warmup + frames
await page.screenshot({ path: '.shots/world.png' });
await page.waitForTimeout(1600);
await page.screenshot({ path: '.shots/world2.png' });
await browser.close();
if (errors) {
  console.error(`world shots done with ${errors} page error(s) — failing.`);
  process.exit(1);
}
console.log('world shots done (no page errors).');
