// Verifies the Grassrooms (草の間) — the big overgrown-backrooms racecourse off
// the liminal level — AND its 3D ghost race (ゴーストレース):
//  - the ?room=grassrooms test entrance drops into the room, the procedural scene
//    renders without throwing, the HUD names it;
//  - starting the race rolls through the countdown into racing (the state machine);
//  - the race HUD (LAP / standing) shows while racing;
//  - forcing a WIN flips to 'won' and records the clear in the progress store.
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail: bad, finish, failures } = await launchSmoke();

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => bad(`pageerror: ${e.message}`));

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

// Snapshot the durable luck BEFORE the win so we can prove the reward DELTA, not
// just that the clear is present (a fresh context starts clean, but assert the
// delta so a regression in the first-win reward path can't slip through).
const readProgress = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
    } catch {
      return {};
    }
  });
const luckBefore = (await readProgress()).luckEarned || 0;

// Force a WIN → 'won', and the clear + the +3 luck reward land in the store.
await page.evaluate(() => window.__sdpRaceForce && window.__sdpRaceForce('you'));
await page.waitForTimeout(300);
const won = await page.evaluate(() => window.__sdpRaceState && window.__sdpRaceState());
if (won?.phase !== 'won')
  bad(`grassrooms: after force-win, phase is ${JSON.stringify(won?.phase)}, expected "won"`);
const after = await readProgress();
const cleared = Array.isArray(after.clearedGames) && after.clearedGames.includes('ghost-race');
if (!cleared) bad('grassrooms: winning the ghost race did not record the clear');
const luckAfter = after.luckEarned || 0;
if (luckAfter !== luckBefore + 3)
  bad(
    `grassrooms: first ghost-race win should grant +3 luck (before ${luckBefore}, after ${luckAfter})`,
  );

// Any uncaught error from the procedural geometry / audio ambient / the race is
// caught by the pageerror listener (→ bad).

console.log(
  `grassrooms -> canvas=${!!canvas} room=${JSON.stringify(title)} countdown=${afterStart?.phase} racing=${racing?.phase} won=${won?.phase} cleared=${cleared} luck=${luckAfter} errors=${failures()}`,
);

await ctx.close();

// ── the LOSS → auto-rematch path (fresh context) ────────────────────────────────
// Force a loss and confirm the race lands in 'lost', then auto-resets to 'idle' a
// few beats later — exercising the in-frame (pause-aware) rematch timer, the path
// the win flow doesn't cover.
// Snapshot here so the loss-phase log reports only loss-phase failures, not the
// win phase's too.
const lossErr0 = failures();
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page2 = await ctx2.newPage();
page2.on('pageerror', (e) => bad(`pageerror: ${e.message}`));
await page2.goto(base + '/?room=grassrooms&debug=1', { waitUntil: 'networkidle' });
await page2.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
await page2.waitForTimeout(1500);
await page2.evaluate(() => window.__sdpRaceForce && window.__sdpRaceForce('ghost'));
await page2.waitForTimeout(300);
const lost = await page2.evaluate(() => window.__sdpRaceState && window.__sdpRaceState());
if (lost?.phase !== 'lost')
  bad(`grassrooms: force-loss phase is ${JSON.stringify(lost?.phase)}, expected "lost"`);
// the in-frame auto-rematch should return to idle within ~4.5s (not a setTimeout).
await page2.waitForTimeout(6000);
const rematch = await page2.evaluate(() => window.__sdpRaceState && window.__sdpRaceState());
if (rematch?.phase !== 'idle')
  bad(
    `grassrooms: after a loss the race should auto-reset to idle (got ${JSON.stringify(rematch?.phase)})`,
  );
console.log(
  `grassrooms(loss) -> lost=${lost?.phase} rematch=${rematch?.phase} errors=${failures() - lossErr0}`,
);
await ctx2.close();

await finish('\ngrassrooms checks passed.', `\n${failures()} grassrooms check(s) FAILED`);
