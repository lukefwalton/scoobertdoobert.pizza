import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useScoreStore } from '../state/scoreStore';
import { flatMat } from './ps1';
import { lootById } from '../data/loot';
import { collectLootById } from '../lib/loot';
import { emitBurst } from './burstBus';

// Per-KIND low-poly art so a pizza slice, a surfboard, and a burrito each read at a
// glance (PS1 primitives + flat materials, a faint emissive accent so loot glints
// "grab me"). Built once per type, disposed on unmount; the parent group bobs+spins.
function useLootArt(typeId: string) {
  return useMemo(() => {
    const type = lootById(typeId);
    const mats: THREE.Material[] = [];
    const mk = (color: string, emissive = '#000000') => {
      const m = flatMat(color);
      m.emissive.set(emissive);
      mats.push(m);
      return m;
    };
    const body = mk(type?.color ?? '#e8b44a', type?.color ?? '#e8b44a');
    body.emissiveIntensity = 0.25;
    const accent = mk(type?.accent ?? '#c0391f', type?.accent ?? '#c0391f');
    accent.emissiveIntensity = 0.3;

    const build = () => {
      switch (typeId) {
        case 'pizza':
          // a flat triangular wedge — crust body + a sauce-red tip dot.
          return (
            <group rotation={[0, 0, 0]}>
              <mesh material={body} rotation={[0, Math.PI / 6, 0]}>
                <cylinderGeometry args={[0.34, 0.34, 0.05, 3]} />
              </mesh>
              <mesh material={accent} position={[0, 0.04, 0.08]}>
                <boxGeometry args={[0.07, 0.03, 0.07]} />
              </mesh>
            </group>
          );
        case 'burrito':
          // a fat foil-wrapped cylinder on its side, one open end.
          return (
            <group rotation={[0, 0, Math.PI / 2]}>
              <mesh material={body}>
                <cylinderGeometry args={[0.12, 0.12, 0.42, 10]} />
              </mesh>
              <mesh material={accent} position={[0, 0.21, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 0.04, 10]} />
              </mesh>
            </group>
          );
        case 'sushi':
          // a rice cylinder with a salmon slab draped on top.
          return (
            <group>
              <mesh material={body}>
                <cylinderGeometry args={[0.17, 0.17, 0.16, 12]} />
              </mesh>
              <mesh material={accent} position={[0, 0.1, 0]}>
                <boxGeometry args={[0.3, 0.06, 0.2]} />
              </mesh>
            </group>
          );
        case 'skateboard':
          // a deck with a colored grip stripe + two wheels.
          return (
            <group>
              <mesh material={body}>
                <boxGeometry args={[0.55, 0.05, 0.17]} />
              </mesh>
              <mesh material={accent} position={[0, 0.03, 0]}>
                <boxGeometry args={[0.5, 0.012, 0.12]} />
              </mesh>
              <mesh material={accent} position={[-0.18, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
              </mesh>
              <mesh material={accent} position={[0.18, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
              </mesh>
            </group>
          );
        case 'surfboard':
        default:
          // a long tapered board with a center stripe.
          return (
            <group rotation={[Math.PI / 2.4, 0, 0]}>
              <mesh material={body} scale={[0.5, 1, 1]}>
                <cylinderGeometry args={[0.16, 0.06, 0.85, 8]} />
              </mesh>
              <mesh material={accent} position={[0, 0, 0.04]} scale={[0.12, 1, 1]}>
                <cylinderGeometry args={[0.16, 0.06, 0.85, 8]} />
              </mesh>
            </group>
          );
      }
    };
    return { node: build(), mats };
  }, [typeId]);
}

// A loot drop lying in the world. Walk onto it / press P / click to grab it (all
// funnel through collectLootById). Renders NOTHING once taken this run, so it
// vanishes the instant you grab it; the next descent restocks (taken is ephemeral).
export function LootPickup({
  id,
  type,
  position,
}: {
  id: string;
  type: string;
  position: [number, number, number];
}) {
  const { gl } = useThree();
  const taken = useScoreStore((s) => s.taken.includes(id));
  const group = useRef<THREE.Group>(null);
  const art = useLootArt(type);
  useEffect(() => () => art.mats.forEach((m) => m.dispose()), [art]);

  // Pop a collect burst the instant it's taken — by ANY path (click / walk-over /
  // P / the smoke hook), since they all flip `taken`. Fires once on the
  // false→true edge, then the component unmounts; the burst lives on its own bus.
  const prevTaken = useRef(taken);
  useEffect(() => {
    if (taken && !prevTaken.current) emitBurst(position, lootById(type)?.color ?? '#e8b44a');
    prevTaken.current = taken;
  }, [taken, position, type]);

  // Idle bob + slow spin — the universal "this is loot" language.
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = position[1] + Math.sin(t * 2 + position[0]) * 0.12;
    group.current.rotation.y = t * 1.1;
  });

  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  if (taken) return null;

  return (
    <group
      ref={group}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        collectLootById(id);
        gl.domElement.style.cursor = 'grab';
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      {/* a generous invisible hit target so the thin shapes stay easy to click */}
      <mesh>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {art.node}
    </group>
  );
}
