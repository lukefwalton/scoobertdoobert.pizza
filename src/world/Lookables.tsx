import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { type Room } from '../data/rooms';
import { lookablesForRoom, resolveLookablePos, type Lookable } from '../data/lookables';
import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';

// ───────────────────────────────────────────────────────────────────────────
// Lookables — the flavor curios (src/data/lookables.ts). Each is a small,
// softly-glowing thing you can look at for a one-line story; a `kind:'animalHead'`
// is a little mounted head whose EYES TRACK YOU as you pass. Mirrors Hotspots:
// its own proximity useFrame publishes nearLookable (the "Press E to look"
// prompt), and each has an invisible click box → openLookableDialog. Renders
// only the CURRENT room's curios (room-local coords), so it swaps with the room.
// ───────────────────────────────────────────────────────────────────────────

const REACH = 3.6; // proximity radius (world units)
const _v = new THREE.Vector3();

export function Lookables({ room }: { room: Room }) {
  const { camera } = useThree();
  const setNear = useSceneStore((s) => s.setNearLookable);
  const lastNear = useRef<string | null>(null);

  const placed = useMemo(
    () => lookablesForRoom(room.id).map((l) => ({ l, pos: resolveLookablePos(l, room.dims) })),
    [room.id, room.dims],
  );

  useFrame(() => {
    const st = useSceneStore.getState();
    // Freeze prompts under any dialog / the pause menu (mirrors Hotspots).
    if (st.openLookable || st.openHotspot || st.openNpc || st.paused || st.pendingRoom) return;
    let nearest: string | null = null;
    let nd = Infinity;
    for (const { l, pos } of placed) {
      _v.set(pos[0], pos[1], pos[2]);
      const d = camera.position.distanceTo(_v);
      if (d < REACH && d < nd) {
        nearest = l.id;
        nd = d;
      }
    }
    if (nearest !== lastNear.current) {
      if (nearest) audio.playChime(noteToFreq('E', 5), 0.15, 0.06, 0.4); // a soft "…hm?"
      lastNear.current = nearest;
      setNear(nearest);
    }
  });

  return (
    <>
      {placed.map(({ l, pos }) => (
        <group key={l.id} position={pos}>
          {l.kind === 'animalHead' ? <AnimalHead look={l} /> : <Curio />}
          {/* invisible, generous click target */}
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              useSceneStore.getState().openLookableDialog(l.id);
            }}
            onPointerOver={() => {
              document.body.style.cursor = "url('/cursor.cur'), pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = '';
            }}
          >
            <boxGeometry args={[1.5, 1.5, 1.5]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// A soft, bobbing mote — the "there's something here to look at" cue. Additive so
// it reads in the darkest rooms; a gentle bob (pure motion, no luminance flash).
function Curio() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffe6a8',
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.8;
      ref.current.position.y = Math.sin(s.clock.elapsedTime * 1.5) * 0.09;
    }
  });
  return (
    <mesh ref={ref} material={mat}>
      <octahedronGeometry args={[0.2, 0]} />
    </mesh>
  );
}

// A little mounted head. The whole point: the two eyes lookAt the camera every
// frame, so the gaze follows you as you cross the room (Luke's ask). Deliberately
// crude / low-poly (PS1 register); it's a wall trophy, not a character.
function AnimalHead({ look }: { look: Lookable }) {
  const leftEye = useRef<THREE.Group>(null);
  const rightEye = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const eyeColor = look.eyeColor ?? '#e8c56a';

  useFrame(() => {
    // lookAt uses world positions, so nesting under the room group is fine.
    leftEye.current?.lookAt(camera.position);
    rightEye.current?.lookAt(camera.position);
  });

  return (
    <group>
      {/* head + snout — flat-shaded, dark; a mounted trophy silhouette */}
      <mesh>
        <boxGeometry args={[0.7, 0.8, 0.55]} />
        <meshLambertMaterial color="#4a3b2e" flatShading />
      </mesh>
      <mesh position={[0, -0.18, 0.34]}>
        <boxGeometry args={[0.36, 0.4, 0.32]} />
        <meshLambertMaterial color="#3d3126" flatShading />
      </mesh>
      {/* ears */}
      <mesh position={[-0.34, 0.42, 0]} rotation={[0, 0, 0.5]}>
        <coneGeometry args={[0.12, 0.34, 5]} />
        <meshLambertMaterial color="#4a3b2e" flatShading />
      </mesh>
      <mesh position={[0.34, 0.42, 0]} rotation={[0, 0, -0.5]}>
        <coneGeometry args={[0.12, 0.34, 5]} />
        <meshLambertMaterial color="#4a3b2e" flatShading />
      </mesh>
      {/* the two tracking eyes: a white ball + a dark pupil sitting on its +z
          face, so when the eye group turns to face you the pupil points at you */}
      {[[-0.17, 0.12, 0.28] as const, [0.17, 0.12, 0.28] as const].map((p, i) => (
        <group key={i} ref={i === 0 ? leftEye : rightEye} position={p}>
          <mesh>
            <sphereGeometry args={[0.1, 10, 10]} />
            <meshBasicMaterial color="#fff8e6" fog={false} />
          </mesh>
          <mesh position={[0, 0, 0.085]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={eyeColor} fog={false} />
          </mesh>
          <mesh position={[0, 0, 0.115]}>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshBasicMaterial color="#120c08" fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
