import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, seededRandom } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { FirstEntryReward } from './FirstEntryReward';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// TubesRoom — THE TUBES (チューブ), the hidden PlayPlace crawl-warren the garden's
// tube slide DROPS you into (about half the time — the rest it loops you back
// out; see TubeSlide). Translucent green tube tunnels arc overhead, bubble
// PORTHOLES glow coloured light onto a soft padded floor, and a low-poly BALL
// PIT sits by the crawl-out mouth. Pure nostalgic play (below SAFE — sweet, not
// dread). A musicRoom: soft rubbery bloops own the space.
//
// The reward for landing here is the room itself (+ the scattered pizza-point
// loot RoomLoot drops); the +Z tube mouth crawls back out to the garden.
// ───────────────────────────────────────────────────────────────────────────

// Bubble portholes on the walls — [x, y, z, rotY, colourIndex].
const PORTHOLES: [number, number, number, number, number][] = [
  [-7.8, 2.6, -3, Math.PI / 2, 0],
  [-7.8, 3.4, 3, Math.PI / 2, 1],
  [7.8, 2.6, -2, -Math.PI / 2, 2],
  [7.8, 3.2, 4, -Math.PI / 2, 3],
  [-3, 3.0, -7.8, 0, 3],
  [3, 3.4, -7.8, 0, 0],
];

// Big translucent crawl-tube tunnels arcing across the upper space —
// [x, y, z, rotX, rotZ, length].
const TUNNELS: [number, number, number, number, number, number][] = [
  [-2, 4.2, 1, 0, Math.PI / 2, 9],
  [3, 4.8, -3, Math.PI / 2, 0, 8],
  [1, 3.6, 5, 0.3, Math.PI / 2.4, 7],
];

const EYE_Y = 2.2; // eye-height ring around the crawl-out mouth

