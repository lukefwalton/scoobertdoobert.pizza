import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat } from './ps1';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GroveRoom — the hidden grove, the reward for beating the goblin (Luke: "winning
// gives you a new room"). A hush after the bright field: dusk settling cool and
// blue, a single glowing thing floating over a stone altar, and the reward-is-
// sound spine — a soft chord greets you on arrival. (Slice 2: the space + the
// payoff; richer contents can grow here later.) Door back to the grass is in the
// room data.
// ───────────────────────────────────────────────────────────────────────────

export function GroveRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const orb = useRef<THREE.Mesh>(null);

  const groundMat = useMemo(() => flatMat('#2f4a44'), []);
  const stoneMat = useMemo(() => flatMat('#566a64'), []);
  const orbMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c6f0e0' }), []); // unlit glow
  useEffect(
    () => () => {
      groundMat.dispose();
      stoneMat.dispose();
      orbMat.dispose();
    },
    [groundMat, stoneMat, orbMat],
  );

  // A soft arrival chord — the grove's reward is sound.
  useEffect(() => {
    audio.unlock();
    const t = ['D', 'A', 'F#', 'D'].map((n, i) =>
      window.setTimeout(
        () => audio.playChime(noteToFreq(n, i === 3 ? 6 : 5), 0, 0.14),
        220 + i * 230,
      ),
    );
    return () => t.forEach((id) => clearTimeout(id));
  }, []);

  useFrame((state) => {
    const m = orb.current;
    if (m) {
      const t = state.clock.elapsedTime;
      m.position.y = 1.7 + Math.sin(t * 1.2) * 0.16; // gentle bob
      m.rotation.y = t * 0.5;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.45} color="#9fd6c4" />
      <pointLight position={[0, 2.4, -1]} intensity={0.95} distance={13} color="#c6f0e0" />

      {/* the clearing floor (dissolves into the dusk fog) */}
      <mesh material={groundMat} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 6, D * 2 + 6]} />
      </mesh>

      {/* a low stone altar + the floating glowing reward over it */}
      <mesh material={stoneMat} position={[0, 0.4, -1]}>
        <cylinderGeometry args={[0.9, 1.1, 0.8, 8]} />
      </mesh>
      <mesh ref={orb} material={orbMat} position={[0, 1.7, -1]}>
        <icosahedronGeometry args={[0.45, 1]} />
      </mesh>
    </group>
  );
}
