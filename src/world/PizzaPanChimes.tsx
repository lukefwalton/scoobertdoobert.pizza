import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';
import { useDispose } from '../lib/useDispose';
import { flatMat } from './ps1';

// ───────────────────────────────────────────────────────────────────────────
// PizzaPanChimes — the "play it" instrument for the Boardwalk: a market-stall
// rack of tuned PIZZA PANS you strike to play a pentatonic run (no wrong notes).
// It's the site's whole thesis made playable — a pizza shop that's secretly a
// music project, so the pans literally bridge pizza → sound. Bigger pan = lower
// note (left → right ascends). Each strike rings a bell-pluck through the shared
// audio engine (mute-aware + brickwall-limited, so it respects global mute and
// stays WCAG/ear safe) and swings the pan. Original parody geometry, no model.
// Mirrors GreekLyre (the Sunken Gallery's lyre) — the surface, sweet counterpart.
// ───────────────────────────────────────────────────────────────────────────

// Six pans, low → high, a C major pentatonic ladder (C D E G A C') — naturals
// only, so any strum sounds consonant.
const PANS: { note: string; octave: number }[] = [
  { note: 'C', octave: 4 },
  { note: 'D', octave: 4 },
  { note: 'E', octave: 4 },
  { note: 'G', octave: 4 },
  { note: 'A', octave: 4 },
  { note: 'C', octave: 5 },
];
const FREQS = PANS.map((p) => noteToFreq(p.note, p.octave));
const N = PANS.length;

const SPAN = 1.6; // rack width the pans hang across
const BAR_Y = 1.7; // crossbar height (pans hang to a comfy strike height)
const WIRE = 0.28; // hang-wire length
// Largest (lowest) pan on the left → smallest (highest) on the right.
const radiusFor = (i: number) => 0.4 - (i / (N - 1)) * 0.16; // 0.40 → 0.24

export function PizzaPanChimes({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const { gl } = useThree();
  // Per-pan strike energy (0..1), decayed each frame → the swing + glow.
  const energy = useRef<number[]>(PANS.map(() => 0));
  const panRefs = useRef<(THREE.Group | null)[]>([]);

  const frameMat = useMemo(() => flatMat('#6b4a2c'), []); // wooden stall rack
  const wireMat = useMemo(() => flatMat('#3a3a3a'), []); // dark hang wire
  // One material per pan so a strike can brighten just that one's emissive.
  const panMats = useMemo(
    () =>
      PANS.map(() => {
        const m = flatMat('#c4c8d0'); // aluminium pizza pan
        // a bright self-lit base so the pan reads as metal even though its
        // camera-facing cap sits away from the (behind-it) golden-hour sun.
        m.emissive.set('#7a7e88');
        return m;
      }),
    [],
  );
  const rimMats = useMemo(() => PANS.map(() => flatMat('#9aa0aa')), []); // darker rim

  useDispose(frameMat, wireMat, ...panMats, ...rimMats);

  // Restore the canvas cursor on teardown so a room exit mid-hover can't leave the
  // pizza cursor stuck on the chimes (cf. ItemPickup).
  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  // A deterministic strike-by-index hook (?world / ?debug): clicking a pan in 3D
  // through Playwright is camera-fragile (cf. ItemPickup's pickup hook), so the
  // boardwalk smoke drives this. The real pointer click stays the player's path.
  useEffect(() => {
    exposeTestGlobal('__sdpStrikePan', (i: number) => {
      const k = Number(i) | 0;
      if (k >= 0 && k < N) strike(k);
    });
    return () => {
      exposeTestGlobal('__sdpStrikePan', undefined);
      exposeTestGlobal('__sdpPans', undefined); // clear last-strike state on teardown
    };
  }, []);

  const panX = (i: number) => -SPAN / 2 + (i / (N - 1)) * SPAN;

  const strike = (i: number) => {
    energy.current[i] = 1;
    // A short metallic ring (the world's instrument voice), panned L→R across the
    // rack so a sweep reads stereo. No-op when muted / before the first gesture.
    audio.playChime(FREQS[i], (i / (N - 1)) * 1.4 - 0.7, 0.18, 0.9);
    exposeTestGlobal('__sdpPans', { i, note: PANS[i].note, octave: PANS[i].octave });
  };

  // r3f renders every frame (default frameloop), so these imperative mutations
  // animate on their own — no per-frame React re-render needed to drive them.
  useFrame((_, dt) => {
    for (let i = 0; i < N; i++) {
      const e = energy.current[i];
      const g = panRefs.current[i];
      if (e > 0.001) {
        energy.current[i] = Math.max(0, e - dt * 1.6);
        // swing about the hang point, damped by the remaining energy
        if (g) g.rotation.z = Math.sin(performance.now() * 0.012 + i) * 0.22 * energy.current[i];
        // brighten the struck pan from its aluminium base toward white
        (panMats[i].emissive as THREE.Color).setRGB(
          0.48 + e * 0.5,
          0.49 + e * 0.5,
          0.53 + e * 0.47,
        );
      } else if (g && g.rotation.z !== 0) {
        g.rotation.z = 0;
        (panMats[i].emissive as THREE.Color).setRGB(0.48, 0.49, 0.53);
      }
    }
  });

  return (
    <group position={position} rotation-y={rotationY}>
      {/* two posts + a crossbar — a little market-stall rack the pans hang from */}
      <mesh material={frameMat} position={[-SPAN / 2 - 0.2, BAR_Y / 2, 0]}>
        <boxGeometry args={[0.12, BAR_Y, 0.12]} />
      </mesh>
      <mesh material={frameMat} position={[SPAN / 2 + 0.2, BAR_Y / 2, 0]}>
        <boxGeometry args={[0.12, BAR_Y, 0.12]} />
      </mesh>
      <mesh material={frameMat} position={[0, BAR_Y, 0]}>
        <boxGeometry args={[SPAN + 0.6, 0.12, 0.12]} />
      </mesh>

      {/* the pans — each strikable. A wide invisible hit-box wraps the disc so it's
          easy to click; the visible disc faces the player, a rim ring reads it as a
          pan. The per-pan group pivots at the crossbar so a strike swings it. */}
      {PANS.map((p, i) => {
        const R = radiusFor(i);
        const x = panX(i);
        const panY = -WIRE - R; // hangs below the crossbar
        return (
          <group
            key={`${p.note}${p.octave}-${i}`}
            position={[x, BAR_Y, 0]}
            ref={(g) => (panRefs.current[i] = g)}
          >
            {/* hang wire */}
            <mesh material={wireMat} position={[0, -WIRE / 2, 0]}>
              <boxGeometry args={[0.02, WIRE, 0.02]} />
            </mesh>
            {/* the pan disc, round face toward the player */}
            <mesh material={panMats[i]} position={[0, panY, 0]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[R, R, 0.05, 20]} />
            </mesh>
            {/* a darker rim ring (a torus lies in XY → already faces +Z) */}
            <mesh material={rimMats[i]} position={[0, panY, 0.03]}>
              <torusGeometry args={[R * 0.92, 0.03, 6, 20]} />
            </mesh>
            {/* generous invisible hit target */}
            <mesh
              position={[0, panY, 0.06]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                strike(i);
              }}
              onPointerOver={() => (gl.domElement.style.cursor = "url('/cursor.cur'), pointer")}
              onPointerOut={() => (gl.domElement.style.cursor = 'grab')}
            >
              <boxGeometry args={[R * 2, R * 2, 0.14]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
