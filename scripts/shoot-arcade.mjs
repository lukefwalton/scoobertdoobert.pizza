// Verifies the Pizza Arcade — the mobile reward. Three contracts:
//   1. /arcade prerenders to a real, crawlable document (title + back-anchor)
//      that works with JavaScript DISABLED (the cold cabinet, no canvas).
//   2. With JS on, the live runner mounts: a <canvas>, a JUMP/START button, and
//      a high score that PERSISTS across reloads via the progress spine.
//   3. The storefront carries a real <a href="/arcade"> callout (crawlable
//      entry point, not a JS-only affordance).
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail: bad, finish, failures } = await launchSmoke();

// --- 1. JS-DISABLED: the prerendered cabinet is a real page with a real link ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/arcade', { waitUntil: 'load' });
  const title = await page.title();
  if (!title.includes('Pizza Arcade')) bad(`no-JS <title> unexpected -> ${JSON.stringify(title)}`);
  const back = await page.$('a[href="/"]');
  if (!back) bad('no-JS: missing real "back to storefront" anchor');
  // The live canvas is a post-hydration enhancement; it must NOT be in the
  // crawlable HTML (the cold screen stands in instead).
  const canvas = await page.$('canvas');
  if (canvas) bad('no-JS: a <canvas> rendered into the crawlable HTML (should be JS-only)');
  console.log(
    `no-JS   -> titled=${title.includes('Pizza Arcade')} back=${!!back} canvas=${!!canvas}`,
  );
  await ctx.close();
}

// --- 2. Storefront has a real crawlable arcade entry point ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  const link = await page.$('.arcade-callout a[href="/arcade"]');
  if (!link) bad('storefront: missing real <a href="/arcade"> callout in JS-off HTML');
  console.log(`store   -> arcade-callout=${!!link}`);
  await ctx.close();
}

// --- 3. JS ON: the runner mounts, is playable, and the high score persists ---
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(base + '/arcade?debug=1', { waitUntil: 'networkidle' });

  const canvas = await page.$('.arcade-canvas');
  if (!canvas) bad('JS: live <canvas> did not mount');
  const jumpBtn = await page.$('.arcade-jump');
  if (!jumpBtn) bad('JS: JUMP/START button missing');

  // Collision geometry (the "lose when you succeed" regression). groundY is
  // H(180) - 30 = 150; an obstacle in front of the runner is at x≈44, h=24.
  // Standing (feet at groundY) must hit it; a clean jump-clear (feet above its
  // top, 150-24=126) must NOT.
  const hit = await page.evaluate(() => {
    const f = window.__sdpRunnerHit;
    if (typeof f !== 'function') return null;
    const o = { x: 44, w: 16, h: 24 };
    return {
      grounded: f(150, 150, o),
      cleared: f(118, 150, o),
      behind: f(150, 150, { x: 120, w: 16, h: 24 }),
    };
  });
  if (!hit) bad('JS: __sdpRunnerHit not exposed under ?debug');
  else {
    if (!hit.grounded) bad('collision: standing in front of an obstacle should be a hit');
    if (hit.cleared)
      bad('collision: a clean jump-clear still registered as a hit (lose-when-you-succeed)');
    if (hit.behind) bad('collision: an obstacle the runner has not reached should not be a hit');
    console.log(
      `hitbox  -> grounded=${hit?.grounded} cleared=${hit?.cleared} behind=${hit?.behind}`,
    );
  }

  if (canvas && jumpBtn) {
    // Start a run and let the score tick up, then write a deterministic high
    // score directly through the spine so persistence is testable without
    // depending on reflex timing, and confirm it survives a reload + merge.
    await page.click('.arcade-jump'); // START
    await page.waitForTimeout(700); // let the score advance
    await page.evaluate(() => {
      const blob = JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
      blob.arcadeHigh = 4242;
      localStorage.setItem('sdp_progress_v1', JSON.stringify(blob));
    });
    await page.reload({ waitUntil: 'networkidle' });
    const hi = (await page.textContent('.arcade-hud').catch(() => '')) || '';
    if (!hi.includes('04242'))
      bad(`JS: high score did not persist/display -> ${JSON.stringify(hi)}`);
    console.log(`play    -> canvas=${!!canvas} jump=${!!jumpBtn} hud=${JSON.stringify(hi.trim())}`);
    await page.screenshot({ path: '.shots/arcade.png' });
  }
  await ctx.close();
}

await finish('\narcade checks passed.', `\n${failures()} arcade check(s) FAILED`);
