import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeTextTexture } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { roomById, type RoomInteractable } from '../data/rooms';
import { emitBurst } from './burstBus';
import { inputFrozen } from './inputFrozen';
import { fireInteractable } from '../lib/interactables';
import { isDebugEntrance, exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// Interactables — the ESCAPE-ROOM grammar (Luke, 2026-07): a small object whose
// whole job is to FIRE A TRIGGER, which reveals a `revealOnTrigger` door somewhere
// in the room ("do something → the way opens"). It glows + pulses while un-used
// (so it reads as usable, on touch too) and answers BOTH a direct click AND the
// shared "Press E" / touch action verb via a proximity scan — so a keyboard-only
// player can ring the room-one bell and actually get downstairs (the fire path is
// the same either way: `fireInteractable`). Once fired it dims and goes quiet — the
// puzzle is solved. Modeled on SkillOrb + the Lookables proximity scan.
// ───────────────────────────────────────────────────────────────────────────

const GLYPH: Record<NonNullable<RoomInteractable['kind']>, string> = {
  bell: '🔔',
  switch: '⏻',
  orb: '✦',
};

const REACH = 3; // proximity radius (world units) for the "Press E to …" prompt
const _v = new THREE.Vector3();

function InteractableMesh({ it }: { it: RoomInteractable }) {
  const { gl } = useThree();
  // Re-render on fire so the visual flips to "used" (dim, still); the door reveal
  // is driven off the same triggersFired via Doors' doorRevealed.
  const fired = useSceneStore((s) => s.triggersFired.includes(it.revealsTrigger));
  const kind = it.kind ?? 'bell';
  const group = useRef<THREE.Group>(null);
  // The delayed "a way opens" second chime, in WORLD-TIME seconds still to wait
  // (0 = nothing pending) — armed when the trigger flips fired, counted down in
  // useFrame ONLY while input isn't frozen, so it freezes with a pause/modal and
  // dies with the room. Never a wall-clock timer (the R3F-clock audio rule).
  const chimeIn = useRef(0);

  const knobMat = useMemo(() => {
    const m = flatMat('#ffcf4d');
    m.emissive.set('#ffcf4d');
    m.emissiveIntensity = 0.5;
    return m;
  }, []);
  const postMat = useMemo(() => flatMat('#3a2a22'), []);
  const glyphTex = useMemo(
    () => makeTextTexture(GLYPH[kind], { fg: '#1a1a1a', bg: '#ffcf4d', w: 64, h: 64 }),
    [kind],
  );
  const glyphMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glyphTex, transparent: true }),
    [glyphTex],
  );
  useDispose(knobMat, postMat, glyphTex, glyphMat);

  // Emit the collect-burst the instant this interactable's trigger FLIPS fired —
  // fires for every path (click / E / touch) since they all set triggersFired, and
  // never on a mount that's already-fired (a same-session re-visit), so there's no
  // phantom burst on re-entry. Keeps the burst (world/three) out of the lib verb.
  const firedPrev = useRef(fired);
  useEffect(() => {
    if (fired && !firedPrev.current) {
      emitBurst(it.position, '#ffcf4d');
      chimeIn.current = 0.13; // arm the pause-aware follow-up chime (played in useFrame)
    }
    firedPrev.current = fired;
  }, [fired, it.position]);

  // Deterministic activate hook (ACTION → the narrower ?debug gate). Mirrors
  // SkillOrb's __sdpLearn so a smoke can fire the REAL reveal path by id.
  useEffect(() => {
    if (isDebugEntrance()) exposeTestGlobal(`__sdpInteract:${it.id}`, () => fireInteractable(it));
    return () => exposeTestGlobal(`__sdpInteract:${it.id}`, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it.id]);

  useFrame((state, delta) => {
    // The queued "a way opens" rise: count down WORLD time, but only while input
    // isn't frozen (so it freezes with a pause/modal and resumes after), then play.
    // Rides the R3F clock + inputFrozen, so it never fires out of band or after the
    // room is gone — matches the repo's in-world-audio rule.
    if (chimeIn.current > 0 && !inputFrozen()) {
      chimeIn.current -= delta;
      if (chimeIn.current <= 0) {
        chimeIn.current = 0;
        audio.playChime(noteToFreq('B', 6), 0, 0.16, 0.95);
      }
    }
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    // Un-used: a gentle bob + emissive pulse (reads as "use me", touch-safe).
    // Used: settle to rest, dim glow. WCAG-safe (slow, no flash).
    group.current.position.y = it.position[1] + (fired ? 0 : Math.sin(t * 3) * 0.05);
    knobMat.emissiveIntensity = fired ? 0.1 : 0.4 + Math.sin(t * 4) * 0.22;
    knobMat.color.set(fired ? '#6b7a4a' : '#ffcf4d');
    knobMat.emissive.set(fired ? '#6b7a4a' : '#ffcf4d');
  });

  return (
    <group
      ref={group}
      position={it.position}
      rotation-y={it.rotationY ?? 0}
      onClick={(e) => {
        e.stopPropagation();
        fireInteractable(it);
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = fired ? 'grab' : "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      {/* a little post it sits on */}
      <mesh material={postMat} position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 0.48, 8]} />
      </mesh>
      {/* the glowing knob/bell — the thing you ring */}
      <mesh material={knobMat} position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
      </mesh>
      {/* a glyph placard floating over it (which verb) */}
      <mesh material={glyphMat} position={[0, 0.92, 0]}>
        <planeGeometry args={[0.34, 0.34]} />
      </mesh>
    </group>
  );
}

