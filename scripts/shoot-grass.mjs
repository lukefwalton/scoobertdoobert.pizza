// Verifies the grass level end-to-end: the field mounts, the wild-goblin encounter
// fires (screen-to-black into the battle room), and WINNING the d20 roll-off opens
// the new room (the grove) + records the durable unlock. The encounter chance + the
// d20 tumble are random/luck-tuned, so we drive deterministic test hooks
// (__sdpGrassEncounter, __sdpBattleRoll) rather than walking + clicking the 3D die.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const {
  ctx,
  page,
  fail: bad,
  finish,
  failures,
} = await startSmoke({
  viewport: { width: 1000, height: 700 },
});
watchPageErrors(page, bad);

const roomLabel = () =>
  page.$eval('.hud-room', (el) => (el.textContent ?? '').trim()).catch(() => '');

// Enter the grass field directly.
await page.goto(base + '/?room=grassfield&debug=1', { waitUntil: 'networkidle' });
const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('grass: world canvas never mounted');
await page.$eval('.hud-welcome__close', (el) => el.click()).catch(() => {});
await page.waitForTimeout(400);

const inGrass = await roomLabel();
if (!/grass/i.test(inGrass)) bad(`grass: expected to land in the grass, saw "${inGrass}"`);
const encHook = await page
  .waitForFunction(() => typeof window.__sdpGrassEncounter === 'function', null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!encHook) bad('grass: __sdpGrassEncounter hook never appeared');
await page.screenshot({ path: '.shots/grass-field.png' });

// Trigger the wild encounter → screen-to-black → the battle room.
let inBattle = '';
let battleHook = false;
if (encHook) {
  await page.evaluate(() => window.__sdpGrassEncounter());
  await page.waitForTimeout(700); // room fade + mid-wipe commit
  inBattle = await roomLabel();
  if (!/goblin/i.test(inBattle))
    bad(`grass: encounter did not reach the battle, saw "${inBattle}"`);
  battleHook = await page.evaluate(() => typeof window.__sdpBattleRoll === 'function');
  if (!battleHook) bad('grass: __sdpBattleRoll hook missing in the battle');
  await page.screenshot({ path: '.shots/grass-battle.png' });
}

// Win the bout (NAT 20) → opens the grove (the new room) + records the unlock.
let inGrove = '';
let cleared = false;
if (battleHook) {
  await page.evaluate(() => window.__sdpBattleRoll(20, 'nat20'));
  await page.waitForTimeout(1700); // the outcome beat (1200ms) + the room fade
  inGrove = await roomLabel();
  if (!/grove/i.test(inGrove)) bad(`grass: winning did not open the grove, saw "${inGrove}"`);
  cleared = await page.evaluate(() => {
    try {
      const p = JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
      return (p.secretsFound || []).includes('grass-cleared');
    } catch {
      return false;
    }
  });
  if (!cleared) bad('grass: a win did not record the grass-cleared unlock');
  await page.screenshot({ path: '.shots/grass-grove.png' });
}

// Durable unlock: from the grove back to the field, the goblin's beaten — so the
// grass is calm (no forced ambush) and a revealed path to the grove has opened at
// the far edge. Proves the 'grass-cleared' flag is actually CONSUMED, not dead.
let revisit = false;
if (cleared) {
  await page.evaluate(() => window.__sdpGoToRoom?.('grassfield', 'fromGrove'));
  await page.waitForTimeout(700);
  await page.keyboard.down('w'); // wade to the field's far edge in peace
  revisit = await page
    .waitForFunction(
      () => document.body.innerText.toLowerCase().includes('opened path to the grove'),
      null,
      { timeout: 9000 },
    )
    .then(
      () => true,
      () => false,
    );
  await page.keyboard.up('w');
  if (!revisit) bad('grass: the grove path did not durably re-open after a win');
}

console.log(
  `grass    -> field="${inGrass}" battle="${inBattle}" grove="${inGrove}" cleared=${cleared} revisit=${revisit} errors=${failures()}`,
);

await ctx.close();
await finish('\ngrass checks passed.', `\n${failures()} grass check(s) FAILED`);
