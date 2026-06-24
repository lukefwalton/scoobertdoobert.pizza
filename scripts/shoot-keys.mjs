// Verifies the inventory + keys loop end-to-end across BOTH slices, using the
// real in-world doors (not teleports): in the poolrooms — pickup → Pockets →
// locked STAFF door blocks → unlock → reward room → persists across reload; and
// in the back hall — the brass key → locked SUPPLY closet → unlock → reward —
// proving the mechanic generalizes. (Lock-blocks/opens logic is also unit-tested
// in src/lib/doorTravel.test.ts.)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

const KEY = 'pool-locker-key';
const held = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').itemsHeld || [];
    } catch {
      return [];
    }
  });

// Fresh state, then into the poolrooms with the pickup test hook (&debug=1).
await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'commit' });
await page.evaluate(() => localStorage.clear());
await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('keys: world canvas never mounted');

const hasHook = await page
  .waitForFunction(() => typeof window[`__sdpPickup:${'pool-locker-key'}`] === 'function', null, {
    timeout: 8000,
  })
  .then(
    () => true,
    () => false,
  );
if (!hasHook) bad('keys: __sdpPickup hook never appeared (pickup not mounted?)');

// Hold movement keys until a selector appears (then release). The poolrooms
// spawn faces -Z; A strafes -X and W walks -Z, so A+W heads toward the locked
// STAFF door in the far -X corner. Generous timeout for a slow CI runner.
const holdUntil = async (selector, keys = ['a', 'w'], timeout = 12000) => {
  for (const k of keys) await page.keyboard.down(k);
  const ok = await page.waitForSelector(selector, { timeout }).then(
    () => true,
    () => false,
  );
  for (const k of keys) await page.keyboard.up(k);
  return ok;
};
// The STAFF door prompt, specifically, showing UNLOCKED (its own label + no locked
// class) — distinguishes the locker door from the other poolrooms doors and from
// its own locked state.
const staffUnlockedPrompt = () => {
  const el = document.querySelector('.hud-prompt--door');
  return (
    !!el && /STAFF ONLY/i.test(el.textContent || '') && !el.classList.contains('hud-prompt--locked')
  );
};
// Walk (hold keys) until a browser predicate holds (then release).
const holdUntilFn = async (fn, keys = ['a', 'w'], timeout = 12000) => {
  for (const k of keys) await page.keyboard.down(k);
  const ok = await page.waitForFunction(fn, null, { timeout }).then(
    () => true,
    () => false,
  );
  for (const k of keys) await page.keyboard.up(k);
  return ok;
};
const roomLabel = async () => {
  const el = await page.$('.hud-room');
  return el ? ((await el.textContent()) ?? '').trim() : '';
};

let lockedBlocked = false;
let pocketed = false;
let inPocketsList = false;
let unlockedViaDoor = false;
let lockerOk = false;
let rewardToast = false;
let persisted = false;
let closetPocketed = false;
let closetOk = false;

