import { useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// GreekLyre — a procedural, pluckable lyre for the Sunken Gallery: the "play it"
// rung of the music ladder, set among the greek statuary it belongs with. Seven
// strings tuned to a pentatonic run (no wrong notes), each one you click to pluck
// — it brightens, shivers, and sounds a bell-pluck through the shared audio engine
// (mute-aware + brickwall-limited, so it's WCAG/ear safe and respects global mute).
// Original parody geometry (no sourced model); a sweet relief beat in the murk.
// ───────────────────────────────────────────────────────────────────────────

// Seven strings, low → high, a C pentatonic ladder (C D E G A C' D').
const STRINGS: { note: string; octave: number }[] = [
  { note: 'C', octave: 4 },
  { note: 'D', octave: 4 },
  { note: 'E', octave: 4 },
  { note: 'G', octave: 4 },
  { note: 'A', octave: 4 },
  { note: 'C', octave: 5 },
  { note: 'D', octave: 5 },
];
const FREQS = STRINGS.map((s) => noteToFreq(s.note, s.octave));

const SPAN = 1.0; // string field width
const STRING_TOP = 1.55; // y of the yoke
const STRING_BOT = 0.55; // y where strings meet the soundbox

export function GreekLyre({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const { gl } = useThree();
  // Per-string pluck energy (0..1), decayed each frame → the shiver + glow.
  const energy = useRef<number[]>(STRINGS.map(() => 0));
  const stringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const [, force] = useState(0); // nudge a re-render for the emissive flip

  const goldMat = useMemo(
    () => new THREE.MeshPhongMaterial({ color: '#c9a24a', specular: '#fff2c0', shininess: 30 }),
    [],
  );
  const woodMat = useMemo(
    () => new THREE.MeshPhongMaterial({ color: '#7a4b2a', specular: '#caa', shininess: 8 }),
    [],
  );
  const stoneMat = useMemo(() => new THREE.MeshPhongMaterial({ color: '#c8c2b0' }), []);
  // One emissive string material per string so a pluck can light just that one.
  const stringMats = useMemo(
    () => STRINGS.map(() => new THREE.MeshBasicMaterial({ color: '#efe3b0' })),
    [],
  );

  const pluck = (i: number) => {
    energy.current[i] = 1;
    // A short bell-pluck (the world's instrument voice), panned slightly L→R across
    // the strings so a strum reads stereo. No-op when muted / pre-gesture.
    audio.playChime(FREQS[i], (i / (STRINGS.length - 1)) * 1.4 - 0.7, 0.2, 0.5);
    exposeTestGlobal('__sdpLyre', { i, note: STRINGS[i].note, octave: STRINGS[i].octave });
  };

  useFrame((_, dt) => {
    let any = false;
    for (let i = 0; i < STRINGS.length; i++) {
      if (energy.current[i] > 0.001) {
        energy.current[i] = Math.max(0, energy.current[i] - dt * 2.4);
        any = true;
        const e = energy.current[i];
        // glow: brighten the string toward white with energy
        (stringMats[i].color as THREE.Color).setRGB(
          0.94 + e * 0.06,
          0.89 + e * 0.06,
          0.69 + e * 0.2,
        );
        // shiver: a tiny horizontal wobble that settles
        const m = stringRefs.current[i];
        if (m) m.position.x = stringX(i) + Math.sin(performance.now() * 0.05 + i) * 0.012 * e;
      }
    }
    if (any) force((n) => (n + 1) & 1023);
  });

  const stringX = (i: number) => -SPAN / 2 + (i / (STRINGS.length - 1)) * SPAN;

  return (
    <group position={position} rotation-y={rotationY}>
      {/* pedestal so the strings sit at a comfortable pluck height */}
      <mesh material={stoneMat} position={[0, 0.25, 0]}>
        <boxGeometry args={[0.9, 0.5, 0.7]} />
      </mesh>
      {/* soundbox (the resonator the arms rise from) */}
      <mesh material={woodMat} position={[0, STRING_BOT - 0.05, 0]}>
        <boxGeometry args={[SPAN + 0.5, 0.34, 0.28]} />
      </mesh>
      {/* two arms, splayed up and out */}
      <mesh material={goldMat} position={[-SPAN / 2 - 0.16, 1.0, 0]} rotation-z={0.18}>
        <boxGeometry args={[0.1, 1.0, 0.12]} />
      </mesh>
      <mesh material={goldMat} position={[SPAN / 2 + 0.16, 1.0, 0]} rotation-z={-0.18}>
        <boxGeometry args={[0.1, 1.0, 0.12]} />
      </mesh>
      {/* the yoke (crossbar) across the top */}
      <mesh material={goldMat} position={[0, STRING_TOP, 0]}>
        <boxGeometry args={[SPAN + 0.6, 0.1, 0.14]} />
      </mesh>

      {/* the strings — each pluckable. A wide invisible hit-box wraps the thin
          visible string so it's easy to click in the dim hall. */}
      {STRINGS.map((s, i) => {
        const x = stringX(i);
        const midY = (STRING_TOP + STRING_BOT) / 2;
        const h = STRING_TOP - STRING_BOT;
        return (
          <group key={`${s.note}${s.octave}-${i}`}>
            <mesh
              ref={(m) => (stringRefs.current[i] = m)}
              material={stringMats[i]}
              position={[x, midY, 0.02]}
            >
              <boxGeometry args={[0.014, h, 0.014]} />
            </mesh>
            {/* invisible, generous click target */}
            <mesh
              position={[x, midY, 0.04]}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                pluck(i);
              }}
              onPointerOver={() => (gl.domElement.style.cursor = "url('/cursor.cur'), pointer")}
              onPointerOut={() => (gl.domElement.style.cursor = 'grab')}
            >
              <boxGeometry args={[SPAN / STRINGS.length, h, 0.12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
