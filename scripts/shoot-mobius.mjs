// Phase 6 Möbius smoke: the looping corridor (warped into directly via ?room=).
// Walk the FORWARD door once — it must drop you back at the corridor's start
// (same room) and tick the lap count up — then fast-forward to MOBIUS_BREAK. At
// the break the loop "breaks on its own": a door that wasn't there is revealed
// and drops you DOWN to the liminal (the level's earned way down — the descent
// fires the waterfall overlay).
//
// Asserts on the `.hud-room` label + the `__sdpMobius` lap hook, not on timing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
const BREAK = 3; // MOBIUS_BREAK in src/data/rooms.ts
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') fail(`console: ${m.text()}`);
});

const roomIs = (name, timeout = 8000) =>
  page
    .waitForFunction(
      (n) => document.querySelector('.hud-room')?.textContent?.includes(n) ?? false,
      name,
      { timeout },
    )
    .then(() => true, () => (fail(`room never became "${name}"`), false));
const toDoor = async (key, timeout = 6000) => {
  await page.keyboard.down(key);
  let ok = false;
  try {
    await page.waitForSelector('.hud-prompt--door', { timeout });
    ok = true;
  } catch {
    /* asserted by caller */
  }
  await page.keyboard.up(key);
  if (ok) await page.keyboard.press('e');
  return ok;
};
const laps = () => page.evaluate(() => window.__sdpMobius ?? 0);

// Warp straight into the corridor (?room=ID). The surface → jukebox → pool →
// corridor walk is covered by shoot-rooms; this smoke is about the LOOP itself,
// so a direct warp keeps it tight now that the way down lives deep.
await page.goto(base + '/?room=mobius&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const inCorridor = await roomIs('The Long Corridor');
await page.screenshot({ path: '.shots/mobius-corridor.png' });
const lapsFresh = await laps(); // a fresh arrival resets the count to 0
if (lapsFresh !== 0) fail(`fresh corridor entry did not reset laps (got ${lapsFresh})`);

// ONE physical lap proves the loop mechanic: walking the forward door drops you
// back at the corridor's start (same room) and ticks the lap count. Then we
// fast-forward the remaining laps via the gated __sdpLoopMobius hook — driving
// multiple physical laps is flaky, and the single lap already covers the
// mechanic; this keeps REACHING the break deterministic.
let looped = 0;
let stayedInLoop = true;
if (!(await toDoor('w'))) {
  fail('forward (loop) door prompt never appeared on lap 1');
} else {
  stayedInLoop = await roomIs('The Long Corridor', 6000);
  const ok = await page
    .waitForFunction(() => (window.__sdpMobius ?? 0) >= 1, null, { timeout: 4000 })
    .then(() => true, () => false);
  if (!ok) fail(`lap 1 did not register (count ${await laps()})`);
  else looped = 1;
}
// fast-forward to the break (≥ MOBIUS_BREAK total) via the gated hook.
await page.evaluate((n) => {
  for (let i = 0; i < n; i++) window.__sdpLoopMobius?.();
}, BREAK);
const lapsCounted = (await laps()) >= BREAK;
if (!lapsCounted) fail(`looping did not reach MOBIUS_BREAK (count ${await laps()})`);
await page.screenshot({ path: '.shots/mobius-looped.png' });

// The loop has broken: a door that wasn't there is now revealed near the far
// end's -X wall. Walk up to it and step through → the floor drops away DOWN to
// the liminal (the level's EARNED way down). That descent rides the waterfall
// overlay, so seeing it fire proves the onward door leads down to the liminal.
let descended = false;
if (lapsCounted) {
  // Walk forward-AND-left toward the new door (it's in the -X wall, ~z=-9):
  // holding both pins us along the -X wall heading down-corridor, and we POLL
  // for the prompt rather than walking a fixed time — robust on a slow machine.
  await page.keyboard.down('w');
  await page.keyboard.down('a');
  const prompted = await page
    .waitForSelector('.hud-prompt--door', { timeout: 9000 })
    .then(() => true, () => false);
  await page.keyboard.up('w');
  await page.keyboard.up('a');
  if (!prompted) fail('the broken-loop "onward" door never prompted');
  if (prompted) {
    await page.keyboard.press('e');
    descended = await page
      .waitForSelector('.hud-waterfall--on', { timeout: 2500 })
      .then(() => true, () => false);
    if (!descended) fail('the onward door did not descend into the liminal (no waterfall fired)');
  }
}

await browser.close();
console.log(
  `mobius: corridor=${inCorridor} freshReset=${lapsFresh === 0} ` +
    `looped=${looped}/${BREAK} stayedInLoop=${stayedInLoop} broke=${lapsCounted} descended=${descended} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