export function TubesRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const CEIL = room.dims.height;

  const padMat = useMemo(() => flatMat('#5a7d8c'), []); // soft padded floor
  const wallMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#3f7d5e', side: THREE.DoubleSide }),
    [],
  );
  const tubeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#5fbf83',
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const rimMat = useMemo(() => flatMat('#e8c247'), []); // yellow tube rims (PlayPlace)
  const pitMat = useMemo(() => flatMat('#2f5647'), []);
  // A handful of bright ball / porthole colours (primary-ish PlayPlace palette).
  const palette = useMemo(() => ['#e0503a', '#e8b53a', '#3a7fe0', '#43b06a'], []);
  const ballMats = useMemo(() => palette.map((c) => flatMat(c)), [palette]);
  const portMats = useMemo(
    () =>
      palette.map(
        (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 }),
      ),
    [palette],
  );
  useDispose(padMat, wallMat, tubeMat, rimMat, pitMat, ...ballMats, ...portMats);

  // The ball pit — a seeded scatter of low-poly balls in a shallow pit by +Z.
  const balls = useMemo(() => {
    const rnd = seededRandom(4242);
    const out: { x: number; z: number; r: number; c: number; ph: number }[] = [];
    for (let i = 0; i < 54; i++) {
      const a = rnd() * Math.PI * 2;
      const rad = Math.sqrt(rnd()) * 2.7; // fill the disc evenly
      out.push({
        x: Math.cos(a) * rad,
        z: 4 + Math.sin(a) * rad,
        r: 0.24 + rnd() * 0.1,
        c: Math.floor(rnd() * palette.length),
        ph: rnd() * Math.PI * 2, // bob phase
      });
    }
    return out;
  }, [palette.length]);
  const pitGroup = useRef<THREE.Group>(null);

  // ── the room's own ambient: soft rubbery bloops + the muffled PlayPlace hum ──
  const bloop = useRef(1.4);
  const hum = useRef(3.0);
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('C', 3), 0, 0.045);
  }, []);
  useFrame((state, delta) => {
    // the balls bob gently (no flashing — a soft idle)
    if (pitGroup.current) {
      const t = state.clock.elapsedTime;
      pitGroup.current.children.forEach((m, i) => {
        const b = balls[i];
        if (b) m.position.y = 0.3 + Math.sin(t * 2 + b.ph) * 0.06;
      });
    }
    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    const dt = Math.min(delta, 0.05);
    bloop.current -= dt;
    if (bloop.current <= 0) {
      // a squeaky pentatonic bloop, panned around the tubes
      const notes = ['C', 'D', 'E', 'G', 'A'];
      const n = notes[Math.floor(Math.random() * notes.length)];
      audio.playChime(noteToFreq(n, 5), (Math.random() - 0.5) * 1.4, 0.08, 0.7);
      bloop.current = 2.5 + Math.random() * 3;
    }
    hum.current -= dt;
    if (hum.current <= 0) {
      audio.playColony(noteToFreq(Math.random() < 0.5 ? 'C' : 'G', 3), 0, 0.04);
      hum.current = 7 + Math.random() * 5;
    }
  });

  return (
    <group>
      {/* soft warm PlayPlace light + a cool fill */}
      <ambientLight intensity={0.7} color="#dff0e6" />
      <directionalLight position={[3, 8, 2]} intensity={0.45} color="#fff2d6" />
      <hemisphereLight args={['#bfe6cf', '#5a7d8c', 0.5]} />

      {/* padded floor */}
      <mesh material={padMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>

      {/* the four soft walls + a low ceiling */}
      {(
        [
          [0, -D, W * 2, 0],
          [0, D, W * 2, 0],
          [-W, 0, D * 2, Math.PI / 2],
          [W, 0, D * 2, Math.PI / 2],
        ] as const
      ).map(([x, z, len, r], i) => (
        <mesh key={i} material={wallMat} position={[x, CEIL / 2, z]} rotation={[0, r, 0]}>
          <planeGeometry args={[len, CEIL]} />
        </mesh>
      ))}
      <mesh material={wallMat} position={[0, CEIL, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>

      {/* bubble portholes — a translucent dome + a coloured light behind each */}
      {PORTHOLES.map(([x, y, z, rotY, ci], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, rotY, 0]}>
          <mesh material={portMats[ci]}>
            <sphereGeometry args={[0.7, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={rimMat} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.7, 0.08, 6, 16]} />
          </mesh>
          <pointLight color={palette[ci]} intensity={0.5} distance={7} position={[0, 0, -0.4]} />
        </group>
      ))}

      {/* translucent green crawl-tube tunnels arcing overhead (the warren) */}
      {TUNNELS.map(([x, y, z, rx, rz, len], i) => (
        <group key={i} position={[x, y, z]} rotation={[rx, 0, rz]}>
          <mesh material={tubeMat}>
            <cylinderGeometry args={[1.1, 1.1, len, 12, 1, true]} />
          </mesh>
          {/* yellow rims at both ends */}
          <mesh material={rimMat} position={[0, len / 2, 0]}>
            <torusGeometry args={[1.1, 0.09, 6, 16]} />
          </mesh>
          <mesh material={rimMat} position={[0, -len / 2, 0]}>
            <torusGeometry args={[1.1, 0.09, 6, 16]} />
          </mesh>
        </group>
      ))}

      {/* the ball pit by the crawl-out mouth (+Z) */}
      <group position={[0, 0, 0]}>
        {/* the pit basin */}
        <mesh material={pitMat} position={[0, 0.12, 4]}>
          <cylinderGeometry args={[3.1, 3.2, 0.42, 24, 1, true]} />
        </mesh>
        <mesh material={rimMat} position={[0, 0.34, 4]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.15, 0.1, 8, 28]} />
        </mesh>
        {/* the balls */}
        <group ref={pitGroup}>
          {balls.map((b, i) => (
            <mesh key={i} material={ballMats[b.c]} position={[b.x, 0.3, b.z]}>
              <icosahedronGeometry args={[b.r, 0]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* a bright rim ring around the crawl-out tube mouth (+Z wall) so the way
          back reads clearly against the green */}
      <mesh material={rimMat} position={[0, EYE_Y, D - 0.2]}>
        <torusGeometry args={[1.5, 0.14, 8, 20]} />
      </mesh>

      {/* first drop-in: a little "you found it" luck (durable, once) */}
      <FirstEntryReward secret="tubes-found" message="down the tubes! +2 LUCK" luck={2} />
    </group>
  );
}
