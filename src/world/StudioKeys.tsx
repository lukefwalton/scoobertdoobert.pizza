import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';
import { useDispose } from '../lib/useDispose';
import { flatMat } from './ps1';

// ───────────────────────────────────────────────────────────────────────────
// StudioKeys — the melody half of the Live Room's "play it" pair (the drum kit is
// the rhythm). A little tabletop keyboard: eight white keys tuned to a C-pentatonic
// run (no wrong notes), each one you click to PLAY — it dips, brightens, and sounds
// a bell-pluck through the shared engine (mute-aware + brickwall-limited). Black-key
// nubs are decorative (the pentatonic lives on the whites, so any mash sounds nice).
// Mirrors GreekLyre/PizzaPanChimes: procedural geometry + invisible hit-targets +
// per-key energy decay (no per-frame React churn) + a test hook + teardown cleanup.
// ───────────────────────────────────────────────────────────────────────────

const KEYS: { note: string; octave: number }[] = [
  { note: 'C', octave: 4 },
  { note: 'D', octave: 4 },
  { note: 'E', octave: 4 },
  { note: 'G', octave: 4 },
  { note: 'A', octave: 4 },
  { note: 'C', octave: 5 },
  { note: 'D', octave: 5 },
  { note: 'E', octave: 5 },
];
const FREQS = KEYS.map((k) => noteToFreq(k.note, k.octave));
const N = KEYS.length;

const KEY_W = 0.26; // white-key width
const KEY_GAP = 0.03;
const KEY_LEN = 0.9; // depth (toward the player)
const SPAN = N * KEY_W + (N - 1) * KEY_GAP;
// black-key nubs sit between certain whites (decorative only)
const BLACK_AFTER = [0, 1, 3, 4, 5];

export function StudioKeys({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const { gl } = useThree();
  const energy = useRef<number[]>(KEYS.map(() => 0));
  const keyRefs = useRef<(THREE.Group | null)[]>([]);

  const bodyMat = useMemo(() => flatMat('#1c1c22'), []); // keyboard chassis
  const standMat = useMemo(() => flatMat('#241a12'), []); // wooden stand
  const blackMat = useMemo(() => flatMat('#0c0c10'), []);
  const whiteMats = useMemo(
    () =>
      KEYS.map(() => {
        const m = flatMat('#efeae0'); // ivory
        m.emissive.set('#3a3833');
        return m;
      }),
    [],
  );

  useDispose(bodyMat, standMat, blackMat, ...whiteMats);

  const keyX = (i: number) => -SPAN / 2 + KEY_W / 2 + i * (KEY_W + KEY_GAP);

  const play = (i: number) => {
    energy.current[i] = 1;
    audio.playChime(FREQS[i], (i / (N - 1)) * 1.2 - 0.6, 0.18, 0.55);
    exposeTestGlobal('__sdpKeys', { i, note: KEYS[i].note, octave: KEYS[i].octave });
  };

  // Deterministic play-by-index hook (?world / ?debug) for the smoke.
  useEffect(() => {
    exposeTestGlobal('__sdpPlayKey', (i: number) => {
      const k = Number(i) | 0;
      if (k >= 0 && k < N) play(k);
    });
    return () => {
      exposeTestGlobal('__sdpPlayKey', undefined);
      exposeTestGlobal('__sdpKeys', undefined);
    };
  }, []);

  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  useFrame((_, dt) => {
    for (let i = 0; i < N; i++) {
      const e = energy.current[i];
      const g = keyRefs.current[i];
      if (e > 0.001) {
        energy.current[i] = Math.max(0, e - dt * 3.4);
        const ne = energy.current[i];
        if (g) g.rotation.x = 0.16 * ne; // the key dips at the far end
        (whiteMats[i].emissive as THREE.Color).setRGB(
          0.23 + e * 0.6,
          0.22 + e * 0.6,
          0.2 + e * 0.5,
        );
      } else if (g && g.rotation.x !== 0) {
        g.rotation.x = 0;
        (whiteMats[i].emissive as THREE.Color).setRGB(0.227, 0.22, 0.2);
      }
    }
  });

  return (
    <group position={position} rotation-y={rotationY}>
      {/* a wooden stand */}
      <mesh material={standMat} position={[0, 0.45, 0]}>
        <boxGeometry args={[SPAN + 0.5, 0.9, KEY_LEN + 0.2]} />
      </mesh>
      {/* the keyboard chassis on top */}
      <mesh material={bodyMat} position={[0, 0.96, 0]}>
        <boxGeometry args={[SPAN + 0.3, 0.12, KEY_LEN + 0.16]} />
      </mesh>

      {/* white keys — each pivots at its BACK edge so a press dips the front */}
      {KEYS.map((k, i) => {
        const x = keyX(i);
        return (
          <group key={`${k.note}${k.octave}-${i}`} position={[x, 1.04, -KEY_LEN / 2]}>
            <group ref={(g) => (keyRefs.current[i] = g)}>
              <mesh material={whiteMats[i]} position={[0, 0, KEY_LEN / 2]}>
                <boxGeometry args={[KEY_W, 0.05, KEY_LEN]} />
              </mesh>
              {/* invisible hit target over the key */}
              <mesh
                position={[0, 0.06, KEY_LEN / 2]}
                onClick={(e: ThreeEvent<MouseEvent>) => {
                  e.stopPropagation();
                  play(i);
                }}
                onPointerOver={() => (gl.domElement.style.cursor = "url('/cursor.cur'), pointer")}
                onPointerOut={() => (gl.domElement.style.cursor = 'grab')}
              >
                <boxGeometry args={[KEY_W + KEY_GAP, 0.18, KEY_LEN]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* decorative black-key nubs (not played) */}
      {BLACK_AFTER.map((i) => (
        <mesh
          key={`blk-${i}`}
          material={blackMat}
          position={[keyX(i) + (KEY_W + KEY_GAP) / 2, 1.09, -KEY_LEN / 2 + 0.28]}
        >
          <boxGeometry args={[KEY_W * 0.6, 0.07, KEY_LEN * 0.6]} />
        </mesh>
      ))}
    </group>
  );
}
