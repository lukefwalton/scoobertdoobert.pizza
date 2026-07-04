import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  flatMat,
  makeCheckerTexture,
  makeAffineTexturedMaterial,
  makeGrassTexture,
  makeBilingualSign,
  seededRandom,
} from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { announce } from '../state/toastStore';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { rollLuckyD20 } from '../lib/luck-core';
import { isDebugEntrance, exposeTestGlobal } from '../lib/testHooks';
import { GlbProp } from './GlbProp';
import { TubeSlide } from './TubeSlide';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GardenRoom — THE BOTANICAL GARDEN (植物園), off the Park Path. A lush, formal
// SoCal garden from the reference photos: trimmed box hedges around planted
// beds, pink-brick paths crossing at a centre circle, palms scattered at
// seeded-random spots, and the garden's two residents —
//
//  · THE FROG (photo one): a verdigris bronze frog stood upright on a pedestal,
//    holding a lily-pad up like a parasol. Click him → he RIBBITS (two low
//    bells) and does a squash-and-stretch hop; under the hood each ribbit is a
//    plain d20 and a NAT 20 means the frog winks — +1 LUCK ("be lucky").
//  · THE TUBE SLIDE (photo four): the deep-green play-place corkscrew — a real
//    ride, see TubeSlide.
//
// REGISTER: a fully sweet SURFACE room (taste guardrail; baseUnease below SAFE).
// A `musicRoom`: the carried song fades out and the garden sings for itself —
// birdsong chirps off the hedges, a breeze pad, and an occasional bullfrog
// croak from the pond-circle (mute-aware, voice-capped, WCAG-safe).
// ───────────────────────────────────────────────────────────────────────────

// Trimmed box hedges framing the quadrant beds — [x, z, w, d, rotY].
const HEDGES: [number, number, number, number, number][] = [
  // the four beds around the centre circle (photo two's formal quadrants)
  [-4.6, -3.4, 3.6, 0.8, 0],
  [-3.4, -4.6, 0.8, 3.2, 0], // (corner pair frames the NW bed w/ the slide behind)
  [4.6, -3.4, 3.6, 0.8, 0],
  [3.4, -4.6, 0.8, 3.2, 0],
  [-4.6, 3.4, 3.6, 0.8, 0],
  [-3.4, 4.6, 0.8, 3.2, 0],
  [4.6, 3.4, 3.6, 0.8, 0],
  [3.4, 4.6, 0.8, 3.2, 0],
  // long boundary hedges along the far walls — the north one stops short of
  // x≈4 so the grotto's rock mouth breaks through the hedge line at x=6.
  [-2, -9.3, 11, 0.9, 0],
  [-9.3, 3, 0.9, 11, 0],
];

// Dome topiary balls dotting the hedge lines — [x, z, r].
const TOPIARY: [number, number, number][] = [
  [-6.6, -3.4, 0.75],
  [6.6, -3.4, 0.7],
  [-6.6, 3.4, 0.7],
  [6.6, 3.4, 0.75],
  [-3.4, -6.4, 0.65],
  [3.4, 6.4, 0.65],
];

