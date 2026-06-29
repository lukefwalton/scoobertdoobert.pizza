import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { audio, type SustainedVoice } from '../audio/engine';
import { exposeTestGlobal } from '../lib/testHooks';
import { useDispose } from '../lib/useDispose';
import { flatMat } from './ps1';
import { THEREMIN, thereminVoiceFor } from '../lib/theremin';

// ───────────────────────────────────────────────────────────────────────────
// Theremin — the deep "play it" instrument you play WITH YOUR BODY. A theremin is
// uniquely played by proximity (the nearness of your hand to the antenna is the
// note), so it's the one instrument that maps onto first-person movement: walk
// toward it and it sings higher + louder, back away and it fades to silence. The
// pitch/gain curve is the pure, unit-tested src/lib/theremin mapping; the SOUND is
// the engine's new sustained voice (audio.startVoice — a warm tri+sub under a
// gentle vibrato, mute-aware + brickwall-limited). Original parody geometry. A
// genuinely NEW sound on the music ladder (every other instrument is struck/
// plucked) and a SWEET relief beat deep down (taste guardrail).
// ───────────────────────────────────────────────────────────────────────────

export function Theremin({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) {
  const { camera } = useThree();
  const voiceRef = useRef<SustainedVoice | null>(null);
  // World position of the device (the proximity is measured to this on the XZ
  // plane). useMemo so the per-frame distance read allocates nothing.
  const worldPos = useMemo(() => new THREE.Vector3(...position), [position]);
  // Smoothed 0..1 "loudness" → drives the glow + the room-lighting swell so the
  // visuals follow the sound without a per-frame React render (cf. PizzaPanChimes).
  const energy = useRef(0);

  // Lit cabinet (flatMat = Lambert); the antenna + coil glow regardless of light
  // (MeshBasic) so they read in the dark room and can brighten as you play.
  const cabMat = useMemo(() => flatMat('#2b2f4a'), []);
  const trimMat = useMemo(() => flatMat('#6b6f93'), []);
  const antennaMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#5a6cff' }), []);
  const loopMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#46408f' }), []);
  const coilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9fb0ff' }), []);
  useDispose(cabMat, trimMat, antennaMat, loopMat, coilMat);

  const glowLight = useRef<THREE.PointLight>(null);

  // Open the sustained voice on enter (a gesture has long since unlocked us this
  // deep in the world), release it on leave.
  useEffect(() => {
    audio.unlock();
    voiceRef.current = audio.startVoice();
    return () => {
      voiceRef.current?.stop();
      voiceRef.current = null;
      exposeTestGlobal('__sdpTheremin', undefined);
      exposeTestGlobal('__sdpThereminMoveTo', undefined);
    };
  }, []);

  // Deterministic test hook (?world / ?debug): teleport the player to `dist` units
  // from the device along +Z, so the smoke drives the REAL per-frame proximity path
  // (camera → distance → mapping → voice → readout) without flaky physical walking.
  // Controls integrates movement onto camera.position, so a direct set persists.
  useEffect(() => {
    exposeTestGlobal('__sdpThereminMoveTo', (dist: number) => {
      const d = Number(dist) || 0;
      camera.position.set(worldPos.x, camera.position.y, worldPos.z + d);
    });
    return () => exposeTestGlobal('__sdpThereminMoveTo', undefined);
  }, [camera, worldPos]);

  useFrame((_, dt) => {
    // Distance on the XZ plane (height/eye doesn't gate the field).
    const dx = camera.position.x - worldPos.x;
    const dz = camera.position.z - worldPos.z;
    const dist = Math.hypot(dx, dz);
    const v = thereminVoiceFor(dist);
    voiceRef.current?.set(v.freq, v.gain);

    // Smooth the glow toward the current normalized loudness (no flashing — a slow
    // follow well under any WCAG flash threshold).
    const target = v.gain / THEREMIN.peak;
    energy.current += (target - energy.current) * Math.min(1, dt * 6);
    const e = energy.current;
    // antenna + coil brighten from a dim resting blue toward white-hot as you play
    (antennaMat.color as THREE.Color).setRGB(0.32 + e * 0.5, 0.38 + e * 0.5, 1);
    (coilMat.color as THREE.Color).setRGB(0.5 + e * 0.5, 0.6 + e * 0.4, 1);
    if (glowLight.current) glowLight.current.intensity = 0.35 + e * 1.4;

    exposeTestGlobal('__sdpTheremin', {
      playing: v.playing,
      freq: Math.round(v.freq),
      gain: +v.gain.toFixed(3),
    });
  });

  return (
    <group position={position} rotation-y={rotationY}>
      {/* the device casts its own soft glow that swells as you play it — the room
          literally brightens to your hand. */}
      <pointLight
        ref={glowLight}
        position={[0, 1.4, 0]}
        distance={9}
        color="#8fa0ff"
        intensity={0.35}
      />

      {/* a slim console cabinet on legs */}
      <mesh material={cabMat} position={[0, 0.95, 0]}>
        <boxGeometry args={[1.3, 0.34, 0.66]} />
      </mesh>
      <mesh material={trimMat} position={[0, 0.96, 0.31]}>
        <boxGeometry args={[1.34, 0.12, 0.06]} />
      </mesh>
      {[
        [-0.55, -0.28],
        [0.55, -0.28],
        [-0.55, 0.28],
        [0.55, 0.28],
      ].map(([x, z], i) => (
        <mesh key={i} material={cabMat} position={[x, 0.4, z]}>
          <boxGeometry args={[0.08, 0.78, 0.08]} />
        </mesh>
      ))}

      {/* the glowing coil/orb on top center — the "voice" */}
      <mesh material={coilMat} position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.12, 12, 8]} />
      </mesh>

      {/* PITCH antenna — a tall vertical rod on the right */}
      <mesh material={antennaMat} position={[0.5, 1.95, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
      </mesh>
      {/* VOLUME loop — a horizontal ring on the left */}
      <mesh material={loopMat} position={[-0.5, 1.32, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.22, 0.018, 6, 16]} />
      </mesh>
      <mesh material={loopMat} position={[-0.5, 1.18, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
      </mesh>
    </group>
  );
}
