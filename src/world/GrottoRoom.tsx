import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeCheckerTexture, seededRandom } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { CeilingDrips } from './CeilingDrips';
import { FirstEntryReward } from './FirstEntryReward';
import { GlbProp } from './GlbProp';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GrottoRoom — THE GROTTO (洞窟), the little cave tucked behind the botanical
// garden's north hedge. Built from the reference photo: you stand in the dark
// among big rounded boulders, and the cave MOUTH frames the bright world —
// green pond water, a white waterfall drumming down, a palm catching the light.
// The room is the view: dark in here, glowing out there.
//
// REGISTER: a cool, hushed SURFACE nook — sweet, never dread (taste guardrail;
// baseUnease below SAFE). A musicRoom: the carried song fades and the cave
// speaks for itself — the waterfall's hush, echoey drips (long-decay bells:
// the menu always promised extra reverb). First entry tips a little luck.
// ───────────────────────────────────────────────────────────────────────────

// Boulder ring around the interior: [x, z, r, squashY]. The -Z wall leaves a
// gap around x=0 — that's the mouth.
const BOULDERS: [number, number, number, number][] = [
  // -Z wall (the mouth wall): heavies either side of the opening
  [-4.6, -6.6, 2.6, 0.9],
  [-2.2, -6.9, 1.7, 0.8],
  [2.3, -6.9, 1.8, 0.85],
  [4.7, -6.5, 2.7, 0.95],
  // +Z wall (around the way back out)
  [-4.8, 6.6, 2.5, 0.9],
  [4.8, 6.6, 2.5, 0.9],
  [-2.0, 7.0, 1.6, 0.8],
  [2.0, 7.0, 1.6, 0.8],
  // ±X walls
  [-6.8, -3.5, 2.6, 1.0],
  [-6.9, 0.5, 2.4, 0.9],
  [-6.7, 4.0, 2.6, 1.0],
  [6.8, -3.5, 2.6, 1.0],
  [6.9, 0.5, 2.4, 0.9],
  [6.7, 4.0, 2.6, 1.0],
];

