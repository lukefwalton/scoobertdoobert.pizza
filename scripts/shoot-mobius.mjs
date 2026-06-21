// Phase 6 Möbius smoke: the looping corridor below the pool. Navigate
// shop → poolrooms → the long corridor, then walk the FORWARD door repeatedly —
// each lap must drop you back at the corridor's start (same room) and tick the
// lap count up. After MOBIUS_BREAK laps the loop "breaks on its own": a door
// that wasn't there is revealed and steps you out somewhere else (the shop).
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

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const startShop = await roomIs('Beach Pizza Shop');
// shop → pool (strafe +X to the stairwell door), pool → corridor (strafe +X again).
if (!(await toDoor('d'))) fail('pool door prompt never appeared');
const inPool = await roomIs('The Poolrooms');
if (!(await toDoor('d'))) fail('corridor door prompt never appeared in the pool');
const inCorridor = await roomIs('The Long Corridor');
await page.screenshot({ path: '.shots/mobius-corridor.png' });
const lapsFresh = await laps(); // a fresh arrival resets the count to 0
if (lapsFresh !== 0) fail(`fresh corridor entry did not reset laps (got ${lapsFresh})`);

// Walk the forward (loop) door BREAK times — each lap returns to the corridor and
// ticks the count. The far door is straight ahead (-Z) from the start spawn.
let looped = 0;
let stayedInLoop = true;
for (let i = 1; i <= BREAK; i++) {
  if (!(await toDoor('w'))) {
    fail(`forward (loop) door prompt never appeared on lap ${i}`);
    break;
  }
  const still = await roomIs('The Long Corridor', 6000);
  if (!still) {
    stayedInLoop = false;
    break;
  }
  const ok = await page
    .waitForFunction((n) => (window.__sdpMobius ?? 0) >= n, i, { timeout: 4000 })
    .then(() => true, () => false);
  if (!ok) fail(`lap ${i} did not register (count ${await laps()})`);
  else looped = i;
}
const lapsCounted = (await laps()) >= BREAK;
if (!lapsCounted) fail(`looping did not reach MOBIUS_BREAK (count ${await laps()})`);
await page.screenshot({ path: '.shots/mobius-looped.png' });

// The loop has broken: a door that wasn't there is now revealed near the far
// end's -X wall. Walk up to it and step through → pop out in the shop.
let escaped = false;
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
    escaped = await roomIs('Beach Pizza Shop');
    if (!escaped) fail('the onward door did not pop the player out to the shop');
  }
}

await browser.close();
console.log(
  `mobius: shop=${startShop} pool=${inPool} corridor=${inCorridor} freshReset=${lapsFresh === 0} ` +
    `looped=${looped}/${BREAK} stayedInLoop=${stayedInLoop} broke=${lapsCounted} escaped=${escaped} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
