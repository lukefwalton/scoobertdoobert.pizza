import { useEffect, useRef, useState } from 'react';
import { useTouchDevice } from '../lib/lowPower';
import { controlHintSeen, markControlHintSeen } from '../lib/controlHintSeen';

// ───────────────────────────────────────────────────────────────────────────
// ControlHint — the one thing the world otherwise never teaches: how to MOVE and
// LOOK. The welcome card is pure tone ("You have entered the Scoobertverse…"), so
// a first-timer can land at spawn with no idea WASD/drag even do anything.
//
// A small, non-blocking legend that fades out on the player's first real INPUT —
// a movement key (walk), or a pointerdown on the canvas (drag-look) or inside the
// on-screen touch controls (stick/buttons, on mobile). Watching input, not the
// camera pose, means the world's own entry settle/reveal motion never trips it.
//
// Truly FIRST-RUN: a durable flag (controlHintSeen) means a returning player who's
// already been taught never sees it again. Captured at mount so marking it seen
// this session doesn't yank the fade-out mid-animation. A backstop timer + an ×
// also dismiss it. Kept separate from WelcomeOverlay (tone vs teaching).
// Reduced-motion: hide immediately, no fade. WCAG-safe (no flash).
// ───────────────────────────────────────────────────────────────────────────

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

export function ControlHint() {
  const touch = useTouchDevice();
  // Already taught on a prior visit → never render (and skip the listeners). Read at
  // mount so a mid-session mark can't flip the render gate before the fade finishes.
  const seenAtMount = useRef(controlHintSeen());
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  const dismissRef = useRef<() => void>(() => {});
  dismissRef.current = () => {
    markControlHintSeen(); // durable: taught — don't show again next visit
    const reduce =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setGone(true); // no delayed fade under reduced motion — hide at once
      return;
    }
    setLeaving(true);
    window.setTimeout(() => setGone(true), 500);
  };

  useEffect(() => {
    if (seenAtMount.current) return; // already taught — no listeners, nothing shows
    const onKey = (e: KeyboardEvent) => {
      if (MOVE_KEYS.has(e.key.toLowerCase())) dismissRef.current();
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      // A canvas pointerdown = drag-look (mouse or touch); a pointerdown inside the
      // on-screen touch controls = the stick/buttons (move/act on mobile). HUD
      // buttons (the menu) don't match, so tapping those doesn't count.
      if (t.tagName === 'CANVAS' || t.closest('.touch-controls')) dismissRef.current();
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

  if (seenAtMount.current || gone) return null;

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
