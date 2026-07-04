// Verifies the directed-play HUD: the always-on objective chip shows your next
// undone objective, and the compass arrow actually points at the next-hop door
// (cross-checked against the live camera pose), and tracks as you turn.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

// The same clockwise bearing the app computes (yaw − bearing), in degrees.
const expectDeg = (tx, tz, hx, hz, yaw) => {
  let rel = yaw - Math.atan2(tx - hx, tz - hz);
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  return (rel * 180) / Math.PI;
};
const angDiff = (a, b) => {
  const d = ((a - b + 540) % 360) - 180;
  return Math.abs(d);
};
const readArrow = async () => {
  const s = await page.evaluate(
    () => document.querySelector('.hud-objective__arrow')?.getAttribute('style') || '',
  );
  const m = s.match(/rotate\(([-\d.]+)deg\)/);
  return m ? parseFloat(m[1]) : null;
};
const cam = () => page.evaluate(() => window.__sdpCam);

// Seed progress so the next undone objective is "pocket the rusted key" (poolrooms),
// which is reachable from the jukebox via the +X juke-to-pool door at [5.95,0,0].
await page.addInitScript(() => {
  localStorage.setItem(
    'sdp_progress_v1',
    JSON.stringify({
      everEnteredWorld: true,
      luckEarned: 2,
      radioUnlocked: true,
      visitedRooms: ['shop', 'hallway', 'jukebox'],
      // The surface-wing objectives (the garden slide, the Turtle's stage) sit
      // ahead of the rusted key in QUESTS order — seed them done so the chip
      // points at the poolrooms key this smoke walks toward.
      secretsFound: ['jump-unlocked', 'garden-slide', 'turtle-stage'],
      itemsHeld: [],
    }),
  );
});
await page.goto(base + '/?room=jukebox&debug=1', { waitUntil: 'networkidle' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 15000 })
  .catch(() => bad('world never mounted'));
await page.waitForTimeout(1200);

const DOOR = [5.95, 0]; // juke-to-pool

let label = '';
let arrowOk = false;
let trackOk = false;
const chip = await page.waitForSelector('.hud-objective', { timeout: 6000 }).catch(() => null);
if (!chip) bad('objective: chip never appeared');
else {
  label = (await page.$eval('.hud-objective__label', (e) => e.textContent || '')).trim();
  if (!/rusted key/i.test(label)) bad(`objective: wrong label ${JSON.stringify(label)}`);

  // Arrow matches the bearing to the next-hop door from the live camera pose.
  const c1 = await cam();
  const a1 = await readArrow();
  if (a1 === null) bad('objective: no compass arrow rendered');
  else {
    const want1 = expectDeg(DOOR[0], DOOR[1], c1.x, c1.z, c1.yaw);
    arrowOk = angDiff(a1, want1) < 5;
    if (!arrowOk) bad(`objective: arrow ${a1.toFixed(1)}° vs expected ${want1.toFixed(1)}°`);
  }

  // Turn (hold ArrowLeft) and confirm the arrow tracks the new heading.
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(200);
  const c2 = await cam();
  const a2 = await readArrow();
  const want2 = expectDeg(DOOR[0], DOOR[1], c2.x, c2.z, c2.yaw);
  trackOk = a2 !== null && angDiff(a2, want2) < 6;
  if (!trackOk)
    bad(`objective: arrow did not track the turn (got ${a2}, want ${want2.toFixed(1)})`);
  await page.screenshot({ path: '.shots/objective.png' });
}

console.log(
  `objective -> chip=${!!chip} label=${JSON.stringify(label)} arrow=${arrowOk} track=${trackOk} errors=${failures()}`,
);

await ctx.close();
await finish('\nobjective checks passed.', `\n${failures()} objective check(s) FAILED`);
