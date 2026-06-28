// Verifies the Grassrooms (草の間) — the big overgrown-backrooms racecourse off
// the liminal level — AND its 3D ghost race (ゴーストレース):
//  - the ?room=grassrooms test entrance drops into the room, the procedural scene
//    renders without throwing, the HUD names it;
//  - starting the race rolls through the countdown into racing (the state machine);
//  - the race HUD (LAP / standing) shows while racing;
//  - forcing a WIN flips to 'won' and records the clear in the progress store.
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
// &debug=1 exposes the race test hooks.
await page.goto(base + '/?room=grassrooms&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('grassrooms: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'The Grassrooms')
  bad(`grassrooms: HUD room is ${JSON.stringify(title)}, expected "The Grassrooms"`);

// Let the scene settle (grass + gates + sky + materials compile), then shoot.
await page.waitForTimeout(2600);
await page.screenshot({ path: '.shots/grassrooms.png' });

// ── the 3D ghost race ─────────────────────────────────────────────────────────
const hasHooks = await page.evaluate(
  () => typeof window.__sdpRaceStart === 'function' && typeof window.__sdpRaceState === 'function',
);
if (!hasHooks) bad('grassrooms: race test hooks (__sdpRaceStart/__sdpRaceState) missing');

// Start it → it should enter the countdown.
await page.evaluate(() => window.__sdpRaceStart && window.__sdpRaceStart());
await page.waitForTimeout(300);
const afterStart = await page.evaluate(() => window.__sdpRaceState && window.__sdpRaceState());
if (afterStart?.phase !== 'countdown')
  bad(
    `grassrooms: after start, phase is ${JSON.stringify(afterStart?.phase)}, expected "countdown"`,
  );

// After the 3·2·1 countdown it should be racing; the LAP HUD should be up.
await page.waitForTimeout(3500);
const racing = await page.evaluate(() => window.__sdpRaceState && window.__sdpRaceState());
if (racing?.phase !== 'racing')
  bad(`grassrooms: after countdown, phase is ${JSON.stringify(racing?.phase)}, expected "racing"`);
const lapText = await page.textContent('.hud-race__lap').catch(() => null);
if (!lapText || !/LAP\s*1\//.test(lapText))
  bad(`grassrooms: race LAP HUD missing/wrong (got ${JSON.stringify(lapText)})`);
await page.screenshot({ path: '.shots/grassrooms-race.png' });

// Force a WIN → 'won', and the clear is recorded in the durable progress store.
await page.evaluate(() => window.__sdpRaceForce && window.__sdpRaceForce('you'));
await page.waitForTimeout(300);
const won = await page.evaluate(() => window.__sdpRaceState && window.__sdpRaceState());
if (won?.phase !== 'won')
  bad(`grassrooms: after force-win, phase is ${JSON.stringify(won?.phase)}, expected "won"`);
const cleared = await page.evaluate(() => {
  try {
    const p = JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
    return Array.isArray(p.clearedGames) && p.clearedGames.includes('ghost-race');
  } catch {
    return false;
  }
});
if (!cleared) bad('grassrooms: winning the ghost race did not record the clear');

// Any uncaught error from the procedural geometry / audio ambient / the race.
if (errors.length)
  bad(`grassrooms: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);

console.log(
  `grassrooms -> canvas=${!!canvas} room=${JSON.stringify(title)} countdown=${afterStart?.phase} racing=${racing?.phase} won=${won?.phase} cleared=${cleared} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} grassrooms check(s) FAILED` : '\ngrassrooms checks passed.');
process.exit(fail ? 1 : 0);
