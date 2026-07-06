import { useEffect, useRef, useState } from 'react';
import { useTouchDevice } from '../lib/lowPower';

// ───────────────────────────────────────────────────────────────────────────
// ControlHint — the one thing the world otherwise never teaches: how to MOVE and
// LOOK. The welcome card is pure tone ("You have entered the Scoobertverse…"), so
// a first-timer can land at spawn with no idea WASD/drag even do anything.
//
// A small, non-blocking legend that fades out on the player's first real INPUT —
// a movement key (walk) or a canvas pointerdown (drag-look, mouse or touch). So a
// returning player who already knows dismisses it instantly, a first-timer keeps
// it until they act, and the world's own entry settle/reveal motion never trips it
// (watching the camera pose did — it fired on the entry animation). A backstop
// timer + an × also dismiss it. Kept separate from WelcomeOverlay (tone vs
// teaching). Reduced-motion: no fade animation. WCAG-safe (no flash).
// ───────────────────────────────────────────────────────────────────────────

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

export function ControlHint() {
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const touch = useTouchDevice();

  // Stable dismiss for the imperative listeners below (they attach once on mount).
  const dismissRef = useRef<() => void>(() => {});
  dismissRef.current = () => {
    setLeaving(true);
    window.setTimeout(() => setShow(false), 500);
  };

  useEffect(() => {
    // A movement key = walk; a canvas pointerdown = drag-look (mouse or touch). HUD
    // button clicks aren't on the canvas, so they don't count.
    const onKey = (e: KeyboardEvent) => {
      if (MOVE_KEYS.has(e.key.toLowerCase())) dismissRef.current();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t && t.tagName === 'CANVAS') dismissRef.current();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, true);
    // Backstop: never linger more than ~10s even if they never move.
    const tBackstop = window.setTimeout(() => dismissRef.current(), 10000);
    return () => {
      window.clearTimeout(tBackstop);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);

  if (!show) return null;

  return (
    <div className={`hud-controlhint${leaving ? ' hud-controlhint--leaving' : ''}`} role="status">
      <button
        type="button"
        className="hud-controlhint__close"
        aria-label="dismiss controls hint"
        onClick={() => dismissRef.current()}
      >
        ×
      </button>
      {touch ? (
        <p className="hud-controlhint__keys">
          <strong>left stick</strong> to move · <strong>drag</strong> to look ·{' '}
          <strong>buttons</strong> at right
        </p>
      ) : (
        <p className="hud-controlhint__keys">
          <strong>WASD</strong> to move · <strong>drag</strong> to look · <strong>Space</strong> to
          jump <span className="hud-controlhint__dim">(once you learn it)</span>
        </p>
      )}
    </div>
  );
}
