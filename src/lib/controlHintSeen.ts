// Durable "the player has been shown the move/look control hint" flag, so the hint
// is truly FIRST-RUN — a returning player who's already been taught never sees it
// again. A UI preference like motionConsent, but in localStorage (durable across
// visits, not motionConsent's per-visit sessionStorage). All access is try/guarded
// (private mode / disabled storage throws on access). Read post-hydration only
// (ControlHint), so it never touches the prerendered / JS-off page.
//
// There is no in-app "reset save" today (progress is never programmatically wiped), so
// this flag has nothing to drift out of. If one is ever added, replaying the FTUE by
// clearing this too is a deliberate opt-in — by default it persists independently of
// progress, like motionConsent (a device preference, not a game-state fact).

const KEY = 'sdp:controls-seen';

export function controlHintSeen(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markControlHintSeen(): void {
  try {
    localStorage?.setItem(KEY, '1');
  } catch {
    /* storage unavailable — the hint just shows again next visit, which is harmless */
  }
}
