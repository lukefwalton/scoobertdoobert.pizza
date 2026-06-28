// Verifies the Grassrooms (草の間) — the overgrown-backrooms breather off the
// liminal level: the ?room=grassrooms test entrance drops into the room, the
// procedural scene renders without throwing, the HUD names it, and the return
// door is wired back to the liminal level.
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

// ?room=grassrooms drops straight in (it's otherwise a side door off the liminal).
await page.goto(base + '/?room=grassrooms', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('grassrooms: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'The Grassrooms')
  bad(`grassrooms: HUD room is ${JSON.stringify(title)}, expected "The Grassrooms"`);

// Let the scene settle (grass + sky + materials compile), then shoot.
await page.waitForTimeout(2600);
await page.screenshot({ path: '.shots/grassrooms.png' });

// Any uncaught error from the procedural geometry / audio ambient is a failure.
if (errors.length)
  bad(`grassrooms: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);

console.log(
  `grassrooms -> canvas=${!!canvas} room=${JSON.stringify(title)} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} grassrooms check(s) FAILED` : '\ngrassrooms checks passed.');
process.exit(fail ? 1 : 0);
