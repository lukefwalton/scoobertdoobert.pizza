import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';
import { flatMat } from './ps1';

// ───────────────────────────────────────────────────────────────────────────
// StudioBass — the low end of the Live Room's "play it" band (drums = rhythm,
// keys = melody, bass = the bottom). A standing electric bass with four pluckable
// strings tuned to a LOW C-arpeggio (C2·E2·G2·C3) so it locks with the kit's pulse
// and the keys' C-pentatonic — any pluck, any combo, sounds like the same chord
// (no wrong notes). Each string you click PLUCKS: it shimmies, brightens, and sounds
// a long, low bell-pluck through the shared engine (mute-aware + brickwall-limited).
// Mirrors StudioKeys/DrumKit: procedural geometry + invisible hit-targets + per-
// string energy decay (no per-frame React churn) + a test hook + teardown cleanup.
// ───────────────────────────────────────────────────────────────────────────

const STRINGS: { note: string; octave: number }[] = [
  { note: 'C', octave: 2 },
  { note: 'E', octave: 2 },
  { note: 'G', octave: 2 },
  { note: 'C', octave: 3 },
];
const FREQS = STRINGS.map((s) => noteToFreq(s.note, s.octave));
const N = STRINGS.length;

const NECK_BOTTOM = 0.7; // strings start at the body
const NECK_TOP = 2.05; // …and run up to the headstock
const STR_LEN = NECK_TOP - NECK_BOTTOM;
const STR_MID = (NECK_TOP + NECK_BOTTOM) / 2;
const STR_GAP = 0.07; // lateral spacing across the neck

export function StudioBass({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const { gl } = useThree();
  const energy = useRef<number[]>(STRINGS.map(() => 0));
  const strRefs = useRef<(THREE.Mesh | null)[]>([]);

  const standMat = useMemo(() => flatMat('#241a12'), []); // wooden stand
  const bodyMat = useMemo(() => {
    const m = flatMat('#3a1f12'); // a warm sunburst-ish body
    m.emissive.set('#180c06');
    return m;
  }, []);
  const neckMat = useMemo(() => flatMat('#caa46a'), []); // maple neck
  const hwMat = useMemo(() => flatMat('#2a2a30'), []); // pickups / bridge / tuners
  const strMats = useMemo(
    () =>
      STRINGS.map(() => {
        const m = flatMat('#d8d2c0'); // wound steel
        m.emissive.set('#2c2a24');
        return m;
      }),
    [],
  );

  useEffect(
    () => () => {
      [standMat, bodyMat, neckMat, hwMat, ...strMats].forEach((m) => m.dispose());
    },
    [standMat, bodyMat, neckMat, hwMat, strMats],
  );

  const strX = (i: number) => (i - (N - 1) / 2) * STR_GAP;

  const pluck = (i: number) => {
    energy.current[i] = 1;
    // long, low sustain — bass rings on. Pan spread across the neck.
    audio.playChime(FREQS[i], (i / (N - 1)) * 0.8 - 0.4, 0.2, 1.5);
    exposeTestGlobal('__sdpBass', { i, note: STRINGS[i].note, octave: STRINGS[i].octave });
  };

  // Deterministic pluck-by-index hook (?world / ?debug) for the smoke.
  useEffect(() => {
    exposeTestGlobal('__sdpPluckBass', (i: number) => {
      const k = Number(i) | 0;
      if (k >= 0 && k < N) pluck(k);
    });
    return () => {
      exposeTestGlobal('__sdpPluckBass', undefined);
      exposeTestGlobal('__sdpBass', undefined);
    };
  }, []);

  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const e = energy.current[i];
      const m = strRefs.current[i];
      if (e > 0.001) {
        energy.current[i] = Math.max(0, e - dt * 1.8); // bass decays slow
        const ne = energy.current[i];
        // a fast lateral shimmy that decays — the plucked string vibrating
        if (m) m.position.x = strX(i) + Math.sin(t * 46) * 0.012 * ne;
        (strMats[i].emissive as THREE.Color).setRGB(0.17 + e * 0.5, 0.16 + e * 0.5, 0.14 + e * 0.4);
      } else if (m && m.position.x !== strX(i)) {
        m.position.x = strX(i);
        (strMats[i].emissive as THREE.Color).setRGB(0.172, 0.165, 0.141);
      }
    }
  });

  return (
    <group position={position} rotation-y={rotationY}>
      {/* a wooden A-frame stand foot */}
      <mesh material={standMat} position={[0, 0.12, 0.12]}>
        <boxGeometry args={[0.9, 0.08, 0.5]} />
      </mesh>
      <mesh material={standMat} position={[0, 0.34, 0.04]} rotation-x={0.18}>
        <boxGeometry args={[0.12, 0.6, 0.1]} />
      </mesh>

      {/* the body — a slab that leans back a touch on the stand */}
      <group rotation-x={-0.08}>
        <mesh material={bodyMat} position={[0, 0.62, 0]}>
          <boxGeometry args={[0.62, 0.78, 0.16]} />
        </mesh>
        {/* a horn cutaway nub + the lower bout, kept blocky for PS1 */}
        <mesh material={bodyMat} position={[-0.34, 0.92, 0]}>
          <boxGeometry args={[0.2, 0.26, 0.15]} />
        </mesh>
        {/* pickup + bridge hardware */}
        <mesh material={hwMat} position={[0, 0.66, 0.1]}>
          <boxGeometry args={[0.34, 0.1, 0.04]} />
        </mesh>
        <mesh material={hwMat} position={[0, 0.46, 0.1]}>
          <boxGeometry args={[0.3, 0.06, 0.04]} />
        </mesh>

        {/* the neck up to the headstock */}
        <mesh material={neckMat} position={[0, STR_MID, 0.02]}>
          <boxGeometry args={[0.4, STR_LEN + 0.1, 0.08]} />
        </mesh>
        <mesh material={hwMat} position={[0, NECK_TOP + 0.06, 0.02]}>
          <boxGeometry args={[0.46, 0.22, 0.06]} />
        </mesh>

        {/* four strings — each pivots-free, just shimmies on a pluck */}
        {STRINGS.map((s, i) => (
          <group key={`${s.note}${s.octave}-${i}`}>
            <mesh
              ref={(m) => (strRefs.current[i] = m)}
              material={strMats[i]}
              position={[strX(i), STR_MID, 0.08]}
            >
              <boxGeometry args={[0.012 + i * 0.004, STR_LEN, 0.012 + i * 0.004]} />
            </mesh>
            {/* invisible hit target running the length of the string */}
            <mesh
              position={[strX(i), STR_MID, 0.1]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                pluck(i);
              }}
              onPointerOver={() => (gl.domElement.style.cursor = "url('/cursor.cur'), pointer")}
              onPointerOut={() => (gl.domElement.style.cursor = 'grab')}
            >
              <boxGeometry args={[STR_GAP, STR_LEN, 0.1]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
