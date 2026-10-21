// Verifies the Grassrooms (草の間) — the big overgrown-backrooms breather off the
// liminal level: the ?room=grassrooms test entrance drops into the room, the
// procedural scene (grass + sky + the office bones + the wind/furin ambient)
// renders without throwing, and the HUD names it. (The 3D ghost race that used to
// run around this room was cut in the 2026-10 complexity pass.)
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail: bad, finish, failures } = await launchSmoke();

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => bad(`grassrooms pageerror: ${e.message}`));

// ?room=grassrooms drops straight in (it's otherwise a side door off the liminal).
await page.goto(base + '/?room=grassrooms&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('grassrooms: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'The Grassrooms')
  bad(`grassrooms: HUD room is ${JSON.stringify(title)}, expected "The Grassrooms"`);

// Let the scene settle (grass + sky + materials compile, the ambient's first
// breeze), then wander a little so the ambient scheduler ticks, and shoot.
await page.waitForTimeout(2600);
await page.keyboard.down('w');
await page.waitForTimeout(900);
await page.keyboard.up('w');
await page.screenshot({ path: '.shots/grassrooms.png' });

// Any uncaught error from the procedural geometry / audio ambient is caught by
// the pageerror listener (→ bad).
console.log(`grassrooms -> canvas=${!!canvas} room=${JSON.stringify(title)} errors=${failures()}`);

await ctx.close();
await finish('\ngrassrooms checks passed.', `\n${failures()} grassrooms check(s) FAILED`);
