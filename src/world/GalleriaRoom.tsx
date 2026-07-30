import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  flatMat,
  makeAffineTexturedMaterial,
  makeBilingualSign,
  makeCheckerTexture,
  makeTextTexture,
  nearestify,
  seededRandom,
} from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GalleriaRoom — THE GALLERIA (ガレリア), the indoor mall on Main Street that
// pretends to be OUTDOORS (the fake skies of Las Vegas, via r/LiminalSpace): a
// long two-story promenade of stucco shopfronts under a PAINTED dusk-sky
// ceiling whose clouds never move, string lights, warm lamp globes, and a
// fountain playing to an empty hall. It bridges the street's two times of day —
// in off the noon, out the far end into the night — while inside it is always
// golden hour.
//
// REGISTER: warm-uncanny (unease 0.09), never a scare (taste guardrail). The
// joke is the sky: painted on, seamed, stuck at one perfect evening. A
// musicRoom: the fountain's plinks + a rare PA bing-bong for nobody + the hush
// own the space. WCAG-safe: every light is steady (nothing blinks), and the
// whole 3D world is off under reduced-motion anyway.
// ───────────────────────────────────────────────────────────────────────────

/** The painted sky: a dusk gradient + soft static cloud puffs on a canvas —
 *  an FX canvas (≤512, sanctioned), NearestFilter so it crunches like the rest.
 *  Two faint darker verticals are the PANEL SEAMS: the tell that somebody
 *  bolted this evening together. */
function makeSkyTexture(): THREE.Texture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#6f5f9e'); // dusk violet overhead
  grad.addColorStop(0.55, '#a97f96'); // mauve mid
  grad.addColorStop(1, '#e0a37e'); // peach horizon
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // soft pink-lit cloud BANKS — seeded so the sky is the SAME painting forever.
  // Fewer, bigger, horizontally-stretched puffs so they read as painted clouds
  // (not plaster texture) from 9 units below.
  const rnd = seededRandom(1996);
  const puff = (cx: number, cy: number, rr: number, col: string, a: number) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    for (let b = 0; b < 5; b++) {
      ctx.beginPath();
      ctx.ellipse(
        cx + (rnd() - 0.5) * rr * 2.6,
        cy + (rnd() - 0.5) * rr * 0.7,
        rr * (0.9 + rnd() * 0.9),
        rr * (0.38 + rnd() * 0.3),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  };
  for (let i = 0; i < 9; i++) {
    const cx = rnd() * w;
    const cy = 24 + rnd() * (h * 0.65);
    const r = 26 + rnd() * 34;
    // under-shadow first, lit body offset up, highlight on top
    puff(cx + 6, cy + 8, r, '#987b9c', 0.55);
    puff(cx, cy, r, '#eebdaa', 0.9);
    puff(cx - 5, cy - 7, r * 0.62, '#f8dcc8', 0.85);
  }
  ctx.globalAlpha = 1;
  // the seams — one evening bolted to the next
  ctx.fillStyle = 'rgba(58, 42, 72, 0.28)';
  ctx.fillRect(168, 0, 2, h);
  ctx.fillRect(344, 0, 2, h);
  return nearestify(new THREE.CanvasTexture(c));
}

