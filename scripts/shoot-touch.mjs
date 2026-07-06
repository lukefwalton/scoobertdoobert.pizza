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

// FTUE control hint on the MOBILE path: it shows on entry and must clear when the
// player starts moving via the ON-SCREEN STICK (not only a canvas drag-look) — the
// touch-specific dismissal the review flagged.
const hintUp = await page.waitForSelector('.hud-controlhint', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (!hintUp) fail('CONTROL HINT MISSING on touch entry');
else {
  const box = await (await page.$('.touch-stick'))?.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.up();
  }
  const hintGone = await page
    .waitForSelector('.hud-controlhint', { state: 'detached', timeout: 2500 })
    .then(
      () => true,
      () => false,
    );
  if (!hintGone) fail('CONTROL HINT STUCK on touch: did not clear after using the stick');
  else console.log('control hint clears on touch stick use');
}

// VIEWPORT: the touch HUD (fixed, inset:0, safe-area insets) must never push the
// page wider than the screen — a horizontal scrollbar on a phone is the classic
// mobile regression. Check portrait now, and landscape below.
const hOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const portraitOverflow = await hOverflow(page);
if (portraitOverflow > 1) {
  fail(`VIEWPORT: horizontal overflow with the touch HUD up (portrait, ${portraitOverflow}px)`);
}

// TOP-HUD LAYOUT: the objective chip (left), the ☰ menu (right), and the score / %-tall
// chip beneath it must not overlap on a phone. They shipped stacked on top of each other
// — the menu button and score shared the same top-right anchor, and the centered
// objective chip reached under the menu. Assert none of the three intersect, and that
// the menu shrank to just its glyph ("(Esc)" is hidden without a keyboard).
//
// One structured probe, reused for BOTH orientations (portrait now, landscape below):
// returns whether the objective chip exists, the three pairwise overlaps, and the
// collapsed menu width. A single assert helper then fails closed the same way in each —
// so landscape can't pass just because nothing happened to intersect while the chip
// vanished or the menu quietly re-expanded.
const topHudProbe = (p) =>
  p.evaluate(() => {
    const box = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom };
    };
    const ov = (a, c) => (a && c ? a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b : false);
    const obj = box('.hud-objective');
    const menu = box('.hud-menu-btn');
    const score = box('.hud-score');
    // The collapse is "the ' menu (Esc)' label is hidden". Read that DIRECTLY off the
    // label span's computed display, not off the button's pixel width — a width
    // threshold drifts with font/rendering, but display:none is the actual contract.
    const label = document.querySelector('.hud-menu-btn__label');
    return {
      hasObjective: !!obj,
      objMenu: ov(obj, menu),
      menuScore: ov(menu, score),
      objScore: ov(obj, score),
      labelDisplay: label ? getComputedStyle(label).display : 'absent',
      menuWidth: document.querySelector('.hud-menu-btn')?.offsetWidth ?? 0, // logged, not asserted
    };
  });
// Assert a probe result fails closed: the objective chip must exist (else the overlap
// checks are vacuously true — ov(null, …) is false — and a vanished chip reads as clean),
// no pair may intersect, and the menu label must have collapsed (display:none).
const assertTopHud = (h, where) => {
  if (!h.hasObjective) fail(`TOP-HUD: the objective chip is missing (${where}) — cannot verify`);
  if (h.objMenu) fail(`TOP-HUD: the objective chip overlaps the ☰ menu button (${where})`);
  if (h.menuScore) fail(`TOP-HUD: the ☰ menu button overlaps the score / %-tall chip (${where})`);
  if (h.objScore) fail(`TOP-HUD: the objective chip overlaps the score chip (${where})`);
  if (h.labelDisplay === 'absent')
    fail(`TOP-HUD: the menu label span is missing (${where}) — cannot verify collapse`);
  else if (h.labelDisplay !== 'none')
    fail(`TOP-HUD: the menu label didn't collapse (${where}, display:${h.labelDisplay})`);
};
const hud = await topHudProbe(page);
assertTopHud(hud, 'portrait');

