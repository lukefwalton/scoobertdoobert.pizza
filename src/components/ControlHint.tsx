import { useEffect, useRef, useState } from 'react';
import { useTouchDevice } from '../lib/lowPower';
import { controlHintSeen, markControlHintSeen } from '../lib/controlHintSeen';
import { useSceneStore } from '../state/sceneStore';
import { inputFrozen } from '../world/inputFrozen';

// ───────────────────────────────────────────────────────────────────────────
// ControlHint — the one thing the world otherwise never teaches: how to MOVE and
// LOOK. The welcome card is pure tone ("You have entered the Scoobertverse…"), so
// a first-timer can land at spawn with no idea WASD/drag even do anything.
//
// A small, non-blocking legend that fades out on the player's first real MOVE/LOOK
// — a movement key (walk), a drag-LOOK on the canvas, or a push of the on-screen
// stick (a real displacement, not a bare tap/click; see the listener below).
// Watching input, not the camera pose, means the world's own entry settle/reveal
// motion never trips it.
//
// Truly FIRST-RUN: a durable flag (controlHintSeen) means a returning player who's
// already been taught never sees it again. Captured at mount so marking it seen
// this session doesn't yank the fade-out mid-animation. A backstop timer + an ×
// also dismiss it. Kept separate from WelcomeOverlay (tone vs teaching).
// Reduced-motion: hide immediately, no fade. WCAG-safe (no flash).
// ───────────────────────────────────────────────────────────────────────────

const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

// Teaching only counts when the player could ACTUALLY move/look THIS frame — otherwise a
// first-timer could bury the one movement legend by mashing keys or dragging against a
// modal without ever having moved. Built on inputFrozen(), the world's OWN shared freeze
// rule (Controls gates BOTH keyboard move and pointer look on it — pause / hotspot / NPC /
// room-wipe / ride / dive / loading level), so this can't drift from the real input gate.
// We union the few HUD overlays inputFrozen() doesn't track — a lookable card, the arcade
// cabinet, the lyrics sheet — matching the world-side interactable scan's conservatism.
function teachBlocked(): boolean {
  const s = useSceneStore.getState();
  return inputFrozen() || s.openLookable !== null || s.arcadeGame !== null || s.lyricsSong !== null;
}

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
      if (!MOVE_KEYS.has(e.key.toLowerCase())) return;
      if (teachBlocked()) return; // a key that can't move the world this frame doesn't teach
      hideRef.current(true); // moved → taught
    };
    // The hint teaches MOVE + LOOK, so only ACTUAL move/look durably marks it taught —
    // NOT a bare hotspot click, a right-side button tap, or a zero-travel press on the
    // stick (a first-timer shouldn't be able to hide the one movement legend without
    // having moved). Both surfaces resolve the same way: arm a displacement watch on
    // pointerdown over the look-CANVAS or the move-STICK, and teach only once the
    // pointer TRAVELS past a small threshold (a real look-drag or stick push). A plain
    // tap (down → up, no travel) disarms without teaching.
    let drag: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t) return;
      if (t.tagName === 'CANVAS' || t.closest('.touch-stick'))
        drag = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) <= 6) return;
      // Same rule as keys: while a modal / room-wipe / ride / loading owns input the camera
      // doesn't turn (Controls gates look on inputFrozen too), so a drag then must NOT
      // teach. Keep the watch armed (don't null) so a drag that continues once the freeze
      // lifts still counts.
      if (teachBlocked()) return;
      drag = null;
      hideRef.current(true); // a real drag-look that turned the camera → taught
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
