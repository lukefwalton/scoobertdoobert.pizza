import { useEffect, useState } from 'react';

// The single "can't / shouldn't run the WebGL world" predicate: true on small
// viewports OR when the user asked for reduced motion. These users descend
// through the flat era floors but skip the 3D world (and the machine-room CRT),
// handing off to the /text list instead. Centralized so the gate can't drift
// between the descent entry (OrderForm), the install (MachineRoomFloor), etc.
const SMALL_SCREEN_QUERY = '(max-width: 768px)';
const LOW_POWER_QUERIES = [SMALL_SCREEN_QUERY, '(prefers-reduced-motion: reduce)'] as const;

/** Imperative read of the *current* state. Safe in event handlers and on the
 *  server (returns false where matchMedia is unavailable). */
export function isLowPower(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return LOW_POWER_QUERIES.some((q) => window.matchMedia(q).matches);
}

/** True on a small TOUCH device — a phone/handheld, not merely a narrow viewport.
 *  The machine-room install uses this to fire the "phones didn't exist in 1996"
 *  desktop-invite gag on real handhelds only: the `pointer: coarse` half keeps a
 *  RESIZED desktop window (narrow but mouse-driven) out of it — that user IS on a
 *  desktop, so they get the plain /text handoff instead of a nonsensical "try
 *  desktop." A handheld that somehow reports a fine pointer just falls back to that
 *  same /text handoff (it's still low-power), so the gate degrades gracefully. */
export function isSmallScreen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia(SMALL_SCREEN_QUERY).matches && window.matchMedia('(pointer: coarse)').matches
  );
}

/** Reactive hook — re-renders when the viewport crosses the breakpoint or the
 *  reduced-motion setting flips, so render-time gating (e.g. whether to mount
 *  the machine-room CRT) stays in sync instead of freezing at mount time. */
export function useLowPower(): boolean {
  const [low, setLow] = useState(isLowPower);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mqls = LOW_POWER_QUERIES.map((q) => window.matchMedia(q));
    const update = () => setLow(isLowPower());
    update(); // resync in case state changed between first render and effect
    // Older Safari/iOS (<14) MediaQueryList only has the deprecated
    // addListener/removeListener — guard so the mobile gate never throws on the
    // very devices it exists to serve.
    const attach = (m: MediaQueryList) =>
      typeof m.addEventListener === 'function'
        ? m.addEventListener('change', update)
        : m.addListener(update);
    const detach = (m: MediaQueryList) =>
      typeof m.removeEventListener === 'function'
        ? m.removeEventListener('change', update)
        : m.removeListener(update);
    mqls.forEach(attach);
    return () => mqls.forEach(detach);
  }, []);
  return low;
}
