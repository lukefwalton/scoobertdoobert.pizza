// Phase 2 descent test (full loop + both escape hatches). Waits on explicit
// floor markers (`[data-floor="..."]`) + the world HUD button rather than fixed
// sleeps, so it stays stable if transition/boot timings drift. Verifies on
// desktop: storefront → 1999 → 2000 → machine room via the era-floor doors, the
// up-door round-trip, the relocated install (machine room → installer → 3D
// world), and exiting the world rewinding to floor 0. Then a mobile pass: the
// machine room skips the WebGL CRT, and Install pops the "pocket computer"
// pre-roll gag that still offers /text (the world itself now runs on phones).
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail, finish, failures } = await launchSmoke();
const floor = (p, id, timeout = 8000) =>
  p.waitForSelector(`[data-floor="${id}"]`, { timeout }).then(
    () => true,
    () => (fail(`floor "${id}" never appeared`), false),
  );

// ── desktop full loop ──────────────────────────────────────────────────────
const ctx = await browser.newContext({
  viewport: { width: 1100, height: 850 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => fail(`desktop pageerror: ${e.message}`));

await page.goto(base + '/', { waitUntil: 'networkidle' });

// Entry rewire: the Order Online "Continue" starts the descent (floor 0 -> 1).
await page.click('#order-form button[type="submit"]');
const on1999 = await floor(page, 'y1999');
await page.screenshot({ path: '.shots/descent-1999.png' });

// The 1999 "Sign My Guestbook!" CTA must be a REAL anchor → the contact
// destination (a mailto:), never the '#' placeholder or the TEXT_ONLY_PATH
// ('/text') fallback. This guards the constitution's "real anchor, never #"
// rule AND proves destById('contact') resolved rather than the ?? fallback firing.
const guestbookOk = await page
  .evaluate(() => {
    const a = document.querySelector('.sb__gbook');
    if (!(a instanceof HTMLAnchorElement)) return false;
    const href = a.getAttribute('href') || '';
    return href.startsWith('mailto:') && href !== '/text'; // contact is a mailto
  })
  .catch(() => false);
if (!guestbookOk)
  fail('the 1999 "Sign My Guestbook!" CTA is not a real contact anchor (fell back to # or /text?)');

// Deeper via the era-floor doors.
await page.click('.floor-door--down');
const on2000 = await floor(page, 'y2000');

// The @-mail envelope serves its ANIMATED frame under normal motion here; the
// reduced-motion still-swap is asserted in the reduced-motion pass at the end —
// together they cover the <picture> in BOTH directions. WAIT for the <img> to
// actually load (currentSrc is empty until it does) rather than reading it in a
// bare evaluate — otherwise a slow runner loses the load race (cf. the NEW! blinky
// check below, which already waits).
const atmailAnimated = await page
  .waitForFunction(
    () => {
      const img = document.querySelector('.tl__mail img');
      return !!img && img.complete && (img.currentSrc || '').endsWith('/gifs/atmail.gif');
    },
    null,
    { timeout: 6000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!atmailAnimated)
  fail('the @-mail did not serve its animated frame (atmail.gif) under normal motion');

await page.click('.floor-door--down');
const onMachine = await floor(page, 'machine');
await page.screenshot({ path: '.shots/descent-machine.png' });

// up-door round-trip: machine room -> back up to 2000 -> back down to machine room.
await page.click('.floor-door--up');
const upDoor = await floor(page, 'y2000');
await page.click('.floor-door--down');
await floor(page, 'machine');

// Desktop should mount the live CRT preview (lazy WebGL) before install — the
// mirror of the mobile noCanvas check, so a MiniWorldPreview regression fails
// here loudly instead of silently shipping a dead screen.
let crtCanvas = false;
try {
  await page.waitForSelector('.mr__crt-screen canvas', { timeout: 12000 });
  crtCanvas = true;
} catch {
  fail('desktop machine-room CRT canvas never mounted');
}

// The relocated install: machine room -> installer -> 3D world.
await page.click('.mr__install');
let world = false;
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 18000 });
  world = true;
} catch {
  fail('world never mounted after install');
}

// Exit the world via the pause menu -> exitWorld() rewinds to floor 0.
await page.keyboard.press('Escape');
let exitToFloor0 = false;
try {
  await page.getByRole('button', { name: 'Return to storefront' }).click({ timeout: 5000 });
  exitToFloor0 = await floor(page, 'storefront');
} catch {
  fail('could not return to storefront from the world');
}

