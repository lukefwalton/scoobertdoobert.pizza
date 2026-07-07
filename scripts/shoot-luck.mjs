// Verifies the game layer's LUCK loop end-to-end: the shrine clap ritual earns
// luck, a toast announces it, and the pause menu shows the stat. (The d20 itself —
// luck-biased rolls + nat20/crit-fail 3× — is unit-tested in src/lib/luck.test.ts;
// this covers the in-world earn + display path.)
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

// ?room=shrine drops into the shrine; &debug=1 exposes the clap test hook.
await page.goto(base + '/?room=shrine&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('luck: world canvas never mounted');

// Wait for the offering-box clap hook to be wired.
const hasHook = await page
  .waitForFunction(() => typeof window.__sdpShrineClap === 'function', null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!hasHook) bad('luck: __sdpShrineClap hook never appeared (shrine not mounted?)');

let toast = false;
let pauseLuck = '';
let luckBefore = null;
let luckAfter = null;
let luckRepeat = null;
let omikujiToast = false;
let fortuneDrawn = false;
if (hasHook) {
  // Read luck straight from the durable store BEFORE the ritual so we can prove a
  // DELTA — stale saved state can't mask a broken earn (the reviewer's point).
  const readLuck = () =>
    page.evaluate(() => {
      try {
        const p = JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
        return (p.luckEarned || 0) - (p.luckSpent || 0);
      } catch {
        return null;
      }
    });
  luckBefore = await readLuck();

  // Perform the ritual (clap clap → +1 luck), then check the announce toast.
  await page.evaluate(() => window.__sdpShrineClap());
  toast = await page.waitForSelector('.hud-toast--luck', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!toast) bad('luck: clapping did not raise the luck announce toast');

  // The clap must move luck by exactly +1 on THIS run (first clap per visit).
  luckAfter = await readLuck();
  if (luckAfter !== luckBefore + 1)
    bad(`luck: clap did not earn exactly +1 (before ${luckBefore}, after ${luckAfter})`);
  await page.screenshot({ path: '.shots/luck.png' });

  // Per-visit gate: a SECOND clap this visit must NOT grant more luck. Wait past
  // the ~1.2s anti-double-tap cooldown so we're testing the once-per-visit gate.
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.__sdpShrineClap());
  await page.waitForTimeout(300);
  luckRepeat = await readLuck();
  if (luckRepeat !== luckAfter)
    bad(
      `luck: a 2nd clap this visit changed luck ${luckAfter}->${luckRepeat} (per-visit gate broken)`,
    );

  // Open the pause menu and read the luck stat — it must match the stored value.
  await page.keyboard.press('Escape');
  const luckEl = await page
    .waitForSelector('.hud-pause__luck strong', { timeout: 4000 })
    .catch(() => null);
  pauseLuck = luckEl ? ((await luckEl.textContent()) ?? '').trim() : '';
  if (Number(pauseLuck) !== luckAfter)
    bad(`luck: pause menu shows ${JSON.stringify(pauseLuck)}, expected ${luckAfter} (stored)`);

  // ── the omikuji fortune draw (the shrine's explicit BAD↔GREAT roll) ──────────
  // Run LAST so its luck payout can't perturb the +1 clap-delta assertions above.
  const hasOmikuji = await page
    .waitForFunction(() => typeof window.__sdpOmikuji === 'function', null, { timeout: 6000 })
    .then(
      () => true,
      () => false,
    );
  if (!hasOmikuji) bad('luck: __sdpOmikuji fortune-draw hook never appeared');
  else {
    // Close the pause menu opened above, then WAIT on its removal (a concrete state
    // wait, not a fixed sleep) before drawing.
    await page.keyboard.press('Escape');
    await page.waitForSelector('.hud-pause', { state: 'detached', timeout: 4000 }).catch(() => {});
    await page.evaluate(() => window.__sdpOmikuji());
    // Every fortune rank carries 吉 or 凶 (大吉…末吉…凶), so the toast text proves a real
    // fortune landed — not just any lingering toast.
    omikujiToast = await page
      .waitForFunction(
        () => {
          const el = document.querySelector('.hud-toast');
          return !!el && /[吉凶]/.test(el.textContent || '');
        },
        null,
        { timeout: 4000 },
      )
      .then(
        () => true,
        () => false,
      );
    if (!omikujiToast) bad('luck: drawing a fortune raised no おみくじ toast');
    // Poll the durable secret directly (a state wait, not a sleep) — the draw persists
    // synchronously, so this settles immediately once the write lands.
    fortuneDrawn = await page
      .waitForFunction(
        () => {
          try {
            return (
              JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || []
            ).includes('omikuji-drawn');
          } catch {
            return false;
          }
        },
        null,
        { timeout: 4000 },
      )
      .then(
        () => true,
        () => false,
      );
    if (!fortuneDrawn) bad('luck: a fortune draw did not record the omikuji-drawn secret');
    await page.screenshot({ path: '.shots/omikuji.png' });
  }
}

console.log(
  `luck     -> canvas=${!!canvas} hook=${hasHook} toast=${toast} delta=${luckBefore}->${luckAfter} repeat=${luckRepeat} pauseLuck=${JSON.stringify(pauseLuck)} omikuji=${omikujiToast}/${fortuneDrawn} errors=${failures()}`,
);

await ctx.close();
await finish('\nluck checks passed.', `\n${failures()} luck check(s) FAILED`);
