import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { exposeTestGlobal } from '../lib/testHooks';
import { useDispose } from '../lib/useDispose';
import { flatMat } from './ps1';

// ───────────────────────────────────────────────────────────────────────────
// DrumKit — the rhythm half of the Live Room's "play it" pair (the keys are the
// melody). A compact PS1 kit: kick, snare, two toms, hi-hat, crash. Each piece is
// strikable (click) and voices a TUNED low bell through the shared engine (the
// world has one synth voice — a bell — so the kit is stylised: low + short for the
// drums, high + ringing for the cymbals; it reads as a beat, not a real kit, which
// suits the all-synth aesthetic). Mute-aware + brickwall-limited like every voice.
// Mirrors PizzaPanChimes/GreekLyre: procedural geometry + invisible hit-targets +
// per-piece energy decay (no per-frame React churn) + a test hook.
// ───────────────────────────────────────────────────────────────────────────

type Piece = {
  key: string;
  label: string;
  freq: number; // Hz — low for drums, high for cymbals
  peak: number;
  decay: number; // playChime decayScale (short = drum, long = cymbal)
  pan: number;
  color: string;
  rim: string;
  // geometry: a disc (head/cymbal) of radius r, at [x,y,z], tilted by tilt (rad)
  x: number;
  y: number;
  z: number;
  r: number;
  tilt: number;
  cymbal?: boolean; // thin metal disc vs a drum shell
};

// A small kit fanned out facing the player (who arrives looking -Z). Drums sit low
// and forward; cymbals ride higher on the wings.
const PIECES: Piece[] = [
  {
    key: 'kick',
    label: 'kick',
    freq: 55,
    peak: 0.34,
    decay: 0.32,
    pan: 0,
    color: '#b23b2f',
    rim: '#e7d9b6',
    x: 0,
    y: 0.55,
    z: 0.5,
    r: 0.62,
    tilt: -1.15,
  }, // big head up, facing the floor-ish
  {
    key: 'snare',
    label: 'snare',
    freq: 196,
    peak: 0.24,
    decay: 0.22,
    pan: -0.15,
    color: '#d9d2c0',
    rim: '#9a8f6a',
    x: -1.0,
    y: 0.92,
    z: -0.1,
    r: 0.34,
    tilt: -1.2,
  },
  {
    key: 'tom1',
    label: 'tom 1',
    freq: 147,
    peak: 0.24,
    decay: 0.4,
    pan: 0.2,
    color: '#2f6db2',
    rim: '#e7d9b6',
    x: 0.55,
    y: 1.18,
    z: -0.35,
    r: 0.32,
    tilt: -0.8,
  },
  {
    key: 'tom2',
    label: 'tom 2',
    freq: 110,
    peak: 0.26,
    decay: 0.5,
    pan: 0.5,
    color: '#2f8fb2',
    rim: '#e7d9b6',
    x: 1.35,
    y: 0.78,
    z: -0.1,
    r: 0.42,
    tilt: -0.5,
  },
  {
    key: 'hat',
    label: 'hi-hat',
    freq: 880,
    peak: 0.14,
    decay: 0.16,
    pan: -0.5,
    color: '#c9b25a',
    rim: '#8a7a36',
    x: -1.7,
    y: 1.18,
    z: -0.2,
    r: 0.36,
    tilt: -0.18,
    cymbal: true,
  },
  {
    key: 'crash',
    label: 'crash',
    freq: 660,
    peak: 0.16,
    decay: 1.7,
    pan: 0.5,
    color: '#cdb968',
    rim: '#8a7a36',
    x: 1.6,
    y: 1.55,
    z: -0.5,
    r: 0.5,
    tilt: -0.22,
    cymbal: true,
  },
];
const N = PIECES.length;

