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
      Array.from({ length: COUNT }, () => {
        const len = 0.35 + Math.random() * 0.5;
        return {
          x: (Math.random() * 2 - 1) * (halfW - 0.6),
          z: (Math.random() * 2 - 1) * (halfD - 0.6),
          // y is the box CENTRE; seed in [len/2, height - len/2] so the whole
          // streak stays between floor and ceiling on first paint (no clip at
          // either end).
          y: len / 2 + Math.random() * (height - len),
          speed: 1.4 + Math.random() * 1.8,
          len,
        };
      }),
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
      // Recycle once the drip's BOTTOM (y - len/2) reaches the floor — y is the
      // box centre, so a fixed epsilon would let long streaks dip below first.
      if (d.y - d.len / 2 < 0) {
        // Recycle to JUST under the ceiling: y is the box centre, so start at
        // height - len/2 (top flush with the ceiling, never poking through).
        d.y = height - d.len / 2 - 0.02;
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
