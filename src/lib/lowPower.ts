import { useEffect, useState } from 'react';

// Two conditions that USED to be OR'd into one "skip the 3D world" gate, now
// deliberately kept apart — they mean different things:
//
//   • TOUCH DEVICE — a phone/tablet whose primary pointer is coarse. The 3D world
//     now RUNS here (on-screen touch controls); this only decides whether we
//     render the touch HUD (and which install-flavor a handheld gets).
//   • REDUCED MOTION — a stated accessibility preference. The world is full of
//     motion, so we never AUTO-drop a reduced-motion user into it; an entry
//     point offers an explicit opt-in (MotionConsent) with the flat /text list
//     as the safe default. The preference is honored again INSIDE the world
//     (softer motion — see the REDUCED caps in Controls/WorldHud/dread).
//
// Centralized so the gate can't drift between the descent entry (OrderForm),
// the install (MachineRoomFloor), and the trap door.
const TOUCH_DEVICE_QUERY = '(pointer: coarse)';
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

/** True on a TOUCH device — a phone/tablet whose PRIMARY pointer is coarse.
 *  Decides whether to render the on-screen touch controls and which install path
 *  a handheld takes. Deliberately NOT width-based: a phone in LANDSCAPE is wider
 *  than 768px but still needs the controls (a width gate would strand the user in
 *  the world with no way to walk). `pointer: coarse` also naturally excludes a
 *  mouse-driven desktop (narrow or not) — its primary pointer is fine — so that
 *  user keeps the keyboard/mouse world. A touch laptop reports a FINE primary
 *  pointer, so it too gets the desktop controls (it has a keyboard). */
export function isTouchDevice(): boolean {
  return mediaMatches(TOUCH_DEVICE_QUERY);
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

/** Reactive `isTouchDevice()` — re-renders if the primary pointer type changes,
 *  so the touch HUD mounts/unmounts to match (orientation-independent). */
export function useTouchDevice(): boolean {
  return useMediaQuery([TOUCH_DEVICE_QUERY], isTouchDevice);
}
