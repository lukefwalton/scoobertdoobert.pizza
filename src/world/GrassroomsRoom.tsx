import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat } from './ps1';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { exposeTestGlobal } from '../lib/testHooks';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GrassroomsRoom — "The Grassrooms" (草の間), inspired by the r/LiminalSpace
// 3D-printed piece: the backrooms after NATURE wins. An endless white office/mall
// interior whose floor has gone wall-to-wall GRASS, flecked with little blue
// wildflowers, low-poly trees growing INDOORS, and one lonely white dresser. The
// low white ceiling breaks open over the middle to an impossibly blue, wispy-cloud
// sky — the killer beat from the reference. Calm, sunlit, gently wrong.
//
// REGISTER: a FULLY SWEET breather (Luke's call). baseUnease sits below SAFE (it
// DECAYS — see dread.ts), so it never curdles; it's a relief exhale among the
// bitter depths (taste guardrail — the contrast is the point). It's a `musicRoom`:
// the carried jukebox voice fades out (RoomEnvironment) and the space sings its
// own soft ambient — a low wind pad + the occasional furin chime drifting off the
// indoor trees on a breeze (the shared bell engine, mute-aware + voice-capped, so
// it degrades to silence and never spikes; WCAG 2.3.1).
//
// PS1 register throughout: unlit flat-white walls (overexposed, like the photo),
// crossed-alpha grass quads ≤32px NearestFilter, fog for the endless feel, blocky
// trees. A bilingual canvas sign hangs at the entrance (草の間 / THE GRASSROOMS) —
// the site keeps its words in English AND Japanese (cf. 青函トンネル, 二拍手).
// ───────────────────────────────────────────────────────────────────────────

// A grass-blade sprite — green verticals on transparent, 32px + NearestFilter
// (PS1). Two crossed quads of it read as a tuft of tall grass. (Same approach as
// GrassRoom; re-spelled here so the rooms stay self-contained.)
function makeGrassTexture(): THREE.Texture {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, s, s);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    const blades: [string, number][] = [
      ['#6f9a3e', 7],
      ['#83b24a', 13],
      ['#5f8a36', 19],
      ['#8fc056', 25],
    ];
    for (const [col, x] of blades) {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, s);
      ctx.quadraticCurveTo(x + (x < s / 2 ? -3 : 3), s * 0.45, x + (x < s / 2 ? -2 : 2), 3);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// A bilingual plaque: the Japanese line over the English, drawn to a small