/** The frog statue: verdigris bronze, stood upright, lily-pad parasol overhead. */
function FrogStatue() {
  const bronzeMat = useMemo(() => flatMat('#3f6e5a'), []);
  const darkMat = useMemo(() => flatMat('#2f5747'), []);
  const padMat = useMemo(() => flatMat('#4a7d52'), []);
  const stoneMat = useMemo(() => flatMat('#b7b1a4'), []);
  const eyeMat = useMemo(() => flatMat('#1c2b24'), []);
  useDispose(bronzeMat, darkMat, padMat, stoneMat, eyeMat);

  const frog = useRef<THREE.Group>(null);
  // Squash-and-stretch hop, driven by a little spring on each ribbit.
  const hopT = useRef(1); // 1 = settled
  const cooldown = useRef(0);

  const ribbit = () => {
    if (cooldown.current > 0) return;
    cooldown.current = 0.6;
    hopT.current = 0;
    audio.unlock();
    // two low bells a fourth apart — a froggy "ri-bbit" (mute-aware + limited)
    audio.playChime(noteToFreq('G', 2), 0, 0.16, 0.45);
    window.setTimeout(() => audio.playChime(noteToFreq('C', 2), 0, 0.18, 0.6), 110);
    // a plain d20 under every ribbit (no luck spent on a decoration): a NAT 20
    // and the frog winks — +1 LUCK. "Be lucky."
    const roll = rollLuckyD20(0);
    if (roll.crit === 'nat20') {
      useProgressStore.getState().gainLuck(1);
      announce('🎲 nat 20 — the frog winks. +1 LUCK', 'crit-good');
      audio.playChime(noteToFreq('E', 6), 0.2, 0.1, 0.8);
    }
    exposeTestGlobal('__sdpFrog', { face: roll.face, crit: roll.crit });
    return roll;
  };

  // Deterministic ribbit hook for the smoke (ACTION — can bank luck on a nat 20 —
  // so it rides the narrower ?debug gate, like the other progression hooks).
  useEffect(() => {
    if (isDebugEntrance()) exposeTestGlobal('__sdpRibbit', ribbit);
    return () => {
      exposeTestGlobal('__sdpRibbit', undefined);
      exposeTestGlobal('__sdpFrog', undefined);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (cooldown.current > 0) cooldown.current -= dt;
    if (hopT.current < 1 && frog.current) {
      hopT.current = Math.min(1, hopT.current + dt * 2.2);
      // one squash → stretch-up → settle arc (a half sine of vertical stretch)
      const a = Math.sin(hopT.current * Math.PI);
      frog.current.scale.set(1 + a * 0.12, 1 - a * 0.18 + a * a * 0.3, 1 + a * 0.12);
      frog.current.position.y = 0.9 + a * 0.22;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* stone pedestal in the centre circle */}
      <mesh material={stoneMat} position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.75, 0.95, 0.9, 10]} />
      </mesh>
      {/* the frog (origin at pedestal top) */}
      <group ref={frog} position={[0, 0.9, 0]}>
        {/* body — plump, upright */}
        <mesh material={bronzeMat} position={[0, 0.62, 0]}>
          <sphereGeometry args={[0.52, 10, 8]} />
        </mesh>
        {/* head */}
        <mesh material={bronzeMat} position={[0, 1.22, 0.06]}>
          <sphereGeometry args={[0.36, 10, 8]} />
        </mesh>
        {/* the wide mouth line */}
        <mesh material={darkMat} position={[0, 1.1, 0.3]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.42, 0.04, 0.12]} />
        </mesh>
        {/* bulging eyes + pupils */}
        {[-0.18, 0.18].map((x, i) => (
          <group key={i} position={[x, 1.5, 0.16]}>
            <mesh material={bronzeMat}>
              <sphereGeometry args={[0.13, 8, 6]} />
            </mesh>
            <mesh material={eyeMat} position={[0, 0.02, 0.1]}>
              <sphereGeometry args={[0.05, 6, 5]} />
            </mesh>
          </group>
        ))}
        {/* haunches + splayed feet */}
        {[-0.4, 0.4].map((x, i) => (
          <group key={i}>
            <mesh material={darkMat} position={[x, 0.26, -0.05]}>
              <sphereGeometry args={[0.26, 8, 6]} />
            </mesh>
            <mesh
              material={darkMat}
              position={[x * 1.15, 0.05, 0.18]}
              rotation={[0, x > 0 ? -0.4 : 0.4, 0]}
            >
              <boxGeometry args={[0.24, 0.08, 0.5]} />
            </mesh>
          </group>
        ))}
        {/* left arm down on the pedestal rim */}
        <mesh material={darkMat} position={[-0.5, 0.62, 0.12]} rotation={[0, 0, 0.7]}>
          <cylinderGeometry args={[0.08, 0.1, 0.7, 6]} />
        </mesh>
        {/* right arm raised, holding the lily-pad parasol stem */}
        <mesh material={darkMat} position={[0.48, 1.0, 0.05]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.08, 0.1, 0.8, 6]} />
        </mesh>
        <mesh material={darkMat} position={[0.62, 1.7, 0.05]}>
          <cylinderGeometry args={[0.04, 0.04, 1.1, 5]} />
        </mesh>
        {/* the lily pad, tipped like an umbrella (photo one) */}
        <mesh material={padMat} position={[0.62, 2.28, 0.05]} rotation={[0.18, 0, -0.12]}>
          <coneGeometry args={[1.05, 0.22, 9, 1, true]} />
        </mesh>
      </group>
      {/* a generous invisible click target over the whole statue */}
      <mesh
        position={[0, 1.7, 0]}
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          ribbit();
        }}
      >
        <sphereGeometry args={[1.5, 8, 6]} />
      </mesh>
    </group>
  );
}

