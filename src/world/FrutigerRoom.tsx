import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';

// ───────────────────────────────────────────────────────────────────────────
// FrutigerRoom — the Frutiger Aero pocket (Luke, 2026-06-22: "frutiger levels").
// A glossy, impossibly-optimistic 2008 hillside found through a too-clean door in
// the beige backrooms: blue-sky gradient, puffy clouds, rolling green "Bliss"
// hills, a low sun with a lens flare, floating glossy aqua bubbles, and a serene
// gel "media-player creature" (an original parody of the era's organic player
// skins — never a real mark). The reward-is-sound spine: a bright major chord on
// arrival over a slow optimistic pad.
//
// The ONE zone where the PS1 crunch is LIFTED (Luke explicitly chose this): while
// it's mounted it bumps the renderer's pixel ratio and drops `image-rendering:
// pixelated`, so it renders CLEAN + glossy — the sweet opposite of the wrong
// depths it sits beside. Both are restored on exit so the rest of the world stays
// crunchy. Desktop/motion-only like the whole 3D world (mobile skips it).
// ───────────────────────────────────────────────────────────────────────────

// ── canvas-texture helpers (soft, gradient, period-glossy) ──
function makeSkyTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#3f97df'); // zenith
  g.addColorStop(0.55, '#8ecbf2');
  g.addColorStop(1, '#e3f4ff'); // pale horizon
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 128);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function makeRadialTexture(inner: string, outer: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

// A puffy cloud — a clutch of soft white billboards so it reads as cumulus, not a
// single fuzzy blob. Drifts very slowly across the sky.
function Cloud({
  pos,
  scale,
  tex,
  speed,
}: {
  pos: [number, number, number];
  scale: number;
  tex: THREE.Texture;
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.95, fog: false }),
    [tex],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const puffs = useMemo(
    () =>
      [
        [0, 0, 1.0],
        [-0.7, -0.15, 0.7],
        [0.7, -0.12, 0.72],
        [-0.3, 0.2, 0.62],
        [0.35, 0.18, 0.66],
      ] as const,
    [],
  );
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    g.position.x += speed * dt;
    if (g.position.x > 60) g.position.x = -60; // wrap across the sky
  });
  return (
    <group ref={ref} position={pos} scale={scale}>
      {puffs.map(([x, y, s], i) => (
        <sprite key={i} position={[x, y, 0]} scale={[s * 2.2, s * 1.4, 1]} material={mat} />
      ))}
    </group>
  );
}

// A glossy aqua bubble — the Frutiger "gel" motif. Phong (the era's glossy shading)
// + a bright sun makes a hot specular dot, so it reads wet and glassy. Bobs + drifts.
function Bubble({ x, y, z, r }: { x: number; y: number; z: number; r: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const mat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: '#9fe7ef',
        emissive: '#10384a',
        specular: '#ffffff',
        shininess: 110,
        transparent: true,
        opacity: 0.5,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    m.position.y = y + Math.sin(t * 0.6 + phase) * 0.5;
    m.position.x = x + Math.cos(t * 0.4 + phase) * 0.4;
    m.rotation.y = t * 0.2;
  });
  return (
    <mesh ref={ref} position={[x, y, z]} material={mat}>
      <sphereGeometry args={[r, 20, 16]} />
    </mesh>
  );
}

