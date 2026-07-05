// Session-scoped memory of a reduced-motion user's "enter the world anyway"
// choice, so the MotionConsent gate asks once per visit rather than at every
// entry point. sessionStorage (not localStorage) on purpose: the consent is for
// THIS visit — a fresh visit re-asks, which is the safer default for an
// accessibility preference. All access is try/guarded (Safari private mode /
// disabled storage throws on access).

const KEY = 'sdp:motion-consent';

export function hasMotionConsent(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function grantMotionConsent(): void {
  try {
    sessionStorage?.setItem(KEY, '1');
  } catch {
    /* storage unavailable — the gate just re-asks, which is safe */
  }
}
