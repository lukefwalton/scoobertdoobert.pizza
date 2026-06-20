import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDreadStore } from '../state/dreadStore';

// ───────────────────────────────────────────────────────────────────────────
// CeilingDrips — Phase 6. You rode the waterfall down, and it followed you: thin
// streaks of water falling from the ceiling of the liminal level, resetting to
// the top on a loop. Pure ambient dressing (no collision, no gameplay). Cheap +
// PS1: a handful of tiny elongated quads, flat basic material, no shadows. The
// dread layer makes it fall faster + heavier as unease rises.
// ───────────────────────────────────────────────────────────────────────────

type Bounds = { halfW: number; halfD: number; height: number };

const COUNT = 20;

export function CeilingDrips({ bounds }: { bounds: Bounds }) {
  const { halfW, halfD, height } = bounds;

  // Each drip: a position, a fall speed, and a length. Seeded once; recycled to
  // the ceiling (with a fresh x/z) when it reaches the floor.
  const drips = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: (Math.random() * 2 - 1) * (halfW - 0.6),
        z: (Math.random() * 2 - 1) * (halfD - 0.6),
        y: Math.random() * height,
        speed: 1.4 + Math.random() * 1.8,
        len: 0.35 + Math.random() * 0.5,
      })),
    [halfW, halfD, height],
  );

  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#cdeef6', transparent: true, opacity: 0.72 }),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const unease = useDreadStore.getState().unease;
    const boost = 1 + unease * 1.4; // falls faster + more insistent as it curdles
    for (let i = 0; i < drips.length; i++) {
      const d = drips[i];
      d.y -= d.speed * boost * dt;
      if (d.y < 0.05) {
        d.y = height - 0.05;
        d.x = (Math.random() * 2 - 1) * (halfW - 0.6);
        d.z = (Math.random() * 2 - 1) * (halfD - 0.6);
      }
      const m = refs.current[i];
      if (m) m.position.set(d.x, d.y, d.z);
    }
  });

  return (
    <group>
      {drips.map((d, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          material={mat}
          position={[d.x, d.y, d.z]}
        >
          <boxGeometry args={[0.045, d.len, 0.045]} />
        </mesh>
      ))}
    </group>
  );
}