// CURSOR: the other half of this fix — a coarse-pointer device must NOT paint the custom
// /cursor.cur (it surfaced as a stuck "pizza slice" over the HUD, since a touch device has
// no pointer). global.css resets it to `auto` under @media (pointer: coarse); prove the
// computed cursor resolved to auto (a desktop would resolve to the url(...cursor.cur)).
// Check BOTH body AND the ☰ menu button: the reported artifact was specifically over the
// menu button, and `button` carries its own `cursor: url(...), pointer` rule — so a
// selector-specific regression could re-break the button while body still reads auto.
const cursors = await page.evaluate(() => {
  const menu = document.querySelector('.hud-menu-btn');
  return {
    body: getComputedStyle(document.body).cursor,
    menu: menu ? getComputedStyle(menu).cursor : 'absent',
  };
});
if (cursors.body !== 'auto')
  fail(`CURSOR: custom cursor not reset on body (coarse-pointer, cursor=${cursors.body})`);
if (cursors.menu !== 'auto')
  fail(
    `CURSOR: custom cursor still on the ☰ menu button — the exact reported artifact (cursor=${cursors.menu})`,
  );

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
// Landscape is wider than the 640px breakpoint, so the coarse-pointer rule (not width
// alone) is what keeps this clean. Re-run the SAME structured probe and full assert set —
// the objective must still be present, nothing may overlap, and the menu must still be
// collapsed (a landscape phone is keyboard-less too).
const hudLandscape = await topHudProbe(page);
assertTopHud(hudLandscape, 'landscape');
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

