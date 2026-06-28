// Verifies "Poke Scoobert" — the face-stretch instrument cabinet.
//   1. JS-OFF: /poke prerenders to a real crawlable page (title + back anchor),
//      with NO live canvas (the instrument is a post-hydration enhancement).
//   2. The arcade page links to /poke (the cabinet is discoverable).
//   3. JS ON: the warp canvas mounts and a drag distorts it without throwing.
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail: bad, finish, failures } = await launchSmoke();

// --- 1. JS-OFF crawlable shell ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/poke', { waitUntil: 'load' });
  const title = await page.title();
  if (!title.includes('Poke Scoobert')) bad(`no-JS title unexpected -> ${JSON.stringify(title)}`);
  const back = await page.$('a[href="/arcade"]');
  if (!back) bad('no-JS: missing "back to the arcade" anchor');
  const canvas = await page.$('canvas');
  if (canvas) bad('no-JS: a <canvas> rendered into crawlable HTML (should be JS-only)');
  console.log(
    `no-JS    -> titled=${title.includes('Poke Scoobert')} back=${!!back} canvas=${!!canvas}`,
  );
  await ctx.close();
}

// --- 2. discoverable from the arcade ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/arcade', { waitUntil: 'load' });
  const link = await page.$('a[href="/poke"]');
  if (!link) bad('arcade: missing link to the /poke cabinet');
  console.log(`arcade   -> poke-link=${!!link}`);
  await ctx.close();
}

// --- 3. JS ON: the warp mounts, a TOUCH drag stretches it, the stretch HOLDS
//        while pressed (the "tap just giggles, won't pull and stay" bug — which
//        was mobile-specific), and springs back on release. Driven by real touch
//        events (CDP Input.dispatchTouchEvent), not page.mouse, so it exercises
//        the actual pointerType:'touch' path + setPointerCapture on a phone.
//        ?debug exposes window.__sdpPokeStretch (max node displacement, px). ---
{
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 900 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => bad(`pageerror: ${e.message}`));
  await page.goto(base + '/poke?debug=1', { waitUntil: 'networkidle' });

  const canvas = await page.waitForSelector('.poke-canvas', { timeout: 8000 }).catch(() => null);
  if (!canvas) bad('JS: face-stretch canvas did not mount');

  let heldStretch = 0;
  let stayStretch = 0;
  let releasedStretch = 0;
  if (canvas) {
    await page.waitForTimeout(600); // let the face image load
    const box = await canvas.boundingBox();
    const stretch = () => page.evaluate(() => window.__sdpPokeStretch ?? 0);
    // Real touch input (a finger), not a mouse — the original bug only showed on
    // touch. touchEnd carries no points.
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, x, y) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
    const sx = box.x + box.width / 2;
    const sy = box.y + box.height * 0.42;
    const ex = box.x + box.width * 0.25;
    const ey = box.y + box.height * 0.78;
    // grab near the centre and yank down-left to stretch the face — then HOLD.
    await touch('touchStart', sx, sy);
    for (let i = 1; i <= 14; i++) {
      await touch('touchMove', sx + (ex - sx) * (i / 14), sy + (ey - sy) * (i / 14));
    }
    await page.waitForTimeout(120);
    heldStretch = await stretch();
    // Keep the finger STILL (no further movement). The bug was the face springing
    // straight back to rest here; with pull-and-hold it should stay deformed.
    await page.waitForTimeout(500);
    stayStretch = await stretch();
    await page.screenshot({ path: '.shots/poke.png' });
    await touch('touchEnd', ex, ey);
    // Released → jelly springs home.
    await page.waitForTimeout(600);
    releasedStretch = await stretch();

    if (heldStretch < 15)
      bad(`JS: drag did not stretch the face (held displ ${heldStretch.toFixed(1)}px)`);
    if (stayStretch < heldStretch * 0.5)
      bad(
        `JS: stretch did not HOLD while pressed (held ${heldStretch.toFixed(1)} -> stayed ${stayStretch.toFixed(1)}px) — the "won't pull and stay" bug`,
      );
    if (releasedStretch > stayStretch * 0.5)
      bad(
        `JS: face did not spring back after release (stayed ${stayStretch.toFixed(1)} -> released ${releasedStretch.toFixed(1)}px)`,
      );
  }
  console.log(
    `play     -> canvas=${!!canvas} held=${heldStretch.toFixed(1)} stay=${stayStretch.toFixed(1)} released=${releasedStretch.toFixed(1)} errors=${failures()}`,
  );
  await ctx.close();
}

await finish('\npoke checks passed.', `\n${failures()} poke check(s) FAILED`);
