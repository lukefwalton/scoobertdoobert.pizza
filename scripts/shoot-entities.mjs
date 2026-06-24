// Verifies the dancing-entity loop in a GLB liminal level: a wanderer roams, and
// when the player comes near it transitions wander → approach → DANCE (never
// anything threatening). Uses the per-entity phase hook (gated to the test
// entrances) since the creatures roam, so a pixel check would be flaky.
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

// ?room=liminal drops into the GLB liminal level (lighter fog than the deeper
// levels); &debug=1 exposes the per-entity phase hook.
await page.goto(base + '/?room=liminal&debug=1', { waitUntil: 'commit' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 15000 })
  .catch(() => bad('entities: world never mounted'));

// Wait out the GLB loader (tap Enter until the camera hook + entities exist).
for (let i = 0; i < 30; i++) {
  const ready = await page.evaluate(
    () => !!window.__sdpCam && typeof window['__sdpEntity:liminal-blob'] !== 'undefined',
  );
  if (ready) break;
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForTimeout(400);
}

const hasEntity = await page
  .waitForFunction(() => typeof window['__sdpEntity:liminal-blob'] !== 'undefined', null, {
    timeout: 8000,
  })
  .then(
    () => true,
    () => false,
  );
if (!hasEntity) bad('entities: liminal-blob phase hook never appeared');

let sawDance = false;
let sawApproach = false;
if (hasEntity) {
  // Walk into the middle where they roam, then stand still — a wanderer drifts in
  // (approach) and stops to dance when it reaches you.
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  for (let i = 0; i < 16 && !sawDance; i++) {
    await page.waitForTimeout(500);
    const p = await page.evaluate(() => [
      window['__sdpEntity:liminal-blob'],
      window['__sdpEntity:liminal-mop'],
    ]);
    if (p.includes('approach')) sawApproach = true;
    if (p.includes('dance')) sawDance = true;
  }
  await page.screenshot({ path: '.shots/entities.png' });
  // DANCE is the contract (a wanderer can't dance without first noticing you);
  // the brief "approach" phase can fall between samples, so it's logged, not gated.
  if (!sawDance) bad('entities: no wanderer ever DANCED when reached');
}

if (errors.length)
  bad(`entities: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `entities -> hook=${hasEntity} approach=${sawApproach} dance=${sawDance} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} entities check(s) FAILED` : '\nentities checks passed.');
process.exit(fail ? 1 : 0);