// The gel creature — a serene, glossy green media-player "being" on the hill: a
// rounded body with little side speakers and a calm closed-eyes-and-smile face.
// Original parody of the era's organic player skins; bobs + breathes gently.
function GelCreature({ pos }: { pos: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: '#5fc23a',
        emissive: '#143a0c',
        specular: '#eaffe0',
        shininess: 90,
      }),
    [],
  );
  const darkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#13350a' }), []);
  const screenMat = useMemo(
    () => new THREE.MeshPhongMaterial({ color: '#bff0ff', emissive: '#2a6f8a', shininess: 120 }),
    [],
  );
  useEffect(
    () => () => {
      bodyMat.dispose();
      darkMat.dispose();
      screenMat.dispose();
    },
    [bodyMat, darkMat, screenMat],
  );
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = pos[1] + Math.sin(t * 0.9) * 0.12; // gentle float
    g.rotation.y = Math.sin(t * 0.3) * 0.12; // soft sway
  });
  return (
    <group ref={ref} position={pos}>
      {/* body — a glossy green ovoid */}
      <mesh material={bodyMat} scale={[1, 1.18, 0.9]}>
        <sphereGeometry args={[1.05, 24, 18]} />
      </mesh>
      {/* little side speakers */}
      <mesh material={bodyMat} position={[-1.05, 0, 0.1]} scale={[0.5, 0.7, 0.5]}>
        <sphereGeometry args={[0.5, 16, 12]} />
      </mesh>
      <mesh material={bodyMat} position={[1.05, 0, 0.1]} scale={[0.5, 0.7, 0.5]}>
        <sphereGeometry args={[0.5, 16, 12]} />
      </mesh>
      {/* a glossy "screen" inlay on the chest */}
      <mesh material={screenMat} position={[0, 0.15, 0.84]} rotation-x={-0.05}>
        <circleGeometry args={[0.42, 20]} />
      </mesh>
      {/* serene face: two closed-eye arcs + a soft smile (thin dark boxes) */}
      <mesh material={darkMat} position={[-0.34, 0.7, 0.82]} rotation-z={0.25}>
        <boxGeometry args={[0.26, 0.05, 0.05]} />
      </mesh>
      <mesh material={darkMat} position={[0.34, 0.7, 0.82]} rotation-z={-0.25}>
        <boxGeometry args={[0.26, 0.05, 0.05]} />
      </mesh>
      <mesh material={darkMat} position={[0, 0.42, 0.86]} rotation-z={0}>
        <boxGeometry args={[0.4, 0.05, 0.05]} />
      </mesh>
    </group>
  );
}

const BUBBLES = [
  { x: -4, y: 2.0, z: 2, r: 0.8 },
  { x: 5, y: 2.6, z: -1, r: 1.0 },
  { x: -7, y: 3.2, z: -5, r: 0.6 },
  { x: 3, y: 1.8, z: 4, r: 0.5 },
  { x: 8, y: 3.6, z: -7, r: 0.9 },
  { x: -2, y: 4.2, z: -9, r: 0.7 },
  { x: 1.5, y: 2.2, z: -3, r: 0.45 },
];

