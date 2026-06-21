// Verifies the game layer's LUCK loop end-to-end: the shrine clap ritual earns
// luck, a toast announces it, and the pause menu shows the stat. (The d20 itself —
// luck-biased rolls + nat20/crit-fail 3× — is unit-tested in src/lib/luck.test.ts;
// this covers the in-world earn + display path.)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

// ?room=shrine drops into the shrine; &debug=1 exposes the clap test hook.
await page.goto(base + '/?room=shrine&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('luck: world canvas never mounted');

// Wait for the offering-box clap hook to be wired.
const hasHook = await page
  .waitForFunction(() => typeof window.__sdpShrineClap === 'function', null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!hasHook) bad('luck: __sdpShrineClap hook never appeared (shrine not mounted?)');

let toast = false;
let pauseLuck = '';
if (hasHook) {
  // Perform the ritual (clap clap → +1 luck), then check the announce toast.
  await page.evaluate(() => window.__sdpShrineClap());
  toast = await page.waitForSelector('.hud-toast--luck', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!toast) bad('luck: clapping did not raise the luck announce toast');
  await page.screenshot({ path: '.shots/luck.png' });

  // Open the pause menu and read the luck stat (should be at least 1).
  await page.keyboard.press('Escape');
  const luckEl = await page
    .waitForSelector('.hud-pause__luck strong', { timeout: 4000 })
    .catch(() => null);
  pauseLuck = luckEl ? ((await luckEl.textContent()) ?? '').trim() : '';
  if (!(Number(pauseLuck) >= 1))
    bad(`luck: pause menu shows luck ${JSON.stringify(pauseLuck)}, expected >= 1`);
}

if (errors.length) bad(`luck: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `luck     -> canvas=${!!canvas} hook=${hasHook} toast=${toast} pauseLuck=${JSON.stringify(pauseLuck)} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} luck check(s) FAILED` : '\nluck checks passed.');
process.exit(fail ? 1 : 0);