export function GardenRoom({ room }: { room: Room }) {
  const fog = fogFor(room);
  const W = room.dims.halfW;
  const D = room.dims.halfD;

  // Lawn: two garden greens, affine on the ground (the PS1 swim).
  const lawnTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#59904a', '#679d52');
    t.repeat.set(8, 8);
    return t;
  }, []);
  const lawnMat = useMemo(
    () => makeAffineTexturedMaterial(lawnTex, 10, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lawnTex, fog.color, fog.near, fog.far],
  );
  // The pink-brick path (photo three's rose-colored pavement).
  const brickTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#d8aca4', '#cf9f96');
    t.repeat.set(1, 8);
    return t;
  }, []);
  const brickMat = useMemo(
    () => makeAffineTexturedMaterial(brickTex, 2, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brickTex, fog.color, fog.near, fog.far],
  );
  const grassTex = useMemo(makeGrassTexture, []);
  const grassMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: grassTex,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
      }),
    [grassTex],
  );
  const signTex = useMemo(() => makeBilingualSign('植物園', 'BOTANICAL GARDEN'), []);
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }),
    [signTex],
  );
  const hedgeMat = useMemo(() => flatMat('#3e6d33'), []);
  const hedgeDarkMat = useMemo(() => flatMat('#35602c'), []);
  const dirtMat = useMemo(() => flatMat('#5d4630'), []);
  const bloomMat = useMemo(() => flatMat('#d873a8'), []); // the beds' pink blossom
  const stoneMat = useMemo(() => flatMat('#c6beb0'), []);
  const rockMat = useMemo(() => flatMat('#8a7a68'), []); // the grotto/gate stone
  const rockDarkMat = useMemo(() => flatMat('#6f6254'), []);
  useDispose(lawnTex, brickTex, grassTex, grassMat, signTex, signMat);
  useDispose(hedgeMat, hedgeDarkMat, dirtMat, bloomMat, stoneMat, rockMat, rockDarkMat);

  // "Some random palm trees": a seeded scatter (stable across visits/smokes),
  // rejected off the paths / the centre circle / the slide's corner so a palm
  // never blocks the walk or the ride.
  const palms = useMemo(() => {
    const rnd = seededRandom(5069); // the reference photo's number
    const out: { x: number; z: number; fit: number; rot: number }[] = [];
    let guard = 0;
    while (out.length < 6 && guard++ < 200) {
      const x = (rnd() - 0.5) * (W - 2) * 2;
      const z = (rnd() - 0.5) * (D - 2) * 2;
      if (Math.abs(x) < 2 || Math.abs(z) < 2) continue; // the crossing paths
      if (Math.hypot(x, z) < 4.2) continue; // the centre circle + frog
      if (x < -2.5 && z < -2.5) continue; // the slide's quadrant
      if (x > 3.5 && z < -6.5) continue; // the grotto mouth + its approach
      if (x < -2.5 && z > 6.5) continue; // the lion moon-gate + its approach
      if (out.some((p) => Math.hypot(p.x - x, p.z - z) < 2.6)) continue; // spread out
      out.push({ x, z, fit: 4 + rnd() * 1.6, rot: rnd() * Math.PI * 2 });
    }
    return out;
  }, [W, D]);

  // Grass tufts along the hedge lines + beds (bounded scatter, seeded).
  const tufts = useMemo(() => {
    const rnd = seededRandom(1997);
    const out: { x: number; z: number; s: number; r: number }[] = [];
    for (let i = 0; i < 110; i++) {
      const x = (rnd() - 0.5) * (W - 1) * 2;
      const z = (rnd() - 0.5) * (D - 1) * 2;
      if (Math.abs(x) < 1.6 || Math.abs(z) < 1.6) continue; // keep the paths clear
      out.push({ x, z, s: 0.4 + rnd() * 0.45, r: rnd() * Math.PI });
    }
    return out;
  }, [W, D]);

  // ── the garden's own ambient: birdsong + a breeze + the occasional bullfrog ──
  const bird = useRef(1.6);
  const wind = useRef(3.0);
  const croak = useRef(6.0);
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('D', 3), 0, 0.045); // the first breath of the garden
  }, []);
  useFrame((_, delta) => {
    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    const dt = Math.min(delta, 0.05);
    bird.current -= dt;
    if (bird.current <= 0) {
      // a two-note chirp, high + quick, panned into the hedges
      const pan = (Math.random() - 0.5) * 1.6;
      const top = Math.random() < 0.5 ? 'E' : 'G';
      audio.playChime(noteToFreq(top, 6), pan, 0.07, 0.25);
      window.setTimeout(() => audio.playChime(noteToFreq('C', 6), pan, 0.06, 0.3), 120);
      bird.current = 2.5 + Math.random() * 4;
    }
    wind.current -= dt;
    if (wind.current <= 0) {
      audio.playColony(noteToFreq(Math.random() < 0.5 ? 'D' : 'A', 3), Math.random() - 0.5, 0.04);
      wind.current = 8 + Math.random() * 5;
    }
    croak.current -= dt;
    if (croak.current <= 0) {
      // the resident, from the middle distance
      audio.playChime(noteToFreq('G', 2), (Math.random() - 0.5) * 0.6, 0.09, 0.5);
      croak.current = 9 + Math.random() * 8;
    }
  });

  return (
    <group>
      {/* bright garden noon — lush + warm */}
      <hemisphereLight args={['#dff2ff', '#3e6d33', 0.95]} />
      <ambientLight intensity={0.5} color="#f6f2dd" />
      <directionalLight position={[5, 10, 2]} intensity={0.7} color="#fff2cc" />

      {/* the lawn (runs past the clamp, dissolving into the fog) */}
      <mesh material={lawnMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W * 2 + 30, D * 2 + 30]} />
      </mesh>
      {/* pink-brick paths crossing at the centre… */}
      <mesh material={brickMat} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[2.8, D * 2 + 8]} />
      </mesh>
      <mesh material={brickMat} rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.02, 0]}>
        <planeGeometry args={[2.8, W * 2 + 8]} />
      </mesh>
      {/* …opening into the centre circle around the frog */}
      <mesh material={brickMat} rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <circleGeometry args={[3.4, 18]} />
      </mesh>
      {/* a pebble ring edging the circle (photo three's river-stone rim) */}
      <mesh material={stoneMat} position={[0, 0.09, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[3.4, 0.14, 6, 22]} />
      </mesh>

      {/* trimmed hedges + their planted beds */}
      {HEDGES.map(([x, z, w, d, r], i) => (
        <mesh
          key={i}
          material={i % 2 ? hedgeDarkMat : hedgeMat}
          position={[x, 0.45, z]}
          rotation={[0, r, 0]}
        >
          <boxGeometry args={[w, 0.9, d]} />
        </mesh>
      ))}
      {TOPIARY.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={dirtMat} position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.22, 0.26, 0.36, 6]} />
          </mesh>
          <mesh material={i % 2 ? hedgeMat : hedgeDarkMat} position={[0, 0.36 + r, 0]}>
            <icosahedronGeometry args={[r, 0]} />
          </mesh>
        </group>
      ))}
      {/* dark beds inside the quadrants, sprinkled with pink blossom */}
      {(
        [
          [-5.2, -5.2],
          [5.2, -5.2],
          [-5.2, 5.2],
          [5.2, 5.2],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={dirtMat} rotation-x={-Math.PI / 2} position={[0, 0.025, 0]}>
            <circleGeometry args={[2.2, 10]} />
          </mesh>
          {[
            [-0.9, 0.4],
            [0.7, -0.8],
            [0.2, 0.9],
            [-0.5, -0.6],
            [1.1, 0.6],
          ].map(([bx, bz], j) => (
            <mesh key={j} material={bloomMat} position={[bx, 0.22, bz]}>
              <icosahedronGeometry args={[0.16, 0]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* grass tufts off the path lines */}
      {tufts.map((t, i) => (
        <group key={i} position={[t.x, t.s * 0.5, t.z]} rotation={[0, t.r, 0]}>
          <mesh material={grassMat}>
            <planeGeometry args={[t.s * 0.9, t.s]} />
          </mesh>
          <mesh material={grassMat} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[t.s * 0.9, t.s]} />
          </mesh>
        </group>
      ))}

      {/* the random palms (seeded — "random" that holds still for the camera) */}
      {palms.map((p, i) => (
        <Suspense key={i} fallback={null}>
          <GlbProp
            spec={{
              url: '/models/palm-tree.glb',
              position: [p.x, 0, p.z],
              fit: p.fit,
              rotationY: p.rot,
            }}
          />
        </Suspense>
      ))}

      {/* the bilingual plaque over the way in (+X wall, by the park gate) */}
      <mesh material={signMat} position={[W - 0.3, 3.2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[4.2, 1.6]} />
      </mesh>

      {/* the grotto's rock mouth, breaking the north hedge line (x=6, -Z) —
          boulders shoulder the doorway so the cave reads from out here */}
      <group position={[6, 0, -D + 0.4]}>
        <mesh material={rockMat} position={[-2.2, 1.0, 0]} scale={[1, 0.85, 1]}>
          <dodecahedronGeometry args={[1.9, 0]} />
        </mesh>
        <mesh material={rockDarkMat} position={[2.2, 1.1, 0]} scale={[1, 0.9, 1]}>
          <dodecahedronGeometry args={[2.0, 0]} />
        </mesh>
        <mesh material={rockMat} position={[0, 2.9, -0.2]} scale={[1.3, 0.55, 1]}>
          <dodecahedronGeometry args={[1.7, 0]} />
        </mesh>
      </group>

      {/* the LION moon-gate (+Z, x=-5): a stone ring in a shoulder of rock, the
          carved lion head keeping watch from the keystone (the reference photo).
          The door itself sits in the opening — this is its stone face. */}
      <group position={[-5, 0, D - 0.45]}>
        {/* the ring */}
        <mesh material={stoneMat} position={[0, 2.1, 0]}>
          <torusGeometry args={[2.1, 0.5, 7, 16]} />
        </mesh>
        {/* rock shoulders + footing */}
        <mesh material={rockMat} position={[-2.9, 1.2, 0.1]} scale={[1, 0.9, 1]}>
          <dodecahedronGeometry args={[1.8, 0]} />
        </mesh>
        <mesh material={rockDarkMat} position={[2.9, 1.3, 0.1]} scale={[1, 0.95, 1]}>
          <dodecahedronGeometry args={[1.9, 0]} />
        </mesh>
        <mesh material={rockDarkMat} position={[0, 4.6, 0.2]} scale={[1.5, 0.5, 1]}>
          <dodecahedronGeometry args={[1.8, 0]} />
        </mesh>
        {/* the lion head on the keystone: muzzle + mane of stone petals */}
        <group position={[0, 4.35, -0.55]}>
          <mesh material={stoneMat}>
            <sphereGeometry args={[0.42, 8, 6]} />
          </mesh>
          <mesh material={stoneMat} position={[0, -0.08, -0.3]}>
            <boxGeometry args={[0.34, 0.26, 0.3]} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={i}
                material={rockMat}
                position={[Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.12]}
                rotation={[0, 0, a - Math.PI / 2]}
              >
                <coneGeometry args={[0.16, 0.42, 5]} />
              </mesh>
            );
          })}
        </group>
      </group>

      {/* the residents */}
      <FrogStatue />
      <TubeSlide />
    </group>
  );
}
