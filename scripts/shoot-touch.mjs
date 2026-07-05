// Touch-controls smoke: proves the 3D world — previously desktop-only — is
// actually WALKABLE on a phone. This is the HUD-MECHANICS smoke; it enters via the
// ?world trigger (same shortcut the desktop shoot:world uses) so the touch rig can
// be exercised deterministically. The REAL mobile journey — order form → descent →
// machine-room install/consent → world — is covered by shoot:descent (the phone
// install gag) and shoot:fallback (mobile descends + the reduced-motion consent
// gate). Here, in a small TOUCH viewport (so useTouchDevice() is true and
// TouchControls mounts), we check:
//   1. the on-screen stick + context button render (portrait AND landscape),
//   2. the stick walks the camera, and releasing it stops the camera,
//   3. MULTI-TOUCH: a walk thumb + a look thumb at once (two real CDP pointers) —
//      the headline dragPointer-ownership path,
//   4. STUCK-INPUT: holding the stick while the HUD hides (pause) must not leave
//      the camera drifting after the modal closes,
//   5. the ☰ menu button opens the pause menu (the always-reachable nav), which
//      hides the touch HUD,
//   6. no horizontal overflow in either orientation,
//   7. REAL PATH: a fresh mobile context walks order form → descent → install gag →
//      "Enter the world" and confirms the touch HUD mounts (the mobile handoff).
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail, finish, failures } = await startSmoke({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
  } catch {
    /* ignore */
  }
});
watchPageErrors(page, fail);

await page.goto(base + '/?world=1', { waitUntil: 'commit' });

// The world + the touch HUD must both mount on a phone.
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`WORLD DID NOT MOUNT ON TOUCH: ${e.message}`);
}
const stick = await page.waitForSelector('.touch-stick', { timeout: 6000 }).then(
  () => true,
  () => false,
);
if (!stick) fail('TOUCH HUD MISSING: the on-screen stick did not render on a phone viewport');
const actionBtn = (await page.$('.touch-btn--action')) !== null;
if (!actionBtn) fail('TOUCH HUD MISSING: the context action button did not render');

