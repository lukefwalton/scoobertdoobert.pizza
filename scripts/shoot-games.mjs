// Verifies the three new arcade cabinets — Crusteroids, Slice Breaker, Jazz Snake.
// Each one, two contracts (mirrors shoot:arcade for Pizza Run):
//   1. JS-DISABLED: the route prerenders to a real, crawlable document (title +
//      a real "back to storefront" anchor) with NO <canvas> (the canvas is a
//      post-hydration enhancement, so the JS-off page is intact).
//   2. JS ON: the live game mounts a <canvas>, STARTS on a tap (the title overlay
//      clears), runs without a page error, and its PER-CABINET high score
//      (progress.arcadeHighs[id]) persists across a reload + displays in the HUD.
import { launchSmoke } from './lib/smoke.mjs';
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
    // The held turret controls: pressing ◀/▶ sets an internal flag, releasing clears
    // it. Read it back through the read-only state hook (no RAF timing).
    holdProbe: {
      stateHook: '__sdpRadarState',
      holds: [
        { button: 'left', field: 'moveL' },
        { button: 'right', field: 'moveR' },
      ],
    },
    // A canvas drag RELEASED off-canvas must still clear drag state (pointer capture),
    // so a later hover isn't mistaken for an active drag. Probe reads `dragging`.
    dragProbe: { stateHook: '__sdpRadarState', field: 'dragging' },
  },
  {
    slug: 'burrito-belt',
    title: 'Burrito Belt',
    id: 'burrito-belt',
    loseHook: '__sdpBeltForceLose',
    // The held soft-drop control (the parity gap the review flagged): the ▼ pad
    // button engages soft-drop while pressed and releases it on lift.
    holdProbe: {
      stateHook: '__sdpBeltState',
      holds: [{ button: 'soft drop', field: 'softDrop' }],
    },
  },
  // delivery-dash's loss (clipped by a car) isn't keypress-forceable, so it exposes
  // a ?debug force-lose hook that drives its REAL game-over branch (the smoke calls
  // it + asserts the over overlay + the persisted high score). Hops are discrete, so
  // there's no held-control parity to probe.
  {
    slug: 'delivery-dash',
    title: 'Delivery Dash',
    id: 'delivery-dash',
    loseHook: '__sdpDashForceLose',
    // The successful-delivery branch (reach the door → +100, reset to the curb,
    // rebuild faster lanes) isn't keypress-forceable, so a ?debug hook drives the
    // REAL deliver() and a read-only state hook witnesses the effects.
    deliverProbe: {
      deliverHook: '__sdpDashDeliver',
      stateHook: '__sdpDashState',
    },
  },
];

