// Phase 6 dice-music smoke: the d20 beside the jukebox is the CHAOS track
// selector. Navigate shop → back hall → jukebox (the direct corridor route, no
// rat detour), then CLICK the die and assert it rolled (1..20) and the jukebox
// jumped to the rolled track. Asserts on the `__sdpDice` test hook + the jukebox
// selection, not on tumble timing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { roomIs as sharedRoomIs, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};
watchPageErrors(page, fail);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail, timeout });

// ?world mounts + auto-enters the world; &debug additionally exposes the ?debug-only
// ACTION hooks. The CRIT payoff below is driven through __sdpRollDice (it forces a
// roll + durably unlocks the radio), which rides the stricter ?debug gate — so the
// run needs both, like the __sdpGoToRoom smokes.
await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const startShop = await roomIs('Beach Pizza Shop');

// shop → back hall (back up to the rear door, E).
await page.keyboard.down('s');
await page.waitForTimeout(900);
await page.keyboard.up('s');
await page.keyboard.press('e');
const inHall = await roomIs('Back Hall');

// down the long corridor to the far jukebox door (no rat detour needed). Hold
// 'w' and POLL for the prompt rather than walking a fixed time, so a slow
// machine (CI) still covers the corridor.
await page.keyboard.down('w');
await page.waitForSelector('.hud-prompt--door', { timeout: 9000 }).catch(() => {});
await page.keyboard.up('w');
await page.keyboard.press('e');
const inJuke = await roomIs('The Jukebox');
await page.waitForTimeout(800);
await page.screenshot({ path: '.shots/dice-before.png' });

// Roll the die: it sits to the right of the cabinet (world ~[2.7,1,-3.4]); from
// the entry pose it projects to roughly the lower-right of center. Click it and
// confirm a face (1..20) landed and the jukebox jumped to the rolled track.
let rolled = false;
let trackJumped = false;
if (inJuke) {
  const before = await page.evaluate(() => window.__sdpJukebox?.index);
  // Clear the hook FIRST so "roll registered" is edge-triggered: if the click
  // misses the die (e.g. a camera/layout tweak shifted its projection), the
  // wait below fails loudly instead of passing on a stale face value.
  await page.evaluate(() => {
    window.__sdpDice = undefined;
  });
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.663, box.y + box.height * 0.62);
  rolled = await page
    .waitForFunction(
      () => typeof window.__sdpDice === 'number' && window.__sdpDice >= 1 && window.__sdpDice <= 20,
      null,
      {
        timeout: 4000,
      },
    )
    .then(
      () => true,
      () => false,
    );
  if (!rolled)
    fail('clicking the d20 did not register a roll (1..20) — the click may have missed the die');
  if (rolled) {
    const face = await page.evaluate(() => window.__sdpDice);
    // The d20 rolls over the VISIBLE dial (seed + discovered songs — "hidden until
    // found"), so derive the modulus from the live visible-track count, not the
    // full catalog. We've discovered nothing on this direct shop→jukebox route, so
    // visible = the seed tracks.
    const visibleLen = (await page.evaluate(() => window.__sdpJukeboxVisible?.length)) || 1;
    const expected = (face - 1) % visibleLen;
    trackJumped = await page
      .waitForFunction((idx) => window.__sdpJukebox?.index === idx, expected, { timeout: 4000 })
      .then(
        () => true,
        () => false,
      );
    if (!trackJumped) {
      const after = await page.evaluate(() => window.__sdpJukebox?.index);
      fail(
        `roll ${face} did not set the jukebox to the mapped track (expected index ${expected}, before ${before}, after ${after})`,
      );
    }
    await page.waitForTimeout(1300); // let the tumble settle for the shot
    await page.screenshot({ path: '.shots/dice-after.png' });
  }
}

// The CRIT payoffs (DESIGN: "I rolled a 1 and got the cursed one"). The real die
// is random, so drive the nat 20 / nat 1 FACES through the ?debug force-roll hook
// and assert the matching crit is reported (the toast + dice SFX ride along; we
// assert on the deterministic __sdpDiceCrit, not on audio/animation timing).
let critPristine = false;
let critCursed = false;
if (inJuke) {
  const forceFace = async (face, want) => {
    await page.evaluate(() => {
      window.__sdpDiceCrit = undefined;
    });
    const fired = await page.evaluate((f) => {
      if (typeof window.__sdpRollDice !== 'function') return false;
      window.__sdpRollDice(f);
      return true;
    }, face);
    if (!fired) {
      fail(`__sdpRollDice missing — cannot drive the ${want} crit (is this a ?debug run?)`);
      return false;
    }
    return page
      .waitForFunction((w) => window.__sdpDiceCrit === w, want, { timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
  };
  critPristine = await forceFace(20, 'nat20');
  if (!critPristine) fail('forcing a 20 did not land the nat20 (pristine pressing) crit');
  critCursed = await forceFace(1, 'nat1');
  if (!critCursed) fail('forcing a 1 did not land the nat1 (cursed pressing) crit');
  await page.screenshot({ path: '.shots/dice-crit.png' });
}

await browser.close();
console.log(
  `dice: shop=${startShop} hall=${inHall} juke=${inJuke} rolled=${rolled} trackJumped=${trackJumped} pristine=${critPristine} cursed=${critCursed} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