/** All the current room's escape-room interactables (usually zero or one), plus a
 *  proximity scan that publishes the nearest UN-FIRED one to nearInteractable — the
 *  "Press E to …" prompt + the shared E/touch verb (worldActions.interactNearby). */
export function Interactables() {
  const { camera } = useThree();
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const items = useMemo(() => roomById(currentRoom).interactables ?? [], [currentRoom]);
  const setNear = useSceneStore((s) => s.setNearInteractable);
  const lastNear = useRef<string | null>(null);
  // Debug-only forced-near (mirrors Lookables' __sdpNearLookable) so a smoke can
  // drive the real proximity→E→reveal chain without pixel-walking to the bell.
  const forced = useRef<string | null>(null);

  useEffect(() => {
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpNearInteractable', (id?: string) => {
      const target = id ?? items[0]?.id ?? null;
      forced.current = target;
      return target;
    });
    return () => exposeTestGlobal('__sdpNearInteractable', undefined);
  }, [items]);

  // Drop any forced-near + clear the prompt on room change (neither outlives its room).
  useEffect(() => {
    return () => {
      forced.current = null;
      lastNear.current = null;
    };
  }, [currentRoom]);

  useFrame(() => {
    const st = useSceneStore.getState();
    // Freeze while a dialog / pause / wipe owns input (mirrors Lookables/Doors).
    if (
      st.paused ||
      st.openHotspot ||
      st.openLookable ||
      st.openNpc ||
      st.pendingRoom ||
      st.transitioning
    )
      return;
    const publish = (id: string | null) => {
      if (id === lastNear.current) return;
      lastNear.current = id;
      setNear(id ? (items.find((i) => i.id === id) ?? null) : null);
    };
    if (forced.current) {
      publish(forced.current);
      return;
    }
    let nearest: string | null = null;
    let nd = Infinity;
    for (const it of items) {
      if (st.triggersFired.includes(it.revealsTrigger)) continue; // fired → no prompt
      _v.set(it.position[0], it.position[1], it.position[2]);
      const d = camera.position.distanceTo(_v);
      if (d < REACH && d < nd) {
        nearest = it.id;
        nd = d;
      }
    }
    publish(nearest);
  });

  return (
    <>
      {items.map((it) => (
        <InteractableMesh key={it.id} it={it} />
      ))}
    </>
  );
}
