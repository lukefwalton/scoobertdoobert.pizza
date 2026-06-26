// Spell-system smoke: the FIREBALL loop end-to-end. Earn it (find the scroll in
// the practice room → learn), see the hotbar light up with a full slot pool, cast
// it (the room ignites: __sdpFireball is stamped, a slot is spent, a pip drops),
// run the pool dry (a cast with no slots is a no-op that nudges, never a crash),
// then REST at the shrine (the clap refills the pool). Asserts on the durable
// store + the hotbar DOM + the ignition test hook, not on animation timing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
let errors = 0;
const bad = (m) => {
  errors++;
  console.log('FAIL:', m);
};
watchPageErrors(page, bad);

// Read the durable spell-slot count (gained − spent, clamped to the pool max=3)
// straight from the save, so a stale state can't mask a broken spend/restore.
const readSlots = () =>
  page.evaluate(() => {
    try {
      const p = JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
      const cur = (p.spellSlotsGained || 0) - (p.spellSlotsSpent || 0);
      return Math.max(0, Math.min(3, cur));
    } catch {
      return null;
    }
  });
const knowsFireball = () =>
  page.evaluate(() => {
    try {
      const p = JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
      return (p.knownSpells || []).includes('fireball');
    } catch {
      return false;
    }
  });
const litPips = () => page.$$eval('.hud-hotbar__pip.is-lit', (els) => els.length);
const fireballNonce = () => page.evaluate(() => window.__sdpFireball?.nonce ?? -1);

// ?room=practice drops straight into the practice room (where the scroll waits);
// &debug=1 exposes the pickup + cast + nav test hooks.
await page.goto(base + '/?room=practice&debug=1', { waitUntil: 'commit' });
const canvas = await page.waitForSelector('canvas', { timeout: 12000 }).catch(() => null);
if (!canvas) bad('spell: world canvas never mounted');
await page.waitForTimeout(1200); // WebGL warmup

// 0) Before learning: no hotbar, no spell known, zero slots.
const hotbarBefore = (await page.$('.hud-hotbar')) !== null;
if (hotbarBefore) bad('spell: the hotbar showed BEFORE any spell was learned');
if (await knowsFireball()) bad('spell: fireball known before the scroll was found');

// 1) Find the scroll → learn Fireball. The pickup hook is keyed by item id.
const hasPickup = await page
  .waitForFunction(() => typeof window['__sdpPickup:fireball-scroll'] === 'function', null, {
    timeout: 8000,
  })
  .then(
    () => true,
    () => false,
  );
if (!hasPickup)
  bad('spell: the fireball-scroll pickup hook never appeared (practice not mounted?)');
await page.evaluate(() => window['__sdpPickup:fireball-scroll']());

