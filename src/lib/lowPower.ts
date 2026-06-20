import { useEffect, useState } from 'react';

// The single "can't / shouldn't run the WebGL world" predicate: true on small
// viewports OR when the user asked for reduced motion. These users descend
// through the flat era floors but skip the 3D world (and the machine-room CRT),
// handing off to the /text list instead. Centralized so the gate can't drift
// between the descent entry (OrderForm), the install (MachineRoomFloor), etc.
const LOW_POWER_QUERIES = ['(max-width: 768px)', '(prefers-reduced-motion: reduce)'] as const;

/** Imperative read of the *current* state. Safe in event handlers and on the
 *  server (returns false where matchMedia is unavailable). */
export function isLowPower(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return LOW_POWER_QUERIES.some((q) => window.matchMedia(q).matches);
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
    mqls.forEach((m) => m.addEventListener('change', update));
    return () => mqls.forEach((m) => m.removeEventListener('change', update));
  }, []);
  return low;
}
