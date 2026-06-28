import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CulturesSim } from '../lib/cultures';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';

// ───────────────────────────────────────────────────────────────────────────
// CultureMotes — the /cultures instrument reused as living in-world ambience (the
// "cultures equivalent of the furin"). A small colony of glowing plankton drifts
// on the pool's surface; the cells are pulled toward YOU as you move (the sim's
// pointer attractor driven by the camera), so wandering through stirs them, and
// when two touch they bloom a soft note through the shared engine (audio.playColony
// — src/lib/cultures synthesis re-homed onto the world mix). Sweet, sparse,
// mute-aware, limiter-safe. Pure additive dressing — no collision/gameplay.
// ───────────────────────────────────────────────────────────────────────────

type Bounds = { halfW: number; halfD: number; height: number };

export function CultureMotes({ bounds }: { bounds: Bounds }) {
  const { camera } = useThree();
  const sim = useMemo(() => {
    const s = new CulturesSim();
    s.params.speed = 0.6; // slow, drifting
    s.params.attraction = 1.2;
    return s;
  }, []);

  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const pingCd = useRef(0);
  const mats = useMemo(
    () =>
      sim.cells.map((c) => {
        const m = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        m.color.setRGB(c.color[0] / 255, c.color[1] / 255, c.color[2] / 255);
        return m;
      }),
    [sim],
  );
  useDispose(...mats);

  // The colony drifts at roughly chest height over an 80% footprint of the room —
  // glowing spirit-orbs you can see clearly and that lean toward you as you move.
  const spanX = bounds.halfW * 1.6;
  const spanZ = bounds.halfD * 1.6;
  const Y = 1.1;

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // Lean toward the player: map the camera's x/z into the sim's 0..1 space, but
    // BIAS toward room centre (×0.4) so the colony drifts out in view and only
    // leans your way, instead of swarming onto the camera (behind the view).
    const px = camera.position.x / Math.max(0.001, spanX * 2) + 0.5;
    const pz = camera.position.z / Math.max(0.001, spanZ * 2) + 0.5;
    sim.pointer = {
      x: 0.5 + (Math.max(0, Math.min(1, px)) - 0.5) * 0.4,
      y: 0.5 + (Math.max(0, Math.min(1, pz)) - 0.5) * 0.4,
      active: true,
    };

    pingCd.current -= dt;
    const collisions = sim.step(dt);
    if (pingCd.current <= 0 && collisions.length > 0) {
      const col = collisions[0];
      audio.playColony(col.freq * 0.5, col.pan, 0.07); // an octave down — a drone bloom
      pingCd.current = 0.18;
    }

    const t = performance.now() * 0.001;
    for (let i = 0; i < sim.cells.length; i++) {
      const c = sim.cells[i];
      const m = refs.current[i];
      if (m) {
        m.position.set(
          (c.x - 0.5) * spanX * 2,
          Y + Math.sin(t * 0.8 + i * 1.7) * 0.12,
          (c.y - 0.5) * spanZ * 2,
        );
        const s = 1 + Math.sin(t * 1.3 + i) * 0.12; // gentle breathing
        m.scale.setScalar(s);
      }
    }
  });

  return (
    <group>
      {sim.cells.map((_, i) => (
        <mesh
          key={i}
          material={mats[i]}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.24, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}