if (hasHook) {
  const before = await held();
  if (before.includes(KEY)) bad('keys: started already holding the key (state not fresh)');

  // 1) The REAL locked door blocks: walk up to it (no key yet), confirm the locked
  //    prompt, press E, and confirm we did NOT travel — exercising the full
  //    proximity → prompt → E → enterDoor wiring, not a teleport.
  if (!(await holdUntil('.hud-prompt--locked'))) bad('keys: never reached the locked STAFF door');
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
  lockedBlocked = /Poolrooms/i.test(await roomLabel());
  if (!lockedBlocked) bad('keys: pressing E on the LOCKED door still navigated away');

  // 2) Pocket the key (deterministic via the hook — collecting a bobbing target
  //    through Playwright is flaky), confirm the announce + durable inventory.
  await page.evaluate((k) => window[`__sdpPickup:${k}`](), KEY);
  const toast = await page.waitForSelector('.hud-toast--luck', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!toast) bad('keys: pocketing the key raised no announce toast');
  pocketed = (await held()).includes(KEY);
  if (!pocketed) bad('keys: itemsHeld did not gain the key after pickup');

  // Pause menu "Pockets" shows it.
  await page.keyboard.press('Escape');
  const inv = await page
    .waitForSelector('.hud-pause__invlist li', { timeout: 4000 })
    .catch(() => null);
  const invText = inv ? ((await inv.textContent()) ?? '').trim() : '';
  inPocketsList = /Locker Key/i.test(invText);
  if (!inPocketsList) bad(`keys: pause "Pockets" missing the key (saw ${JSON.stringify(invText)})`);
  await page.screenshot({ path: '.shots/keys.png' });
  await page.keyboard.press('Escape');

  // 3) Still standing at the door, now holding the key: the prompt flips from
  //    locked → "open the STAFF ONLY door". Press E and travel through the REAL
  //    door into the reward room, which pays out on first entry.
  unlockedViaDoor = await page.waitForFunction(staffUnlockedPrompt, null, { timeout: 6000 }).then(
    () => true,
    () => false,
  );
  if (!unlockedViaDoor) bad('keys: locked prompt did not flip to "open" after pocketing the key');
  await page.keyboard.press('e');
  // Assert the REWARD toast specifically (by its text), not just "some luck toast"
  // — the pickup toast is also .hud-toast--luck, so a generic wait could be
  // satisfied by a lingering pickup toast even if the reward regressed.
  rewardToast = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('.hud-toast--luck');
        return !!el && /locker hums|fortune kept/i.test(el.textContent || '');
      },
      null,
      { timeout: 6000 },
    )
    .then(
      () => true,
      () => false,
    );
  await page.waitForTimeout(400);
  lockerOk = /Staff Locker Room/i.test(await roomLabel());
  if (!lockerOk) bad('keys: real locked door did not open into the Staff Locker Room');
  if (!rewardToast) bad('keys: first entry to the locker room paid no reward toast');

  // 4) Persisted unlock, end-to-end: after a reload the key is still held AND the
  //    REAL door rehydrates as unlocked and transitions (not just localStorage).
  await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => {});
  persisted = (await held()).includes(KEY);
  if (!persisted) bad('keys: key did not persist across reload');
  const unlockedAfterReload = await holdUntilFn(staffUnlockedPrompt);
  if (!unlockedAfterReload) bad('keys: persisted key did not re-unlock the real door after reload');
  else {
    await page.keyboard.press('e');
    await page.waitForTimeout(600);
    if (!/Staff Locker Room/i.test(await roomLabel()))
      bad('keys: persisted-unlock did not transition through the real door after reload');
  }

  // 5) The SECOND slice — the hallway's brass key → locked SUPPLY closet — proves
  //    the key/lock mechanic generalizes (not a one-off). The hall spawn faces -Z,
  //    so D+W heads to the +X SUPPLY door. Same contract: locked blocks, pocket
  //    the key, the real door opens into the reward nook.
  await page.goto(base + '/?room=hallway&debug=1', { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => {});
  const supplyUnlocked = () => {
    const el = document.querySelector('.hud-prompt--door');
    return (
      !!el && /SUPPLY/i.test(el.textContent || '') && !el.classList.contains('hud-prompt--locked')
    );
  };
  if (!(await holdUntil('.hud-prompt--locked', ['d', 'w']))) {
    bad('keys: never reached the locked SUPPLY door');
  } else {
    await page.keyboard.press('e');
    await page.waitForTimeout(600);
    if (!/Back Hall/i.test(await roomLabel()))
      bad('keys: E on the locked SUPPLY door navigated away');
    await page.evaluate(() => window['__sdpPickup:hall-closet-key']());
    closetPocketed = (await held()).includes('hall-closet-key');
    if (!closetPocketed) bad('keys: itemsHeld did not gain the brass key after pickup');
    if (
      await page.waitForFunction(supplyUnlocked, null, { timeout: 6000 }).then(
        () => true,
        () => false,
      )
    ) {
      await page.keyboard.press('e');
      const r = await page
        .waitForFunction(
          () => {
            const el = document.querySelector('.hud-toast--luck');
            return !!el && /tip jar|finders keepers/i.test(el.textContent || '');
          },
          null,
          { timeout: 6000 },
        )
        .then(
          () => true,
          () => false,
        );
      await page.waitForTimeout(400);
      closetOk = /Supply Closet/i.test(await roomLabel()) && r;
    }
    if (!closetOk) bad('keys: brass key did not open the SUPPLY closet with its reward');
  }
}

if (errors.length) bad(`keys: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `keys     -> canvas=${!!canvas} hook=${hasHook} lockedBlocked=${lockedBlocked} pocketed=${pocketed} pockets=${inPocketsList} unlockedViaDoor=${unlockedViaDoor} lockerRoom=${lockerOk} reward=${rewardToast} persisted=${persisted} closetPocketed=${closetPocketed} closet=${closetOk} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} keys check(s) FAILED` : '\nkeys checks passed.');
process.exit(fail ? 1 : 0);
