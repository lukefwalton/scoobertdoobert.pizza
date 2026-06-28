import { useMemo } from 'react';
import * as THREE from 'three';
import { flatMat, makeBilingualSign } from './ps1';
import { useDispose } from '../lib/useDispose';
import { PizzaPanChimes } from './PizzaPanChimes';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// KitchenRoom — the pizza shop's back-of-house, behind the counter ("EMPLOYEES
// ONLY", off the shop's -X wall). A warm, goofy SURFACE relief room (stays sweet,
// taste guardrail): a stainless prep counter, a glowing brick oven, stacked dough
// boxes, pots hanging from a rail — and, against the back wall, a rack of tuned
// PIZZA PANS you can play (the shipped PizzaPanChimes). It's the site's thesis at
// its source: a pizza shop that is secretly a music project, so the kitchen itself
// makes music. Original parody geometry (PS1 flat-shaded); the only words are a
// bilingual 厨房 / KITCHEN plaque (EN + JP, like the rest of the world).
// ───────────────────────────────────────────────────────────────────────────

export function KitchenRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;

  const signTex = useMemo(
    () =>
      makeBilingualSign('厨房', 'KITCHEN', {
        bg: '#2a1a10',
        accent: '#e2a13b',
        jpColor: '#ffe2a8',
        enColor: '#e8b66a',
      }),
    [],
  );
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }),
    [signTex],
  );
  // The oven mouth glows (unlit emissive so it reads as fire against the warm room).
  const fireMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff8a3a' }), []);
  // Lit (flatMat = Lambert) surfaces — warm tungsten kitchen.
  const floorMat = useMemo(() => flatMat('#c9b78f'), []);
  const wallMat = useMemo(() => flatMat('#e3d6bd'), []);
  const ceilMat = useMemo(() => flatMat('#d6c8ae'), []);
  const steelMat = useMemo(() => flatMat('#b6bcc2'), []); // the prep counter
  const ovenMat = useMemo(() => flatMat('#6b4a36'), []); // brick oven body
  const doughMat = useMemo(() => flatMat('#ecdcb4'), []); // dough boxes
  const potMat = useMemo(() => flatMat('#2c2926'), []); // hanging pots + rail

  useDispose(
    signTex,
    signMat,
    fireMat,
    floorMat,
    wallMat,
    ceilMat,
    steelMat,
    ovenMat,
    doughMat,
    potMat,
  );

  return (
    <group>
      {/* warm back-of-house light — flatMat is lit, so the room needs it; the oven
          adds a hot point glow. Bright + cozy, never harsh (sweet surface room). */}
      <ambientLight intensity={0.8} color="#ffe9c8" />
      <hemisphereLight args={['#fff1d6', '#6b5a3e', 0.5]} />
      <directionalLight position={[3, 8, 4]} intensity={0.5} color="#ffe0b0" />
      <pointLight position={[-W + 2, 1.6, -D + 2]} intensity={0.9} distance={12} color="#ff9a4a" />

      {/* floor + ceiling */}
      <mesh material={floorMat} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      <mesh material={ceilMat} rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>

      {/* four walls */}
      {(
        [
          [0, H / 2, -D, W * 2, 0],
          [0, H / 2, D, W * 2, 0],
          [-W, H / 2, 0, D * 2, Math.PI / 2],
          [W, H / 2, 0, D * 2, Math.PI / 2],
        ] as const
      ).map(([x, y, z, len, r], i) => (
        <mesh key={i} material={wallMat} position={[x, y, z]} rotation={[0, r, 0]}>
          <planeGeometry args={[len, H]} />
        </mesh>
      ))}

      {/* the brick oven in the back-left corner — a chunky body with a glowing
          arched mouth (the hot point light above sits in it) */}
      <group position={[-W + 2, 0, -D + 1.4]}>
        <mesh material={ovenMat} position={[0, 1.1, 0]}>
          <boxGeometry args={[3, 2.2, 2]} />
        </mesh>
        <mesh material={ovenMat} position={[0, 2.5, 0]}>
          <boxGeometry args={[0.5, 0.9, 0.5]} />
        </mesh>
        {/* the fire mouth (emissive), facing +Z into the room */}
        <mesh material={fireMat} position={[0, 0.9, 1.01]}>
          <planeGeometry args={[1.8, 1.0]} />
        </mesh>
      </group>

      {/* a long stainless prep counter along the +Z (entry) wall side */}
      <mesh material={steelMat} position={[1.5, 0.9, D - 1]}>
        <boxGeometry args={[W, 0.18, 1.2]} />
      </mesh>
      <mesh material={steelMat} position={[1.5, 0.45, D - 1]}>
        <boxGeometry args={[W - 0.4, 0.9, 1.0]} />
      </mesh>
      {/* stacked dough boxes on the counter */}
      {[
        [-1.5, 1.1],
        [-0.6, 1.1],
        [-1.05, 1.45],
        [2.6, 1.1],
      ].map(([x, y], i) => (
        <mesh key={i} material={doughMat} position={[x, y, D - 1]}>
          <boxGeometry args={[0.7, 0.3, 0.7]} />
        </mesh>
      ))}

      {/* a pot rail across the ceiling with a few hanging pots (decorative) */}
      <mesh material={potMat} position={[0, H - 0.4, 1.5]}>
        <boxGeometry args={[W * 1.4, 0.08, 0.08]} />
      </mesh>
      {[-3, -1.4, 0.2, 1.8, 3.2].map((x, i) => (
        <group key={i} position={[x, 0, 1.5]}>
          <mesh material={potMat} position={[0, H - 0.85, 0]}>
            <cylinderGeometry args={[0.26, 0.22, 0.5, 10]} />
          </mesh>
          <mesh material={potMat} position={[0, H - 0.55, 0]}>
            <boxGeometry args={[0.02, 0.5, 0.02]} />
          </mesh>
        </group>
      ))}

      {/* the bilingual plaque over the way back to the shop (+X wall) */}
      <mesh material={signMat} position={[W - 0.1, 2.9, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 1.0]} />
      </mesh>

      {/* the playable tuned pizza-pan rack against the back (-X) wall — the thesis,
          made playable, at its source. Reuses the shipped instrument. */}
      <PizzaPanChimes position={[-W + 0.9, 0, 1]} rotationY={Math.PI / 2} />
    </group>
  );
}
