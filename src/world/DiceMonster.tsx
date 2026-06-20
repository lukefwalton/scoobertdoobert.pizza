import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { applyVertexSnap } from './ps1';
import { useMonsterStore, monsterScale } from '../state/monsterStore';
import { useDreadStore } from '../state/dreadStore';

// ───────────────────────────────────────────────────────────────────────────
// DiceMonster — Phase 6. The thing you gamble against. A low-poly, goofy-uncanny
// blob with two big eyes and little horns. It scales with your LOSS count
// (monsterScale): small + leaning-at-you menacing at first, then bloating each
// time it beats your roll until — at the cap — it's a room-filling lump that's
// TOO BIG TO MOVE and just sits there (inert, harmless, faintly embarrassing).
// Never a threat that can hurt you (taste guardrail) — the size IS the joke.
// Scale eases toward the target so a loss reads as a visible "puff up".
// ───────────────────────────────────────────────────────────────────────────

function flatMat(color: string): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
  applyVertexSnap(m, 64);
  return m;
}

export function DiceMonster({ position }: { position: [number, number, number] }) {
  const { camera } = useThree();
  const losses = useMonsterStore((s) => s.losses);
  const maxed = useMonsterStore((s) => s.maxed);
  const target = monsterScale(losses);

  const root = useRef<THREE.Group>(null);
  const scaleRef = useRef(monsterScale(0));

  const bodyMat = useMemo(() => flatMat('#5e7d52'), []); // sickly green
  const bellyMat = useMemo(() => flatMat('#7fa06a'), []);
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f7f4d8' }), []); // glowy
  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#1a120f' }), []);
  const hornMat = useMemo(() => flatMat('#caa14a'), []);

  useFrame((state, delta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    // Ease the scale toward target (a loss visibly inflates it).
    scaleRef.current += (target - scaleRef.current) * Math.min(1, dt * 4);
    g.scale.setScalar(scaleRef.current);

    const t = state.clock.elapsedTime;
    const unease = useDreadStore.getState().unease;
    if (maxed) {
      // Too big to move: it just sits, breathing slightly. No lean, no menace.
      g.rotation.y = 0;
      g.position.y = position[1] + Math.sin(t * 0.8) * 0.02 * scaleRef.current;
    } else {
      // Small + spry: leans/turns toward you and bobs, more agitated with unease.
      const dx = camera.position.x - g.position.x;
      const dz = camera.position.z - g.position.z;
      g.rotation.y = Math.atan2(dx, dz);
      const bob = 0.06 + unease * 0.06;
      g.position.y = position[1] + Math.abs(Math.sin(t * (2 + unease * 2))) * bob;
    }
  });

  // Built at unit scale (~1.2 tall), centred so the feet sit near y=0; the group
  // scales the whole thing. Eyes/horns on the +Z face (it turns to face you).
  return (
    <group ref={root} position={position}>
      {/* body */}
      <mesh material={bodyMat} position={[0, 0.55, 0]}>
        <icosahedronGeometry args={[0.6, 0]} />
      </mesh>
      {/* paler belly */}
      <mesh material={bellyMat} position={[0, 0.4, 0.18]}>
        <icosahedronGeometry args={[0.42, 0]} />
      </mesh>
      {/* eyes */}
      {[-0.22, 0.22].map((x) => (
        <group key={x} position={[x, 0.72, 0.46]}>
          <mesh material={eyeMat}>
            <sphereGeometry args={[0.16, 8, 6]} />
          </mesh>
          <mesh material={pupilMat} position={[0, 0, 0.12]}>
            <sphereGeometry args={[0.07, 6, 5]} />
          </mesh>
        </group>
      ))}
      {/* little horns */}
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} material={hornMat} position={[x, 1.04, 0.05]} rotation-x={-0.3}>
          <coneGeometry args={[0.09, 0.32, 5]} />
        </mesh>
      ))}
      {/* stubby feet */}
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} material={bodyMat} position={[x, 0.12, 0.1]}>
          <boxGeometry args={[0.22, 0.24, 0.3]} />
        </mesh>
      ))}
      <pointLight position={[0, 0.8, 0.8]} intensity={0.25} distance={5} color="#bfe0a0" />
    </group>
  );
}
