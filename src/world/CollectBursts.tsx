import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { subscribeBursts } from './burstBus';

// The collect-burst renderer: a small fixed POOL of reusable particle bursts,
// driven off the R3F clock (never Date.now). Each burst is a flash + an expanding
// ring + a spray of sparks that fly outward (they ride the group's scale) and
// fade over ~0.5s. Emitting is decoupled (burstBus) so the pickup meshes — which
// unmount the instant they're taken — can still spawn a burst that outlives them,
// and every collect path gets the same juice. WCAG-safe: a single soft expand +
// fade per burst, no strobe, no full-field flash; and it only mounts inside the
// 3D world (already gated off reduced-motion / mobile).

const POOL = 10;
const DURATION = 0.55; // seconds per burst
const SPARKS = 7;

type Slot = { active: boolean; start: number };

export function CollectBursts() {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const slots = useRef<Slot[]>(Array.from({ length: POOL }, () => ({ active: false, start: 0 })));
  const next = useRef(0);
  const clock = useRef(0);

  // One material set per slot (opacity/colour animate independently per burst).
  const mats = useMemo(
    () =>
      Array.from({ length: POOL }, () => ({
        flash: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
        ring: new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
        spark: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
      })),
    [],
  );
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.34, 0.46, 18), []);
  const flashGeo = useMemo(() => new THREE.IcosahedronGeometry(0.16, 0), []);
  const sparkGeo = useMemo(() => new THREE.BoxGeometry(0.07, 0.07, 0.07), []);

  useEffect(
    () => () => {
      ringGeo.dispose();
      flashGeo.dispose();
      sparkGeo.dispose();
      for (const m of mats) {
        m.flash.dispose();
        m.ring.dispose();
        m.spark.dispose();
      }
    },
    [mats, ringGeo, flashGeo, sparkGeo],
  );

  useEffect(() => {
    return subscribeBursts(({ position, color }) => {
      const i = next.current;
      next.current = (next.current + 1) % POOL; // round-robin (a burst can preempt an old one)
      const g = groups.current[i];
      if (!g) return;
      g.position.set(position[0], position[1], position[2]);
      g.visible = true;
      mats[i].flash.color.set(color);
      mats[i].ring.color.set(color);
      mats[i].spark.color.set(color);
      slots.current[i] = { active: true, start: clock.current };
    });
  }, [mats]);

  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.05);
    for (let i = 0; i < POOL; i++) {
      const s = slots.current[i];
      const g = groups.current[i];
      if (!s.active || !g) continue;
      const u = (clock.current - s.start) / DURATION;
      if (u >= 1) {
        s.active = false;
        g.visible = false;
        continue;
      }
      // ease-out expand; opacity fades on a slightly faster curve so it clears clean
      const scale = 0.3 + (1 - (1 - u) * (1 - u)) * 1.5;
      g.scale.setScalar(scale);
      const op = Math.max(0, 1 - u * u);
      mats[i].flash.opacity = op;
      mats[i].ring.opacity = op * 0.9;
      mats[i].spark.opacity = op;
    }
  });

  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <group key={i} ref={(el) => (groups.current[i] = el)} visible={false}>
          <mesh geometry={flashGeo} material={mats[i].flash} />
          <mesh geometry={ringGeo} material={mats[i].ring} rotation={[-Math.PI / 2, 0, 0]} />
          {Array.from({ length: SPARKS }, (_, j) => {
            const a = (j / SPARKS) * Math.PI * 2;
            return (
              <mesh
                key={j}
                geometry={sparkGeo}
                material={mats[i].spark}
                position={[Math.cos(a) * 0.34, Math.sin(a * 1.7) * 0.12, Math.sin(a) * 0.34]}
              />
            );
          })}
        </group>
      ))}
    </>
  );
}
