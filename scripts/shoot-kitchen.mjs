// Verifies The Kitchen — the pizza shop's back-of-house off the -X "EMPLOYEES
// ONLY" door. The ?room=kitchen test entrance drops into the room, the warm
// procedural scene (oven, prep counter, pot rail) renders without throwing, the
// HUD names it, and the rack of tuned PIZZA PANS — the reused in-world instrument,
// the site's thesis at its source — strikes by its deterministic hook.
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

// ?room=kitchen drops straight into the room (it's otherwise behind the shop's
// "EMPLOYEES ONLY" door). ?debug exposes the pan-strike test hook.
await page.goto(base + '/?room=kitchen&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('kitchen: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'The Kitchen')
  bad(`kitchen: HUD room is ${JSON.stringify(title)}, expected "The Kitchen"`);

// Let the scene settle (materials compile, the oven glows), then shoot.
await page.waitForTimeout(2200);
await page.screenshot({ path: '.shots/kitchen.png' });

// The thesis, made playable: strike a pizza pan. Clicking a 3D pan through
// Playwright is camera-fragile, so drive the deterministic strike hook;
// __sdpPans carries the last strike's note (index 0 = the C4 pan).
const panStruck = await page.evaluate(() => {
  if (typeof window.__sdpStrikePan !== 'function') return { err: 'no strike hook' };
  window.__sdpStrikePan(0);
  return window.__sdpPans ?? { err: 'no __sdpPans after strike' };
});
const panOk = !!panStruck && panStruck.note === 'C' && panStruck.octave === 4;
if (!panOk)
  fail(
    `kitchen: striking a pizza pan did not register the right note (got ${JSON.stringify(panStruck)})`,
  );

// Any uncaught error from the procedural geometry / instrument is a failure.
if (errors.length)
  bad(`kitchen: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);

console.log(
  `kitchen  -> canvas=${!!canvas} room=${JSON.stringify(title)} pan=${panOk} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} kitchen check(s) FAILED` : '\nkitchen checks passed.');
process.exit(fail ? 1 : 0);
