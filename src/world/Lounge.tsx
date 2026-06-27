import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { fogFor, type Room } from '../data/rooms';
import { announce } from '../state/toastStore';
import { useProgressStore } from '../state/progressStore';
import { exposeTestGlobal } from '../lib/testHooks';

// The Lounge — the sweet breather off the live room: a couch, a coffee table, a
// softly bobbing lava lamp, and the rat fast asleep in the good armchair (paying
// its rent in dreams). The CRT (room.tv) plays a "Finding SD" session clip via the
// shared TV layer. Warm, low, restful — the relief beat of the basement, taste-safe
// (a gentle bob on the lamp, never a flash; WCAG 2.3.1 holds). The wing's "discover"
// rung: tuck the blanket over the sleeping rat for a sweet one-time secret (+luck) —
// the rat motif the storefront teases ("RAT SPOTTED IN WALL"), finally paid off.

// The napping rat: a curled grey body, two ears, a tail, breathing slowly.
function SleepingRat({ mat, pink }: { mat: THREE.Material; pink: THREE.Material }) {
  const body = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (body.current) body.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.04;
  });
  return (
    <group ref={body}>
      <mesh material={mat} position={[0, 0, 0]}>
        <sphereGeometry args={[0.22, 10, 8]} />
      </mesh>
      {/* head tucked in */}
      <mesh material={mat} position={[0.18, -0.02, 0.08]}>
        <sphereGeometry args={[0.13, 10, 8]} />
      </mesh>
      {/* ears */}
      <mesh material={pink} position={[0.22, 0.1, 0.0]}>
        <circleGeometry args={[0.06, 8]} />
      </mesh>
      <mesh material={pink} position={[0.22, 0.1, 0.14]}>
        <circleGeometry args={[0.06, 8]} />
      </mesh>
      {/* tail curling round */}
      <mesh material={pink} position={[-0.2, -0.06, -0.14]} rotation-y={0.6}>
        <torusGeometry args={[0.16, 0.018, 6, 12, Math.PI * 1.2]} />
      </mesh>
    </group>
  );
}

export function Lounge({ room }: { room: Room }) {
  const fog = fogFor(room);
  const { gl } = useThree();

  // Tuck the blanket over the sleeping rat — a sweet, one-time secret (taste: you
  // never wake or disturb it; it just keeps dreaming). Records the secret + tips a
  // little luck. A deterministic hook drives it from the smoke (clicking a 3D mesh
  // through Playwright is camera-fragile).
  const petRat = () => {
    const prog = useProgressStore.getState();
    if (prog.secretsFound.includes('lounge-rat')) {
      announce('🐀 The rat doesn’t stir — still paying its rent in dreams.', 'info');
      return;
    }
    prog.findSecret('lounge-rat');
    prog.gainLuck(1);
    announce(
      '🐀 You tuck the blanket over the sleeping rat — rent paid, in dreams · +1 luck',
      'luck',
    );
  };

  useEffect(() => {
    exposeTestGlobal('__sdpPetRat', petRat);
    return () => exposeTestGlobal('__sdpPetRat', undefined);
  }, []);
  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#221710', '#2c1f14');
    t.repeat.set(4, 4);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 5, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#2a1d12', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#1a110a'), []);
  const couchMat = useMemo(() => flatMat('#5a6e3a'), []); // a sage-green couch
  const chairMat = useMemo(() => flatMat('#6a3a2a'), []); // the good armchair
  const tableMat = useMemo(() => flatMat('#3a2a18'), []);
  const lampBaseMat = useMemo(() => flatMat('#2a2a30'), []);
  const ratMat = useMemo(() => flatMat('#6b6b73'), []);
  const ratPink = useMemo(() => flatMat('#c98a8a'), []);
  // the lava lamp's glowing goo (additive, gently bobbing — no flash)
  const lavaMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ff5ea0',
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const lava = useRef<THREE.Mesh>(null);
  const lava2 = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lava.current) lava.current.position.y = 1.15 + Math.sin(t * 0.6) * 0.12;
    if (lava2.current) lava2.current.position.y = 1.0 + Math.sin(t * 0.5 + 2) * 0.1;
  });

  useEffect(() => () => floorTex.dispose(), [floorTex]);

  return (
    <group>
      <ambientLight intensity={0.4} color="#ffd9a8" />
      <pointLight position={[0, 2.6, 0]} intensity={0.55} distance={13} color="#ffbf80" />
      <pointLight position={[-3.2, 1.4, -2.6]} intensity={0.3} distance={7} color="#ff6aa0" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* a low couch against the -Z wall */}
      <group position={[0.5, 0, -3.8]}>
        <mesh material={couchMat} position={[0, 0.4, 0]}>
          <boxGeometry args={[2.6, 0.5, 0.9]} />
        </mesh>
        <mesh material={couchMat} position={[0, 0.85, -0.34]}>
          <boxGeometry args={[2.6, 0.7, 0.22]} />
        </mesh>
      </group>

      {/* the coffee table, center-ish */}
      <mesh material={tableMat} position={[0.4, 0.4, -1.8]}>
        <boxGeometry args={[1.3, 0.12, 0.7]} />
      </mesh>

      {/* the good armchair (-X corner) with the rat asleep in it */}
      <group position={[-3.4, 0, -2.4]} rotation-y={0.5}>
        <mesh material={chairMat} position={[0, 0.42, 0]}>
          <boxGeometry args={[1.0, 0.5, 1.0]} />
        </mesh>
        <mesh material={chairMat} position={[0, 0.95, -0.4]}>
          <boxGeometry args={[1.0, 0.8, 0.22]} />
        </mesh>
        <mesh material={chairMat} position={[-0.5, 0.8, 0]}>
          <boxGeometry args={[0.2, 0.5, 1.0]} />
        </mesh>
        <mesh material={chairMat} position={[0.5, 0.8, 0]}>
          <boxGeometry args={[0.2, 0.5, 1.0]} />
        </mesh>
        <group position={[0, 0.78, 0.1]}>
          <SleepingRat mat={ratMat} pink={ratPink} />
          {/* invisible hit-target over the rat — click to tuck it in (the secret) */}
          <mesh
            position={[0.05, 0.02, 0.04]}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              petRat();
            }}
            onPointerOver={() => (gl.domElement.style.cursor = "url('/cursor.cur'), pointer")}
            onPointerOut={() => (gl.domElement.style.cursor = 'grab')}
          >
            <sphereGeometry args={[0.34, 8, 6]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>

      {/* a lava lamp on a side table by the couch */}
      <group position={[-1.4, 0, -3.6]}>
        <mesh material={tableMat} position={[0, 0.45, 0]}>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
        </mesh>
        <mesh material={lampBaseMat} position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.13, 0.18, 0.22, 12]} />
        </mesh>
        <mesh ref={lava} material={lavaMat} position={[0, 1.15, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
        </mesh>
        <mesh ref={lava2} material={lavaMat} position={[0, 1.0, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}
