// Phase 6 GLB-props smoke: set-dressing from the model trove now lives in the
// rooms. Navigate through the reliably-reachable prop'd rooms (shop → pool →
// corridor) and assert each room's crunched prop GLB actually loads (200) and
// nothing errors. Proves the GlbProp load path end-to-end; exact placement is a
// visual call left to the preview.
import { mkdirSync } from 'node:fs';
import { roomIs as sharedRoomIs, startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { page, fail, finish, failures } = await startSmoke();
watchPageErrors(page, fail);

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

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail, timeout });
const loaded = async (file, timeout = 6000) =>
  page
    .waitForFunction(
      // re-checks the map we fill from page 'response' via a window mirror below
      (f) => (window.__sdpModels || {})[f] === 200,
      file,
      { timeout },
    )
    .then(
      () => true,
      () => false,
    );

await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const startShop = await roomIs('Beach Pizza Shop');
const palm = await loaded('palm-tree.glb'); // the shop's palm
if (!palm) fail('palm-tree.glb did not load in the shop');

// Fail fast if the gated transition hook isn't exposed (a gating regression).
if (!(await page.evaluate(() => typeof window.__sdpGoToRoom === 'function')))
  fail('__sdpGoToRoom hook not exposed under ?world&debug (gating regression?)');
// Jump room-to-room via the gated transition hook — the surface→pool→corridor
// walk is shoot-rooms'; this smoke only cares that each room's prop GLB loads.
await page.evaluate(() => window.__sdpGoToRoom?.('poolrooms', 'fromAbove'));
const inPool = await roomIs('The Poolrooms');
const statue = await loaded('greek-statue.glb');
if (!statue) fail('greek-statue.glb did not load in the pool');

await page.evaluate(() => window.__sdpGoToRoom?.('mobius', 'fromPool'));
const inCorr = await roomIs('The Long Corridor');
const mobius = await loaded('mobius-strip.glb');
if (!mobius) fail('mobius-strip.glb did not load in the corridor');

// crt-tv ships in the machine-room / memory-lane path (not the shop→pool→corridor
// walk above), so cover it with a direct HEAD — proves it ships + 200. Arcade
// cabinets are procedural now (no arcade-cabinet.glb).
const others = await page.evaluate(async () => {
  const out = {};
  for (const f of ['crt-tv.glb']) {
    try {
      out[f] = (await fetch('/models/' + f, { method: 'HEAD' })).status;
    } catch {
      out[f] = 0;
    }
  }
  return out;
});
const crt = others['crt-tv.glb'] === 200;
if (!crt) fail('crt-tv.glb is not served (200)');

console.log(
  `props: shop=${startShop} palm=${palm} pool=${inPool} statue=${statue} corridor=${inCorr} ` +
    `mobius=${mobius} crt=${crt} models=${JSON.stringify(modelStatus)} | errors=${failures()}`,
);
await finish();
