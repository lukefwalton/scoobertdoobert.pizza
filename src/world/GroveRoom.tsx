import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat } from './ps1';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GroveRoom — the hidden grove, the reward for beating the goblin (Luke: "winning
// gives you a new room"). A hush after the bright field: dusk settling cool and
// blue. The reward is SOUND, made playable — the grove is a little SOUND GARDEN:
// glowing blooms tuned to the site's D6/9 pentatonic that SING as you wander near
// them (any path is consonant, so it always sounds nice), over a slow root drone
// pulsing from the orb on its altar. A soft chord greets you on arrival, then the
// space is yours to play by exploring it.
//
// Reuses the shared world audio (audio.playChime = the /chimes bell, playColony =
// the /cultures pad) — mute-aware + voice-capped by construction, so it degrades
// to silence and never spikes (WCAG 2.3.1; a SWEET room). Door back to the grass
// is in the room data.
// ───────────────────────────────────────────────────────────────────────────

// The blooms, placed around the clearing and tuned to the D-major pentatonic
// (D E F# A B — the site's D6/9 world, same family as the shrine furin). Spread so
// crossing the grove plays an ever-shifting, always-consonant little phrase.
const BLOOMS = [
  { x: -4.0, z: 2.0, note: 'A', octave: 5, color: '#bfeede' },
  { x: 4.2, z: 1.0, note: 'D', octave: 6, color: '#bfe0ff' },
  { x: -5.0, z: -3.0, note: 'F#', octave: 5, color: '#e9d8ff' },
  { x: 5.0, z: -4.0, note: 'B', octave: 5, color: '#ffe6c4' },
  { x: -2.6, z: -6.0, note: 'E', octave: 6, color: '#ffd6ec' },
  { x: 2.8, z: -6.6, note: 'D', octave: 6, color: '#cdeef6' },
] as const;

const BLOOM_R = 2.2; // how close you wander before a bloom sings

// A single bloom: a glowing bud on a thin stem that sounds its note when you come
// near, then re-arms once you've stepped away — so moving among them is the music.
function Bloom({
  x,
  z,
  note,
  octave,
  color,
  halfW,
}: {
  x: number;
  z: number;
  note: string;
  octave: number;
  color: string;
  halfW: number;
}) {
  const { camera } = useThree();
  const bud = useRef<THREE.Mesh>(null);
  const armed = useRef(true);
  const pulse = useRef(0);
  const freq = useMemo(() => noteToFreq(note, octave), [note, octave]);
  const stemMat = useMemo(() => flatMat('#37564a'), []);
  const budMat = useMemo(() => new THREE.MeshBasicMaterial({ color }), [color]);
  useEffect(
    () => () => {
      stemMat.dispose();
      budMat.dispose();
    },
    [stemMat, budMat],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    pulse.current *= Math.pow(0.03, dt); // decay the bloom flare
    const dist = Math.hypot(camera.position.x - x, camera.position.z - z);
    if (armed.current && dist < BLOOM_R) {
      armed.current = false; // sing once per approach…
      pulse.current = 1;
      const pan = Math.max(-1, Math.min(1, x / Math.max(0.001, halfW)));
      audio.playChime(freq, pan, 0.13, 1.5); // a soft, ringing bell (mute-aware)
    } else if (!armed.current && dist > BLOOM_R + 0.8) {
      armed.current = true; // …re-arm once you step away, so wandering keeps playing
    }
    const b = bud.current;
    if (b) {
      const t = state.clock.elapsedTime;
      b.position.y = 0.9 + Math.sin(t * 1.1 + x) * 0.06; // a gentle drift
      b.scale.setScalar(0.22 * (1 + pulse.current * 0.7)); // flare when it sings
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh material={stemMat} position={[0, 0.45, 0]}>
        <boxGeometry args={[0.05, 0.9, 0.05]} />
      </mesh>
      <mesh ref={bud} material={budMat} position={[0, 0.9, 0]} scale={0.22}>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

export function GroveRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const orb = useRef<THREE.Mesh>(null);
  const drone = useRef(1.5); // countdown to the next root-drone pulse
  const orbPulse = useRef(0);

  const groundMat = useMemo(() => flatMat('#2f4a44'), []);
  const stoneMat = useMemo(() => flatMat('#566a64'), []);
  const orbMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c6f0e0' }), []); // unlit glow
  useEffect(
    () => () => {
      groundMat.dispose();
      stoneMat.dispose();
      orbMat.dispose();
    },
    [groundMat, stoneMat, orbMat],
  );

  // A soft arrival chord + the first root note, so the garden's drone bed is
  // already humming as you step in — the grove's reward is sound.
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('D', 3), 0, 0.06); // the low root, straight away
    const t = ['D', 'A', 'F#', 'D'].map((n, i) =>
      window.setTimeout(
        () => audio.playChime(noteToFreq(n, i === 3 ? 6 : 5), 0, 0.14),
        220 + i * 230,
      ),
    );
    return () => t.forEach((id) => clearTimeout(id));
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    // The orb's slow root drone — a soft low pad every several seconds, the grove's
    // heartbeat under the blooms (the /cultures voice; mute-aware + voice-capped).
    drone.current -= dt;
    if (drone.current <= 0) {
      audio.playColony(noteToFreq(Math.random() < 0.5 ? 'D' : 'A', 3), 0, 0.06);
      orbPulse.current = 1;
      drone.current = 6 + Math.random() * 3;
    }
    orbPulse.current *= Math.pow(0.06, dt);
    const m = orb.current;
    if (m) {
      const t = state.clock.elapsedTime;
      m.position.y = 1.7 + Math.sin(t * 1.2) * 0.16; // gentle bob
      m.rotation.y = t * 0.5;
      m.scale.setScalar(0.45 * (1 + orbPulse.current * 0.18)); // breathe with the drone
    }
  });

  return (
    <group>
      <ambientLight intensity={0.45} color="#9fd6c4" />
      <pointLight position={[0, 2.4, -1]} intensity={0.95} distance={13} color="#c6f0e0" />

      {/* the clearing floor (dissolves into the dusk fog) */}
      <mesh material={groundMat} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 6, D * 2 + 6]} />
      </mesh>

      {/* a low stone altar + the floating glowing reward over it */}
      <mesh material={stoneMat} position={[0, 0.4, -1]}>
        <cylinderGeometry args={[0.9, 1.1, 0.8, 8]} />
      </mesh>
      <mesh ref={orb} material={orbMat} position={[0, 1.7, -1]} scale={0.45}>
        <icosahedronGeometry args={[1, 1]} />
      </mesh>

      {/* the sound garden — blooms that sing as you wander among them */}
      {BLOOMS.map((b, i) => (
        <Bloom key={i} {...b} halfW={W} />
      ))}
    </group>
  );
}