export function FrutigerRoom() {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);

  // LIFT the PS1 crunch while we're here (Luke's call): bump the pixel ratio and
  // drop the pixelated upscale so the zone renders clean + glossy. Restored on exit.
  useEffect(() => {
    const el = gl.domElement;
    const prevIR = el.style.imageRendering;
    const prevRatio = gl.getPixelRatio();
    setDpr(Math.min(2, window.devicePixelRatio || 1.5));
    el.style.imageRendering = 'auto';
    return () => {
      setDpr(prevRatio);
      el.style.imageRendering = prevIR;
    };
  }, [gl, setDpr]);

  // ── textures + materials ──
  const skyTex = useMemo(() => makeSkyTexture(), []);
  const puffTex = useMemo(
    () => makeRadialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
    [],
  );
  const sunGlowTex = useMemo(
    () => makeRadialTexture('rgba(255,247,224,1)', 'rgba(255,238,196,0)'),
    [],
  );
  const flareTex = useMemo(
    () => makeRadialTexture('rgba(190,235,255,0.9)', 'rgba(190,235,255,0)'),
    [],
  );

  const skyMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
    [skyTex],
  );
  const sunMat = useMemo(
    () => new THREE.SpriteMaterial({ map: sunGlowTex, transparent: true, opacity: 1, fog: false }),
    [sunGlowTex],
  );
  const sunDiscMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fffaf0', fog: false }),
    [],
  );
  const flareMat = useMemo(
    () => new THREE.SpriteMaterial({ map: flareTex, transparent: true, opacity: 0.5, fog: false }),
    [flareTex],
  );
  const groundMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6cc24a', roughness: 1, metalness: 0 }),
    [],
  );
  const hillMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5bb838', roughness: 1, metalness: 0 }),
    [],
  );
  const waterMat = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: '#46b6d8',
        emissive: '#0d3a4a',
        specular: '#ffffff',
        shininess: 140,
        transparent: true,
        opacity: 0.82,
      }),
    [],
  );
  useEffect(
    () => () => {
      skyTex.dispose();
      puffTex.dispose();
      sunGlowTex.dispose();
      flareTex.dispose();
      skyMat.dispose();
      sunMat.dispose();
      sunDiscMat.dispose();
      flareMat.dispose();
      groundMat.dispose();
      hillMat.dispose();
      waterMat.dispose();
    },
    [
      skyTex,
      puffTex,
      sunGlowTex,
      flareTex,
      skyMat,
      sunMat,
      sunDiscMat,
      flareMat,
      groundMat,
      hillMat,
      waterMat,
    ],
  );

  // The sun's world position (up + far, off to one side) — disc, glow, and a
  // couple of flare beads sit here; the directional light comes FROM here too.
  const SUN: [number, number, number] = [-16, 16, -46];

  // Bright major arrival chord + a slow optimistic pad bed — the reward is sound.
  const pad = useRef(2.0);
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('D', 3), 0, 0.07);
    audio.playColony(noteToFreq('A', 3), 0.2, 0.05);
    const t = ['D', 'F#', 'A', 'D'].map((n, i) =>
      window.setTimeout(
        () => audio.playChime(noteToFreq(n, i === 3 ? 6 : 5), 0, 0.12),
        200 + i * 200,
      ),
    );
    return () => t.forEach((id) => clearTimeout(id));
  }, []);

  useFrame((_, delta) => {
    pad.current -= Math.min(delta, 0.05);
    if (pad.current <= 0) {
      // a soft, bright major pad cycle (D / A / F#) — unhurried, optimistic
      const n = ['D', 'A', 'F#'][Math.floor(Math.random() * 3)];
      audio.playColony(noteToFreq(n, 3), (Math.random() - 0.5) * 0.6, 0.05);
      pad.current = 7 + Math.random() * 4;
    }
  });

  return (
    <group>
      {/* ── bright lush lighting (no PS1 flatness here) ── */}
      <hemisphereLight args={['#bfe6ff', '#4f9a2f', 0.95]} />
      <ambientLight intensity={0.3} color="#eaf6ff" />
      <directionalLight position={SUN} intensity={1.15} color="#fff3da" />

      {/* sky dome (unfogged backdrop) */}
      <mesh material={skyMat}>
        <sphereGeometry args={[140, 24, 16]} />
      </mesh>

      {/* the sun: a soft glow, a bright disc, and a few lens-flare beads */}
      <sprite position={SUN} scale={[26, 26, 1]} material={sunMat} />
      <mesh position={SUN} material={sunDiscMat}>
        <circleGeometry args={[3.4, 28]} />
      </mesh>
      <sprite position={[-10, 11, -32]} scale={[3, 3, 1]} material={flareMat} />
      <sprite position={[-4, 7, -22]} scale={[2, 2, 1]} material={flareMat} />
      <sprite position={[2, 4, -14]} scale={[3.4, 3.4, 1]} material={flareMat} />

      {/* puffy clouds drifting across the sky */}
      <Cloud pos={[-14, 11, -34]} scale={4.5} tex={puffTex} speed={0.25} />
      <Cloud pos={[12, 13, -42]} scale={6} tex={puffTex} speed={0.18} />
      <Cloud pos={[2, 9, -26]} scale={3.6} tex={puffTex} speed={0.32} />
      <Cloud pos={[24, 10, -30]} scale={5} tex={puffTex} speed={0.22} />

      {/* the green vista: a broad ground plane + rolling "Bliss" hills (smooth
          half-buried mounds receding into the haze) */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[300, 300]} />
      </mesh>
      <mesh material={hillMat} position={[-6, -13, -40]}>
        <sphereGeometry args={[20, 24, 18]} />
      </mesh>
      <mesh material={hillMat} position={[18, -16, -52]}>
        <sphereGeometry args={[26, 24, 18]} />
      </mesh>
      <mesh material={hillMat} position={[-26, -18, -58]}>
        <sphereGeometry args={[28, 24, 18]} />
      </mesh>
      <mesh material={hillMat} position={[8, -9, -24]}>
        <sphereGeometry args={[13, 20, 16]} />
      </mesh>

      {/* a glossy little pond catching the sky */}
      <mesh material={waterMat} rotation-x={-Math.PI / 2} position={[-6, 0.03, -8]}>
        <circleGeometry args={[4.2, 28]} />
      </mesh>

      {/* the gel creature on the near hill, and the floating bubbles */}
      <GelCreature pos={[3.5, 1.6, -6]} />
      {BUBBLES.map((b, i) => (
        <Bubble key={i} {...b} />
      ))}

      {/* clamp lights: a touch of fill from the front so the creature's face reads */}
      <pointLight position={[0, 4, 10]} intensity={0.35} distance={26} color="#eaffff" />
    </group>
  );
}