// Clear the welcome card so nothing overlays the controls, then let WebGL warm up.
const welcomeUp = await page.waitForSelector('.hud-welcome', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (welcomeUp) {
  await page
    .getByRole('button', { name: /dismiss intro/i })
    .click({ timeout: 3000 })
    .catch(() => {});
}
// Wait on STATE, not a fixed sleep: __sdpCam is published from the render loop
// (exposed under ?world), so its presence proves the world is actually running.
await page.waitForFunction(() => !!window.__sdpCam, null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(300); // a few frames so the first pose is settled
await page.screenshot({ path: '.shots/touch-world.png' });

// VIEWPORT: the touch HUD (fixed, inset:0, safe-area insets) must never push the
// page wider than the screen — a horizontal scrollbar on a phone is the classic
// mobile regression. Check portrait now, and landscape below.
const hOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const portraitOverflow = await hOverflow(page);
if (portraitOverflow > 1) {
  fail(`VIEWPORT: horizontal overflow with the touch HUD up (portrait, ${portraitOverflow}px)`);
}

// Push the stick FORWARD (up = negative screen-y) and hold — the camera should
// travel. __sdpCam is exposed under the ?world test entrance.
let walked = false;
if (stick) {
  const box = await page.$eval('.touch-stick', (el) => {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  // Stamp the start pose in-page, then poll until the camera has actually traveled
  // — a STATE wait (walks as long as it needs, up to a cap) rather than a fixed hold.
  const camBefore = await page.evaluate(() => {
    window.__t0 = window.__sdpCam ? { ...window.__sdpCam } : null;
    return window.__t0;
  });
  await page.mouse.move(box.cx, box.cy);
  await page.mouse.down();
  await page.mouse.move(box.cx, box.cy - 44, { steps: 6 }); // full-forward push
  walked = await page
    .waitForFunction(
      () => {
        const c = window.__sdpCam;
        const a = window.__t0;
        return !!(a && c) && Math.hypot(c.x - a.x, c.z - a.z) > 0.15;
      },
      null,
      { timeout: 4000 },
    )
    .then(
      () => true,
      () => false,
    );
  const camMid = await page.evaluate(() => window.__sdpCam);
  await page.mouse.up();
  if (!walked) {
    const moved =
      camBefore && camMid ? Math.hypot(camMid.x - camBefore.x, camMid.z - camBefore.z) : 0;
    fail(
      camBefore
        ? `STICK DID NOT WALK: camera barely moved (${moved.toFixed(3)})`
        : 'STICK WALK: __sdpCam not exposed (test entrance regression?)',
    );
  }
  // Releasing the stick must STOP the camera (the reset zeroed the vector). Let
  // the pointerup propagate first — reading the pose in the same tick as up()
  // can catch one last in-flight movement frame and flake the strict threshold.
  await page.waitForTimeout(350);
  const camA = await page.evaluate(() => window.__sdpCam);
  await page.waitForTimeout(600);
  const camB = await page.evaluate(() => window.__sdpCam);
  if (camA && camB && Math.hypot(camB.x - camA.x, camB.z - camA.z) > 0.05) {
    fail('STICK DID NOT STOP: camera kept drifting after the stick was released');
  }
  await page.screenshot({ path: '.shots/touch-world-walked.png' });
}

// MULTI-TOUCH — the headline of this change: a walk thumb AND a look thumb at the
// same time. page.mouse is single-pointer, so drive two REAL touch pointers via
// CDP: finger 0 holds the stick forward (walk), finger 1 drags the bare canvas
// sideways (look). If the pointer-ownership (dragPointer) is wrong, one finger
// corrupts the other — so assert BOTH the position advanced AND the yaw turned in
// the one gesture. This is the regression the whole feature hinges on.
let multiWalk = 0;
let multiTurn = 0;
if (walked) {
  const cdp = await page.context().newCDPSession(page);
  const s = await page.$eval('.touch-stick', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const lookX = 300;
  const lookY = 300; // upper-right: over the bare canvas, clear of the HUD clusters
  const before = await page.evaluate(() => ({ ...window.__sdpCam }));
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: s.x, y: s.y, id: 0 },
      { x: lookX, y: lookY, id: 1 },
    ],
  });
  // Hold the stick forward while sweeping the look finger left, in small steps.
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: s.x, y: s.y - 40, id: 0 },
        { x: lookX - i * 18, y: lookY, id: 1 },
      ],
    });
    await page.waitForTimeout(60);
  }
  const after = await page.evaluate(() => ({ ...window.__sdpCam }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (before && after) {
    multiWalk = Math.hypot(after.x - before.x, after.z - before.z);
    multiTurn = Math.abs(after.yaw - before.yaw);
    if (multiWalk <= 0.1)
      fail(`MULTI-TOUCH: no walk while looking (moved ${multiWalk.toFixed(3)})`);
    if (multiTurn <= 0.05)
      fail(`MULTI-TOUCH: no look while walking (yaw Δ ${multiTurn.toFixed(3)})`);
  }
  // The stick must release cleanly on touchEnd (its pointerup zeroes the vector).
  await page.waitForTimeout(400);
  const restA = await page.evaluate(() => ({ ...window.__sdpCam }));
  await page.waitForTimeout(500);
  const restB = await page.evaluate(() => ({ ...window.__sdpCam }));
  if (restA && restB && Math.hypot(restB.x - restA.x, restB.z - restA.z) > 0.05) {
    fail('MULTI-TOUCH: camera kept drifting after both fingers lifted');
  }
}

// STUCK-INPUT lifecycle: if the HUD hides mid-hold (open pause while walking), the
// stick element unmounts with no pointerup, so the shared move vector must be reset
// on hide — otherwise the camera drifts the instant the modal closes. Hold the
// stick forward via a CDP touch, open pause (unmounts the stick), resume, and
// assert the camera is stationary.
if (walked) {
  const cdp2 = await page.context().newCDPSession(page);
  const sp = await page.$eval('.touch-stick', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await cdp2.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: sp.x, y: sp.y, id: 0 }],
  });
  await cdp2.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: sp.x, y: sp.y - 40, id: 0 }],
  });
  await page.waitForTimeout(250); // walking now
  await page.keyboard.press('Escape'); // open pause → TouchControls returns null → stick unmounts
  const pausedMid = await page.waitForSelector('.hud-pause', { timeout: 3000 }).then(
    () => true,
    () => false,
  );
  if (!pausedMid) fail('STUCK-INPUT: could not open pause to exercise the hidden-reset');
  // The finger never lifted from the now-gone stick; end it so CDP state is clean.
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  // Resume and prove the camera does NOT drift from a stale vector.
  await page
    .getByRole('button', { name: /^resume/i })
    .click({ timeout: 3000 })
    .catch(() => page.keyboard.press('Escape'));
  await page.waitForSelector('.touch-stick', { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
  const s1 = await page.evaluate(() => ({ ...window.__sdpCam }));
  await page.waitForTimeout(600);
  const s2 = await page.evaluate(() => ({ ...window.__sdpCam }));
  const drift = s1 && s2 ? Math.hypot(s2.x - s1.x, s2.z - s1.z) : 0;
  if (drift > 0.05) {
    fail(`STUCK-INPUT: camera drifted ${drift.toFixed(3)} after pause closed (stale touch vector)`);
  }
}

// VIEWPORT (landscape): rotate to a short, wide phone and confirm the HUD still
// fits with no horizontal overflow — the stick + action cluster must not spill.
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(400);
const landscapeOverflow = await hOverflow(page);
if (landscapeOverflow > 1) {
  fail(`VIEWPORT: horizontal overflow with the touch HUD up (landscape, ${landscapeOverflow}px)`);
}
const stickInLandscape = (await page.$('.touch-stick')) !== null;
if (!stickInLandscape) fail('VIEWPORT: the touch stick vanished in landscape');
await page.screenshot({ path: '.shots/touch-landscape.png' });
await page.setViewportSize({ width: 390, height: 844 }); // back to portrait for the pause check

// The ☰ menu button opens the pause menu — the always-reachable nav on a phone.
await page.click('.hud-menu-btn');
const paused = await page.waitForSelector('.hud-pause', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (!paused) fail('MENU BUTTON: tapping ☰ did not open the pause menu');
// The touch controls must hide while paused (they mean nothing under the menu).
const stickGone = (await page.$('.touch-stick')) === null;
if (!stickGone) fail('TOUCH HUD: the stick stayed visible under the pause menu');
await page.screenshot({ path: '.shots/touch-pause.png' });

// REAL-PATH coverage: the mechanics above enter via ?world (required — __sdpCam is
// gated to the test entrance by testHooks.ts). This block proves the ACTUAL mobile
// journey — order form → descent floors → machine-room install gag → "Enter the
// world" — lands on the touch HUD, so the mobile handoff can't regress unnoticed.
// (Fresh context; no camera asserts here, just that the real path shows the stick.)
let realStick;
{
  const rctx = await ctx
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const rp = await rctx.newPage();
  rp.on('pageerror', (e) => fail(`real-path pageerror: ${e.message}`));
  await rp.goto(base + '/', { waitUntil: 'networkidle' });
  const floor = (id) =>
    rp.waitForSelector(`[data-floor="${id}"]`, { timeout: 8000 }).then(
      () => true,
      () => false,
    );
  await rp.click('#order-form button[type="submit"]'); // Continue → descend
  if (!(await floor('y1999'))) fail('REAL PATH: order form did not start the mobile descent');
  await rp.click('.floor-door--down');
  await floor('y2000');
  await rp.click('.floor-door--down');
  await floor('machine');
  await rp.click('.mr__install'); // phone → the "pocket computer" pre-roll
  const gag = await rp.waitForSelector('.mr__gag', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!gag) fail('REAL PATH: mobile install did not show the pocket-computer pre-roll');
  await rp.getByRole('button', { name: /enter the world/i }).click(); // wave-through
  const mounted = await rp.waitForSelector('.hud-menu-btn', { timeout: 18000 }).then(
    () => true,
    () => false,
  );
  if (!mounted) fail('REAL PATH: world did not mount after the mobile install handoff');
  realStick = await rp.waitForSelector('.touch-stick', { timeout: 6000 }).then(
    () => true,
    () => false,
  );
  if (!realStick)
    fail('REAL PATH: touch HUD (stick) absent after entering the world via the real mobile flow');
  await rp.screenshot({ path: '.shots/touch-realpath.png' });
  await rctx.close();
}

console.log(
  `touch: stick=${stick} action=${actionBtn} walked=${walked} ` +
    `multitouch(walk=${multiWalk.toFixed(2)},turn=${multiTurn.toFixed(2)}) paused=${paused} ` +
    `stickHidesOnPause=${stickGone} realPathStick=${realStick} ` +
    `overflow(portrait=${portraitOverflow},landscape=${landscapeOverflow}) | errors=${failures()}`,
);
await finish('touch controls smoke passed.', `touch controls smoke: ${failures()} failure(s).`);
