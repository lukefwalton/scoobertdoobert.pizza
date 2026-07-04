import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeBilingualSign, makeGrassTexture, seededRandom } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { FirstEntryReward } from './FirstEntryReward';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// BambooRoom — THE BAMBOO GROVE (竹林), through the garden's stone LION
// moon-gate (the reference photo: a round rock portal, a carved lion on the
// keystone, and past it nothing but bamboo). Inside: a dense stand of tall
// culms in dappled gold-green light, a mossy floor, a stone lantern — and a
// SHISHI-ODOSHI keeping time: the bamboo rocker fills, tips, and CRACKS
// against its stone every little while (the animation and the klok are one
// event). 鹿威し is really the "deer-scarer," but 獅子 (shishi) also means
// LION — the gate's lion insists it's named after him. Sweet, dappled, safe.
// A musicRoom: wind in the leaves + the knocker own the space.
// ───────────────────────────────────────────────────────────────────────────

export function BambooRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;

  const mossMat = useMemo(() => flatMat('#57713d'), []);
  const culmMats = useMemo(() => [flatMat('#a9bd6c'), flatMat('#93ad58'), flatMat('#bccb7e')], []);
  const nodeMat = useMemo(() => flatMat('#7a9146'), []);
  const leafMat = useMemo(() => flatMat('#6f9a48'), []);
  const stoneMat = useMemo(() => flatMat('#9a978c'), []);
  const spoutMat = useMemo(() => flatMat('#c4d089'), []);
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
  const signTex = useMemo(() => makeBilingualSign('竹林', 'BAMBOO GROVE'), []);
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }),
    [signTex],
  );
  useDispose(mossMat, ...culmMats, nodeMat, leafMat, stoneMat, spoutMat);
  useDispose(grassTex, grassMat, signTex, signMat);

  // The stand: a seeded scatter of culms with a clearing down the entry line
  // (z ≈ -4.5 → the lantern) and around the shishi-odoshi. Each culm = one
  // cylinder + a couple of darker node rings; heights vary into the canopy.
  const culms = useMemo(() => {
    const rnd = seededRandom(5081); // the lion-gate photo's number
    const out: { x: number; z: number; h: number; r: number; m: number; lean: number }[] = [];
    let guard = 0;
    while (out.length < 64 && guard++ < 400) {
      const x = (rnd() - 0.5) * (W - 1) * 2;
      const z = (rnd() - 0.5) * (D - 1) * 2;
      if (Math.abs(x) < 1.6 && z < -1) continue; // the walk in from the gate
      if (Math.hypot(x - 3.4, z - 2.6) < 2.0) continue; // the shishi-odoshi nook
      if (Math.hypot(x, z) < 1.4) continue; // breathing room mid-grove
      if (out.some((c) => Math.hypot(c.x - x, c.z - z) < 0.9)) continue;
      out.push({
        x,
        z,
        h: 6.2 + rnd() * 2.4,
        r: 0.1 + rnd() * 0.09,
        m: Math.floor(rnd() * 3),
        lean: (rnd() - 0.5) * 0.09,
      });
    }
    return out;
  }, [W, D]);

  // Canopy blobs overhead (the dapple source, visually) + ground tufts.
  const canopy = useMemo(() => {
    const rnd = seededRandom(777);
    return Array.from({ length: 14 }, () => ({
      x: (rnd() - 0.5) * (W + 4) * 2,
      z: (rnd() - 0.5) * (D + 4) * 2,
      y: 7.2 + rnd() * 1.6,
      s: 1.8 + rnd() * 1.8,
    }));
  }, [W, D]);
  const tufts = useMemo(() => {
    const rnd = seededRandom(1212);
    return Array.from({ length: 70 }, () => ({
      x: (rnd() - 0.5) * (W - 0.5) * 2,
      z: (rnd() - 0.5) * (D - 0.5) * 2,
      s: 0.35 + rnd() * 0.4,
      r: rnd() * Math.PI,
    }));
  }, [W, D]);

  // ── the shishi-odoshi: one rocker, one klok — animation and sound are the
  // same event, so the grove keeps honest time. It idles slightly nose-down,
  // "fills," tips hard, cracks against the stone (klok + a wooden after-note),
  // and eases back. Period ~11–17s.
  const rocker = useRef<THREE.Group>(null);
  const phase = useRef(3.0); // seconds until the next tip
  const anim = useRef(1); // 0..1 through the tip-and-return, 1 = settled
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('E', 3), 0.1, 0.04); // the leaves, straight away
  }, []);
  const wind = useRef(4.0);
  useFrame((_, delta) => {
    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    const dt = Math.min(delta, 0.05);
    // wind in the leaves
    wind.current -= dt;
    if (wind.current <= 0) {
      audio.playColony(
        noteToFreq(Math.random() < 0.5 ? 'E' : 'B', 3),
        (Math.random() - 0.5) * 1.2,
        0.04,
      );
      wind.current = 7 + Math.random() * 5;
    }
    // the knocker
    phase.current -= dt;
    if (phase.current <= 0 && anim.current >= 1) {
      anim.current = 0;
      phase.current = 11 + Math.random() * 6;
    }
    if (anim.current < 1 && rocker.current) {
      anim.current = Math.min(1, anim.current + dt * 1.1);
      const a = anim.current;
      // tip fast (0→0.25), CRACK, then ease home (0.25→1)
      let tilt: number;
      if (a < 0.25) {
        tilt = (a / 0.25) * 0.5; // nose swings down 0.5 rad
        if (a + dt * 1.1 >= 0.25) {
          // the klok lands exactly at the crack
          audio.playChime(noteToFreq('A', 3), 0.35, 0.14, 0.16); // the crack
          window.setTimeout(() => audio.playChime(noteToFreq('D', 3), 0.35, 0.07, 0.5), 60);
        }
      } else {
        tilt = 0.5 * (1 - (a - 0.25) / 0.75);
      }
      rocker.current.rotation.z = -0.12 - tilt;
    }
  });

  return (
    <group>
      {/* dappled gold-green: bright hemisphere, a warm shaft angling through */}
      <hemisphereLight args={['#e9f6d2', '#4c6b34', 0.9]} />
      <ambientLight intensity={0.45} color="#eaf2cd" />
      <directionalLight position={[3, 10, -2]} intensity={0.8} color="#fdf3c1" />

      {/* mossy floor */}
      <mesh material={mossMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W * 2 + 24, D * 2 + 24]} />
      </mesh>

      {/* the stand */}
      {culms.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]} rotation={[c.lean, 0, c.lean * 0.7]}>
          <mesh material={culmMats[c.m]} position={[0, c.h / 2, 0]}>
            <cylinderGeometry args={[c.r * 0.85, c.r, c.h, 5]} />
          </mesh>
          {/* node rings */}
          {[0.3, 0.55, 0.8].map((f, j) => (
            <mesh key={j} material={nodeMat} position={[0, c.h * f, 0]}>
              <cylinderGeometry args={[c.r * 1.12, c.r * 1.12, 0.07, 5]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* the canopy overhead (the light gets green on the way down) */}
      {canopy.map((b, i) => (
        <mesh key={i} material={leafMat} position={[b.x, b.y, b.z]} scale={[1, 0.5, 1]}>
          <icosahedronGeometry args={[b.s, 0]} />
        </mesh>
      ))}
      {/* ground tufts */}
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

      {/* the stone lantern (tōrō), where the entry line opens out */}
      <group position={[-1.8, 0, 2.2]}>
        <mesh material={stoneMat} position={[0, 0.25, 0]}>
          <boxGeometry args={[0.9, 0.5, 0.9]} />
        </mesh>
        <mesh material={stoneMat} position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.16, 0.22, 0.8, 6]} />
        </mesh>
        <mesh material={stoneMat} position={[0, 1.45, 0]}>
          <boxGeometry args={[0.66, 0.5, 0.66]} />
        </mesh>
        <mesh material={stoneMat} position={[0, 1.85, 0]}>
          <coneGeometry args={[0.62, 0.4, 4]} />
        </mesh>
        {/* the little warm heart of it */}
        <pointLight position={[0, 1.45, 0]} intensity={0.5} distance={6} color="#ffe9b0" />
      </group>

      {/* the shishi-odoshi nook: basin stone,支柱 posts, the rocking spout */}
      <group position={[3.4, 0, 2.6]}>
        <mesh material={stoneMat} position={[0, 0.22, 0.5]}>
          <cylinderGeometry args={[0.55, 0.7, 0.44, 8]} />
        </mesh>
        {/* the strike stone */}
        <mesh material={stoneMat} position={[0.4, 0.5, 0]} scale={[1, 0.7, 1]}>
          <dodecahedronGeometry args={[0.3, 0]} />
        </mesh>
        {[-0.22, 0.22].map((z, i) => (
          <mesh key={i} material={nodeMat} position={[0, 0.55, z]}>
            <cylinderGeometry args={[0.05, 0.05, 1.1, 5]} />
          </mesh>
        ))}
        {/* the rocker (pivot at the posts; nose toward +X, over the stone) */}
        <group ref={rocker} position={[0, 1.05, 0]} rotation={[0, 0, -0.12]}>
          <mesh material={spoutMat} position={[0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.13, 1.5, 6]} />
          </mesh>
        </group>
      </group>

      {/* the bilingual plaque, hung by the way back to the gate */}
      <mesh material={signMat} position={[2.2, 3.1, -D + 0.35]}>
        <planeGeometry args={[3.8, 1.5]} />
      </mesh>

      {/* first time under the canopy: a quiet luck beat (durable, once) */}
      <FirstEntryReward secret="bamboo-grove" message="the grove lets you in — +1 LUCK" luck={1} />
    </group>
  );
}