// NARROW NON-TOUCH DESKTOP: the collapse rule has a SECOND arm — `@media (max-width: 640px)`
// — that is deliberate for skinny keyboard windows too (a non-touch browser pane narrow
// enough to hit the same horizontal collision; documented in hud.css). Everything above
// runs in a coarse-pointer/touch context, so that width arm was untested. Open a fresh
// NON-touch, narrow context (no hasTouch → `pointer: coarse` does NOT match, so ONLY the
// width breakpoint can collapse the label) and assert the same top-HUD contract. No touch
// stick is expected here (non-touch device); we only check the top band.
let hudNarrow;
{
  const dctx = await ctx.browser().newContext({ viewport: { width: 480, height: 900 } });
  const dp = await dctx.newPage();
  dp.on('pageerror', (e) => fail(`narrow-desktop pageerror: ${e.message}`));
  await dp.addInitScript(() => {
    try {
      sessionStorage.setItem('sdp_booted', '1');
    } catch {
      /* ignore */
    }
  });
  await dp.goto(base + '/?world=1', { waitUntil: 'commit' });
  const mounted = await dp.waitForSelector('.hud-menu-btn', { timeout: 12000 }).then(
    () => true,
    () => false,
  );
  if (!mounted) fail('NARROW-DESKTOP: the world/menu button did not mount at 480px (non-touch)');
  await dp.waitForFunction(() => !!window.__sdpCam, null, { timeout: 8000 }).catch(() => {});
  // Concrete state wait (repo standard: no fixed sleeps in smokes) — block until the exact
  // elements this path asserts on exist AND the label has actually collapsed to display:none
  // under the width breakpoint, instead of sleeping a fixed 200ms and hoping layout settled.
  await dp
    .waitForFunction(
      () => {
        const obj = document.querySelector('.hud-objective');
        const score = document.querySelector('.hud-score');
        const label = document.querySelector('.hud-menu-btn__label');
        return !!obj && !!score && !!label && getComputedStyle(label).display === 'none';
      },
      null,
      { timeout: 8000 },
    )
    .catch(() => {}); // let assertTopHud below produce the precise failure if this never settles
  hudNarrow = await topHudProbe(dp);
  // Same fail-closed contract as the phone: objective present, no overlaps, label collapsed
  // — here driven by the WIDTH arm, not the pointer arm.
  assertTopHud(hudNarrow, 'narrow-desktop');
  const noOverflow =
    (await dp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1;
  if (!noOverflow) fail('NARROW-DESKTOP: horizontal overflow at 480px');
  await dp.screenshot({ path: '.shots/touch-narrow-desktop.png' });
  await dctx.close();
}

// WIDE DESKTOP (full-label, fine pointer): the score↔menu collision this PR fixes was
// latent on EVERY viewport (both were anchored top:12/right:12), not just phones — every
// case above exercises the COLLAPSED-label layout, so the full-label desktop state had no
// guard. Open a wide, non-touch context and assert the INVERSE contract:
//   - the stacking fix still holds (objective present, nothing overlaps — the latent bug),
//   - the label stays VISIBLE here (neither the pointer nor the width arm fires), and
//   - the custom /cursor.cur STILL resolves (the coarse-pointer reset must not leak to a
//     fine-pointer desktop) — the symmetric half of the touch cursor-reset check.
let hudWide;
let wideCursor;
{
  const wctx = await ctx.browser().newContext({ viewport: { width: 1280, height: 800 } });
  const wp = await wctx.newPage();
  wp.on('pageerror', (e) => fail(`wide-desktop pageerror: ${e.message}`));
  await wp.addInitScript(() => {
    try {
      sessionStorage.setItem('sdp_booted', '1');
    } catch {
      /* ignore */
    }
  });
  await wp.goto(base + '/?world=1', { waitUntil: 'commit' });
  const wmounted = await wp.waitForSelector('.hud-menu-btn', { timeout: 12000 }).then(
    () => true,
    () => false,
  );
  if (!wmounted) fail('WIDE-DESKTOP: the world/menu button did not mount at 1280px');
  await wp.waitForFunction(() => !!window.__sdpCam, null, { timeout: 8000 }).catch(() => {});
  // Concrete state wait: block until the HUD is present AND the label is actually VISIBLE
  // (display !== none) — the wide-desktop, no-collapse state this path asserts.
  await wp
    .waitForFunction(
      () => {
        const obj = document.querySelector('.hud-objective');
        const score = document.querySelector('.hud-score');
        const label = document.querySelector('.hud-menu-btn__label');
        return !!obj && !!score && !!label && getComputedStyle(label).display !== 'none';
      },
      null,
      { timeout: 8000 },
    )
    .catch(() => {});
  hudWide = await topHudProbe(wp);
  // The core stacking fix must hold on desktop too (this was the latent every-viewport bug).
  if (!hudWide.hasObjective) fail('WIDE-DESKTOP: the objective chip is missing');
  if (hudWide.objMenu)
    fail('WIDE-DESKTOP: objective overlaps the ☰ menu button (latent every-viewport bug)');
  if (hudWide.menuScore)
    fail(
      'WIDE-DESKTOP: the ☰ menu button overlaps the score chip (the latent every-viewport bug)',
    );
  if (hudWide.objScore) fail('WIDE-DESKTOP: objective overlaps the score chip');
  // …but here the full label must STAY visible (neither collapse arm applies on wide desktop).
  if (hudWide.labelDisplay === 'none')
    fail('WIDE-DESKTOP: the "menu (Esc)" label collapsed on a wide desktop (should stay full)');
  // …and the custom cursor must STILL resolve on a fine-pointer desktop — proving the broad
  // coarse-pointer reset did not bleed onto desktop (the "desktop unchanged" claim).
  wideCursor = await wp.evaluate(
    () => getComputedStyle(document.querySelector('.hud-menu-btn') || document.body).cursor,
  );
  if (!/cursor\.cur/.test(wideCursor))
    fail(`WIDE-DESKTOP: the custom cursor no longer resolves on desktop (cursor=${wideCursor})`);
  await wp.screenshot({ path: '.shots/touch-wide-desktop.png' });
  await wctx.close();
}

console.log(
  `touch: stick=${stick} action=${actionBtn} walked=${walked} ` +
    `multitouch(walk=${multiWalk.toFixed(2)},turn=${multiTurn.toFixed(2)}) paused=${paused} ` +
    `stickHidesOnPause=${stickGone} realPathStick=${realStick} cursor(body=${cursors.body},menu=${cursors.menu}) ` +
    `topHud[portrait](obj=${hud.hasObjective},noOverlap=${!hud.objMenu && !hud.menuScore && !hud.objScore},label=${hud.labelDisplay},menu=${hud.menuWidth}px) ` +
    `topHud[landscape](obj=${hudLandscape.hasObjective},noOverlap=${!hudLandscape.objMenu && !hudLandscape.menuScore && !hudLandscape.objScore},label=${hudLandscape.labelDisplay},menu=${hudLandscape.menuWidth}px) ` +
    `topHud[narrowDesktop](obj=${hudNarrow.hasObjective},noOverlap=${!hudNarrow.objMenu && !hudNarrow.menuScore && !hudNarrow.objScore},label=${hudNarrow.labelDisplay},menu=${hudNarrow.menuWidth}px) ` +
    `topHud[wideDesktop](obj=${hudWide.hasObjective},noOverlap=${!hudWide.objMenu && !hudWide.menuScore && !hudWide.objScore},label=${hudWide.labelDisplay},cursorKept=${/cursor\.cur/.test(wideCursor)}) ` +
    `overflow(portrait=${portraitOverflow},landscape=${landscapeOverflow}) | errors=${failures()}`,
);
await finish('touch controls smoke passed.', `touch controls smoke: ${failures()} failure(s).`);
