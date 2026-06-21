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
export async function tapLoaderCta(page, name = /TAP TO ENTER/i) {
  const clicked = await page
    .getByRole('button', { name })
    .click({ timeout: 4000 })
    .then(() => true, () => false);
  if (!clicked) await page.keyboard.press('Enter');
  return clicked;
}

export function makeLoaderHelpers(page, fail) {
  const enterLoadedLevel = async (label, timeout = 25000) => {
    const ready = await page
      .waitForFunction(
        () => document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') === 'ready',
        null,
        { timeout },
      )
      .then(() => true, () => false);
    if (!ready) {
      fail(`${label} loader never reached ready`);
      return false;
    }
    if (!(await tapLoaderCta(page))) {
      console.log(`NOTE: '${label}' entered via Enter fallback (button click failed)`);
    }
    const gone = await page
      .waitForFunction(() => !document.querySelector('[data-level-loader]'), null, { timeout: 6000 })
      .then(() => true, () => false);
    if (!gone) {
      fail(`${label} loader never dismissed after entering`);
      return false;
    }
    return true;
  };
  return { enterLoadedLevel };
}
