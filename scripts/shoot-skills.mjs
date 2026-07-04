// Verifies the SKILL-LEARN loop in the FIRST room: you arrive in the beach shop
// unable to jump; a glowing JUMP skill orb floats in view; learning it (the
// deterministic orb hook) turns Space into a hop. This is the "learn a skill
// right where you start" beat + the earned-not-granted contract, end to end.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors, roomIs as sharedRoomIs } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);
const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail: bad, timeout });

// Cold start — no seeded progress, so jump is genuinely unlearned.
await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
const inShop = await roomIs('Beach Pizza Shop');
await page.screenshot({ path: '.shots/skills-shop.png' });

// 1) Before learning: Space must do NOTHING (the verb isn't earned yet).
const eyeY = await page.evaluate(() => window.__sdpCam?.y ?? 0);
await page.keyboard.down(' ');
const hoppedBefore = await page
  .waitForFunction((y0) => (window.__sdpCam?.y ?? 0) > y0 + 0.25, eyeY, { timeout: 1200 })
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up(' ');
if (hoppedBefore) bad('Space hopped BEFORE learning jump — the skill gate is open');

// 2) PHYSICALLY walk into the shop orb (the real "earned by touching it" path,
//    not the debug grant hook) — the orb floats ahead-right of the spawn, so
//    forward + strafe-right reaches it. Poll for the durable secret to bank.
const jumpSecret = () =>
  page.evaluate(() => {
    try {
      return (
        JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || []
      ).includes('jump-unlocked');
    } catch {
      return false;
    }
  });
await page.keyboard.down('w');
await page.keyboard.down('d');
const learned = await page
  .waitForFunction(
    () => {
      try {
        return (
          JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || []
        ).includes('jump-unlocked');
      } catch {
        return false;
      }
    },
    { timeout: 6000 },
  )
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up('w');
await page.keyboard.up('d');
if (!learned) bad('walking into the shop orb did not learn JUMP (proximity pickup broken)');
// belt-and-suspenders: if the physical walk somehow missed, the secret read is
// authoritative — surface it either way.
if (learned && !(await jumpSecret())) bad('jump secret not banked after the orb pickup');
await page.waitForTimeout(300);

// 3) After learning: Space hops, and lands back on the eye line.
const eyeY2 = await page.evaluate(() => window.__sdpCam?.y ?? 0);
await page.keyboard.down(' ');
const hoppedAfter = await page
  .waitForFunction((y0) => (window.__sdpCam?.y ?? 0) > y0 + 0.25, eyeY2, { timeout: 2000 })
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up(' ');
if (!hoppedAfter) bad('Space did not hop AFTER learning jump (grant did not reach Controls)');
const landed = await page
  .waitForFunction((y0) => Math.abs((window.__sdpCam?.y ?? 0) - y0) < 0.06, eyeY2, {
    timeout: 2500,
  })
  .then(
    () => true,
    () => false,
  );
if (!landed) bad('the jump never settled back to the ground');

console.log(
  `skills -> shop=${inShop} gated=${!hoppedBefore} learned=${learned} ` +
    `jumpWorks=${hoppedAfter} landed=${landed} errors=${failures()}`,
);

await ctx.close();
await finish('\nskills checks passed.', `\n${failures()} skills check(s) FAILED`);
