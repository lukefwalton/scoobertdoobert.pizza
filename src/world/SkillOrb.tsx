import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeTextTexture } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { announce } from '../state/toastStore';
import { useProgressStore } from '../state/progressStore';
import { inputFrozen } from './inputFrozen';
import { emitBurst } from './burstBus';
import { abilityById, type AbilityId } from '../data/abilities';
import { isDebugEntrance, exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// SkillOrb — a LEARNABLE ability, sitting in the world as a glowing collectible.
// Walk into it (or click it) and you LEARN the verb: an "ooo, a skill" burst of
// light, a rising fanfare, a durable once-only grant, and the orb pops out of
// existence. The reward-for-finding-it is a new way to move.
//
// Self-contained (like the frog / the slide mouth): its own bob + spin + pulse,
// its own proximity trigger, its own grant. Grants a progressStore secret that
// Controls reads to gate the verb (see data/abilities.ts). Renders NOTHING once
// learned, so it's gone for good the instant you take it.
// ───────────────────────────────────────────────────────────────────────────

const REACH = 1.5; // walk this close → learn it

export function SkillOrb({
  ability,
  position,
}: {
  ability: AbilityId;
  position: [number, number, number];
}) {
  const { camera, gl } = useThree();
  const info = abilityById(ability);
  const learned = useProgressStore((s) => s.secretsFound.includes(info.secret));
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const claimed = useRef(false);

  // A self-lit gem core + a bright ring + a little placard with the verb's glyph.
  const coreMat = useMemo(() => {
    const m = flatMat(info.color);
    m.emissive.set(info.color);
    m.emissiveIntensity = 0.6;
    return m;
  }, [info.color]);
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.85 }),
    [info.color],
  );
  const glyphTex = useMemo(
    () => makeTextTexture(info.glyph, { fg: '#1a1a1a', bg: info.color, w: 64, h: 64 }),
    [info.glyph, info.color],
  );
  const glyphMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glyphTex, transparent: true }),
    [glyphTex],
  );
  useDispose(coreMat, ringMat, glyphTex, glyphMat);

  const learn = () => {
    if (claimed.current) return;
    const prog = useProgressStore.getState();
    if (prog.secretsFound.includes(info.secret)) return;
    claimed.current = true;
    prog.findSecret(info.secret);
    audio.unlock();
    emitBurst(position, info.color);
    announce(`★ learned ${info.name}! (${info.hint})`, 'crit-good');
    // a rising three-note fanfare — the "ooo, a skill" sting
    audio.playChime(noteToFreq('C', 5), -0.2, 0.12, 0.7);
    window.setTimeout(() => audio.playChime(noteToFreq('E', 5), 0, 0.12, 0.7), 110);
    window.setTimeout(() => audio.playChime(noteToFreq('A', 5), 0.2, 0.15, 1.1), 240);
  };

  // Deterministic learn hook (ACTION → the narrower ?debug gate: it banks a
  // durable progression secret, so it must never fire on plain ?world).
  useEffect(() => {
    if (isDebugEntrance()) exposeTestGlobal(`__sdpLearn:${ability}`, learn);
    return () => exposeTestGlobal(`__sdpLearn:${ability}`, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ability]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = position[1] + Math.sin(t * 2.2) * 0.14;
    group.current.rotation.y = t * 1.4;
    if (core.current) {
      const p = 1 + Math.sin(t * 4) * 0.08; // gentle pulse
      core.current.scale.setScalar(p);
    }
    // Walk into it → learn it (playground logic; the orb IS the button). XZ only,
    // so jumping through it counts too. Frozen states (pause/wipe) don't collect.
    if (!claimed.current && !inputFrozen()) {
      const dx = camera.position.x - position[0];
      const dz = camera.position.z - position[2];
      if (dx * dx + dz * dz < REACH * REACH) learn();
    }
  });

  if (learned) return null;

  return (
    <group ref={group} position={position}>
      {/* a soft glow pool so it reads "important" even in a bright room */}
      <pointLight color={info.color} intensity={0.6} distance={4} />
      {/* the gem core */}
      <mesh
        ref={core}
        material={coreMat}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          learn();
        }}
        onPointerOver={() => {
          gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
        }}
        onPointerOut={() => {
          gl.domElement.style.cursor = 'grab';
        }}
      >
        <octahedronGeometry args={[0.34, 0]} />
      </mesh>
      {/* an orbiting ring */}
      <mesh material={ringMat} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[0.52, 0.045, 6, 20]} />
      </mesh>
      {/* the verb's glyph on a little placard above the gem */}
      <mesh material={glyphMat} position={[0, 0.7, 0]}>
        <planeGeometry args={[0.4, 0.4]} />
      </mesh>
    </group>
  );
}