const learned = await knowsFireball();
if (!learned) bad('spell: pocketing the scroll did not learn fireball');
const learnToast = await page.waitForSelector('.hud-toast--crit-good', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (!learnToast) bad('spell: learning the scroll did not raise the “you learned” toast');

// 2) The hotbar lights up with a FULL pool (3 lit pips).
const hotbar = await page.waitForSelector('.hud-hotbar', { timeout: 4000 }).catch(() => null);
if (!hotbar) bad('spell: the hotbar never appeared after learning');
const slotsLearned = await readSlots();
if (slotsLearned !== 3) bad(`spell: a fresh caster should have 3 slots, has ${slotsLearned}`);
const pipsLearned = await litPips();
if (pipsLearned !== 3) bad(`spell: hotbar shows ${pipsLearned} lit pips, expected 3`);

// 3) Cast → the room ignites (__sdpFireball stamped), a slot is spent, a pip drops.
const n0 = await fireballNonce();
await page.evaluate(() => window.__sdpCast());
const ignited = await page
  .waitForFunction((prev) => (window.__sdpFireball?.nonce ?? -1) > prev, n0, { timeout: 4000 })
  .then(
    () => true,
    () => false,
  );
if (!ignited) bad('spell: casting did not ignite the fireball (no __sdpFireball bump)');
// The cast must push back the dark — spellcast bumps the dread relief pool.
const relief = await page.evaluate(() => window.__sdpRelief ?? 0);
if (!(relief > 0)) bad(`spell: casting did not ease the dread (relief ${relief})`);
await page.waitForTimeout(700); // let the burn reach its peak for the shot
await page.screenshot({ path: '.shots/spell-fireball.png' });
const slotsAfter1 = await readSlots();
if (slotsAfter1 !== 2) bad(`spell: a cast should leave 2 slots, left ${slotsAfter1}`);

// 4) Run the pool dry, then a no-slot cast must be a harmless no-op (nudge toast,
//    no ignition bump, slots stay 0).
await page.evaluate(() => window.__sdpCast());
await page.evaluate(() => window.__sdpCast());
const slotsEmpty = await readSlots();
if (slotsEmpty !== 0) bad(`spell: three casts should empty the pool, left ${slotsEmpty}`);
const pipsEmpty = await litPips();
if (pipsEmpty !== 0) bad(`spell: an empty pool should show 0 lit pips, shows ${pipsEmpty}`);
const nBeforeDry = await fireballNonce();
await page.evaluate(() => window.__sdpCast()); // the dry cast
await page.waitForTimeout(200);
const nAfterDry = await fireballNonce();
if (nAfterDry !== nBeforeDry) bad('spell: a no-slot cast still ignited (the dry guard is broken)');
const dryToast = await page.waitForSelector('.hud-toast--crit-bad', { timeout: 3000 }).then(
  () => true,
  () => false,
);
if (!dryToast) bad('spell: a no-slot cast did not nudge with the out-of-slots toast');

// 5) REST at the shrine: the clap refills the pool. Jump there (poll past the
//    first-entry intro that hard-blocks goToRoom), then clap via its test hook.
const atShrine = await page
  .waitForFunction(
    () => {
      const go = window.__sdpGoToRoom;
      if (typeof go !== 'function') return false;
      if (document.querySelector('.hud-room')?.textContent?.includes('Shrine')) return true;
      go('shrine', 'default');
      return false;
    },
    null,
    { timeout: 15000, polling: 500 },
  )
  .then(
    () => true,
    () => false,
  );
if (!atShrine) bad('spell: could not reach the shrine to rest');
const hasClap = await page
  .waitForFunction(() => typeof window.__sdpShrineClap === 'function', null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!hasClap) bad('spell: the shrine clap hook never appeared');
await page.evaluate(() => window.__sdpShrineClap());
await page.waitForTimeout(300);
const slotsRested = await readSlots();
if (slotsRested !== 3) bad(`spell: the shrine clap should refill to 3, has ${slotsRested}`);

// 6) The LIGHT cantrip: learn it from the scroll in the (dark) classified room,
//    then cast it — it must ignite AND be FREE (a cantrip never spends a slot).
const atClassified = await page
  .waitForFunction(
    () => {
      const go = window.__sdpGoToRoom;
      if (typeof go !== 'function') return false;
      if (document.querySelector('.hud-room')?.textContent?.includes('Classified')) return true;
      go('classified', 'default');
      return false;
    },
    null,
    { timeout: 15000, polling: 500 },
  )
  .then(
    () => true,
    () => false,
  );
if (!atClassified) bad('spell: could not reach the classified room for the light scroll');
const hasLightPickup = await page
  .waitForFunction(() => typeof window['__sdpPickup:light-scroll'] === 'function', null, {
    timeout: 8000,
  })
  .then(
    () => true,
    () => false,
  );
if (!hasLightPickup) bad('spell: the light-scroll pickup hook never appeared in classified');
await page.evaluate(() => window['__sdpPickup:light-scroll']());
const knowsLight = await page.evaluate(() => {
  try {
    return (JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').knownSpells || []).includes(
      'light',
    );
  } catch {
    return false;
  }
});
if (!knowsLight) bad('spell: pocketing the light scroll did not learn light');
// Two spells now → two hotbar slots.
const slotCount = await page.$$eval('.hud-hotbar__slot', (els) => els.length);
if (slotCount !== 2) bad(`spell: the hotbar should show 2 spell slots, shows ${slotCount}`);
// A cantrip shows ∞, not pips.
const hasCantripMark = (await page.$('.hud-hotbar__cantrip')) !== null;
if (!hasCantripMark) bad('spell: the cantrip (Light) did not show its ∞ marker');

const slotsBeforeLight = await readSlots();
const ln0 = await page.evaluate(() => window.__sdpLight?.nonce ?? -1);
await page.evaluate(() => window.__sdpCast('light'));
const litUp = await page
  .waitForFunction((prev) => (window.__sdpLight?.nonce ?? -1) > prev, ln0, { timeout: 4000 })
  .then(
    () => true,
    () => false,
  );
if (!litUp) bad('spell: casting Light did not raise the glow (no __sdpLight bump)');
await page.waitForTimeout(600);
await page.screenshot({ path: '.shots/spell-light.png' });
const slotsAfterLight = await readSlots();
if (slotsAfterLight !== slotsBeforeLight)
  bad(`spell: Light (a cantrip) spent a slot (${slotsBeforeLight} → ${slotsAfterLight})`);

// 7) No room-BLEED: cast fireball, then immediately take a door — the burn is
//    bound to the room it was cast in, so it must ABORT on the room change rather
//    than following you into the next room (the review bot's transition case).
const bn0 = await page.evaluate(() => window.__sdpFireball?.nonce ?? -1);
await page.evaluate(() => window.__sdpCast('fireball'));
await page
  .waitForFunction((p) => (window.__sdpFireball?.nonce ?? -1) > p, bn0, { timeout: 4000 })
  .catch(() => {});
await page.evaluate(() => window.__sdpGoToRoom('shrine', 'default')); // leave mid-burn
const burnAborted = await page
  .waitForFunction(() => window.__sdpFireball?.aborted === true, null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!burnAborted) bad('spell: a burn bled through a door (FX did not abort on room change)');

await ctx.close();
await browser.close();
console.log(
  `spell: learned=${learned} hotbar=${!!hotbar} pipsLearned=${pipsLearned} ignited=${ignited} ` +
    `afterCast=${slotsAfter1} empty=${slotsEmpty} dryNoop=${nAfterDry === nBeforeDry} ` +
    `rested=${slotsRested} relief=${relief.toFixed(2)} | light: learned=${knowsLight} ` +
    `slots=${slotCount} lit=${litUp} free=${slotsAfterLight === slotsBeforeLight} ` +
    `noBleed=${burnAborted} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
