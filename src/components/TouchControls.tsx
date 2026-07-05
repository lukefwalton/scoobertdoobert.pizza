import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { JUMP_SECRET } from '../data/abilities';
import { interactNearby, grabNearby } from '../lib/worldActions';
import { castEquippedSpell } from '../lib/spellcast';
import { setTouchMove, queueTouchJump, resetTouchInput } from '../world/touchInput';
import '../styles/touch.css';

// The on-screen controls for the 3D world on phones — the piece that lets the
// world (previously desktop-only) be walked with two thumbs. Mounted ONLY on a
// small touch device (WorldMount gates on useSmallScreen), so desktop keeps its
// clean keyboard/mouse view. Everything here maps onto the SAME inputs the
// keyboard drives: the stick feeds touchInput (read in Controls' useFrame), the
// context/jump/spell buttons call the shared world-action helpers. Look is the
// bare canvas drag that already works under touch (Controls owns it).
//
// The container is pointer-events:none so empty space still passes taps through
// to the canvas for look-drag; only the actual controls opt back in.

// Thumb travel: how far (px) the stick nub can leave center. The move vector is
// normalized against this, so a full push = magnitude 1 (same cap as a WASD key).
const MAX_R = 40;

export function TouchControls() {
  // Hide whenever a modal / pause / room-transition owns the screen — the stick
  // and verbs are meaningless there, and the pause menu (☰) covers navigation.
  const gate = useSceneStore(
    useShallow((s) => ({
      paused: s.paused,
      openHotspot: s.openHotspot,
      tvVideo: s.tvVideo,
      arcadeGame: s.arcadeGame,
      openNpc: s.openNpc,
      lyricsSong: s.lyricsSong,
      pendingRoom: s.pendingRoom,
    })),
  );
  // The nearby-interaction slice drives the context button's label + action —
  // the same priority order the DOM prompts use in WorldHud.
  const near = useSceneStore(
    useShallow((s) => ({
      door: s.nearDoor,
      tv: s.nearTv,
      arcade: s.nearArcade,
      hotspot: s.nearHotspot,
      npc: s.nearNpc,
      entity: s.nearEntity,
      pickup: s.nearPickup,
    })),
  );
  const canJump = useProgressStore((s) => s.secretsFound.includes(JUMP_SECRET));
  const knowsSpell = useProgressStore((s) => s.knownSpells.length > 0);

  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const stickRef = useRef<HTMLDivElement>(null);
  const center = useRef<{ x: number; y: number } | null>(null);
  const stickPointer = useRef<number | null>(null);

  // Hidden whenever a modal / pause / room-transition owns the screen. Computed
  // BEFORE the early return so the reset effect below can watch it.
  const hidden =
    gate.paused ||
    gate.openHotspot ||
    gate.tvVideo ||
    gate.arcadeGame ||
    gate.openNpc ||
    gate.lyricsSong ||
    gate.pendingRoom;

  // Belt-and-suspenders: if this unmounts (leaving the world) mid-push, zero the
  // shared input so a stale vector can't keep the camera drifting.
  useEffect(() => () => resetTouchInput(), []);

  // The stick can vanish mid-hold when the HUD hides (open pause while walking):
  // returning null below does NOT run the unmount cleanup, and the removed element
  // fires no pointerup, so `touchInput` would keep its last non-zero vector and the
  // camera would drift the moment the modal closes. Zero it whenever we hide (and
  // clear the local pointer/thumb state so a later reappear starts clean).
  useEffect(() => {
    if (hidden) {
      resetTouchInput();
      stickPointer.current = null;
      center.current = null;
      setThumb({ x: 0, y: 0 });
    }
  }, [hidden]);

  const stickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stickRef.current;
    if (!el) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    stickPointer.current = e.pointerId;
    const r = el.getBoundingClientRect();
    center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    stickMove(e);
  };
  const stickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current === null || e.pointerId !== stickPointer.current) return;
    const c = center.current;
    if (!c) return;
    const dx = e.clientX - c.x;
    const dy = e.clientY - c.y;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, MAX_R);
    const nx = (dx / len) * (clamped / MAX_R);
    const ny = (dy / len) * (clamped / MAX_R);
    setThumb({ x: nx * MAX_R, y: ny * MAX_R });
    // Screen-y grows downward; forward is up, so negate y for the move vector.
    setTouchMove(nx, -ny);
  };
  const stickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== null && e.pointerId !== stickPointer.current) return;
    stickPointer.current = null;
    center.current = null;
    setThumb({ x: 0, y: 0 });
    setTouchMove(0, 0);
  };

  if (hidden) return null;

  // Context button: the nearest interaction, in the SAME priority as the DOM
  // prompts. Interact targets fall to interactNearby; a lone pickup to grabNearby.
  const hasInteract =
    near.door || near.tv || near.arcade || near.hotspot || near.npc || near.entity;
  const label = near.door
    ? near.door.requiresKey
      ? '🔒'
      : 'Enter'
    : near.tv
      ? 'TV'
      : near.arcade
        ? 'Play'
        : near.hotspot
          ? 'Look'
          : near.npc
            ? 'Talk'
            : near.entity
              ? 'Dance'
              : near.pickup
                ? 'Grab'
                : 'Use';
  const idle = !hasInteract && !near.pickup;
  // A words-only accessible name for the context button (its visible label can be
  // a bare glyph like 🔒). A phone screen-reader user taps this, so it must read.
  const actionAria = near.door
    ? near.door.requiresKey
      ? 'Locked door'
      : 'Enter door'
    : near.tv
      ? 'Watch TV'
      : near.arcade
        ? 'Play cabinet'
        : near.hotspot
          ? 'Look'
          : near.npc
            ? 'Talk'
            : near.entity
              ? 'Dance'
              : near.pickup
                ? 'Grab item'
                : 'Interact';

  // NOTE: no aria-hidden on the container — these are focusable buttons a phone
  // screen-reader user can tap, so hiding the subtree would be the aria-hidden-focus
  // anti-pattern. Only the stick (a non-interactive drag surface) is hidden from AT.
  // The buttons fire on `onClick`, not `onPointerDown`: click is the activation
  // event assistive tech (VoiceOver/TalkBack) and the keyboard synthesize, so a
  // pointer-only handler would leave them named-but-inert for AT. `touch-action:
  // manipulation` (touch.css) removes the 300ms tap delay, so a finger stays snappy.
  return (
    <div className="touch-controls">
      <div
        ref={stickRef}
        className="touch-stick"
        aria-hidden="true"
        onPointerDown={stickDown}
        onPointerMove={stickMove}
        onPointerUp={stickUp}
        onPointerCancel={stickUp}
      >
        <span
          className="touch-stick__nub"
          style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
        />
      </div>

      <div className="touch-actions">
        {knowsSpell && (
          <button
            type="button"
            className="touch-btn touch-btn--spell"
            aria-label="Cast spell"
            onClick={() => castEquippedSpell()}
          >
            <span aria-hidden="true">✦</span>
          </button>
        )}
        {canJump && (
          <button
            type="button"
            className="touch-btn touch-btn--jump"
            aria-label="Jump"
            onClick={() => queueTouchJump()}
          >
            Jump
          </button>
        )}
        <button
          type="button"
          className={`touch-btn touch-btn--action${idle ? ' is-idle' : ''}`}
          aria-label={actionAria}
          onClick={() => {
            if (hasInteract) interactNearby();
            else grabNearby();
          }}
        >
          <span aria-hidden="true">{label}</span>
        </button>
      </div>
    </div>
  );
}
