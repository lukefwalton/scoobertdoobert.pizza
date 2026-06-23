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

let pocketed = false;
let persisted = false;
let inPocketsList = false;
let lockerOk = false;
let rewardToast = false;

if (hasHook) {
  const before = await held();
  if (before.includes(KEY)) bad('keys: started already holding the key (state not fresh)');

  // Pocket it.
  await page.evaluate((k) => window[`__sdpPickup:${k}`](), KEY);
  const toast = await page.waitForSelector('.hud-toast--luck', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!toast) bad('keys: pocketing the key raised no announce toast');
  const after = await held();
  pocketed = after.includes(KEY);
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

  // Persists across a reload.
  await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'networkidle' });
  persisted = (await held()).includes(KEY);
  if (!persisted) bad('keys: key did not persist across reload');

  // The reward room behind the lock renders + pays out (first entry → luck toast).
  await page
    .waitForFunction(() => typeof window.__sdpGoToRoom === 'function', null, { timeout: 8000 })
    .catch(() => {});
  await page.evaluate(() => window.__sdpGoToRoom('lockerroom', 'fromPool'));
  rewardToast = await page.waitForSelector('.hud-toast--luck', { timeout: 5000 }).then(
    () => true,
    () => false,
  );
  const label = await page.waitForSelector('.hud-room', { timeout: 5000 }).catch(() => null);
  const labelText = label ? ((await label.textContent()) ?? '').trim() : '';
  lockerOk = /Staff Locker Room/i.test(labelText);
  if (!lockerOk) bad(`keys: locker room did not render (label ${JSON.stringify(labelText)})`);
  if (!rewardToast) bad('keys: first entry to the locker room paid no reward toast');
}

if (errors.length) bad(`keys: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `keys     -> canvas=${!!canvas} hook=${hasHook} pocketed=${pocketed} pockets=${inPocketsList} persisted=${persisted} lockerRoom=${lockerOk} reward=${rewardToast} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} keys check(s) FAILED` : '\nkeys checks passed.');
process.exit(fail ? 1 : 0);
