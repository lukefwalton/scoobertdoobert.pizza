// Shared Playwright smoke helpers for the GLB level-loader flow (LoaderGame).
//
// Every "heavy level" smoke (deeppool, terminus, metro, levels) waits out the
// pizza-tracker loader and then taps in. That tap had been a bare
// `getByRole('TAP TO ENTER').click({ timeout: 4000 })` copy-pasted into each
// file — and under CI's slower headless runner that click could throw an
// UNCAUGHT TimeoutError on the heaviest levels (it flaked metro, then deeppool).
// One home for it, made resilient, kills the whole flake class at once.
//
// LoaderGame offers TWO equivalent ways in: the "TAP TO ENTER" button and the
// Enter key (see src/components/LoaderGame.tsx). We try the button, fall back to
// Enter — the keyboard path can't be intercepted by an overlay or stalled by
// actionability/stability checks — then CONFIRM the loader actually dismissed.
// The smoke's guarantee is "level entry works", not "the CTA button works", so a
// fallback keeps it green but logs loudly so a genuinely broken button is still
// visible in the run output.

// Press the loader's CTA, falling back to Enter. Both LoaderGame CTAs respond to
// Enter — onEnter when ready, onAbort when errored — so the keyboard path covers
// "TAP TO ENTER" and "TURN BACK" alike. Returns false if the fallback was needed
// (the button click itself failed), which callers log so a broken button stays
// visible even though entry still succeeded.
//
// Pass `{ fail, label }` to ALSO assert the visible control is present first —
// the single CTA-coverage contract shared by every loader-entry path (so a
// missing/mislabeled button is a real failure), kept separate from the resilient
// click so a transient actionability stall still falls back to Enter, not red.
export async function tapLoaderCta(page, name = /TAP TO ENTER/i, { fail, label = 'loader' } = {}) {
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

export function makeLoaderHelpers(page, fail) {
  const enterLoadedLevel = async (label, timeout = 25000) => {
    const ready = await page
      .waitForFunction(
        () =>
          document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') ===
          'ready',
        null,
        { timeout },
      )
      .then(
        () => true,
        () => false,
      );
    if (!ready) {
      fail(`${label} loader never reached ready`);
      return false;
    }
    // Keep CTA-button coverage despite the resilient Enter fallback (shared
    // contract: asserts the visible control is present, then taps with Enter
    // fallback).
    if (!(await tapLoaderCta(page, /TAP TO ENTER/i, { fail, label }))) {
      console.log(`NOTE: '${label}' entered via Enter fallback (button click failed)`);
    }
    const gone = await page
      .waitForFunction(() => !document.querySelector('[data-level-loader]'), null, {
        timeout: 6000,
      })
      .then(
        () => true,
        () => false,
      );
    if (!gone) {
      fail(`${label} loader never dismissed after entering`);
      return false;
    }
    return true;
  };
  return { enterLoadedLevel };
}