export function GalleriaRoom({ room }: { room: Room }) {
  const fog = fogFor(room);
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const FACADE_H = 5.6; // the shopfronts' parapet — above it, the painted sky begins

  // Big marble checker underfoot (affine, so the polish swims — the Venetian tell).
  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(4, '#e6dcc4', '#c8b394');
    t.repeat.set(5, 10);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 4, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const skyTex = useMemo(() => makeSkyTexture(), []);
  // Self-lit: the sky is a painting with its own light in it, fog can't have it.
  const skyMat = useMemo(() => new THREE.MeshBasicMaterial({ map: skyTex }), [skyTex]);
  const horizonMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#dda184', side: THREE.DoubleSide }),
    [],
  );
  // Stucco storefront tones, warmed by the permanent golden hour.
  const stuccoMats = useMemo(
    () => ['#c99b78', '#b78a70', '#d0ab88', '#ad8b95'].map((c) => flatMat(c)),
    [],
  );
  const trimMat = useMemo(() => flatMat('#8a6a58'), []);
  const darkWin = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3a2f3e' }), []);
  const litWin = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8c67e' }), []);
  const glassMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2c2436' }), []);
  const awningMats = useMemo(() => ['#a63d3d', '#3d6b5e', '#b08340'].map((c) => flatMat(c)), []);
  const poleMat = useMemo(() => flatMat('#4a3a44'), []);
  const globeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), []);
  const bulbMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe2ae' }), []);
  const stoneMat = useMemo(() => flatMat('#b9a48e'), []);
  const waterMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8fc7cc' }), []);
  const jetMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#cfeef0', transparent: true, opacity: 0.7 }),
    [],
  );
  const benchMat = useMemo(() => flatMat('#7a5a48'), []);
  const shrubMat = useMemo(() => flatMat('#4d6b46'), []);
  const potMat = useMemo(() => flatMat('#8f5e4a'), []);
  useDispose(floorTex, floorMat, skyTex, skyMat, horizonMat, trimMat);
  useDispose(darkWin, litWin, glassMat, poleMat, globeMat, bulbMat);
  useDispose(stoneMat, waterMat, jetMat, benchMat, shrubMat, potMat);
  useDispose(...stuccoMats, ...awningMats);

  // Shop signboards — original parody mall-tenant names, warm on dark.
  const signTexes = useMemo(
    () =>
      ['CHEESE & THINGS', 'MOSTLY SUNGLASSES', 'PRETZEL INFINITY'].map((s) =>
        makeTextTexture(s, { fg: '#ffd9a0', bg: '#241a2a', w: 256, h: 64 }),
      ),
    [],
  );
  const signMats = useMemo(
    () => signTexes.map((t) => new THREE.MeshBasicMaterial({ map: t })),
    [signTexes],
  );
  // The GALLERIA lintel over each end door (the same building, both ends).
  const lintelTex = useMemo(
    () =>
      makeBilingualSign('ガレリア', 'GALLERIA', {
        bg: '#2a1e30',
        accent: '#e0a37e',
        jpColor: '#ffd9a0',
        enColor: '#dda184',
      }),
    [],
  );
  const lintelMat = useMemo(() => new THREE.MeshBasicMaterial({ map: lintelTex }), [lintelTex]);
  useDispose(...signTexes, ...signMats, lintelTex, lintelMat);

  // Two-story shopfronts down both long walls — a seeded terrace, kept clear of
  // nothing (the doors are on the ±Z ends, so the runs are unbroken).
  const shops = useMemo(() => {
    const rnd = seededRandom(2026);
    const out: {
      x: number;
      z: number;
      w: number;
      h: number;
      d: number;
      mat: number;
      awning: number;
      lit: number[];
    }[] = [];
    for (const side of [-1, 1]) {
      let z = -D + 1.2;
      while (z < D - 1.2) {
        const w = 2.6 + rnd() * 1.3;
        if (z + w > D - 1.2) break;
        const depth = 1.6 + rnd() * 0.9;
        out.push({
          x: side * (W - depth / 2 - 0.05),
          z: z + w / 2,
          w,
          h: FACADE_H - 0.3 + rnd() * 0.3,
          d: depth,
          mat: Math.floor(rnd() * stuccoMats.length),
          awning: Math.floor(rnd() * awningMats.length),
          // which upper windows glow warm (someone left the lights on, forever)
          lit: [0, 1, 2, 3].filter(() => rnd() < 0.22),
        });
        z += w + 0.12;
      }
    }
    return out;
  }, [W, D, stuccoMats.length, awningMats.length]);

  // String-light strands sagging across the promenade (static — nothing blinks).
  const strands = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (const z of [-7, 0, 7]) {
      for (let i = 0; i <= 8; i++) {
        const x = -5.2 + (i / 8) * 10.4;
        pts.push([x, 5.7 - 0.55 * (1 - (x / 5.2) ** 2), z]);
      }
    }
    return pts;
  }, []);

  // ── the mall's ambience: fountain plinks, a PA chime for nobody, the hush ──
  const plink = useRef(0.6);
  const pa = useRef(14);
  const hush = useRef(2.5);
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('A', 2), 0, 0.04); // set the empty-hall tone at once
  }, []);
  useFrame((_state, delta) => {
    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    const dt = Math.min(delta, 0.05);
    plink.current -= dt;
    if (plink.current <= 0) {
      // the fountain: small bright drops, just off-center
      const notes: [string, number][] = [
        ['E', 6],
        ['G', 6],
        ['A', 6],
        ['C', 7],
      ];
      const [n, o] = notes[Math.floor(Math.random() * notes.length)];
      audio.playChime(noteToFreq(n, o), (Math.random() - 0.5) * 0.5, 0.022, 0.35);
      plink.current = 0.35 + Math.random() * 0.55;
    }
    pa.current -= dt;
    if (pa.current <= 0) {
      // the PA bing-bong — and then no announcement follows, ever
      audio.playChime(noteToFreq('E', 5), 0, 0.05, 0.8);
      window.setTimeout(() => audio.playChime(noteToFreq('C', 5), 0, 0.045, 1.1), 300);
      pa.current = 24 + Math.random() * 16;
    }
    hush.current -= dt;
    if (hush.current <= 0) {
      audio.playColony(noteToFreq(Math.random() < 0.5 ? 'A' : 'E', 2), 0, 0.035);
      hush.current = 7 + Math.random() * 5;
    }
  });

  return (
    <group>
      {/* permanent golden hour: warm ambient, a dusk hemisphere off the painted
          sky, a low "sun" that isn't there, and two lamp pools down the walk */}
      <ambientLight intensity={0.74} color="#ecc9ac" />
      <hemisphereLight args={['#9585b2', '#d0a87e', 0.6]} />
      <directionalLight position={[6, 7, -4]} intensity={0.35} color="#ffd9a8" />
      <pointLight position={[0, 4.2, 5]} intensity={0.55} distance={12} color="#ffd9a0" />
      <pointLight position={[0, 4.2, -5]} intensity={0.55} distance={12} color="#ffd9a0" />

      {/* the marble promenade */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>

      {/* THE SKY — a painting where the ceiling should be */}
      <mesh material={skyMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* the horizon band above the parapets — where the paint meets the wall */}
      <mesh material={horizonMat} position={[0, (FACADE_H + H) / 2, -D + 0.02]}>
        <planeGeometry args={[W * 2, H - FACADE_H]} />
      </mesh>
      <mesh material={horizonMat} position={[0, (FACADE_H + H) / 2, D - 0.02]} rotation-y={Math.PI}>
        <planeGeometry args={[W * 2, H - FACADE_H]} />
      </mesh>
      <mesh
        material={horizonMat}
        rotation-y={Math.PI / 2}
        position={[-W + 0.02, (FACADE_H + H) / 2, 0]}
      >
        <planeGeometry args={[D * 2, H - FACADE_H]} />
      </mesh>
      <mesh
        material={horizonMat}
        rotation-y={-Math.PI / 2}
        position={[W - 0.02, (FACADE_H + H) / 2, 0]}
      >
        <planeGeometry args={[D * 2, H - FACADE_H]} />
      </mesh>

      {/* end walls below the horizon (the doors punch through these) */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          material={stuccoMats[3]}
          position={[0, FACADE_H / 2, s * (D - 0.05)]}
          rotation-y={s > 0 ? Math.PI : 0}
        >
          <planeGeometry args={[W * 2, FACADE_H]} />
        </mesh>
      ))}
      {/* GALLERIA over each end door */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          material={lintelMat}
          position={[0, 4.1, s * (D - 0.12)]}
          rotation-y={s > 0 ? Math.PI : 0}
        >
          <planeGeometry args={[3.6, 1.35]} />
        </mesh>
      ))}

      {/* the shopfront terraces */}
      {shops.map((b, i) => {
        const inward = b.x > 0 ? -1 : 1;
        const face = b.x + (inward * b.d) / 2 + inward * 0.01;
        return (
          <group key={i}>
            <mesh material={stuccoMats[b.mat]} position={[b.x, b.h / 2, b.z]}>
              <boxGeometry args={[b.d, b.h, b.w]} />
            </mesh>
            {/* ground-floor glass */}
            <mesh
              material={glassMat}
              position={[face, 1.15, b.z]}
              rotation-y={inward > 0 ? Math.PI / 2 : -Math.PI / 2}
            >
              <planeGeometry args={[b.w * 0.72, 2.0]} />
            </mesh>
            {/* the awning over it */}
            <mesh
              material={awningMats[b.awning]}
              position={[face + inward * 0.35, 2.5, b.z]}
              rotation-z={inward * 0.35}
            >
              <boxGeometry args={[0.85, 0.06, b.w * 0.8]} />
            </mesh>
            {/* second-story windows — a few lit warm, forever */}
            {[0, 1, 2, 3].map((w) => {
              const col = w % 2;
              const row = Math.floor(w / 2);
              return (
                <mesh
                  key={w}
                  material={b.lit.includes(w) ? litWin : darkWin}
                  position={[face, 3.35 + row * 1.0, b.z + (col - 0.5) * (b.w * 0.45)]}
                  rotation-y={inward > 0 ? Math.PI / 2 : -Math.PI / 2}
                >
                  <planeGeometry args={[b.w * 0.26, 0.66]} />
                </mesh>
              );
            })}
            {/* parapet */}
            <mesh material={trimMat} position={[b.x, b.h + 0.07, b.z]}>
              <boxGeometry args={[b.d + 0.12, 0.14, b.w + 0.1]} />
            </mesh>
          </group>
        );
      })}

      {/* three tenant signboards (fixed spots along the runs) */}
      {(
        [
          [-1, -6],
          [1, -2],
          [-1, 6],
        ] as const
      ).map(([side, z], i) => (
        <mesh
          key={i}
          material={signMats[i]}
          position={[side * (W - 0.6), 2.95, z]}
          rotation-y={side > 0 ? -Math.PI / 2 : Math.PI / 2}
        >
          <planeGeometry args={[2.3, 0.58]} />
        </mesh>
      ))}

      {/* the fountain, playing to the empty hall */}
      <group position={[0, 0, 0]}>
        <mesh material={stoneMat} position={[0, 0.4, 0]}>
          <cylinderGeometry args={[2.3, 2.5, 0.8, 8]} />
        </mesh>
        <mesh material={waterMat} rotation-x={-Math.PI / 2} position={[0, 0.62, 0]}>
          <circleGeometry args={[2.05, 8]} />
        </mesh>
        <mesh material={stoneMat} position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.32, 0.42, 1.1, 8]} />
        </mesh>
        <mesh material={stoneMat} position={[0, 1.78, 0]}>
          <cylinderGeometry args={[0.95, 0.75, 0.26, 8]} />
        </mesh>
        <mesh material={jetMat} position={[0, 2.35, 0]}>
          <cylinderGeometry args={[0.05, 0.09, 0.9, 6]} />
        </mesh>
      </group>

      {/* lamp posts with warm globes, flanking the walk */}
      {(
        [
          [-2.8, -5],
          [2.8, -5],
          [-2.8, 5],
          [2.8, 5],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={poleMat} position={[0, 1.7, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 3.4, 6]} />
          </mesh>
          <mesh material={globeMat} position={[0, 3.55, 0]}>
            <sphereGeometry args={[0.24, 8, 6]} />
          </mesh>
        </group>
      ))}

      {/* string lights sagging across the promenade */}
      {strands.map((p, i) => (
        <mesh key={i} material={bulbMat} position={p}>
          <sphereGeometry args={[0.07, 6, 5]} />
        </mesh>
      ))}

      {/* benches + planters around the fountain */}
      {(
        [
          [-1, -3.4],
          [1, 3.4],
        ] as const
      ).map(([s, z], i) => (
        <group key={i} position={[s * 1.6, 0, z]} rotation-y={s > 0 ? Math.PI : 0}>
          <mesh material={benchMat} position={[0, 0.45, 0]}>
            <boxGeometry args={[2.0, 0.12, 0.55]} />
          </mesh>
          <mesh material={benchMat} position={[0, 0.75, -0.28]} rotation-x={-0.2}>
            <boxGeometry args={[2.0, 0.6, 0.08]} />
          </mesh>
          {[-0.8, 0.8].map((lx) => (
            <mesh key={lx} material={poleMat} position={[lx, 0.22, 0]}>
              <boxGeometry args={[0.1, 0.44, 0.5]} />
            </mesh>
          ))}
        </group>
      ))}
      {(
        [
          [-4.2, -9],
          [4.2, -9],
          [-4.2, 9],
          [4.2, 9],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={potMat} position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.5, 0.4, 0.7, 7]} />
          </mesh>
          <mesh material={shrubMat} position={[0, 1.15, 0]}>
            <coneGeometry args={[0.55, 1.1, 7]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
