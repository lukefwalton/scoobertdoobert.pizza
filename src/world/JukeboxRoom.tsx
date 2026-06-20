import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  applyVertexSnap,
  makeAffineTexturedMaterial,
  makeCheckerTexture,
  makeTextTexture,
} from './ps1';
import { JUKEBOX_POS, type Room } from '../data/rooms';
import { audio } from '../audio/engine';

// The jukebox room — the music payoff at the end of the hall. Warm, dim, a
// little womb-like. The site's song (the boot loop) localizes to the jukebox:
// it swells as you cross the room toward it and fades as you walk off (handled
// by JukeboxAudio driving the engine's proximity duck). The drei
// <PositionalAudio> + real catalog swap drops in here later; the swell is real
// now, using the one degraded loop we ship.
function flatMat(color: string, map?: THREE.Texture, side: THREE.Side = THREE.FrontSide): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, map, flatShading: true, side });
  applyVertexSnap(m, 64);
  return m;
}

// Drives the engine's spatial duck from camera distance to the jukebox.
function JukeboxAudio() {
  const { camera } = useThree();
  useEffect(() => {
    // Entering is a good moment to make sure the loop is actually running.
    audio.unlock();
    return () => audio.setProximityGain(1); // restore full volume on leaving
  }, []);
  useFrame(() => {
    const dx = camera.position.x - JUKEBOX_POS[0];
    const dz = camera.position.z - JUKEBOX_POS[2];
    const dist = Math.hypot(dx, dz);
    const NEAR = 2.2;
    const FAR = 10;
    const FLOOR = 0.16; // how quiet it gets across the room
    const t = Math.max(0, Math.min(1, (dist - NEAR) / (FAR - NEAR)));
    audio.setProximityGain(1 - (1 - FLOOR) * t);
  });
  return null;
}

function Jukebox() {
  const bodyMat = useMemo(() => flatMat('#3a1c2a'), []); // dark plum cabinet
  const trimMat = useMemo(() => flatMat('#c0843a'), []); // brass trim
  const glowMat = useMemo(() => flatMat('#ff7bd5'), []); // glowing arch (hot pink)
  const screenMat = useMemo(() => flatMat('#ffd27a'), []); // amber display
  const grilleTex = useMemo(() => {
    const t = makeCheckerTexture(10, '#1c0f16', '#2c1622');
    t.repeat.set(2, 2);
    return t;
  }, []);
  const grilleMat = useMemo(() => flatMat('#ffffff', grilleTex), [grilleTex]);
  const signTex = useMemo(
    () => makeTextTexture('WHAT DO YOU\nWANT TO HEAR?', { fg: '#ffe9c2', w: 256, h: 128 }),
    [],
  );
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, transparent: true }),
    [signTex],
  );

  const pulse = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (pulse.current) pulse.current.intensity = 0.9 + Math.sin(state.clock.elapsedTime * 2.1) * 0.28;
  });

  // Centered on JUKEBOX_POS, facing +Z (toward the player entering from +Z).
  return (
    <group position={JUKEBOX_POS}>
      {/* glow pool from the jukebox */}
      <pointLight ref={pulse} position={[0, 1.4, 1.4]} intensity={0.9} distance={11} color="#ff9ad6" />

      {/* cabinet */}
      <mesh material={bodyMat} position={[0, 0.2, 0]}>
        <boxGeometry args={[2.6, 3.4, 1.1]} />
      </mesh>
      {/* arched glowing crown */}
      <mesh material={glowMat} position={[0, 2.05, 0.2]}>
        <cylinderGeometry args={[1.35, 1.35, 0.7, 16, 1, false, 0, Math.PI]} />
      </mesh>
      {/* brass trim band */}
      <mesh material={trimMat} position={[0, 1.1, 0.56]}>
        <boxGeometry args={[2.4, 0.18, 0.12]} />
      </mesh>
      {/* amber display / now-playing window */}
      <mesh material={screenMat} position={[0, 1.5, 0.57]}>
        <planeGeometry args={[1.9, 0.7]} />
      </mesh>
      {/* speaker grille */}
      <mesh material={grilleMat} position={[0, 0.35, 0.57]}>
        <planeGeometry args={[2.0, 1.2]} />
      </mesh>
      {/* glowing select buttons */}
      {[-0.7, -0.23, 0.24, 0.71].map((x) => (
        <mesh key={x} material={glowMat} position={[x, -0.55, 0.57]}>
          <boxGeometry args={[0.26, 0.26, 0.08]} />
        </mesh>
      ))}
      {/* the MTV-M2 question, hovering above */}
      <mesh material={signMat} position={[0, 3.15, 0.3]}>
        <planeGeometry args={[3.0, 1.5]} />
      </mesh>
    </group>
  );
}

export function JukeboxRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const fog = { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };

  const carpetTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#3a0f24', '#511633'); // deep magenta carpet
    t.repeat.set(3, 3);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(carpetTex, 3, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carpetTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#241026', undefined, THREE.DoubleSide), []);
  const ceilMat = useMemo(() => flatMat('#160a18'), []);

  return (
    <group>
      {/* warm low fill so the cabinet glow does most of the work */}
      <ambientLight intensity={0.34} color="#c98fb6" />

      {/* floor */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* ceiling */}
      <mesh material={ceilMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* walls */}
      <mesh material={wallMat} position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} position={[0, H / 2, D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={Math.PI / 2} position={[-W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={-Math.PI / 2} position={[W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>

      <Jukebox />
      <JukeboxAudio />
    </group>
  );
}