export function GrottoRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const CEIL = room.dims.height;

  const rockMat = useMemo(() => flatMat('#4a3c30'), []);
  const rockDarkMat = useMemo(() => flatMat('#382d24'), []);
  const floorMat = useMemo(() => flatMat('#2e2620'), []);
  // The bright world outside the mouth (unlit, so it GLOWS against the dark).
  const pondMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#9dbd72' }), []);
  const backdropMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#cfe6ac' }), []);
  const foamMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#eef6f2', transparent: true, opacity: 0.85 }),
    [],
  );
  // The waterfall: a scrolling two-tone streak texture on an unlit plane.
  const fallTex = useMemo(() => {
    const t = makeCheckerTexture(4, '#e8f3f4', '#bcd9de');
    t.repeat.set(2, 6);
    return t;
  }, []);
  const fallMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.9 }),
    [fallTex],
  );
  // A still dark pool on the cave floor, catching the mouth-light.
  const poolMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#33534a', transparent: true, opacity: 0.8 }),
    [],
  );
  useDispose(
    rockMat,
    rockDarkMat,
    floorMat,
    pondMat,
    backdropMat,
    foamMat,
    fallTex,
    fallMat,
    poolMat,
  );

  // Ceiling boulders (the photo's low stone roof) — seeded so they hold still.
  const roof = useMemo(() => {
    const rnd = seededRandom(5080); // this reference photo's number
    const out: { x: number; z: number; r: number; y: number }[] = [];
    for (let i = 0; i < 12; i++) {
      out.push({
        x: (rnd() - 0.5) * (W - 1) * 2,
        z: (rnd() - 0.5) * (D - 1) * 2,
        r: 1.6 + rnd() * 1.6,
        y: CEIL + 0.4 + rnd() * 0.8,
      });
    }
    return out;
  }, [W, D, CEIL]);

  // The waterfall scroll + the cave's own ambient (hush + echoey drips).
  const fall = useRef<THREE.Texture>(fallTex);
  const hush = useRef(0.5);
  const drip = useRef(2.0);
  useEffect(() => {
    audio.unlock();
  }, []);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // the water falls (texture scroll — PS1-cheap, reads perfectly at 240p)
    fall.current.offset.y = (fall.current.offset.y + dt * 1.4) % 1;
    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    hush.current -= dt;
    if (hush.current <= 0) {
      // the waterfall's white hush, from the mouth
      audio.playColony(noteToFreq('D', 2), -0.1, 0.05);
      hush.current = 5 + Math.random() * 3;
    }
    drip.current -= dt;
    if (drip.current <= 0) {
      // a drip with a LONG decay — the cave answers back (extra reverb, as the
      // menu always promised). Panned around the dark.
      const notes = ['A', 'C', 'E'];
      const n = notes[Math.floor(Math.random() * notes.length)];
      audio.playChime(noteToFreq(n, 4), (Math.random() - 0.5) * 1.6, 0.07, 2.6);
      drip.current = 3 + Math.random() * 5;
    }
  });

  return (
    <group>
      {/* dark cave light: a dim cool ambient + the green-white GLOW of the mouth
          throwing light in from -Z (the photo's whole grammar: silhouetted rock
          against the bright outside). */}
      <ambientLight intensity={0.34} color="#5a5348" />
      <directionalLight position={[0, 2.5, -8]} intensity={0.75} color="#cfe6c2" />
      <pointLight position={[0, 1.6, -4]} intensity={0.5} distance={10} color="#a8c9a0" />

      {/* stone floor */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W * 2 + 10, D * 2 + 10]} />
      </mesh>
      {/* the still pool, just inside the mouth */}
      <mesh material={poolMat} rotation-x={-Math.PI / 2} position={[-1.5, 0.03, -4.2]}>
        <circleGeometry args={[2.2, 12]} />
      </mesh>

      {/* the boulder walls (gap at -Z ≈ x 0 — the mouth) */}
      {BOULDERS.map(([x, z, r, sy], i) => (
        <mesh
          key={i}
          material={i % 2 ? rockMat : rockDarkMat}
          position={[x, r * sy * 0.8, z]}
          scale={[1, sy, 1]}
        >
          <dodecahedronGeometry args={[r, 0]} />
        </mesh>
      ))}
      {/* the low stone roof */}
      {roof.map((b, i) => (
        <mesh
          key={i}
          material={i % 2 ? rockDarkMat : rockMat}
          position={[b.x, b.y, b.z]}
          scale={[1, 0.55, 1]}
        >
          <dodecahedronGeometry args={[b.r, 0]} />
        </mesh>
      ))}
      {/* two hangers over the mouth (the photo's brow of rock) */}
      <mesh material={rockDarkMat} position={[-0.9, CEIL - 0.9, -6.4]} scale={[1, 0.7, 1]}>
        <dodecahedronGeometry args={[1.5, 0]} />
      </mesh>
      <mesh material={rockMat} position={[1.2, CEIL - 1.2, -6.5]} scale={[1, 0.6, 1]}>
        <dodecahedronGeometry args={[1.2, 0]} />
      </mesh>

      {/* ── the world outside the mouth ─────────────────────────────────── */}
      {/* bright backdrop greenery */}
      <mesh material={backdropMat} position={[0, 4, -14]}>
        <planeGeometry args={[34, 12]} />
      </mesh>
      {/* the pond */}
      <mesh material={pondMat} rotation-x={-Math.PI / 2} position={[0, 0.01, -10.5]}>
        <planeGeometry args={[30, 8]} />
      </mesh>
      {/* the waterfall, drumming down into it */}
      <mesh material={fallMat} position={[2.4, 2.6, -11.5]}>
        <planeGeometry args={[2.6, 5.2]} />
      </mesh>
      {/* foam where it lands */}
      <mesh material={foamMat} rotation-x={-Math.PI / 2} position={[2.4, 0.05, -11.2]}>
        <circleGeometry args={[1.6, 10]} />
      </mesh>
      {/* a palm catching the light outside (the photo's bright frond) */}
      <Suspense fallback={null}>
        <GlbProp
          spec={{
            url: '/models/palm-tree.glb',
            position: [-3.4, 0, -10],
            fit: 4.2,
            rotationY: 0.7,
          }}
        />
      </Suspense>

      {/* water dripping off the stone roof (the shared drip system) */}
      <CeilingDrips bounds={room.dims} />

      {/* first time in: the cool-of-the-cave luck beat (durable, once) */}
      <FirstEntryReward secret="garden-grotto" message="cool in here — +1 LUCK" luck={1} />
    </group>
  );
}