// The rewind must leave floor 0 actually interactive, not just on-screen:
// the order form should restart the descent (floor 0 -> 1999) all over again.
let reusable = false;
if (exitToFloor0) {
  await page.click('#order-form button[type="submit"]');
  reusable = await floor(page, 'y1999');
}
await ctx.close();

// ── mobile / low-power handoff ─────────────────────────────────────────────
// A faithful phone: mobile viewport + TOUCH, so pointer:coarse matches — the
// desktop-invite gag now requires a coarse pointer (so a narrow mouse-driven
// desktop window doesn't get told to "try desktop").
const mctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mp = await mctx.newPage();
mp.on('pageerror', (e) => fail(`mobile pageerror: ${e.message}`));
await mp.goto(base + '/', { waitUntil: 'networkidle' });
await mp.click('.floor-door--plain'); // descend via the era-floor door (universal on mobile)
await floor(mp, 'y1999');
await mp.click('.floor-door--down');
await floor(mp, 'y2000');
await mp.click('.floor-door--down');
await floor(mp, 'machine');
const mobileNoCanvas = (await mp.$$eval('.mr__crt-screen canvas', (e) => e.length)) === 0;
// Mobile install now pops the cheeky "desktop only — phones didn't exist in 1996"
// gag instead of silently redirecting. It must still offer a REAL path onward to
// /text (never a dead end), so: gag appears → its text-only link → /text.
await mp.click('.mr__install');
let mobileGag = false;
let tabTraps = false;
let gagEscapes = false;
let focusReturned = false;
let backdropCloses = false;
let mobileToText = false;
try {
  await mp.waitForSelector('.mr__gag', { timeout: 6000 });
  mobileGag = true;
} catch {
  fail('mobile install did not show the desktop-invite gag');
}
if (mobileGag) {
  // Focus trap (the gag is open): Tab from the last control wraps to the first,
  // and Shift+Tab from the first wraps to the last — focus can't leave the modal.
  await mp.locator('.mr__gag-back').focus();
  await mp.keyboard.press('Tab');
  const wrapFwd = await mp.evaluate(
    () => document.activeElement?.classList.contains('mr__gag-x') ?? false,
  );
  await mp.locator('.mr__gag-x').focus();
  await mp.keyboard.press('Shift+Tab');
  const wrapBack = await mp.evaluate(
    () => document.activeElement?.classList.contains('mr__gag-back') ?? false,
  );
  tabTraps = wrapFwd && wrapBack;
  if (!tabTraps)
    fail(`focus did not trap within the gag (fwd→first=${wrapFwd}, back→last=${wrapBack})`);

  // a11y: Escape closes the modal AND returns focus to the Install button (the
  // focus-trap/restore logic is JS, so without this it could regress unseen).
  await mp.keyboard.press('Escape');
  gagEscapes = await mp.waitForSelector('.mr__gag', { state: 'detached', timeout: 3000 }).then(
    () => true,
    () => false,
  );
  if (!gagEscapes) fail('Escape did not close the gag');
  focusReturned = await mp.evaluate(
    () => document.activeElement?.classList.contains('mr__install') ?? false,
  );
  if (!focusReturned) fail('focus did not return to the Install button after the gag closed');

  // Clicking the backdrop (outside the centered dialog) also dismisses it.
  await mp.click('.mr__install');
  await mp
    .waitForSelector('.mr__gag', { timeout: 3000 })
    .catch(() => fail('gag did not re-open for the backdrop check'));
  await mp.click('.mr__gag-backdrop', { position: { x: 6, y: 6 } });
  backdropCloses = await mp.waitForSelector('.mr__gag', { state: 'detached', timeout: 3000 }).then(
    () => true,
    () => false,
  );
  if (!backdropCloses) fail('clicking the backdrop did not dismiss the gag');

  // Re-open and take the real exit: the gag must still lead onward to /text.
  await mp.click('.mr__install');
  await mp.waitForSelector('.mr__gag', { timeout: 3000 }).catch(() => fail('gag did not re-open'));
  await mp.getByRole('link', { name: /text-only version/i }).click();
  try {
    await mp.waitForURL('**/text', { timeout: 6000 });
    mobileToText = true;
  } catch {
    fail('the desktop-invite gag did not lead onward to /text');
  }
}
await mctx.close();

