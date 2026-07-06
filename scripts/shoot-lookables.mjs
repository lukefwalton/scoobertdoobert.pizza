// Lookables smoke: the flavor-curio interaction loop end-to-end via the REAL
// entry path — enter the world in a room, approach a curio (proximity → the
// "Press E to look" prompt), open its story with E (the real interactNearby +
// key handler), confirm the prompt hides behind its own dialog, then close it
// with Esc (the real Esc priority chain). Kitchen is chosen because it has a
// lookable and NO hotspots, so E can't resolve to a higher-priority interaction.
//
// Proximity is forced deterministically through the debug-only __sdpNearLookable
// hook (walking to a wall-anchored curio pixel-by-pixel is flaky on CI); every
// OTHER link in the chain — prompt render, prompt priority, E→open, the
// !openLookable guard, Esc→close — is the real runtime path.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke({ deviceScaleFactor: 1 });
watchPageErrors(page, bad);

const lookDialog = () => page.$('.hud-dialog[role="dialog"]');
const lookPrompt = () => page.$('.hud-prompt--look');

// ?room=kitchen enters the world in the kitchen; &debug=1 exposes the smoke hook.
await page.goto(base + '/?room=kitchen&debug=1', { waitUntil: 'commit' });
const canvas = await page.waitForSelector('canvas', { timeout: 12000 }).catch(() => null);
if (!canvas) bad('lookables: world canvas never mounted');
await page.waitForTimeout(1000); // WebGL warmup

// 0) No story dialog open on arrival. (We don't assert the prompt is absent —
// a room's single curio can legitimately sit within proximity of the spawn, so
// the prompt may already show; that's real proximity working, not a bug.)
if (await lookDialog()) bad('lookables: a dialog was already open on entry');

// 1) The forced-proximity hook must be present (Lookables mounted under ?debug).
const hasHook = await page
  .waitForFunction(() => typeof window.__sdpNearLookable === 'function', null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!hasHook) bad('lookables: __sdpNearLookable hook never appeared (Lookables not mounted?)');
const targetId = hasHook ? await page.evaluate(() => window.__sdpNearLookable()) : null;
if (!targetId) bad('lookables: no curio found in the kitchen to approach');

// 2) Approaching raises the "Press E to look" prompt (real DOM + real priority).
const promptShown = await page.waitForSelector('.hud-prompt--look', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (!promptShown) bad('lookables: approaching a curio did not raise the look prompt');

// 3) E opens the story dialog (real interactNearby + WorldHud key handler).
await page.keyboard.press('e');
const dialog = await page
  .waitForSelector('.hud-dialog[role="dialog"]', { timeout: 4000 })
  .catch(() => null);
if (!dialog) bad('lookables: pressing E near a curio did not open the story dialog');
const story = dialog ? ((await dialog.textContent()) || '').trim() : '';
if (dialog && story.length < 3) bad('lookables: the story dialog opened empty');

// 3b) The prompt must hide while its own dialog is open (the !openLookable guard).
await page.waitForTimeout(150);
if (await lookPrompt()) bad('lookables: the look prompt stayed visible under its open dialog');
await page.screenshot({ path: '.shots/lookable-open.png' });

// 4) Esc closes it (real Esc priority chain).
await page.keyboard.press('Escape');
const closed = await page
  .waitForFunction(() => !document.querySelector('.hud-dialog[role="dialog"]'), null, {
    timeout: 4000,
  })
  .then(
    () => true,
    () => false,
  );
if (!closed) bad('lookables: Escape did not close the story dialog');

await ctx.close();
console.log(
  `lookables: hook=${hasHook} target=${targetId} prompt=${promptShown} ` +
    `opened=${!!dialog} storyLen=${story.length} closed=${closed} | errors=${failures()}`,
);
await finish();
