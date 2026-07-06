// Escape-room grammar + the 1101 LEVEL smoke (Luke, 2026-07: "interact → the way
// opens"). Two beats:
//   1. ROOM ONE teaches it: the back-hall door is HIDDEN until you ring the counter
//      bell. Prove the before/after — no door prompt walking back at first, then
//      (after ringing the bell via its action hook) the prompt appears.
//   2. THE 1101 LEVEL: in the Tape Vault, pocketing the "1101" master reel reveals a
//      door in the wall; stepping through raises the full-screen text-adventure
//      overlay (an iframe of /1101.html), and Esc returns you to the world.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors, holdUntilDoorPrompt, roomIs } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { page, fail, finish, failures } = await startSmoke();
watchPageErrors(page, fail);
const roomHas = (name, timeout) => roomIs(page, name, { fail, timeout });

// &debug=1: a superset of ?world so the interact/pickup ACTION hooks are exposed.
await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1200);
const close = await page.$('.hud-welcome__close');
if (close) await close.click();
await page.waitForTimeout(300);

// ── 1) ROOM ONE: the bell reveals the back-hall door ────────────────────────
await roomHas('Beach Pizza Shop');
// Before ringing: walk back toward the +Z wall — the hall door is hidden, so no
// door prompt should appear.
const promptBefore = await holdUntilDoorPrompt(page, 's', { timeout: 2500 });
if (promptBefore) fail('the back-hall door prompted BEFORE the bell was rung (should be hidden)');

// Ring the counter bell with a REAL mouse CLICK on the bell mesh (its knob sits at
// world [-2.2, 0.6, -0.5]) — this exercises the actual onClick raycast → fireTrigger
// path, not just the action hook. __sdpProject maps the world point to the exact
// canvas pixel via the live camera.
const canvasBox = await page.locator('canvas').boundingBox();
await page.waitForFunction(() => typeof window.__sdpProject === 'function', null, {
  timeout: 6000,
});
const bellPx = await page.evaluate(() => window.__sdpProject([-2.2, 0.6, -0.5]));
let rang = false;
if (bellPx && bellPx[0] > 0 && bellPx[0] < 1 && bellPx[1] > 0 && bellPx[1] < 1) {
  await page.mouse.click(
    canvasBox.x + bellPx[0] * canvasBox.width,
    canvasBox.y + bellPx[1] * canvasBox.height,
  );
  await page.waitForTimeout(300);
  rang = true;
} else {
  fail(`the shop bell did not project into view for a real click (got ${JSON.stringify(bellPx)})`);
}

// After ringing: the hall door has manifested — walking back now prompts it.
const promptAfter = await holdUntilDoorPrompt(page, 's', { timeout: 6000 });
if (!promptAfter) fail('the back-hall door never appeared after ringing the bell');
await page.screenshot({ path: '.shots/escaperoom-shop.png' });

// ── 2) THE 1101 LEVEL: the tape reveals the door → the text adventure ────────
await page.evaluate(() => window.__sdpGoToRoom?.('tapevault', 'default'));
await roomHas('The Tape Vault', 10000);
await page.waitForTimeout(500);

// Pocket the "1101" master reel via its pickup hook → banks the durable secret.
const took = await page
  .waitForFunction(
    () => {
      const f = window['__sdpPickup:tape-1101'];
      if (typeof f !== 'function') return false;
      f();
      return true;
    },
    null,
    { timeout: 6000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!took) fail('could not pocket the 1101 reel (its pickup hook never appeared)');
await page.waitForTimeout(300);

// Walk toward the -Z back wall (the default spawn faces -Z) → the revealed level
// door should prompt "step into the transmission".
const levelPrompt = await page
  .waitForFunction(
    () => {
      const p = document.querySelector('.hud-prompt--door')?.textContent ?? '';
      return /transmission/i.test(p);
    },
    null,
    { timeout: 8000, polling: 300 },
  )
  .then(
    () => true,
    () => false,
  );
// help the walk along (holdUntilDoorPrompt presses a key; here we nudge forward)
if (!levelPrompt) {
  await page.keyboard.down('w');
  const reached = await page
    .waitForFunction(
      () => /transmission/i.test(document.querySelector('.hud-prompt--door')?.textContent ?? ''),
      null,
      { timeout: 8000, polling: 300 },
    )
    .then(
      () => true,
      () => false,
    );
  await page.keyboard.up('w');
  if (!reached) fail('the 1101 level door never appeared/prompted after taking the reel');
}

// Step through → the full-screen level overlay opens (the 1101 text adventure).
await page.keyboard.press('e');
const opened = await page.waitForSelector('.level-overlay', { timeout: 5000 }).then(
  () => true,
  () => false,
);
if (!opened) fail('pressing E at the level door did not open the 1101 level overlay');

let framed = false;
let storyLoaded = false;
if (opened) {
  const frameEl = await page.$('.level-frame');
  framed = !!frameEl;
  if (!framed) fail('the level overlay opened but the /1101.html iframe is missing');
  if (frameEl) {
    const src = await frameEl.getAttribute('src');
    if (src !== '/1101.html')
      fail(`level iframe src is ${JSON.stringify(src)}, expected /1101.html`);
    const frame = await frameEl.contentFrame();
    storyLoaded = await frame
      .waitForFunction(
        () =>
          document.querySelector('tw-storydata')?.getAttribute('name')?.includes('Save San Diego'),
        null,
        { timeout: 8000 },
      )
      .then(
        () => true,
        () => false,
      );
    if (!storyLoaded) fail('the embedded 1101 Twine story did not load in the level overlay');
  }
  await page.screenshot({ path: '.shots/escaperoom-level.png' });
}

// The "Return to the world" button (parent DOM, always reachable) drops the
// overlay. (Esc also works — including from inside the story's iframe — but that
// path is timing-sensitive headless, so CI gates on the primary button.)
const back = await page.$('.level-back');
if (back) await back.click();
const closed = await page
  .waitForFunction(() => !document.querySelector('.level-overlay'), null, { timeout: 4000 })
  .then(
    () => true,
    () => false,
  );
if (!closed) fail('the "Return to the world" button did not close the 1101 level overlay');

console.log(
  `escaperoom: rang=${rang} beforeHidden=${!promptBefore} revealed=${promptAfter} ` +
    `tookReel=${took} levelOpened=${opened} framed=${framed} story=${storyLoaded} closed=${closed} ` +
    `| errors=${failures()}`,
);
await finish();
