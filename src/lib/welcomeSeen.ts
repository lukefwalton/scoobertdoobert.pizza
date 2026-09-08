// Session-scoped memory of "the Scoobertverse welcome card already played this
// visit" — so it greets you on the FIRST world entry of a visit and stays quiet on
// a bounce out to the storefront and back (Luke, 2026-09: once per visit; the
// entry cadence in sceneStore.introStage skips straight past it when set).
// sessionStorage on purpose, like motionConsent: a fresh visit gets the mood card
// again — it's tone, not a lesson (the WASD legend is the durable one). All access
// try/guarded (Safari private mode / disabled storage throws). Read post-hydration
// only (WelcomeOverlay), so it never touches the prerendered / JS-off page.

const KEY = 'sdp:welcome-seen';

export function welcomeSeen(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeSeen(): void {
  try {
    sessionStorage?.setItem(KEY, '1');
  } catch {
    /* storage unavailable — the card just plays again next entry, which is harmless */
  }
}
