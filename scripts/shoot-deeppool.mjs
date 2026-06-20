// Phase 6 deep-pool smoke: the bitter bottom of the water descent — a HEAVY
// (52 MB → 5 MB) GLB level reached by a GLB → GLB hop from the liminal space,
// each masked by the loader minigame. Tours shop → pool → liminal → abandoned
// pool → liminal, asserting BOTH loaders reach ready and the deep room enters.
// (This is the load the minigame was built for.)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

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
// Walk `key` until a door prompts, then E. Fails IMMEDIATELY (with the hop's
// name) if the prompt never appears, so a spawn/door drift points at the broken
// hop instead of surfacing later as a vague "room never became…" timeout.
const toDoor = async (key, label) => {
  await page.keyboard.down(key);
  const prompted = await page
    .waitForSelector('.hud-prompt--door', { timeout: 4000 })
    .then(() => true, () => false);
  await page.keyboard.up(key);
  if (!prompted) {
    fail(`no door prompt walking '${key}' toward ${label} — nav regression at this hop`);
    return false;
  }
  await page.keyboard.press('e');
  return true;
};
// Wait out a GLB loader and tap in. Generous timeout for the heavy deep level.
const enterLoadedLevel = async (label, timeout = 25000) => {
  const ready = await page
    .waitForFunction(
      () => document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') === 'ready',
      null,
      { timeout },
    )
    .then(() => true, () => false);
  if (!ready) {
    fail(`${label} loader never reached ready`);
    return false;
  }
  await page.getByRole('button', { name: /TAP TO ENTER/i }).click({ timeout: 4000 });
  return true;
};

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

// One linear tour, SHORT-CIRCUITED: each step gates the next, so the first
// broken hop fails with its own context and we stop — no 15–25s of follow-on
// "loader never reached ready" noise after a nav regression upstream.
let inPool = false;
let inLiminal = false;
let deepReady = false;
let inDeep = false;
let backUp = false;

if (
  (await roomIs('Beach Pizza Shop')) &&
  (await toDoor('d', 'the poolrooms')) &&
  (inPool = await roomIs('The Poolrooms')) &&
  // pool → liminal (centre door across the water), through its loader.
  (await toDoor('w', 'the centre water door')) &&
  (await enterLoadedLevel('liminal')) &&
  (inLiminal = await roomIs('Liminal Space'))
) {
  await page.waitForTimeout(600);
  // liminal → DEEP: the -Z "go down to the deep end" door (GLB → GLB), heavy loader.
  if (
    (await toDoor('w', 'the deep-end door')) &&
    (deepReady = await enterLoadedLevel('abandoned pool')) &&
    (inDeep = await roomIs('The Abandoned Pool'))
  ) {
    await page.waitForTimeout(800);
    await page.screenshot({ path: '.shots/deeppool.png' });
    // climb back up to the liminal (deep → liminal; cached → quick).
    if ((await toDoor('s', 'the climb-back-up door')) && (await enterLoadedLevel('liminal (return)', 15000))) {
      backUp = await roomIs('Liminal Space');
    }
  }
}

await browser.close();
console.log(
  `deeppool: pool=${inPool} liminal=${inLiminal} deepReady=${deepReady} deep=${inDeep} ` +
    `backUp=${backUp} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
