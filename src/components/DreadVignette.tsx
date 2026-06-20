import { useDreadStore } from '../state/dreadStore';
import { mapUnease } from '../data/dread';

// ───────────────────────────────────────────────────────────────────────────
// DreadVignette — Phase 5, ckpt 3 (DOM half). A soft inset shadow that tightens
// at the edges of the screen as `unease` rises, sitting just above the world
// canvas. Pure CSS box-shadow (no flashing → WCAG-safe), pointer-events: none so
// it never blocks the HUD or the world. Mounted only while the world is active.
//
// Subscribes to a QUANTIZED vignette value so it only re-renders when the level
// actually steps, not every frame.
// ───────────────────────────────────────────────────────────────────────────
export function DreadVignette() {
  // Round to ~40 steps so we re-render on meaningful change, not 60×/sec.
  const step = useDreadStore((s) => Math.round(mapUnease(s.unease).vignette * 40));
  const v = step / 40;
  if (v <= 0.02) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 61, // just above the world canvas (z 60); HUD/dialogs sit higher
        pointerEvents: 'none',
        boxShadow: `inset 0 0 ${100 + v * 140}px ${20 + v * 130}px rgba(0,0,0,${0.55 * v})`,
        transition: 'box-shadow 0.25s linear',
      }}
    />
  );
}