// NearestFilter canvas so it reads as a printed sign, not a clean modern label.
// Every word in this level stays EN + JP (cf. 青函トンネル / 二拍手 elsewhere).
function makeSignTexture(jp: string, en: string): THREE.Texture {
  const w = 256;
  const h = 96;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f3f4ee';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3a5a32';
    ctx.fillRect(0, 0, w, 4);
    ctx.fillRect(0, h - 4, w, 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2f4a2a';
    ctx.font = 'bold 40px "Hiragino Kaku Gothic Pro", "Yu Gothic", sans-serif';
    ctx.fillText(jp, w / 2, 48);
    ctx.fillStyle = '#4a6a40';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText(en, w / 2, 80);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// Tiny seeded LCG so the scatter is STABLE across frames/reloads (never reshuffles).
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
}

// The white partition slabs + square pillars (the office bones nature grew over).
// Hand-authored so they leave the entrance lane (+Z, x≈0) and the central skylight
// clear, and read as the photo's irregular white maze. [x, z, w, d, h, rotY].
const SLABS: [number, number, number, number, number, number][] = [
  [-6.5, 4.5, 2.6, 0.5, 3.6, 0.15],
  [-7.0, -1.0, 0.7, 0.7, 3.8, 0], // square pillar
  [-5.2, -5.5, 3.0, 0.5, 3.5, -0.2],
  [-2.2, -7.0, 2.4, 0.5, 3.6, 0.1],
  [2.4, -6.8, 2.6, 0.5, 3.5, -0.1],
  [5.4, -5.2, 3.0, 0.5, 3.6, 0.25],
  [7.0, -0.5, 0.7, 0.7, 3.8, 0], // square pillar
  [6.6, 4.6, 2.4, 0.5, 3.5, -0.15],
  [-3.6, 0.5, 0.6, 0.6, 3.8, 0], // square pillar near the skylight edge
  [3.6, 0.4, 0.6, 0.6, 3.8, 0], // square pillar near the skylight edge
];

export function GrassroomsRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const CEIL = room.dims.height;

  const { gl } = useThree();
  const openArcade = useSceneStore((s) => s.openArcade);

  const grassTex = useMemo(makeGrassTexture, []);
  const signTex = useMemo(() => makeSignTexture('草の間', 'THE GRASSROOMS'), []);
  const raceTex = useMemo(() => makeSignTexture('ゴーストとレース', 'RACE THE GHOST'), []);
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
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }),
    [signTex],
  );
  const raceMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: raceTex, side: THREE.DoubleSide }),
    [raceTex],
  );
  // The parked pizza go-kart's body + the floating ghost that wants a race.
  const kartMat = useMemo(() => flatMat('#e23b2e'), []);
  const kartTrimMat = useMemo(() => flatMat('#2a2622'), []);
  const ghostMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f4f0ff' }), []);
  // Unlit flat white for the office bones — overexposed, like the reference photo.
  const wallMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#eef1ec' }), []);
  const ceilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8ebe4' }), []);
  // The sky through the broken ceiling — bright, impossible blue + soft clouds.
  const skyMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#4aa6ff' }), []);
  const cloudMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f2f8ff' }), []);
  const flowerMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#5a6cf0' }), []);
  // Lit (flatMat = Lambert) green ground + blocky trees / the lonely dresser.
  const groundMat = useMemo(() => flatMat('#5c7f3a'), []);
  const trunkMat = useMemo(() => flatMat('#6b4f32'), []);
  const leafMat = useMemo(() => flatMat('#4f7233'), []);
  const dresserMat = useMemo(() => flatMat('#d9d6cc'), []);
  const drawerMat = useMemo(() => flatMat('#c2bdae'), []);

  useEffect(
    () => () => {
      grassTex.dispose();
      signTex.dispose();
      raceTex.dispose();
      [
        grassMat,
        signMat,
        raceMat,
        kartMat,
        kartTrimMat,
        ghostMat,
        wallMat,
        ceilMat,
        skyMat,
        cloudMat,
        flowerMat,
        groundMat,
        trunkMat,
        leafMat,
        dresserMat,
        drawerMat,
      ].forEach((m) => m.dispose());
    },
    [
      grassTex,
      signTex,
      raceTex,
      grassMat,
      signMat,
      raceMat,
      kartMat,
      kartTrimMat,
      ghostMat,
      wallMat,
      ceilMat,
      skyMat,
      cloudMat,
      flowerMat,
      groundMat,
      trunkMat,
      leafMat,
      dresserMat,
      drawerMat,
    ],
  );

  // Open the ghost kart-battle (おばけグランプリ) — shared by the kart's click and a
  // test hook so shoot:grassrooms can launch it without a precise 3D click.
  const raceTheGhost = () => openArcade('ghost-kart');
  useEffect(() => {
    exposeTestGlobal('__sdpRaceGhost', raceTheGhost);
    return () => exposeTestGlobal('__sdpRaceGhost', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grass tufts on a jittered grid (keep a clear lane down the entrance, +Z x≈0).
  const tufts = useMemo(() => {
    const out: { x: number; z: number; s: number; r: number }[] = [];
    const rnd = lcg(1996);
    for (let gx = -W + 1; gx <= W - 1; gx += 1.5) {
      for (let gz = -D + 1; gz <= D - 1; gz += 1.5) {
        const x = gx + (rnd() - 0.5) * 1.0;
        const z = gz + (rnd() - 0.5) * 1.0;
        if (Math.abs(x) < 1.6 && z > 5) continue; // entrance lane stays walkable
        out.push({ x, z, s: 0.55 + rnd() * 0.55, r: rnd() * Math.PI });
      }
    }
    return out;
  }, [W, D]);

  // Little blue wildflowers dotted through the grass — the photo's bluebells.
  const flowers = useMemo(() => {
    const out: { x: number; z: number; s: number }[] = [];
    const rnd = lcg(424242);
    for (let i = 0; i < 60; i++) {
      const x = (rnd() - 0.5) * (W - 0.5) * 2;
      const z = (rnd() - 0.5) * (D - 0.5) * 2;
      if (Math.abs(x) < 1.6 && z > 5) continue;
      out.push({ x, z, s: 0.08 + rnd() * 0.08 });
    }
    return out;
  }, [W, D]);

  // ── the room's own ambient: a low wind pad + furin chimes off the trees ──────
  // A `musicRoom`, so the carried song is faded out (RoomEnvironment) and the
  // space sings for itself: a soft breeze pad every several seconds + an
  // occasional pentatonic bell, panned, mute-aware + voice-capped (degrades to
  // silence, never spikes — WCAG 2.3.1; a SWEET room).
  const wind = useRef(2.0);
  const chime = useRef(3.5);
  const ghostRef = useRef<THREE.Group>(null);
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('A', 2), 0, 0.05); // the breeze, straight away
  }, []);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    // the little ghost hovering by its kart, bobbing + drifting (it wants a race)
    const gm = ghostRef.current;
    if (gm) {
      const t = state.clock.elapsedTime;
      gm.position.y = 1.7 + Math.sin(t * 1.4) * 0.18;
      gm.rotation.y = Math.sin(t * 0.6) * 0.4;
    }
    wind.current -= dt;
    if (wind.current <= 0) {
      audio.playColony(
        noteToFreq(Math.random() < 0.5 ? 'A' : 'E', 2),
        (Math.random() - 0.5) * 1.2,
        0.045,
      );
      wind.current = 7 + Math.random() * 4;
    }
    chime.current -= dt;
    if (chime.current <= 0) {
      // D-major pentatonic, same family as the shrine furin / the grove blooms.
      const notes = ['D', 'E', 'F#', 'A', 'B'];
      const n = notes[Math.floor(Math.random() * notes.length)];
      audio.playChime(noteToFreq(n, 5), (Math.random() - 0.5) * 1.4, 0.1, 1.6);
      chime.current = 4 + Math.random() * 5;
    }
  });

  // The central skylight footprint (the hole in the ceiling). Ceiling is built as
  // four panels around it so the sky shows through the middle.
  const HOLE = 3; // half-size of the square aperture
  const ceilY = CEIL;

  return (
    <group>
      {/* Bright sunlit daylight — flatMat (Lambert) ground/trees need light, and
          the open skylight should feel like a sunbeam. Warm + airy, never harsh. */}
      <ambientLight intensity={0.85} color="#fbf6e8" />
      <hemisphereLight args={['#bfe2ff', '#5c7f3a', 0.6]} />
      <directionalLight position={[2, 12, 3]} intensity={0.7} color="#fff3d6" />

      {/* the grass floor (extends past the camera clamp, dissolving into fog) */}
      <mesh material={groundMat} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 10, D * 2 + 10]} />
      </mesh>

      {/* the four outer walls (flat white, unlit) */}
      {(
        [
          [0, ceilY / 2, -D, W * 2, 0],
          [0, ceilY / 2, D, W * 2, 0],
          [-W, ceilY / 2, 0, D * 2, Math.PI / 2],
          [W, ceilY / 2, 0, D * 2, Math.PI / 2],
        ] as const
      ).map(([x, y, z, len, r], i) => (
        <mesh key={i} material={wallMat} position={[x, y, z]} rotation={[0, r, 0]}>
          <planeGeometry args={[len, ceilY]} />
        </mesh>
      ))}

      {/* the low white ceiling — four panels around the central skylight hole */}
      {(
        [
          [0, (D + HOLE) / 2 + HOLE, W * 2 + 10, D - HOLE], // toward +Z
          [0, -((D + HOLE) / 2 + HOLE), W * 2 + 10, D - HOLE], // toward -Z
          [-((W + HOLE) / 2), 0, W - HOLE, HOLE * 2], // -X strip beside the hole
          [(W + HOLE) / 2, 0, W - HOLE, HOLE * 2], // +X strip beside the hole
        ] as const
      ).map(([cx, cz, sw, sd], i) => (
        <mesh key={i} material={ceilMat} position={[cx, ceilY, cz]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[sw, sd]} />
        </mesh>
      ))}

      {/* the impossibly blue sky + drifting clouds, seen UP through the hole */}
      <mesh material={skyMat} position={[0, ceilY + 9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[34, 34]} />
      </mesh>
      {(
        [
          [-2.2, ceilY + 4.5, -1.4, 2.6],
          [2.4, ceilY + 5.2, 1.0, 3.0],
          [0.4, ceilY + 6.0, 2.0, 2.2],
        ] as const
      ).map(([x, y, z, s], i) => (
        <mesh key={i} material={cloudMat} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[s, s * 0.6]} />
        </mesh>
      ))}
      {/* a soft shaft of light pouring in through the skylight */}
      <pointLight position={[0, ceilY - 0.5, 0]} intensity={0.8} distance={14} color="#fff2cf" />

      {/* the white office bones — partition slabs + square pillars, nature-grown */}
      {SLABS.map(([x, z, w, d, h, r], i) => (
        <mesh key={i} material={wallMat} position={[x, h / 2, z]} rotation={[0, r, 0]}>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      ))}

      {/* the bilingual entrance plaque (草の間 / THE GRASSROOMS), hung over the way in */}
      <mesh material={signMat} position={[0, 2.7, D - 0.3]}>
        <planeGeometry args={[3.2, 1.2]} />
      </mesh>

      {/* tall grass — crossed alpha quads, knee-to-waist high, wall to wall */}
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

      {/* the little blue wildflowers (the photo's bluebells) */}
      {flowers.map((f, i) => (
        <mesh key={i} material={flowerMat} position={[f.x, 0.18, f.z]}>
          <icosahedronGeometry args={[f.s, 0]} />
        </mesh>
      ))}

      {/* a few trees growing INDOORS (trunk + a blocky canopy under the low ceiling) */}
      {(
        [
          [-5.5, -3.0],
          [4.8, -4.2],
          [5.8, 3.0],
        ] as const
      ).map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh material={trunkMat} position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.22, 0.34, 2.4, 6]} />
          </mesh>
          <mesh material={leafMat} position={[0, 3.0, 0]}>
            <icosahedronGeometry args={[1.4, 0]} />
          </mesh>
        </group>
      ))}

      {/* the one lonely white dresser, marooned in the grass (the domestic tell) */}
      <group position={[-6.4, 0, 2.4]} rotation={[0, 0.3, 0]}>
        <mesh material={dresserMat} position={[0, 0.65, 0]}>
          <boxGeometry args={[1.3, 1.3, 0.7]} />
        </mesh>
        {[0.3, 0.65, 1.0].map((y, i) => (
          <mesh key={i} material={drawerMat} position={[0, y, 0.36]}>
            <boxGeometry args={[1.05, 0.26, 0.04]} />
          </mesh>
        ))}
      </group>

      {/* the parked pizza go-kart + the floating ghost that wants a race. Click it
          (or its ghost) to drop into おばけグランプリ / GHOST GRAND PRIX — the
          balloon battle. A bilingual sign floats above, words EN + JP. */}
      <group
        position={[4.5, 0, 4.4]}
        rotation={[0, -0.5, 0]}
        onClick={(e) => {
          e.stopPropagation();
          raceTheGhost();
        }}
        onPointerOver={() => {
          gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
        }}
        onPointerOut={() => {
          gl.domElement.style.cursor = 'grab';
        }}
      >
        {/* the kart: a chunky red body, a seat back, four black wheels */}
        <mesh material={kartMat} position={[0, 0.34, 0]}>
          <boxGeometry args={[0.95, 0.34, 1.5]} />
        </mesh>
        <mesh material={kartMat} position={[0, 0.62, -0.45]}>
          <boxGeometry args={[0.8, 0.4, 0.12]} />
        </mesh>
        {(
          [
            [-0.52, -0.55],
            [0.52, -0.55],
            [-0.52, 0.55],
            [0.52, 0.55],
          ] as const
        ).map(([x, z], i) => (
          <mesh
            key={i}
            material={kartTrimMat}
            position={[x, 0.22, z]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.22, 0.22, 0.16, 10]} />
          </mesh>
        ))}
        {/* the floating ghost (bobs via ghostRef) — sheet body + two dark eyes */}
        <group ref={ghostRef} position={[0, 1.7, 0.2]}>
          <mesh material={ghostMat}>
            <sphereGeometry args={[0.42, 10, 8]} />
          </mesh>
          <mesh material={ghostMat} position={[0, -0.34, 0]}>
            <coneGeometry args={[0.42, 0.5, 10]} />
          </mesh>
          <mesh material={kartTrimMat} position={[-0.14, 0.06, 0.36]}>
            <sphereGeometry args={[0.06, 6, 6]} />
          </mesh>
          <mesh material={kartTrimMat} position={[0.14, 0.06, 0.36]}>
            <sphereGeometry args={[0.06, 6, 6]} />
          </mesh>
        </group>
        {/* the bilingual race sign floating over the kart */}
        <mesh material={raceMat} position={[0, 2.9, 0]}>
          <planeGeometry args={[2.6, 1.0]} />
        </mesh>
      </group>
    </group>
  );
}
