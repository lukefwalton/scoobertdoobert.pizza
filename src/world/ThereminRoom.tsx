import { useMemo } from 'react';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { Theremin } from './Theremin';
import { flatMat, makeBilingualSign } from './ps1';
import { useDispose } from '../lib/useDispose';
import { THEREMIN } from '../lib/theremin';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// ThereminRoom — "The Aerial" (テルミン). A hushed, cosmic little chamber found deep
// off the liminal level: a dark indigo box scattered with soft stars, and one
// theremin on the floor that SINGS as you approach (the new sustained voice, played
// by proximity — see Theremin / src/lib/theremin). A SWEET relief beat (taste
// guardrail): it owns the space (musicRoom — the carried song fades), so most of
// the room is silent and wondrous until you step into the device's field and play
// it with your body. A faint floor ring marks where the sound begins. Original
// parody PS1 geometry; the only words are a bilingual テルミン / THEREMIN plaque.
// ───────────────────────────────────────────────────────────────────────────

// Where the device stands (matches the room's data spawns: you arrive at the +Z
// door, a stride OUTSIDE the field, and walk in to it).
const DEVICE: [number, number, number] = [0, 0, -2];

export function ThereminRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;

  const floorMat = useMemo(() => flatMat('#0c1130'), []);
  const wallMat = useMemo(() => flatMat('#10163a', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#070a22', { side: THREE.DoubleSide }), []);

  // Bilingual plaque over the way back to the liminal (+Z wall).
  const signTex = useMemo(
    () =>
      makeBilingualSign('テルミン', 'THEREMIN', {
        bg: '#0a0e26',
        accent: '#5a6cff',
        jpColor: '#cdd6ff',
        enColor: '#8fa0ff',
      }),
    [],
  );
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }),
    [signTex],
  );

  // A soft starfield in the upper volume — deterministic (seeded) so screenshots
  // are stable. Unlit points, so they read against the dark "sky".
  const starGeo = useMemo(() => {
    let s = 0x9e3779b9 >>> 0;
    const rand = () => {
      // mulberry32 — a tiny deterministic PRNG (no Math.random → stable shots)
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const N = 80;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rand() * 2 - 1) * (W - 0.4);
      pos[i * 3 + 1] = H * 0.5 + rand() * (H * 0.5 - 0.2);
      pos[i * 3 + 2] = (rand() * 2 - 1) * (D - 0.4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [W, D, H]);
  const starMat = useMemo(
    () => new THREE.PointsMaterial({ color: '#cdd6ff', size: 0.11, sizeAttenuation: true }),
    [],
  );

  // The "step inside to play" ring on the floor at the field edge, under the device.
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#3a44a0',
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  useDispose(floorMat, wallMat, ceilMat, signTex, signMat, starGeo, starMat, ringMat);

  return (
    <group>
      {/* dim cosmic base light — enough to read the cabinet from the door; the
          device's own glow (in Theremin) is the swelling key light as you play. */}
      <ambientLight intensity={0.24} color="#6678c0" />
      <hemisphereLight args={['#2a3170', '#05060f', 0.4]} />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* the starfield overhead */}
      <points geometry={starGeo} material={starMat} />

      {/* the field ring around the device — the affordance: cross it and it sings */}
      <mesh material={ringMat} rotation-x={-Math.PI / 2} position={[DEVICE[0], 0.02, DEVICE[2]]}>
        <ringGeometry args={[THEREMIN.field - 0.12, THEREMIN.field, 48]} />
      </mesh>

      {/* the bilingual plaque over the return door (+Z wall), facing into the room */}
      <mesh material={signMat} position={[0, 2.7, D - 0.1]} rotation-y={Math.PI}>
        <planeGeometry args={[2.6, 1.0]} />
      </mesh>

      {/* the theremin — play it by walking into its field */}
      <Theremin position={DEVICE} />
    </group>
  );
}
