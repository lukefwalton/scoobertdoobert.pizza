// Verifies the three new arcade cabinets — Crusteroids, Slice Breaker, Jazz Snake.
// Each one, two contracts (mirrors shoot:arcade for Pizza Run):
//   1. JS-DISABLED: the route prerenders to a real, crawlable document (title +
//      a real "back to storefront" anchor) with NO <canvas> (the canvas is a
//      post-hydration enhancement, so the JS-off page is intact).
//   2. JS ON: the live game mounts a <canvas>, STARTS on a tap (the title overlay
//      clears), runs without a page error, and its PER-CABINET high score
//      (progress.arcadeHighs[id]) persists across a reload + displays in the HUD.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const GAMES = [
  { slug: 'crusteroids', title: 'Crusteroids', id: 'crusteroids' },
  { slug: 'slice-breaker', title: 'Slice Breaker', id: 'slice-breaker' },
  // jazz-snake can be driven to a DETERMINISTIC loss (steer up into the top wall),
  // so it carries the real lose-path assertion: the GAME OVER overlay must render
  // (guards the "ref phase set but React setPhase missing" regression).
  { slug: 'jazz-snake', title: 'Jazz Snake', id: 'jazz-snake', forceLoss: true },
  // pizza-radar + burrito-belt losses (a saucer to the floor / a jammed belt) aren't
  // keypress-forceable, so each exposes a ?debug force-lose hook that drives its REAL
  // game-over branch; the smoke calls it and asserts the GAME OVER overlay renders.
  {
    slug: 'pizza-radar',
    title: 'Pizza Radar 1996',
    id: 'pizza-radar',
    loseHook: '__sdpRadarForceLose',
  },
  {
    slug: 'burrito-belt',
    title: 'Burrito Belt',
    id: 'burrito-belt',
    loseHook: '__sdpBeltForceLose',
  },
];

const browser = await chromium.launch();
let fail = 0;
const bad = (msg) => {
  fail++;
  console.log('FAIL:', msg);
};

for (const g of GAMES) {
  // --- 1. JS-DISABLED: a real prerendered page, no canvas ---
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(`${base}/${g.slug}`, { waitUntil: 'load' });
    const title = await page.title();
    const titled = title.includes(g.title);
    if (!titled) bad(`${g.slug} no-JS <title> unexpected -> ${JSON.stringify(title)}`);
    const back = await page.$('a[href="/"]');
    if (!back) bad(`${g.slug} no-JS: missing real back-to-storefront anchor`);
    const canvas = await page.$('canvas');
    if (canvas) bad(`${g.slug} no-JS: a <canvas> leaked into the crawlable HTML`);
    console.log(`${g.slug} no-JS -> titled=${titled} back=${!!back} canvas=${!!canvas}`);
    await ctx.close();
  }

  // --- 2. JS ON: mounts, starts, no errors, per-game high score persists ---
  {
    const ctx = await browser.newContext({
      viewport: { width: 420, height: 760 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(`${base}/${g.slug}?debug=1`, { waitUntil: 'networkidle' });

    const canvas = await page.$('.arcade-canvas');
    if (!canvas) bad(`${g.slug} JS: live <canvas> did not mount`);

    // start it: a tap on the canvas
    if (canvas) {
      const box = await canvas.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(900); // let a few frames + the rAF loop run
      const overlayText = await page
        .$eval('.arcade-overlay', (el) => el.textContent || '')
        .catch(() => '');
      const started = !/TAP TO START|TAP TO LAUNCH|TAP \/ SWIPE/i.test(overlayText);
      if (!started) bad(`${g.slug} JS: tapping the screen did not start the game`);
      if (errs.length) bad(`${g.slug} JS: page error -> ${errs[0]?.slice(0, 80)}`);

      // The real lose path: drive a deterministic loss and assert the GAME OVER
      // overlay actually renders (not just the ref phase flipping). Check BEFORE each
      // keypress so we don't restart the game by pressing a steer key post-over.
      if (g.forceLoss) {
        let gameOver = false;
        for (let t = 0; t < 40 && !gameOver; t++) {
          gameOver = await page
            .$eval('.arcade-overlay', (el) => /GAME OVER/i.test(el.textContent || ''))
            .catch(() => false);
          if (gameOver) break;
          await page.keyboard.press('ArrowUp'); // steer into the top wall
          await page.waitForTimeout(110);
        }
        if (!gameOver) bad(`${g.slug} JS: a real loss never surfaced the GAME OVER overlay`);
        console.log(`${g.slug} loss  -> gameover=${gameOver}`);
      }

      // Hook-driven lose path: call the game's ?debug force-lose hook (it drives the
      // REAL game-over branch) and assert the over overlay renders. Asserts on the
      // shared "PLAY AGAIN" blink, so it works whether the card says GAME OVER or a
      // flavour title (e.g. burrito-belt's "BELT JAMMED").
      if (g.loseHook) {
        const fired = await page.evaluate((h) => {
          if (typeof window[h] !== 'function') return false;
          window[h]();
          return true;
        }, g.loseHook);
        if (!fired) bad(`${g.slug} JS: the force-lose hook ${g.loseHook} was not exposed`);
        let gameOver = false;
        for (let t = 0; t < 30 && !gameOver; t++) {
          gameOver = await page
            .$eval('.arcade-overlay', (el) => /PLAY AGAIN/i.test(el.textContent || ''))
            .catch(() => false);
          if (gameOver) break;
          await page.waitForTimeout(100);
        }
        if (!gameOver)
          bad(`${g.slug} JS: the force-lose hook never surfaced the game-over overlay`);
        // The loss must also PERSIST a high score via recordArcadeHigh (the real
        // over branch scores before ending) — read it BEFORE the manual seed below,
        // so a regression that shows the overlay but skips the HI write is caught.
        const lossHi = await page.evaluate((id) => {
          try {
            return (JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').arcadeHighs || {})[
              id
            ];
          } catch {
            return undefined;
          }
        }, g.id);
        if (!(lossHi > 0))
          bad(
            `${g.slug} JS: the loss did not persist a high score (arcadeHighs[${g.id}]=${lossHi})`,
          );
        console.log(`${g.slug} loss  -> gameover=${gameOver} hiWritten=${lossHi}`);
      }

      // per-cabinet high score persistence: write it into arcadeHighs[id], reload,
      // and confirm the HUD reads it back (the progress spine + the game's HI).
      await page.evaluate((id) => {
        const blob = JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
        blob.arcadeHighs = { ...(blob.arcadeHighs || {}), [id]: 777 };
        localStorage.setItem('sdp_progress_v1', JSON.stringify(blob));
      }, g.id);
      await page.reload({ waitUntil: 'networkidle' });
      const hud = (await page.textContent('.arcade-hud').catch(() => '')) || '';
      if (!hud.includes('777'))
        bad(`${g.slug} JS: high score 777 did not persist -> ${hud.trim()}`);
      console.log(
        `${g.slug} JS    -> canvas=${!!canvas} started=${started} errors=${errs.length} hi="${hud.trim()}"`,
      );
      await page.screenshot({ path: `.shots/game-${g.slug}.png` });
    }
    await ctx.close();
  }
}

await browser.close();
console.log(fail ? `\n${fail} games check(s) FAILED` : '\ngames checks passed.');
process.exit(fail ? 1 : 0);