export function DrumKit({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const { gl } = useThree();
  // Per-piece hit energy (0..1), decayed each frame → the bounce + glow.
  const energy = useRef<number[]>(PIECES.map(() => 0));
  const headRefs = useRef<(THREE.Group | null)[]>([]);

  const headMats = useMemo(
    () =>
      PIECES.map((p) => {
        const m = flatMat(p.color);
        // a bright-ish self-lit base so heads/cymbals read in the dim basement
        m.emissive.set(p.cymbal ? '#4a431f' : '#2a2118');
        return m;
      }),
    [],
  );
  const rimMats = useMemo(() => PIECES.map((p) => flatMat(p.rim)), []);
  const shellMat = useMemo(() => flatMat('#241a12'), []); // drum shells / stands
  const standMat = useMemo(() => flatMat('#1a1a1e'), []); // chrome-dark hardware

  useDispose(shellMat, standMat, ...headMats, ...rimMats);

  const hit = (i: number) => {
    energy.current[i] = 1;
    const p = PIECES[i];
    audio.playChime(p.freq, p.pan, p.peak, p.decay);
    exposeTestGlobal('__sdpDrum', { i, key: p.key, label: p.label });
  };

  // A deterministic hit-by-index hook (?world / ?debug) for the smoke — clicking a
  // 3D drum head is camera-fragile (cf. ItemPickup). The pointer click is the
  // player's path.
  useEffect(() => {
    exposeTestGlobal('__sdpHitDrum', (i: number) => {
      const k = Number(i) | 0;
      if (k >= 0 && k < N) hit(k);
    });
    return () => {
      exposeTestGlobal('__sdpHitDrum', undefined);
      exposeTestGlobal('__sdpDrum', undefined);
    };
  }, []);

  // Restore the cursor on teardown so a room exit mid-hover can't strand it.
  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  // r3f renders every frame (default frameloop) — the imperative mutations animate
  // on their own; no React re-render needed.
  useFrame((_, dt) => {
    for (let i = 0; i < N; i++) {
      const e = energy.current[i];
      const g = headRefs.current[i];
      if (e > 0.001) {
        energy.current[i] = Math.max(0, e - dt * (PIECES[i].cymbal ? 1.4 : 3.2));
        const ne = energy.current[i];
        if (g) {
          if (PIECES[i].cymbal) {
            // cymbals swing
            g.rotation.z = Math.sin(performance.now() * 0.02 + i) * 0.18 * ne;
          } else {
            // drum heads dip + flex when struck
            g.position.y = -0.06 * ne;
            g.scale.y = 1 - 0.18 * ne;
          }
        }
        (headMats[i].emissive as THREE.Color).setRGB(0.16 + e * 0.5, 0.13 + e * 0.5, 0.1 + e * 0.5);
      } else if (g && (g.position.y !== 0 || g.scale.y !== 1 || g.rotation.z !== 0)) {
        g.position.y = 0;
        g.scale.y = 1;
        g.rotation.z = 0;
        const base = PIECES[i].cymbal ? [0.29, 0.26, 0.12] : [0.16, 0.13, 0.1];
        (headMats[i].emissive as THREE.Color).setRGB(base[0], base[1], base[2]);
      }
    }
  });

  return (
    <group position={position} rotation-y={rotationY}>
      {/* a little rug so the kit reads as a set-up, not floating parts */}
      <mesh material={shellMat} position={[0, 0.02, -0.1]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[2.4, 20]} />
      </mesh>

      {PIECES.map((p, i) => (
        <group key={p.key} position={[p.x, 0, p.z]}>
          {/* a stand / leg down to the rug */}
          <mesh material={standMat} position={[0, p.y / 2, 0]}>
            <boxGeometry args={[0.06, p.y, 0.06]} />
          </mesh>
          {/* drum shell under a head (skip for cymbals) */}
          {!p.cymbal && (
            <mesh material={shellMat} position={[0, p.y - 0.18, 0]}>
              <cylinderGeometry args={[p.r * 0.94, p.r * 0.9, 0.36, 16]} />
            </mesh>
          )}
          {/* the struck head/cymbal — pivots so the bounce/swing reads */}
          <group ref={(g) => (headRefs.current[i] = g)} position={[0, p.y, 0]} rotation-x={p.tilt}>
            <mesh material={headMats[i]}>
              <cylinderGeometry args={[p.r, p.r, p.cymbal ? 0.02 : 0.06, 16]} />
            </mesh>
            {/* rim ring */}
            <mesh material={rimMats[i]} position={[0, p.cymbal ? 0.012 : 0.035, 0]}>
              <torusGeometry args={[p.r * 0.97, 0.022, 6, 16]} />
            </mesh>
            {/* generous invisible hit target */}
            <mesh
              position={[0, 0.1, 0]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                hit(i);
              }}
              onPointerOver={() => (gl.domElement.style.cursor = "url('/cursor.cur'), pointer")}
              onPointerOut={() => (gl.domElement.style.cursor = 'grab')}
            >
              <cylinderGeometry args={[p.r + 0.12, p.r + 0.12, 0.3, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
