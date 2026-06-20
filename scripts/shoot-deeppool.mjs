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
// Walk `key` until a door prompts, then E.
const toDoor = async (key) => {
  await page.keyboard.down(key);
  await page.waitForSelector('.hud-prompt--door', { timeout: 4000 }).catch(() => {});
  await page.keyboard.up(key);
  await page.keyboard.press('e');
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

await roomIs('Beach Pizza Shop');
await toDoor('d'); // → poolrooms
const inPool = await roomIs('The Poolrooms');

// pool → liminal (centre door across the water), through its loader.
await toDoor('w');
const limReady = await enterLoadedLevel('liminal');
const inLiminal = limReady && (await roomIs('Liminal Space'));
await page.waitForTimeout(600);

// liminal → DEEP: the -Z "go down to the deep end" door (GLB → GLB), heavy loader.
let inDeep = false;
let deepReady = false;
if (inLiminal) {
  await toDoor('w'); // deep door is straight ahead (-Z) from the liminal spawn
  deepReady = await enterLoadedLevel('abandoned pool');
  inDeep = deepReady && (await roomIs('The Abandoned Pool'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: '.shots/deeppool.png' });
}

// climb back up to the liminal (deep → liminal).
let backUp = false;
if (inDeep) {
  await toDoor('s'); // exit door behind us (+Z)
  // re-entering the liminal is a cached GLB load — should be quick/ready.
  backUp = await enterLoadedLevel('liminal (return)', 15000);
  backUp = backUp && (await roomIs('Liminal Space'));
}

await browser.close();
console.log(
  `deeppool: pool=${inPool} liminal=${inLiminal} deepReady=${deepReady} deep=${inDeep} ` +
    `backUp=${backUp} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
