// Verifies the grass level: the field mounts off the shrine, and wading to its far
// edge reaches the plain (un-gated) path into the grove — the real door, walked
// to, not teleported. (The wild-goblin ambush + battle room that used to sit
// between the two were cut in 2026-10; the dice pit is the one dice fight.)
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
await page.screenshot({ path: '.shots/grass-field.png' });

// Wade straight down the field (-Z) to the far edge: the grove door's prompt
// should come up on its own — no fight, no reveal, just the walk.
await page.keyboard.down('w');
const pathPrompt = await page
  .waitForFunction(
    () => document.body.innerText.toLowerCase().includes('trodden path into the grove'),
    null,
    { timeout: 12000 },
  )
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up('w');
if (!pathPrompt) bad('grass: wading to the far edge never raised the grove path prompt');

// Step through the real door → the grove.
let inGrove = '';
if (pathPrompt) {
  await page.keyboard.press('e');
  await page.waitForTimeout(700); // room fade + mid-wipe commit
  inGrove = await roomLabel();
  if (!/grove/i.test(inGrove)) bad(`grass: the path did not lead to the grove, saw "${inGrove}"`);
  await page.screenshot({ path: '.shots/grass-grove.png' });
}

console.log(
  `grass    -> field="${inGrass}" path=${pathPrompt} grove="${inGrove}" errors=${failures()}`,
);

await ctx.close();
await finish('\ngrass checks passed.', `\n${failures()} grass check(s) FAILED`);
