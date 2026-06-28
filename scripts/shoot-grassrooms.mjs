// Verifies the Grassrooms (草の間) — the overgrown-backrooms breather off the
// liminal level — AND its ghost kart-battle minigame (おばけグランプリ):
//  - the ?room=grassrooms test entrance drops into the room, the procedural scene
//    renders without throwing, the HUD names it;
//  - the pure battle helpers (projectileHits / decideWinner) hold;
//  - launching the battle mounts the ArcadeModal + the game canvas;
//  - forcing a WIN clears the game in the progress store (the reward).
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

// ?room=grassrooms drops straight in (it's otherwise a side door off the liminal).
// &debug=1 so the action test hooks (room-jump-free) are exposed.
await page.goto(base + '/?room=grassrooms&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('grassrooms: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'The Grassrooms')
  bad(`grassrooms: HUD room is ${JSON.stringify(title)}, expected "The Grassrooms"`);

// Let the scene settle (grass + sky + materials compile), then shoot.
await page.waitForTimeout(2600);
await page.screenshot({ path: '.shots/grassrooms.png' });

// ── the ghost kart battle ───────────────────────────────────────────────────
// Launch it via the room's debug hook (no precise 3D click needed).
const launched = await page.evaluate(() => {
  if (typeof window.__sdpRaceGhost !== 'function') return false;
  window.__sdpRaceGhost();
  return true;
});
if (!launched) bad('grassrooms: __sdpRaceGhost hook missing — cannot launch the battle');

// The ArcadeModal + the game's own canvas should mount (two canvases now: the
// world + the minigame). Give React a beat to render the modal.
await page.waitForTimeout(600);
const canvases = await page.evaluate(() => document.querySelectorAll('canvas').length);
if (canvases < 2) bad(`grassrooms: ghost-kart modal canvas didn't mount (canvases=${canvases})`);

await page.screenshot({ path: '.shots/grassrooms-kart.png' });

// The pure helpers must be exposed + correct (a dead-on hit, a clean miss; 0
// ghost balloons = a win).
const helpers = await page.evaluate(() => {
  const hit = window.__sdpKartHits;
  const win = window.__sdpKartWinner;
  if (typeof hit !== 'function' || typeof win !== 'function') return null;
  return {
    onTarget: hit({ x: 100, y: 100, owner: 'you' }, { x: 102, y: 101 }),
    miss: hit({ x: 100, y: 100, owner: 'you' }, { x: 200, y: 200 }),
    youWin: win(3, 0),
    youLose: win(0, 3),
  };
});
if (!helpers) bad('grassrooms: kart helper hooks (__sdpKartHits/__sdpKartWinner) missing');
else {
  if (helpers.onTarget !== true) bad('grassrooms: a dead-on pizza should hit the target');
  if (helpers.miss !== false) bad('grassrooms: a far-off pizza should miss');
  if (helpers.youWin !== 'won') bad('grassrooms: 0 ghost balloons should be a WIN');
  if (helpers.youLose !== 'lost') bad('grassrooms: 0 of your balloons should be a LOSS');
}

// Force a WIN and confirm the reward landed: the game is recorded as cleared in
// the durable progress store (localStorage 'scoobert:progress').
await page.evaluate(() => window.__sdpKartForce && window.__sdpKartForce('won'));
await page.waitForTimeout(300);
const cleared = await page.evaluate(() => {
  try {
    const raw = localStorage.getItem('sdp_progress_v1');
    if (!raw) return false;
    const p = JSON.parse(raw);
    return Array.isArray(p.clearedGames) && p.clearedGames.includes('ghost-kart');
  } catch {
    return false;
  }
});
if (!cleared) bad('grassrooms: winning the ghost kart battle did not record the clear');

// Any uncaught error from the procedural geometry / audio ambient / minigame.
if (errors.length)
  bad(`grassrooms: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);

console.log(
  `grassrooms -> canvas=${!!canvas} room=${JSON.stringify(title)} kartCanvases=${canvases} cleared=${cleared} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} grassrooms check(s) FAILED` : '\ngrassrooms checks passed.');
process.exit(fail ? 1 : 0);
