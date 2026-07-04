import { useEffect, useState } from 'react';

// Two conditions that USED to be OR'd into one "skip the 3D world" gate, now
// deliberately kept apart — they mean different things:
//
//   • SMALL SCREEN — a phone/handheld. The 3D world now RUNS here (on-screen
//     touch controls), so a small screen is no longer a reason to skip it; it
//     only decides whether we render the touch HUD.
//   • REDUCED MOTION — a stated accessibility preference. The world is full of
//     motion, so we never AUTO-drop a reduced-motion user into it; an entry
//     point offers an explicit opt-in (MotionConsent) with the flat /text list
//     as the safe default. The preference is honored again INSIDE the world
//     (softer motion — see the REDUCED caps in Controls/WorldHud/dread).
//
// Centralized so the gate can't drift between the descent entry (OrderForm),
// the install (MachineRoomFloor), and the trap door.
const SMALL_SCREEN_QUERY = '(max-width: 768px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function mediaMatches(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

/** True when the user asked for reduced motion — the one condition that should
 *  gate AUTO-entry into the 3D world (offer an opt-in instead). SSR-safe. */
export function prefersReducedMotion(): boolean {
  return mediaMatches(REDUCED_MOTION_QUERY);
}

/** Back-compat alias. "Low power" now means exactly "reduced motion": small
 *  screens are no longer excluded from the world. Prefer `prefersReducedMotion`
 *  in new code — this stays only for callers that still read the old name. */
export const isLowPower = prefersReducedMotion;

/** True on a small TOUCH device — a phone/handheld, not merely a narrow viewport.
 *  Decides whether to render the on-screen touch controls and which install path
 *  a phone takes. The `pointer: coarse` half keeps a RESIZED desktop window
 *  (narrow but mouse-driven) out of it — that user is on a desktop and gets the
 *  normal keyboard/mouse world. A handheld that somehow reports a fine pointer
 *  just misses the touch HUD but can still descend (its drag-look works). */
export function isSmallScreen(): boolean {
  return mediaMatches(SMALL_SCREEN_QUERY) && mediaMatches('(pointer: coarse)');
}

// A reactive matchMedia hook shared by the exported hooks below: re-renders when
// the query flips (viewport crossing the breakpoint, reduced-motion toggled), so
// render-time gating stays in sync instead of freezing at mount. Guards the
// deprecated addListener/removeListener path for older Safari/iOS (<14) — the
// very devices the mobile gate exists to serve, so it must never throw there.
function useMediaQuery(queries: readonly string[], read: () => boolean): boolean {
  const [value, setValue] = useState(read);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mqls = queries.map((q) => window.matchMedia(q));
    const update = () => setValue(read());
    update(); // resync in case state changed between first render and effect
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/** Reactive `prefersReducedMotion()`. */
export function useReducedMotion(): boolean {
  return useMediaQuery([REDUCED_MOTION_QUERY], prefersReducedMotion);
}

/** Reactive `isSmallScreen()` — re-renders when the viewport crosses 768px or the
 *  pointer type changes, so the touch HUD mounts/unmounts to match. */
export function useSmallScreen(): boolean {
  return useMediaQuery([SMALL_SCREEN_QUERY, '(pointer: coarse)'], isSmallScreen);
}
