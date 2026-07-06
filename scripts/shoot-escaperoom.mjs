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

// ── 1) ROOM ONE: the bell reveals the back-hall door — via the SHARED E VERB ──
// The FTUE fix (2026-07): the counter bell now answers the same "Press E" / touch
// action the rest of the world teaches, not just a mouse click — so a keyboard-only
// player can ring it and get downstairs. Prove the whole chain: hidden door → the
// bell's interact PROMPT appears on approach → keyboard E fires it → hall manifests.
// (The mouse-click + action-hook fire paths stay covered by shoot:rooms' bell rings.)
await roomHas('Beach Pizza Shop');
// Before ringing: the hall door is hidden, so walking back shows no door prompt.
const promptBefore = await holdUntilDoorPrompt(page, 's', { timeout: 2500 });
if (promptBefore) fail('the back-hall door prompted BEFORE the bell was rung (should be hidden)');

// Force proximity to the bell (the __sdpNearInteractable scanner hook, mirroring
// lookables) so the interact prompt shows deterministically without pixel-walking.
await page.waitForFunction(() => typeof window.__sdpNearInteractable === 'function', null, {
  timeout: 6000,
});
await page.evaluate(() => window.__sdpNearInteractable());
const bellPrompt = await page
  .waitForFunction(
    () =>
      /ring the counter bell/i.test(
        document.querySelector('.hud-prompt--interact')?.textContent ?? '',
      ),
    null,
    { timeout: 5000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!bellPrompt) fail('the counter bell never showed its "Press E" interact prompt on approach');

// Ring it via the SHARED VERB — keyboard E, not a mouse click. This IS the fix.
let rang = false;
if (bellPrompt) {
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  rang = true;
}

// After ringing: the hall door has manifested — walking back now prompts it.
const promptAfter = await holdUntilDoorPrompt(page, 's', { timeout: 6000 });
if (!promptAfter) fail('the back-hall door never appeared after ringing the bell via E');
await page.screenshot({ path: '.shots/escaperoom-shop.png' });

// ── 2) THE 1101 LEVEL: the tape reveals the door → the text adventure ────────
// Reach the vault via __sdpGoToRoom (the sanctioned way to reach a deep room — the
// REAL studio traversal, forward-walking control→vault, is covered by shoot:studio).
await page.evaluate(() => window.__sdpGoToRoom?.('tapevault', 'default'));
await roomHas('The Tape Vault', 10000);
await page.waitForTimeout(500);

// The REAL player path: the spawn faces -Z down the shelves; the "1101" reel sits at
// z≈-3.2 and the (hidden) level door behind it at z≈-4.95. WALK forward ('w') — the
// reel AUTO-GRABS on walk-over (the real pickup path, not the __sdpPickup hook: a
// bobbing target is fragile to click but reliable to walk into), banking the durable
// secret → the level door manifests ahead and prompts "step into the transmission".
// The "transmission" door prompt appearing PROVES the whole real chain: walked →
// auto-grabbed the reel → its findSecret revealed the (hidden) level door → prompt.
await page.keyboard.down('w');
const reached = await page
  .waitForFunction(
    () => /transmission/i.test(document.querySelector('.hud-prompt--door')?.textContent ?? ''),
    null,
    { timeout: 10000, polling: 200 },
  )
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up('w');
if (!reached)
  fail('walking into the 1101 reel did not auto-grab it + reveal the level door (real path)');
const took = reached; // the reveal is caused by the grab, so this attests both

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
  `escaperoom: prompt=${bellPrompt} rangViaE=${rang} beforeHidden=${!promptBefore} revealed=${promptAfter} ` +
    `tookReel=${took} levelOpened=${opened} framed=${framed} story=${storyLoaded} closed=${closed} ` +
    `| errors=${failures()}`,
);
await finish();
