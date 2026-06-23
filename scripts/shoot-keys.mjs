// Verifies the inventory + keys loop end-to-end: pick the rusted locker key up in
// the poolrooms (it lands in the durable inventory + announces), see it in the
// pause-menu "Pockets", confirm it PERSISTS across a reload, and confirm the
// locked STAFF ONLY door's reward room renders. (The lock-blocks/opens logic
// itself is unit-tested in src/lib/doorTravel.test.ts.)
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
  unlockedViaDoor = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('.hud-prompt--door');
        return (
          !!el &&
          /STAFF ONLY/i.test(el.textContent || '') &&
          !el.classList.contains('hud-prompt--locked')
        );
      },
      null,
      { timeout: 6000 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!unlockedViaDoor) bad('keys: locked prompt did not flip to "open" after pocketing the key');
  await page.keyboard.press('e');
  rewardToast = await page.waitForSelector('.hud-toast--luck', { timeout: 6000 }).then(
    () => true,
    () => false,
  );
  await page.waitForTimeout(400);
  lockerOk = /Staff Locker Room/i.test(await roomLabel());
  if (!lockerOk) bad('keys: real locked door did not open into the Staff Locker Room');
  if (!rewardToast) bad('keys: first entry to the locker room paid no reward toast');

  // 4) The key persists across a reload (durable inventory).
  await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'networkidle' });
  persisted = (await held()).includes(KEY);
  if (!persisted) bad('keys: key did not persist across reload');
}

if (errors.length) bad(`keys: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `keys     -> canvas=${!!canvas} hook=${hasHook} lockedBlocked=${lockedBlocked} pocketed=${pocketed} pockets=${inPocketsList} unlockedViaDoor=${unlockedViaDoor} lockerRoom=${lockerOk} reward=${rewardToast} persisted=${persisted} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} keys check(s) FAILED` : '\nkeys checks passed.');
process.exit(fail ? 1 : 0);
