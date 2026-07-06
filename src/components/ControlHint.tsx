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

  // hide(persist): persist=true (the player actually MOVED or LOOKED) durably marks
  // the controls TAUGHT so the hint never shows again; persist=false (the × or the
  // 10s backstop) just hides it THIS visit — idling it out or closing it without
  // ever using the controls still teaches you next time (the reviewer's distinction:
  // "already taught" vs merely "hidden once").
  const hideRef = useRef<(persist: boolean) => void>(() => {});
  hideRef.current = (persist: boolean) => {
    if (persist) markControlHintSeen();
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
      if (MOVE_KEYS.has(e.key.toLowerCase())) hideRef.current(true); // moved → taught
    };
    // The hint teaches MOVE + LOOK, so only ACTUAL move/look durably marks it taught —
    // NOT a bare hotspot click or a right-side button tap (a first-timer shouldn't be
    // able to hide the one movement legend without having moved). Touch: engaging the
    // STICK (not the jump/spell/action buttons) is the move intent. Desktop look is a
    // DRAG on the canvas: arm on pointerdown, teach only once the pointer travels past
    // a small threshold (a real drag) — a plain click (down → up, no travel) disarms.
    let drag: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (t.closest('.touch-stick')) {
        hideRef.current(true); // the stick = starting to move
        return;
      }
      if (t.tagName === 'CANVAS') drag = { x: e.clientX, y: e.clientY }; // arm drag-look watch
    };
    const onPointerMove = (e: PointerEvent) => {
      if (drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
        drag = null;
        hideRef.current(true); // a real drag-look → taught
      }
    };
    const disarm = () => {
      drag = null; // click released without dragging → not "looked"
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', disarm, true);
    window.addEventListener('pointercancel', disarm, true);
    // Backstop: never linger more than ~10s — but idling it out is NOT "taught".
    const tBackstop = window.setTimeout(() => hideRef.current(false), 10000);
    return () => {
      window.clearTimeout(tBackstop);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', disarm, true);
      window.removeEventListener('pointercancel', disarm, true);
    };
  }, []);

  if (seenAtMount.current || gone) return null;

  return (
    <div className={`hud-controlhint${leaving ? ' hud-controlhint--leaving' : ''}`} role="status">
      <button
        type="button"
        className="hud-controlhint__close"
        aria-label="dismiss controls hint"
        onClick={() => hideRef.current(false)}
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
