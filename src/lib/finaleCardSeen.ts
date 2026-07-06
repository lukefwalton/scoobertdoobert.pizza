// Durable "the 100% finale card has been shown + dismissed" flag, so the capstone
// card is a ONCE-EVER moment: it appears the instant you hit 100%, and once you
// dismiss it, it never nags again (you can still re-share from the pause menu). A
// UI preference in localStorage (durable across visits), all access try/guarded
// (private mode / disabled storage throws). Read post-hydration only (FinaleCard),
// so it never touches the prerendered / JS-off page. Mirrors controlHintSeen.

const KEY = 'sdp:finale-card-seen';

export function finaleCardSeen(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markFinaleCardSeen(): void {
  try {
    localStorage?.setItem(KEY, '1');
  } catch {
    /* storage unavailable — the card just shows again next visit, which is harmless */
  }
}