const { browser, fail: bad, finish, failures } = await launchSmoke();

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

  // --- 1b. The force-lose globals are ACTION hooks → ?debug-ONLY (the stricter
  //     gate, like __sdpGoToRoom). Confirm they're ABSENT at the real call site on a
  //     normal route AND on the wider ?world entrance (which only gates read-only
  //     state). Presence on ?debug is proven by the lose path working in block 2. ---
  if (g.loseHook) {
    for (const q of ['', '?world=1']) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(`${base}/${g.slug}${q}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.arcade-canvas', { timeout: 12000 }).catch(() => {});
      const leaked = await page.evaluate((h) => typeof window[h] === 'function', g.loseHook);
      if (leaked)
        bad(`${g.slug}: ${g.loseHook} is exposed on "${q || 'plain'}" — must be ?debug-only`);
      console.log(`${g.slug} ${q || 'plain'} -> hookAbsent=${!leaked}`);
      await ctx.close();
    }
  }

  // --- 2. JS ON: mounts, starts, no errors, per-game high score persists ---
  {
    const ctx = await browser.newContext({
      viewport: { width: 420, height: 760 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => bad(`pageerror: ${e.message}`));
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

      // Touch-hold parity: the held pad controls (PizzaRadar ◀/▶, BurritoBelt
      // soft-drop) set an internal flag on pointerdown and clear it on pointerup —
      // the trickiest input path, and easy to regress unnoticed on desktop. Press +
      // release the REAL pad button and read the flag back through the game's
      // read-only ?world/?debug state hook (deterministic — no RAF timing).
      if (g.holdProbe) {
        const { stateHook, holds } = g.holdProbe;
        const read = (field) =>
          page.evaluate(
            ([h, f]) => (typeof window[h] === 'function' ? !!window[h]()[f] : null),
            [stateHook, field],
          );
        for (const { button, field } of holds) {
          const padBtn = await page.$(`.arcade-pad button[aria-label="${button}"]`);
          if (!padBtn) {
            bad(`${g.slug} JS: no "${button}" pad button to hold-test`);
            continue;
          }
          const bx = await padBtn.boundingBox();
          await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
          await page.mouse.down();
          const held = await read(field);
          await page.mouse.up();
          const released = await read(field);
          if (held !== true)
            bad(`${g.slug} JS: holding "${button}" did not set ${field} (got ${held})`);
          if (released !== false)
            bad(`${g.slug} JS: releasing "${button}" left ${field} stuck (got ${released})`);
          console.log(`${g.slug} hold "${button}" -> down=${held} up=${released}`);
        }
      }

      // Drag-strand guard (the review's yellow flag): press on the canvas, drag UP
      // and OUT of its bounds, and release the pointer outside it. With pointer
      // capture the canvas still gets that pointerup and clears drag state; without
      // it, `dragging` would stay stuck true and a later hover would sweep the turret.
      if (g.dragProbe) {
        const cb = await canvas.boundingBox();
        await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
        await page.mouse.down();
        // Move off the TOP edge AND shift X by >4px first, so this exercises the real
        // moved=true DRAG branch (the path that originally stranded), not the tap path.
        await page.mouse.move(cb.x + cb.width / 2 + 40, Math.max(2, cb.y - 40));
        await page.mouse.up(); // released OUTSIDE the canvas bounds
        const dragging = await page.evaluate(
          (h) => (typeof window[h] === 'function' ? !!window[h]().dragging : null),
          g.dragProbe.stateHook,
        );
        if (dragging !== false)
          bad(
            `${g.slug} JS: a drag released off-canvas left drag state stranded (dragging=${dragging})`,
          );
        console.log(`${g.slug} drag-off-canvas-release -> dragging=${dragging}`);
      }

      // The successful-delivery branch (delivery-dash): call the ?debug deliver hook
      // and assert via the read-only state hook that it scored +100, reset the player
      // to the curb (row 0), counted the delivery, and bumped the lane speed. Runs
      // while the game is still playing, before the loss path below ends it.
      if (g.deliverProbe) {
        const { deliverHook, stateHook } = g.deliverProbe;
        const readState = () =>
          page.evaluate((h) => (typeof window[h] === 'function' ? window[h]() : null), stateHook);
        const before = await readState();
        const fired = await page.evaluate((h) => {
          if (typeof window[h] !== 'function') return false;
          window[h]();
          return true;
        }, deliverHook);
        if (!fired) bad(`${g.slug} JS: the deliver hook ${deliverHook} was not exposed`);
        await page.waitForTimeout(120);
        const after = await readState();
        if (!before || !after) {
          bad(`${g.slug} JS: deliver state hook ${stateHook} missing`);
        } else {
          if (after.score !== before.score + 100)
            bad(`${g.slug} JS: a delivery should score +100 (${before.score} -> ${after.score})`);
          if (after.row !== 0 || after.delivered !== before.delivered + 1)
            bad(
              `${g.slug} JS: a delivery should reset to the curb + count it (row ${after.row}, delivered ${before.delivered} -> ${after.delivered})`,
            );
          if (!(after.speed > before.speed))
            bad(
              `${g.slug} JS: a delivery should speed the lanes up (${before.speed} -> ${after.speed})`,
            );
          console.log(
            `${g.slug} deliver -> score ${before.score}->${after.score} row=${after.row} speed ${before.speed}->${after.speed}`,
          );
        }
      }

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
        `${g.slug} JS    -> canvas=${!!canvas} started=${started} errors=${failures()} hi="${hud.trim()}"`,
      );
      await page.screenshot({ path: `.shots/game-${g.slug}.png` });
    }
    await ctx.close();
  }
}

await finish('\ngames checks passed.', `\n${failures()} games check(s) FAILED`);
