import { useMemo } from 'react';
import * as THREE from 'three';
import { flatMat, makeGrassTexture, seededRandom } from './ps1';
import { useDispose } from '../lib/useDispose';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GrassRoom — the "tall grass" off the shrine's torii (Luke). An overgrown lot
// under the shrine's golden-hour haze: a worn dirt path in, knee-high grass you
// wade through (crossed alpha quads, PS1), a few mossy stones and trees melting
// into the fog. SWEET surface space (taste guardrail). Wade to the far edge and
// the trodden path on into the grove is right there (rooms/japan.ts).
// (2026-10: the wild-goblin ambush that used to ride on this field — and its
// battle room — were cut; the dice pit is the one dice fight.)
// ───────────────────────────────────────────────────────────────────────────

type Tuft = { x: number; z: number; s: number; r: number };

export function GrassRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;

  const grassTex = useMemo(makeGrassTexture, []);
  const grassMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: grassTex,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
      }),
    [grassTex],
  );
  const groundMat = useMemo(() => flatMat('#5c7f3a'), []);
  const pathMat = useMemo(() => flatMat('#a98f57'), []);
  const toriiMat = useMemo(() => flatMat('#b3492f'), []);
  const rockMat = useMemo(() => flatMat('#8d8b84'), []);
  const trunkMat = useMemo(() => flatMat('#6b4f32'), []);
  const leafMat = useMemo(() => flatMat('#4f7233'), []);
  useDispose(grassTex, grassMat, groundMat, pathMat, toriiMat, rockMat, trunkMat, leafMat);

  // Scatter tufts on a jittered grid; keep a clear strip down the entrance path
  // (+Z, x≈0) so you can walk in, and another at the far (-Z) edge where the
  // trodden path leads on into the grove.
  const tufts = useMemo<Tuft[]>(() => {
    const out: Tuft[] = [];
    const rnd = seededRandom(90210);
    for (let gx = -W + 1; gx <= W - 1; gx += 1.45) {
      for (let gz = -D + 1; gz <= D - 1; gz += 1.45) {
        const x = gx + (rnd() - 0.5) * 1.0;
        const z = gz + (rnd() - 0.5) * 1.0;
        if (Math.abs(x) < 1.6 && z > 6) continue; // keep the entrance path walkable
        if (Math.abs(x) < 1.6 && z < -D + 5) continue; // …and the far path to the grove
        out.push({ x, z, s: 0.65 + rnd() * 0.7, r: rnd() * Math.PI });
      }
    }
    return out;
  }, [W, D]);

  const rocks = useMemo(() => {
    const rnd = seededRandom(4242);
    return Array.from({ length: 7 }, () => ({
      x: (rnd() - 0.5) * (W - 2) * 2,
      z: (rnd() - 0.5) * (D - 4) * 2,
      s: 0.4 + rnd() * 0.6,
    }));
  }, [W, D]);

  const toriiH = 3.6;
  const toriiPx = 1.5;

  return (
    <group>
      {/* warm golden-hour outdoor light — flatMat is MeshLambertMaterial (lit),
          so without this the ground/torii/trees render black. */}
      <ambientLight intensity={0.75} color="#ffedd0" />
      <hemisphereLight args={['#ffe6b0', '#3f5a28', 0.55]} />
      <directionalLight position={[7, 11, 5]} intensity={0.85} color="#ffd9a0" />

      {/* ground (extends past the camera clamp, dissolving into fog) + a worn dirt
          path leading in from the entrance torii, and a second trodden strip out
          the far edge toward the grove */}
      <mesh material={groundMat} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 8, D * 2 + 8]} />
      </mesh>
      <mesh material={pathMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, D - 4]}>
        <planeGeometry args={[2.4, 9]} />
      </mesh>
      <mesh material={pathMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -D + 3]}>
        <planeGeometry args={[2.0, 7]} />
      </mesh>

      {/* the entrance torii (the way back to the shrine) near the +Z edge */}
      <group position={[0, 0, D - 1]}>
        <mesh material={toriiMat} position={[-toriiPx, toriiH / 2, 0]}>
          <boxGeometry args={[0.24, toriiH, 0.24]} />
        </mesh>
        <mesh material={toriiMat} position={[toriiPx, toriiH / 2, 0]}>
          <boxGeometry args={[0.24, toriiH, 0.24]} />
        </mesh>
        <mesh material={toriiMat} position={[0, toriiH - 0.16, 0]}>
          <boxGeometry args={[toriiPx * 2 + 1.2, 0.22, 0.32]} />
        </mesh>
        <mesh material={toriiMat} position={[0, toriiH * 0.72, 0]}>
          <boxGeometry args={[toriiPx * 2 + 0.5, 0.16, 0.26]} />
        </mesh>
      </group>

      {/* tall grass — crossed alpha quads, knee-to-waist high */}
      {tufts.map((t, i) => (
        <group key={i} position={[t.x, t.s * 0.5, t.z]} rotation={[0, t.r, 0]}>
          <mesh material={grassMat}>
            <planeGeometry args={[t.s * 0.9, t.s]} />
          </mesh>
          <mesh material={grassMat} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[t.s * 0.9, t.s]} />
          </mesh>
        </group>
      ))}

      {/* a few mossy stones */}
      {rocks.map((r, i) => (
        <mesh key={i} material={rockMat} position={[r.x, r.s * 0.35, r.z]} rotation={[r.x, r.z, 0]}>
          <icosahedronGeometry args={[r.s, 0]} />
        </mesh>
      ))}

      {/* a couple of simple trees at the far corners (trunk + a blocky canopy) */}
      {(
        [
          [-W + 1.5, -D + 2],
          [W - 1.5, -D + 2.5],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={trunkMat} position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.28, 0.42, 2.8, 6]} />
          </mesh>
          <mesh material={leafMat} position={[0, 3.4, 0]}>
            <icosahedronGeometry args={[1.7, 0]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