// ── narrow FINE-pointer window (a resized desktop) — now ENTERS THE WORLD ──────
// The 3D world used to be desktop-ONLY, so a merely-narrow fine-pointer window
// was handed off to /text. It runs everywhere now, so a narrow desktop window
// must enter the world like any other desktop — no gag (that's the coarse-pointer
// phone pre-roll), no /text handoff. isSmallScreen() still requires a coarse
// pointer, so this fine-pointer window is NOT "small": install goes straight in.
const nctx = await browser.newContext({ viewport: { width: 500, height: 820 } }); // no touch → fine pointer
const np = await nctx.newPage();
np.on('pageerror', (e) => fail(`narrow-window pageerror: ${e.message}`));
await np.goto(base + '/', { waitUntil: 'networkidle' });
await np.click('.floor-door--plain');
await floor(np, 'y1999');
await np.click('.floor-door--down');
await floor(np, 'y2000');
await np.click('.floor-door--down');
await floor(np, 'machine');
await np.click('.mr__install');
let narrowToWorld = false;
try {
  // The world's HUD button IS the proof it entered; a wrongly-shown phone gag
  // would block that instead.
  await np.waitForSelector('.hud-menu-btn', { timeout: 18000 });
  narrowToWorld = (await np.locator('.mr__gag').count()) === 0;
} catch {
  fail('a narrow fine-pointer window did not enter the 3D world after install');
}
if (!narrowToWorld)
  fail('the phone-only pre-roll gag leaked into a narrow fine-pointer (desktop) window');
await nctx.close();

// ── reduced-motion: the NEW! blinky must serve its STATIC twin ──────────────────
// The <picture> swap IS the accessibility accommodation for our animated GIFs (a
// GIF can't be CSS-paused), so prove the media query actually selects the still —
// not just that both files exist (shoot:gifs covers existence). Reach the 1999
// floor via the plain door (works regardless of low-power), confirm the animated
// frame loads under normal motion, then emulate reduced motion and assert the
// badge's currentSrc flips to the *-static twin.
const rctx = await browser.newContext({ viewport: { width: 1100, height: 850 } });
const rp = await rctx.newPage();
rp.on('pageerror', (e) => fail(`reduced-motion pageerror: ${e.message}`));
await rp.goto(base + '/', { waitUntil: 'networkidle' });
await rp.click('.floor-door--plain');
await floor(rp, 'y1999');
const blinkySrc = () =>
  rp.evaluate(() => document.querySelector('.sb__newblink img')?.currentSrc || '').catch(() => '');
const rmAnimated = (await blinkySrc()).endsWith('/gifs/new-badge.gif');
if (!rmAnimated) fail('the NEW! blinky did not load its animated frame under normal motion');
await rp.emulateMedia({ reducedMotion: 'reduce' });
const rmStatic = await rp
  .waitForFunction(
    () =>
      (document.querySelector('.sb__newblink img')?.currentSrc || '').endsWith(
        '/gifs/new-badge-static.gif',
      ),
    null,
    { timeout: 3000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!rmStatic) fail('the NEW! blinky did not swap to its static twin under prefers-reduced-motion');

// Same reduced-motion context: descend to the 2000 floor and prove the @-mail
// envelope ALSO swaps to its static twin while the anchor keeps its mailto href +
// accessible name — the markup-level contract the binary GIF check can't see.
await rp.click('.floor-door--down');
await floor(rp, 'y2000');
const atmailRm = await rp
  .waitForFunction(
    () => {
      const a = document.querySelector('.tl__mail');
      const img = a?.querySelector('img');
      return (
        !!img &&
        (img.currentSrc || '').endsWith('/gifs/atmail-static.gif') &&
        a.getAttribute('href') === 'mailto:webmaster@scoobertdoobert.pizza' &&
        a.getAttribute('aria-label') === 'Email the webmaster'
      );
    },
    null,
    { timeout: 3000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!atmailRm)
  fail(
    'the @-mail envelope did not swap to its static twin, or its exact mailto/aria-label contract changed, under reduced motion',
  );
await rctx.close();

console.log(
  `descent: 1999=${on1999} 2000=${on2000} machine=${onMachine} upDoor=${upDoor} crt=${crtCanvas} ` +
    `world=${world} exitToFloor0=${exitToFloor0} reusable=${reusable} guestbook=${guestbookOk} rmStatic=${rmStatic} atmailAnim=${atmailAnimated} atmail=${atmailRm} | mobile: noCanvas=${mobileNoCanvas} ` +
    `gag=${mobileGag} tab=${tabTraps} esc=${gagEscapes} focus=${focusReturned} backdrop=${backdropCloses} install→text=${mobileToText} | narrowToWorld=${narrowToWorld} | errors=${failures()}`,
);
await finish();
