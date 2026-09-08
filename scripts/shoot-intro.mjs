// Entry-cadence smoke (Luke, 2026-09: "a shit ton to see all at once on load … pace
// them through, level 1 and then level 2"). The world's HUD arrives in beats
// (sceneStore.introStage): welcome card → move/look legend → the game layer fades
// in → the toast channel opens. Two passes:
//   1. FIRST-TIMER: nothing from the game layer during the greeting or the legend —
//      even with points already banked and a toast already queued (the gate, not
//      luck); the chip arrives after the first move; the held toast lands a beat
//      AFTER the chip (never on the same frame).
//   2. RETURNING (already greeted this visit + already taught): no welcome card at
//      all, the chip + hotbar within a beat of mount; the score badge stays off at 0
//      points and pops in with the first loot; and — the bug this fixes — a save
//      with luck that predates the 'luck-explained' secret gets NO 🍀 lecture on
//      entry (it now only ever follows a luck gain this session).
// Pass 1 enters the KITCHEN (procedural → stocked with loot for the pickup hooks,
// and a curated perception whisper): &debug=1 forces the whisper's d20, so a queued
// toast is guaranteed to be waiting behind the cadence from the moment you arrive.
// (The shop has no whisper, and one loot is far short of the 🏆 new-best line.)
import { mkdirSync } from 'node:fs';
import { launchSmoke, seedIntroSeen, bankOnePoint, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail: bad, finish, failures } = await launchSmoke();

const layer = (page) =>
  page.evaluate(() => ({
    welcome: !!document.querySelector('.hud-welcome'),
    hint: !!document.querySelector('.hud-controlhint'),
    chip: !!document.querySelector('.hud-objective'),
    score: !!document.querySelector('.hud-score'),
    hotbar: !!document.querySelector('.hud-hotbar'),
    toast: !!document.querySelector('.hud-toast'),
    menu: !!document.querySelector('.hud-menu-btn'),
    room: !!document.querySelector('.hud-room'),
  }));
const noGameLayer = (l) => !l.chip && !l.score && !l.hotbar && !l.toast;

