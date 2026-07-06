import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeTextTexture } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { announce } from '../state/toastStore';
import { useSceneStore } from '../state/sceneStore';
import { roomById, type RoomInteractable } from '../data/rooms';
import { emitBurst } from './burstBus';
import { isDebugEntrance, exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// Interactables — the ESCAPE-ROOM grammar (Luke, 2026-07): a small clickable
// object whose whole job is to FIRE A TRIGGER, which reveals a `revealOnTrigger`
// door somewhere in the room ("do something → the way opens"). Trivially easy and
// signposted: it glows + pulses while un-used (so it reads as clickable, on touch
// too), the cursor turns to a pointer on hover, and a click dings + pops a burst +
// announces "a way opens" while the target door shimmers into its wall (DoorMesh).
// Once fired it dims and goes quiet — the puzzle is solved. Modeled on SkillOrb.
// ───────────────────────────────────────────────────────────────────────────

const GLYPH: Record<NonNullable<RoomInteractable['kind']>, string> = {
  bell: '🔔',
  switch: '⏻',
  orb: '✦',
};

function InteractableMesh({ it }: { it: RoomInteractable }) {
  const { gl } = useThree();
  // Re-render on fire so the visual flips to "used" (dim, still); the door reveal
  // is driven off the same triggersFired via Doors' doorRevealed.
  const fired = useSceneStore((s) => s.triggersFired.includes(it.revealsTrigger));
  const kind = it.kind ?? 'bell';
  const group = useRef<THREE.Group>(null);

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

  const activate = () => {
    const st = useSceneStore.getState();
    if (st.triggersFired.includes(it.revealsTrigger)) return; // already solved — no-op
    st.fireTrigger(it.revealsTrigger);
    audio.unlock();
    emitBurst(it.position, '#ffcf4d');
    // a bright ding → a soft "a way opens" fifth above it
    audio.playChime(noteToFreq('E', 6), 0, 0.14, 0.7);
    window.setTimeout(() => audio.playChime(noteToFreq('B', 6), 0, 0.16, 0.95), 130);
    announce(`🔓 ${it.label} — a way opens`, 'luck');
  };

  // Deterministic activate hook (ACTION → the narrower ?debug gate). Mirrors
  // SkillOrb's __sdpLearn so a smoke can fire the REAL reveal path by id.
  useEffect(() => {
    if (isDebugEntrance()) exposeTestGlobal(`__sdpInteract:${it.id}`, activate);
    return () => exposeTestGlobal(`__sdpInteract:${it.id}`, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it.id]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    // Un-used: a gentle bob + emissive pulse (reads as "click me", touch-safe).
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
        activate();
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
      {/* the glowing knob/bell — the thing you click */}
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

/** All the current room's escape-room interactables (usually zero or one). */
export function Interactables() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const items = roomById(currentRoom).interactables ?? [];
  return (
    <>
      {items.map((it) => (
        <InteractableMesh key={it.id} it={it} />
      ))}
    </>
  );
}
