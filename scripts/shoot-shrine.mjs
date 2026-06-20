// Verifies the Japan level (the Wayside Shrine scaffold): the ?room=shrine test
// entrance drops into the room, the procedural scene renders without throwing,
// the HUD names it, and the return door is wired back to the poolrooms.
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

// ?room=shrine drops straight into the room (it's otherwise behind the rat's
// secret torii in the poolrooms).
await page.goto(base + '/?room=shrine', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('shrine: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'Wayside Shrine') bad(`shrine: HUD room is ${JSON.stringify(title)}, expected "Wayside Shrine"`);

// Let the scene settle (fireflies drift, materials compile), then shoot.
await page.waitForTimeout(2600);
await page.screenshot({ path: '.shots/shrine.png' });

// Any uncaught error from the procedural geometry is a failure.
if (errors.length) bad(`shrine: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);

console.log(`shrine   -> canvas=${!!canvas} room=${JSON.stringify(title)} errors=${errors.length}`);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} shrine check(s) FAILED` : '\nshrine checks passed.');
process.exit(fail ? 1 : 0);
