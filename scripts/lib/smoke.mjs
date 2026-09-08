import { chromium } from 'playwright';

// Shared Playwright smoke helpers for the GLB level-loader flow (LevelLoader).
//
// The error-path smoke (levels) taps TURN BACK to bounce out of a failed GLB
// load. As a bare `getByRole('TURN BACK').click({ timeout: 4000 })` that tap could
// throw an UNCAUGHT TimeoutError under CI's slower headless runner (the flake
// class that once hit metro/deeppool entry). One home for it, made resilient.
//
// The surviving CTA is TURN BACK on the error overlay; it also responds to the
// Enter key (see src/components/LevelLoader.tsx). We try the button, fall back to
// Enter — the keyboard path can't be intercepted by an overlay or stalled by
// actionability/stability checks — then CONFIRM the loader actually dismissed.
// The smoke's guarantee is "level entry works", not "the CTA button works", so a
// fallback keeps it green but logs loudly so a genuinely broken button is still
// visible in the run output.

// Press the loader's CTA, falling back to Enter. The error overlay's TURN BACK
// button responds to Enter too (onAbort), so the keyboard path is an equivalent
// way to trigger recovery. Returns false if the fallback was needed (the button
// click itself failed), which callers log so a broken button stays visible even
// though recovery still succeeded.
//
// Pass `{ fail, label }` to ALSO assert the visible control is present first —
// the single CTA-coverage contract shared by every loader-entry path (so a
// missing/mislabeled button is a real failure), kept separate from the resilient
// click so a transient actionability stall still falls back to Enter, not red.
export async function tapLoaderCta(page, name = /TURN BACK/i, { fail, label = 'loader' } = {}) {
  if (fail) {
    const visible = await page
      .getByRole('button', { name })
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(
        () => true,
        () => false,
      );
    if (!visible)
      fail(`${label} reached ready but the ${name.source ?? name} control never appeared`);
  }
  const clicked = await page
    .getByRole('button', { name })
    .click({ timeout: 4000 })
    .then(
      () => true,
      () => false,
    );
  if (!clicked) await page.keyboard.press('Enter');
  return clicked;
}

// Hold a movement key (or several) and POLL for the door prompt, releasing once
// it shows. Replaces fixed-duration `walk(key, ms)` hops: world movement uses a
// clamped per-frame delta, so on a slow runner (CI most of all) the same wall-
// clock time covers less ground — a fixed walk can fall short of the door and
// the later assertions cascade. Returns whether the prompt appeared.
export async function holdUntilDoorPrompt(page, keys, { timeout = 8000 } = {}) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) await page.keyboard.down(k);
  const shown = await page.waitForSelector('.hud-prompt--door', { timeout }).then(
    () => true,
    () => false,
  );
  for (const k of list) await page.keyboard.up(k);
  return shown;
}

// Walk (hold `key`) until a door prompts, then press E — failing (via `fail`)
// with the hop's name if the prompt never appears. The generous default timeout
// is the whole point: this replaces per-file `toDoor` helpers whose 4s budget was
// too short for a slow CI runner to traverse a long room, surfacing as a bogus
// "nav regression at this hop". Returns whether it entered.
export async function walkToDoor(page, fail, key, label, { timeout = 8000 } = {}) {
  if (!(await holdUntilDoorPrompt(page, key, { timeout }))) {
    fail(`no door prompt walking '${key}' toward ${label} — nav regression at this hop`);
    return false;
  }
  await page.keyboard.press('e');
  return true;
}

// Resolve true once the HUD's quiet room-label contains `name`; on timeout,
// resolve false and (if a `fail` is given) record the miss. This exact poll had
// been copy-pasted verbatim into ~9 room smokes; one home keeps them identical
// and lets the per-script `roomIs(name)` stay a one-line adapter over it.
export function roomIs(page, name, { fail, timeout = 8000 } = {}) {
  return page
    .waitForFunction(
      (n) => document.querySelector('.hud-room')?.textContent?.includes(n) ?? false,
      name,
      { timeout },
    )
    .then(
      () => true,
      () => {
        fail?.(`room never became "${name}"`);
        return false;
      },
    );
}

// Route a page's uncaught errors + console.error into `onError` (the smoke's
// fail counter). The same two listeners were pasted into most smokes; call this
// once per page/context (multi-context smokes call it per fresh page).
export function watchPageErrors(page, onError) {
  page.on('pageerror', (e) => onError(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') onError(`console: ${m.text()}`);
  });
}

// ── Harness scaffold ─────────────────────────────────────────────────────────
// Every shoot:* smoke repeated the same launch / context / page / fail-counter /
// process.exit boilerplate. These two factories own it: launchSmoke() for the
// multi-context smokes (e.g. storefront desktop + JS-off + mobile), startSmoke()
// for the common single-context case. Error-watching stays OPT-IN — call
// watchPageErrors(page, fail) yourself — because smokes differ on whether a
// console.error should fail the run.

