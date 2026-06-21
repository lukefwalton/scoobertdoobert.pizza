// Practice Room smoke (Phase 6, the "play it" rung). Verifies the backstage
// instrument room renders, and DRIVES the call-and-response sequence game to a
// win via the gated __sdpPractice test hook — reading the expected phrase each
// round and playing it back — then asserts the clearGame('practice') unlock
// actually persisted to localStorage. (The hook is exposed under ?world/?debug,
// so we enter with &debug.)
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

await page.goto(base + '/?room=practice&debug', { waitUntil: 'commit' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('practice: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'The Practice Room')
  bad(`practice: HUD room is ${JSON.stringify(title)}, expected "The Practice Room"`);

// Wait for the in-world test hook to come online.
const hookReady = await page
  .waitForFunction(() => !!window.__sdpPractice, null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!hookReady) bad('practice: __sdpPractice test hook never appeared');

let result = { ok: false };
if (hookReady) {
  // Drive the whole game in-page: start it, then each round wait for 'listen',
  // read the expected phrase, and play it back, until it clears.
  result = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const h = () => window.__sdpPractice;
    h().start();
    const waitListen = async (timeout = 7000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        if (h().cleared) return 'cleared';
        if (h().phase === 'listen') return 'listen';
        await sleep(80);
      }
      return 'timeout';
    };
    for (let round = 0; round < 8; round++) {
      const ph = await waitListen();
      if (ph === 'cleared') break;
      if (ph === 'timeout') return { ok: false, reason: `stuck before round ${round + 1}` };
      const expected = (h().expected || []).slice();
      if (!expected.length) return { ok: false, reason: 'empty expected phrase' };
      for (const idx of expected) {
        h().press(idx);
        await sleep(160);
      }
      await sleep(550); // let the win stinger / next call fire
      if (h().cleared) break;
    }
    await sleep(300);
    let stored = false;
    try {
      stored = (
        JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').clearedGames || []
      ).includes('practice');
    } catch {
      /* ignore */
    }
    return { ok: true, cleared: !!h().cleared, stored };
  });
}

if (!result.ok) bad(`practice: could not drive the sequence game — ${result.reason}`);
else {
  if (!result.cleared) bad('practice: sequence game never reached the win state');
  if (!result.stored) bad("practice: clearGame('practice') did not persist to localStorage");
}

await page.screenshot({ path: '.shots/practice.png' });
if (errors.length)
  bad(`practice: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);

// Companion guard: the test hook must NOT leak onto a normal (non-debug) load —
// it's gated to the ?world / ?debug test entrances only.
await page.goto(base + '/?room=practice', { waitUntil: 'commit' });
await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null);
if (await page.evaluate(() => !!window.__sdpPractice))
  bad('practice: __sdpPractice hook present on a normal (non-debug) load');

console.log(
  `practice -> canvas=${!!canvas} room=${JSON.stringify(title)} cleared=${result.cleared} stored=${result.stored} errors=${errors.length}`,
);
await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} practice check(s) FAILED` : '\npractice checks passed.');
process.exit(fail ? 1 : 0);