// --- 1. first-timer: level 1, then level 2 ---
{
  const err0 = failures();
  // Pin the motion preference: the cadence's 1200ms breath before the toast channel
  // opens is deliberately 0 under prefers-reduced-motion (WorldHud), so the timing
  // assertion below only holds on the no-preference path. Playwright defaults to it,
  // but say so, so a CI/context default can never turn the product's reduced-motion
  // behavior into a false red here.
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  watchPageErrors(page, bad);
  await page.goto(base + '/?room=kitchen&debug=1', { waitUntil: 'commit' });
  const mounted = await page
    .waitForSelector('.hud-menu-btn', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!mounted) bad('first: world never mounted');

  // Level 1 — the greeting plays ALONE (menu button + room label are fine: orientation).
  const welcome = await page
    .waitForSelector('.hud-welcome', { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!welcome) bad('first: the welcome card never showed on a fresh visit');
  const l1 = await layer(page);
  if (!noGameLayer(l1)) bad(`first: game layer up during the welcome (${JSON.stringify(l1)})`);
  if (l1.hint) bad('first: the move/look legend showed on top of the welcome card');
  if (!l1.menu || !l1.room) bad('first: level-1 orientation (menu / room label) missing');
  await page.screenshot({ path: '.shots/intro-1-welcome.png' });
  // Play DURING the greeting (it's non-blocking): grab a loot. Points on the board —
  // and, with the whisper already queued on arrival, both must stay held behind the
  // cadence: no score badge, no toast, until their beat.
  const banked = await bankOnePoint(page);
  if (!banked) bad('first: could not bank a point during the welcome (no loot hooks)');
  await page.waitForTimeout(400);
  const l1b = await layer(page);
  if (l1b.score || l1b.toast)
    bad(`first: points/toast leaked through the gate during the welcome (${JSON.stringify(l1b)})`);

  // Dismiss the card → the legend, still alone.
  await page
    .getByRole('button', { name: /dismiss intro/i })
    .click({ timeout: 3000 })
    .catch(() => bad('first: could not click the intro ×'));
  const hint = await page
    .waitForSelector('.hud-controlhint', { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!hint) bad('first: the move/look legend never followed the welcome card');
  const l2 = await layer(page);
  if (!noGameLayer(l2)) bad(`first: game layer up during the legend (${JSON.stringify(l2)})`);
  await page.screenshot({ path: '.shots/intro-2-legend.png' });

  // Move → level 2: the chip fades in; the first toast lands a beat LATER, not with it.
  await page.keyboard.down('w');
  await page.waitForTimeout(700);
  await page.keyboard.up('w');
  const chipAt = Date.now();
  const chip = await page
    .waitForSelector('.hud-objective', { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!chip) bad('first: the objective chip never arrived after the first move');
  const withChip = await layer(page);
  if (withChip.toast) bad('first: a toast landed on the same beat as the chip (no breath)');
  if (banked && !withChip.score) bad('first: the score badge did not reveal with the chip');
  await page.screenshot({ path: '.shots/intro-3-chip.png' });
  const toast = await page
    .waitForSelector('.hud-toast', { timeout: 6000 })
    .then(() => true)
    .catch(() => false);
  const toastAfterMs = Date.now() - chipAt;
  if (!toast) bad('first: the held whisper never surfaced once the cadence settled');
  else if (toastAfterMs < 900)
    bad(`first: the toast channel opened too soon after the chip (${toastAfterMs}ms)`);
  await page.screenshot({ path: '.shots/intro-4-settled.png' });
  console.log(
    `first    -> welcome=${welcome} hint=${hint} banked=${!!banked} chip=${chip} toast=${toast}(+${toastAfterMs}ms) errors=${failures() - err0}`,
  );
  await ctx.close();
}

// --- 2. returning: no greeting, quick HUD, and NO luck lecture on entry ---
{
  const err0 = failures();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  await seedIntroSeen(ctx);
  await ctx.addInitScript(() => {
    // A save with luck from before the 'luck-explained' secret existed, plus two known
    // spells so the hotbar has slots to reveal.
    localStorage.setItem(
      'sdp_progress_v1',
      JSON.stringify({
        everEnteredWorld: true,
        luckEarned: 3,
        luckSpent: 0,
        secretsFound: ['jump-unlocked'],
        knownSpells: ['fireball', 'light'],
      }),
    );
  });
  const page = await ctx.newPage();
  watchPageErrors(page, bad);
  await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
  const mounted = await page
    .waitForSelector('.hud-menu-btn', { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  if (!mounted) bad('returning: world never mounted');
  const t0 = Date.now();
  const chip = await page
    .waitForSelector('.hud-objective', { timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  const chipMs = Date.now() - t0;
  if (!chip) bad('returning: the objective chip did not arrive promptly (no card to wait on)');
  const l = await layer(page);
  if (l.welcome) bad('returning: the welcome card replayed although already seen this visit');
  if (l.hint) bad('returning: the move/look legend showed although already taught');
  if (!l.hotbar) bad('returning: the spell hotbar did not reveal with the chip');
  if (l.score) bad('returning: the score badge showed with 0 points');
  // The bug: the 🍀 explainer used to fire on mount for exactly this save. Give it a
  // generous window; the only toast allowed here is the (debug-forced) whisper.
  const lecture = await page
    .waitForFunction(
      () => /LUCK works on its own/.test(document.querySelector('.hud-toast')?.textContent || ''),
      null,
      { timeout: 6000 },
    )
    .then(() => true)
    .catch(() => false);
  if (lecture) bad('returning: the 🍀 LUCK explainer fired on entry with no luck gained');
  const secret = await page.evaluate(() =>
    (JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || []).includes(
      'luck-explained',
    ),
  );
  if (secret) bad('returning: luck-explained was banked on entry without a luck gain');
  // Points → the score badge pops in (it was rightly absent at 0).
  if (!(await bankOnePoint(page))) bad('returning: could not bank a point (no loot hooks)');
  const score = await page
    .waitForSelector('.hud-score', { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!score) bad('returning: the score badge did not appear with the first points');
  await page.screenshot({ path: '.shots/intro-5-returning.png' });
  console.log(
    `returning-> chip=${chip}(${chipMs}ms) welcome=${l.welcome} hint=${l.hint} hotbar=${l.hotbar} lecture=${lecture} score=${score} errors=${failures() - err0}`,
  );
  await ctx.close();
}

await finish('shoot:intro OK', 'shoot:intro FAILED');
