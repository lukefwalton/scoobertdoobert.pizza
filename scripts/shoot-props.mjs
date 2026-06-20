// Phase 6 GLB-props smoke: set-dressing from the model trove now lives in the
// rooms. Navigate through the reliably-reachable prop'd rooms (shop → pool →
// corridor) and assert each room's crunched prop GLB actually loads (200) and
// nothing errors. Proves the GlbProp load path end-to-end; exact placement is a
// visual call left to the preview.
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

// Record the HTTP status of every shipped model fetch (node-side for the log,
// and mirrored into the page so a waitForFunction can poll it).
const modelStatus = {};
page.on('response', (r) => {
  const u = r.url();
  if (!u.includes('/models/') || !u.endsWith('.glb')) return;
  const file = u.split('/').pop();
  const status = r.status();
  modelStatus[file] = status;
  page
    .evaluate(
      ([f, s]) => {
        window.__sdpModels = window.__sdpModels || {};
        window.__sdpModels[f] = s;
      },
      [file, status],
    )
    .catch(() => {});
});

const roomIs = (name, timeout = 8000) =>
  page
    .waitForFunction(
      (n) => document.querySelector('.hud-room')?.textContent?.includes(n) ?? false,
      name,
      { timeout },
    )
    .then(() => true, () => (fail(`room never became "${name}"`), false));
const toDoor = async (key) => {
  await page.keyboard.down(key);
  await page.waitForSelector('.hud-prompt--door', { timeout: 5000 }).catch(() => {});
  await page.keyboard.up(key);
  await page.keyboard.press('e');
  await page.waitForTimeout(900);
};
const loaded = async (file, timeout = 6000) =>
  page
    .waitForFunction(
      // re-checks the map we fill from page 'response' via a window mirror below
      (f) => (window.__sdpModels || {})[f] === 200,
      file,
      { timeout },
    )
    .then(() => true, () => false);

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const startShop = await roomIs('Beach Pizza Shop');
const palm = await loaded('palm-tree.glb'); // the shop's palm
if (!palm) fail('palm-tree.glb did not load in the shop');

await toDoor('d');
const inPool = await roomIs('The Poolrooms');
const statue = await loaded('greek-statue.glb');
if (!statue) fail('greek-statue.glb did not load in the pool');

await toDoor('d'); // +X corridor door
const inCorr = await roomIs('The Long Corridor');
const mobius = await loaded('mobius-strip.glb');
if (!mobius) fail('mobius-strip.glb did not load in the corridor');

await browser.close();
console.log(
  `props: shop=${startShop} palm=${palm} pool=${inPool} statue=${statue} corridor=${inCorr} ` +
    `mobius=${mobius} models=${JSON.stringify(modelStatus)} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