// Launch Chromium with a shared fail counter + teardown. `fail(msg)` logs and
// counts; `finish(ok, bad)` prints the matching summary (both args optional — pass
// neither if the script already logged its own summary line), closes the browser,
// and exits non-zero iff anything failed. `failures()` reads the live count.
// `launchOpts` spreads into chromium.launch() — the booth smoke passes Chromium's
// fake-camera flags so getUserMedia works headless; everything else omits it.
export async function launchSmoke(launchOpts = {}) {
  const browser = await chromium.launch(launchOpts);
  let failed = 0;
  const fail = (msg) => {
    failed++;
    console.log('FAIL:', msg);
  };
  const finish = async (ok, bad) => {
    if (failed) {
      if (bad) console.error(bad);
    } else if (ok) {
      console.log(ok);
    }
    await browser.close();
    process.exit(failed ? 1 : 0);
  };
  return { browser, fail, finish, failures: () => failed };
}

// The common case: launchSmoke() + one context + its page. The default viewport is
// a 1280×800 desktop; override or extend via `opts` (it spreads into newContext) —
// e.g. { javaScriptEnabled: false } for the JS-off pass, or a mobile
// { isMobile, hasTouch, deviceScaleFactor } for a phone viewport.
//
// The page is created eagerly. Calling ctx.addInitScript() AFTER this still works
// (init scripts apply on the next navigation), so the common "set a sessionStorage
// flag, then goto" pattern is fine. If a smoke needs per-context setup BEFORE any
// page exists — or creates a fresh context per call — use launchSmoke() and build
// the context/page yourself.
//
// THE ENTRY CADENCE (sceneStore.introStage): on a real first entry the world shows
// the welcome card, then the move/look legend, and only THEN fades in the game layer
// (objective chip, score, hotbar) and opens the toast channel. Every smoke runs in a
// fresh context, i.e. as a first-timer — so by default the harness seeds the two
// "already seen" flags (seedIntroSeen) and the HUD is settled at mount, which is
// what ~20 smokes that assert on `.hud-objective` / `.hud-toast` / `.hud-score`
// within seconds of entry expect. Pass `{ intro: true }` to keep the cadence live —
// only the smokes that TEST it (shoot-world, shoot-touch, shoot-intro) want that.
export async function startSmoke({ intro = false, ...opts } = {}) {
  const h = await launchSmoke();
  const ctx = await h.browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  if (!intro) await seedIntroSeen(ctx);
  const page = await ctx.newPage();
  return { ...h, ctx, page };
}

// Mark the entry cadence's two skippable beats as already done — the welcome card
// (once per visit, sessionStorage) and the move/look legend (durable, localStorage)
// — so the world's game layer is on screen at mount. An init script, so it re-runs
// on every navigation: a smoke's `localStorage.clear()` → `goto` still lands seeded.
// For smokes that build their own contexts (launchSmoke / browser.newContext).
export function seedIntroSeen(ctx) {
  return ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('sdp:welcome-seen', '1');
      localStorage.setItem('sdp:controls-seen', '1');
    } catch {
      /* storage unavailable — the cadence just plays; the smoke's waits are the guard */
    }
  });
}

// Put the run on the SCOREBOARD: the score badge (`.hud-score`) only renders once
// the run has points, so a layout smoke that measures it must bank one loot first.
// Uses the &debug=1 pickup hooks (PickupController): waits for them, grabs the first
// un-taken drop in the current room. Resolves the grabbed id, or null (no hooks /
// no loot) — callers decide whether that's a failure.
export async function bankOnePoint(page, { timeout = 8000 } = {}) {
  const ready = await page
    .waitForFunction(
      () => typeof window.__sdpLootIds === 'function' && typeof window.__sdpGrabLoot === 'function',
      null,
      { timeout },
    )
    .then(
      () => true,
      () => false,
    );
  if (!ready) return null;
  return page.evaluate(() => {
    const id = window.__sdpLootIds()[0];
    if (!id) return null;
    window.__sdpGrabLoot(id);
    return id;
  });
}

export function makeLoaderHelpers(page, fail) {
  const enterLoadedLevel = async (label, timeout = 25000) => {
    // GLB levels AUTO-ENTER now (the loader minigame was removed — loads are fast
    // enough that it broke the flow). Just wait for the loader overlay to be ABSENT:
    // it clears the instant the asset resolves (or was never shown for a cached
    // load). A short settle first avoids resolving before the overlay even renders;
    // a failed load leaves the error overlay up, so this then times out → fail.
    await page.waitForTimeout(350);
    const entered = await page
      .waitForFunction(() => !document.querySelector('[data-level-loader]'), null, { timeout })
      .then(
        () => true,
        () => false,
      );
    if (!entered) {
      fail(`${label} never auto-entered (load failed or stalled)`);
      return false;
    }
    return true;
  };
  return { enterLoadedLevel };
}
