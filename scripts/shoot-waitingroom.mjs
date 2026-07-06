// Verifies The Waiting Room (待合室) — the liminal municipal lobby off the drained
// deep end. The ?room=waitingroom test entrance drops straight in; the procedural
// scene (chairs, reception window, dead CRT, signs, the flickering panel) must
// render without throwing, and the HUD must name it. Any shader/geometry throw is
// caught by watchPageErrors. A screenshot is captured for visual review.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors, holdUntilDoorPrompt } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

// ?room=waitingroom drops straight in (it's otherwise a hidden door off deeppool).
await page.goto(base + '/?room=waitingroom&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('waitingroom: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'The Waiting Room')
  bad(`waitingroom: HUD room is ${JSON.stringify(title)}, expected "The Waiting Room"`);

// Let the scene settle (materials compile, the panel flicker starts), dismiss the
// first-entry overlay (best-effort), then shoot the establishing view.
await page.waitForTimeout(2400);
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
await page.waitForTimeout(600);
await page.screenshot({ path: '.shots/waitingroom.png' });

// Back up toward the +Z return door (under the EXIT sign) and prove the way back
// prompts — the room is a dead-end, so this is its one navigational contract. The
// spawn faces -Z (into the room), so 's' backpedals straight toward the door.
const sawDoor = await holdUntilDoorPrompt(page, 's', { timeout: 8000 });
if (!sawDoor) bad('waitingroom: backing up to the EXIT door never prompted — dead-end has no exit');
await page.screenshot({ path: '.shots/waitingroom-exit.png' });

console.log(
  `waitingroom -> canvas=${!!canvas} room=${JSON.stringify(title)} door=${sawDoor} errors=${failures()}`,
);

await ctx.close();
await finish('\nwaitingroom checks passed.', `\n${failures()} waitingroom check(s) FAILED`);
