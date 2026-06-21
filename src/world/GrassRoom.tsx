import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { flatMat } from './ps1';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GrassRoom — the "tall grass" off the shrine's torii (Luke). An overgrown lot
// under the shrine's golden-hour haze: a worn dirt path in, knee-high grass you
// wade through (crossed alpha quads, PS1), a few mossy stones and trees melting
// into the fog. SWEET surface space (taste guardrail). The wild-goblin encounter
// + the screen-to-black battle ride on top of this in a later slice; this is the
// field + its way back to the shrine.
// ───────────────────────────────────────────────────────────────────────────

// A grass-blade sprite — a clump of green verticals on transparent, 32px +
// NearestFilter (PS1). Two crossed quads of it read as a tuft of tall grass.
function makeGrassTexture(): THREE.Texture {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, s, s);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    const blades: [string, number][] = [
      ['#6f9a3e', 7],
      ['#83b24a', 13],
      ['#5f8a36', 19],
      ['#8fc056', 25],
    ];
    for (const [col, x] of blades) {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, s);
      ctx.quadraticCurveTo(x + (x < s / 2 ? -3 : 3), s * 0.45, x + (x < s / 2 ? -2 : 2), 3);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// Tiny seeded LCG so the scatter is STABLE across frames/reloads (never reshuffles).
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
}

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
  useEffect(
    () => () => {
      grassTex.dispose();
      [grassMat, groundMat, pathMat, toriiMat, rockMat, trunkMat, leafMat].forEach((m) =>
        m.dispose(),
      );
    },
    [grassTex, grassMat, groundMat, pathMat, toriiMat, rockMat, trunkMat, leafMat],
  );

  // Scatter tufts on a jittered grid; keep a clear strip down the entrance path
  // (+Z, x≈0) so you can walk in.
  const tufts = useMemo<Tuft[]>(() => {
    const out: Tuft[] = [];
    const rnd = lcg(90210);
    for (let gx = -W + 1; gx <= W - 1; gx += 1.45) {
      for (let gz = -D + 1; gz <= D - 1; gz += 1.45) {
        const x = gx + (rnd() - 0.5) * 1.0;
        const z = gz + (rnd() - 0.5) * 1.0;
        if (Math.abs(x) < 1.6 && z > 6) continue; // keep the entrance path walkable
        out.push({ x, z, s: 0.65 + rnd() * 0.7, r: rnd() * Math.PI });
      }
    }
    return out;
  }, [W, D]);

  const rocks = useMemo(() => {
    const rnd = lcg(4242);
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
          path leading in from the entrance torii */}
      <mesh material={groundMat} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 8, D * 2 + 8]} />
      </mesh>
      <mesh material={pathMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, D - 4]}>
        <planeGeometry args={[2.4, 9]} />
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
