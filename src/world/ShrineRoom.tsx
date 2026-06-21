import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { applyVertexSnap, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import type { Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// ShrineRoom — the Japan level (scaffold). The one OUTDOOR, *sweet* deep room:
// a rural golden-hour dusk with a torii path, a little wayside shrine, a country
// railway crossing, distant vaporwave mountains, and fireflies. A breather among
// the bitter depths (taste guardrail — the contrast is the point).
//
// Built procedurally from primitives in the PS1 register (flat-shaded, vertex-
// snapped, fogged) — torii are two posts + two beams, the shrine is a platform +
// a gabled roof, the tracks are rails + sleepers. Original parody only (no real
// marks). The tracks run off into the fog toward a future metro-tunnel GLB
// hookup ("connect to the tunnel cuz of trains"). All easy to swap for sourced
// GLBs later; this gets the place STANDING.
// ───────────────────────────────────────────────────────────────────────────

function flatMat(color: string, side: THREE.Side = THREE.FrontSide, map?: THREE.Texture): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, map, flatShading: true, side });
  applyVertexSnap(m, 64);
  return m;
}

// A torii gate: two pillars, the lower tie-beam (nuki), the top lintel (kasagi +
// shimaki), and the little centre strut. Vermilion. Spans the path at `z`.
function Torii({
  z,
  span = 2.6,
  height = 3.6,
  mat,
}: {
  z: number;
  span?: number;
  height?: number;
  mat: THREE.Material;
}) {
  const px = span / 2;
  return (
    <group position={[0, 0, z]}>
      {/* pillars */}
      <mesh material={mat} position={[-px, height / 2, 0]}>
        <boxGeometry args={[0.22, height, 0.22]} />
      </mesh>
      <mesh material={mat} position={[px, height / 2, 0]}>
        <boxGeometry args={[0.22, height, 0.22]} />
      </mesh>
      {/* nuki — lower tie beam */}
      <mesh material={mat} position={[0, height * 0.72, 0]}>
        <boxGeometry args={[span + 0.5, 0.18, 0.26]} />
      </mesh>
      {/* shimaki — beam under the lintel */}
      <mesh material={mat} position={[0, height - 0.16, 0]}>
        <boxGeometry args={[span + 1.0, 0.16, 0.28]} />
      </mesh>
      {/* kasagi — the top lintel */}
      <mesh material={mat} position={[0, height + 0.04, 0]}>
        <boxGeometry args={[span + 1.4, 0.24, 0.34]} />
      </mesh>
      {/* gakuzuka — centre strut */}
      <mesh material={mat} position={[0, height * 0.86, 0]}>
        <boxGeometry args={[0.16, height * 0.28, 0.2]} />
      </mesh>
    </group>
  );
}

// A stone lantern (tōrō): stacked blocks with a softly lit firebox.
function Lantern({
  x,
  z,
  stone,
  glow,
}: {
  x: number;
  z: number;
  stone: THREE.Material;
  glow: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh material={stone} position={[0, 0.18, 0]}>
        <boxGeometry args={[0.5, 0.36, 0.5]} />
      </mesh>
      <mesh material={stone} position={[0, 0.62, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
      </mesh>
      {/* firebox — the lit chamber */}
      <mesh material={glow} position={[0, 1.0, 0]}>
        <boxGeometry args={[0.4, 0.36, 0.4]} />
      </mesh>
      {/* cap */}
      <mesh material={stone} position={[0, 1.3, 0]}>
        <coneGeometry args={[0.42, 0.3, 4]} />
      </mesh>
      <pointLight position={[0, 1.0, 0]} intensity={0.35} distance={4} color="#ffcf7a" />
    </group>
  );
}

// Fireflies — drifting glowing points in the dusk. THREE.Points so they read as
// chunky glowing pixels under the low-res render; each bobs on its own phase.
function Fireflies({ count = 44 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const sprite = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,210,1)');
    g.addColorStop(1, 'rgba(255,255,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  }, []);

  // Seed base positions + per-point bob phase/speed.
  const seed = useMemo(() => {
    const base = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      base[i * 3] = (Math.random() - 0.5) * 16; // x
      base[i * 3 + 1] = 0.5 + Math.random() * 3.2; // y
      base[i * 3 + 2] = -12 + Math.random() * 22; // z (down the path)
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.4 + Math.random() * 0.8;
    }
    return { base, phase, speed };
  }, [count]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(seed.base.slice(), 3));
    return g;
  }, [seed]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#eaff8c',
        map: sprite,
        size: 0.22,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
    [sprite],
  );

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const ph = seed.phase[i];
      const sp = seed.speed[i];
      arr[i * 3] = seed.base[i * 3] + Math.sin(t * sp * 0.6 + ph) * 0.8;
      arr[i * 3 + 1] = seed.base[i * 3 + 1] + Math.sin(t * sp + ph) * 0.35;
      arr[i * 3 + 2] = seed.base[i * 3 + 2] + Math.cos(t * sp * 0.5 + ph) * 0.8;
    }
    attr.needsUpdate = true;
    // gentle collective twinkle
    mat.opacity = 0.7 + Math.sin(t * 2.3) * 0.2;
  });

  useEffect(
    () => () => {
      geom.dispose();
      mat.dispose();
      sprite.dispose();
    },
    [geom, mat, sprite],
  );

  return <points ref={ref} geometry={geom} material={mat} />;
}

export function ShrineRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const fog = { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };

  // ── materials (shared) ──
  const grassTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#5f7a3a', '#6f8a44'); // two dusk greens
    t.repeat.set(6, 6);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(grassTex, 8, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grassTex, fog.color, fog.near, fog.far],
  );
  const pathTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#b9a982', '#c6b78e'); // pale gravel
    t.repeat.set(1, 8);
    return t;
  }, []);
  const pathMat = useMemo(
    () => makeAffineTexturedMaterial(pathTex, 2, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathTex, fog.color, fog.near, fog.far],
  );
  const toriiMat = useMemo(() => flatMat('#c4352a'), []); // vermilion
  const woodMat = useMemo(() => flatMat('#6b4a2f', THREE.DoubleSide), []);
  const roofMat = useMemo(() => flatMat('#33414c', THREE.DoubleSide), []); // dark slate
  const stoneMat = useMemo(() => flatMat('#9a958a'), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe6a0' }), []);
  const railMat = useMemo(() => flatMat('#aab0b6'), []);
  const sleeperMat = useMemo(() => flatMat('#3a2e22'), []);
  const ballastMat = useMemo(() => flatMat('#6f6a60'), []);
  const trainBodyMat = useMemo(() => flatMat('#c9c2a6', THREE.DoubleSide), []); // cream
  const trainStripeMat = useMemo(() => flatMat('#3f6b4a'), []); // rural green stripe
  const trainGlassMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#23303a' }), []);
  const mountainMat = useMemo(() => flatMat('#7d6f96', THREE.DoubleSide), []); // dusty vaporwave blue
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffdca0' }), []);
  const concreteMat = useMemo(() => flatMat('#6a6e72'), []); // the tunnel portal surround
  const portalDarkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#08090d' }), []); // its mouth

  // dispose the canvas textures we generated
  useEffect(
    () => () => {
      grassTex.dispose();
      pathTex.dispose();
    },
    [grassTex, pathTex],
  );

  // sleeper cross-ties along the crossing (placed along X)
  const sleepers = useMemo(() => {
    const xs: number[] = [];
    for (let x = -W - 4; x <= W + 4; x += 1.3) xs.push(x);
    return xs;
  }, [W]);

  const TRACK_Z = 2; // the level crossing sits between you and the shrine

  return (
    <group>
      {/* ── dusk lighting: warm sky, a low sun, soft ground bounce ── */}
      <hemisphereLight args={['#f0d6a0', '#42502c', 0.7]} />
      <ambientLight intensity={0.35} color="#ffe0bd" />
      <directionalLight position={[-7, 5, -10]} intensity={0.7} color="#ffcf95" />

      {/* ground + central path */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2 + 12, D * 2 + 12]} />
      </mesh>
      <mesh material={pathMat} rotation-x={-Math.PI / 2} position={[0, 0.02, 1]}>
        <planeGeometry args={[2.4, D * 2]} />
      </mesh>

      {/* the torii path — gates receding toward the shrine (one behind you, at
          the entrance, so you step out from under it) */}
      <Torii z={12} mat={toriiMat} />
      <Torii z={7.5} mat={toriiMat} />
      <Torii z={-1.5} span={2.8} height={3.9} mat={toriiMat} />
      <Torii z={-6.5} span={3.0} height={4.1} mat={toriiMat} />

      {/* stone lanterns flanking the path */}
      <Lantern x={-2.3} z={9} stone={stoneMat} glow={glowMat} />
      <Lantern x={2.3} z={9} stone={stoneMat} glow={glowMat} />
      <Lantern x={-2.6} z={-4.5} stone={stoneMat} glow={glowMat} />
      <Lantern x={2.6} z={-4.5} stone={stoneMat} glow={glowMat} />

      {/* ── the wayside shrine (honden) at the far end ── */}
      <group position={[0, 0, -10.5]}>
        {/* stone base */}
        <mesh material={stoneMat} position={[0, 0.2, 0]}>
          <boxGeometry args={[4.2, 0.4, 3.2]} />
        </mesh>
        {/* raised wooden floor */}
        <mesh material={woodMat} position={[0, 0.55, 0]}>
          <boxGeometry args={[3.5, 0.3, 2.7]} />
        </mesh>
        {/* corner posts */}
        {[
          [-1.5, -1.1],
          [1.5, -1.1],
          [-1.5, 1.1],
          [1.5, 1.1],
        ].map(([x, z], i) => (
          <mesh key={i} material={woodMat} position={[x, 1.5, z]}>
            <boxGeometry args={[0.18, 1.9, 0.18]} />
          </mesh>
        ))}
        {/* back + side walls (front left open to see in) */}
        <mesh material={woodMat} position={[0, 1.4, -1.25]}>
          <boxGeometry args={[3.4, 1.7, 0.12]} />
        </mesh>
        <mesh material={woodMat} position={[-1.65, 1.4, 0]}>
          <boxGeometry args={[0.12, 1.7, 2.4]} />
        </mesh>
        <mesh material={woodMat} position={[1.65, 1.4, 0]}>
          <boxGeometry args={[0.12, 1.7, 2.4]} />
        </mesh>
        {/* gabled roof — two slate planes meeting at a ridge, deep overhang */}
        <mesh material={roofMat} position={[0, 2.9, -0.95]} rotation-x={-0.62}>
          <planeGeometry args={[4.8, 2.3]} />
        </mesh>
        <mesh material={roofMat} position={[0, 2.9, 0.95]} rotation-x={Math.PI + 0.62}>
          <planeGeometry args={[4.8, 2.3]} />
        </mesh>
        {/* ridge beam */}
        <mesh material={woodMat} position={[0, 3.45, 0]}>
          <boxGeometry args={[4.9, 0.18, 0.18]} />
        </mesh>
        {/* a small offering box at the front */}
        <mesh material={woodMat} position={[0, 0.85, 1.7]}>
          <boxGeometry args={[1.0, 0.6, 0.5]} />
        </mesh>
      </group>

      {/* ── the country railway crossing (tracks run along X, off into the fog
            toward the future tunnel) ── */}
      <mesh material={ballastMat} rotation-x={-Math.PI / 2} position={[0, 0.03, TRACK_Z]}>
        <planeGeometry args={[W * 2 + 10, 2.6]} />
      </mesh>
      {sleepers.map((x, i) => (
        <mesh key={i} material={sleeperMat} position={[x, 0.09, TRACK_Z]}>
          <boxGeometry args={[0.5, 0.14, 2.2]} />
        </mesh>
      ))}
      <mesh material={railMat} position={[0, 0.18, TRACK_Z - 0.7]}>
        <boxGeometry args={[W * 2 + 10, 0.12, 0.1]} />
      </mesh>
      <mesh material={railMat} position={[0, 0.18, TRACK_Z + 0.7]}>
        <boxGeometry args={[W * 2 + 10, 0.12, 0.1]} />
      </mesh>

      {/* a single rail car parked on the crossing — pulled clear to the -X side
          (just left the tunnel), trailing off into the fog */}
      <group position={[-9, 0, TRACK_Z]}>
        <mesh material={trainBodyMat} position={[0, 1.4, 0]}>
          <boxGeometry args={[6.5, 2.0, 1.7]} />
        </mesh>
        <mesh material={roofMat} position={[0, 2.5, 0]}>
          <boxGeometry args={[6.5, 0.3, 1.8]} />
        </mesh>
        {/* window strip + green livery stripe */}
        <mesh material={trainGlassMat} position={[0, 1.7, 0.86]}>
          <boxGeometry args={[5.6, 0.7, 0.05]} />
        </mesh>
        <mesh material={trainStripeMat} position={[0, 1.0, 0.86]}>
          <boxGeometry args={[6.5, 0.3, 0.06]} />
        </mesh>
      </group>

      {/* the tunnel portal at the +X end — where the rails run underground. The
          way DEEPER (the metro-tunnel GLB level) is on the other side; the
          'shrine-to-tunnel' door in rooms.ts sits just in front of this mouth. */}
      <group position={[11.5, 0, TRACK_Z]}>
        {/* concrete surround flanking the track gauge, + a lintel over the top */}
        <mesh material={concreteMat} position={[0, 2, -1.7]}>
          <boxGeometry args={[1.4, 4, 0.7]} />
        </mesh>
        <mesh material={concreteMat} position={[0, 2, 1.7]}>
          <boxGeometry args={[1.4, 4, 0.7]} />
        </mesh>
        <mesh material={concreteMat} position={[0, 3.7, 0]}>
          <boxGeometry args={[1.4, 0.7, 4.1]} />
        </mesh>
        {/* the dark mouth the rails disappear into */}
        <mesh material={portalDarkMat} position={[0.4, 1.7, 0]}>
          <boxGeometry args={[0.3, 3.4, 2.8]} />
        </mesh>
      </group>

      {/* crossbuck crossing sign by the path */}
      <group position={[1.8, 0, TRACK_Z + 1.4]}>
        <mesh material={stoneMat} position={[0, 1.2, 0]}>
          <boxGeometry args={[0.12, 2.4, 0.12]} />
        </mesh>
        <mesh material={glowMat} position={[0, 2.3, 0.08]} rotation-z={Math.PI / 4}>
          <boxGeometry args={[1.0, 0.16, 0.05]} />
        </mesh>
        <mesh material={glowMat} position={[0, 2.3, 0.08]} rotation-z={-Math.PI / 4}>
          <boxGeometry args={[1.0, 0.16, 0.05]} />
        </mesh>
      </group>

      {/* ── distant vaporwave mountains + a low dusk sun, near the fog line ── */}
      {[-8, -2, 4, 9].map((x, i) => (
        <mesh key={i} material={mountainMat} position={[x, 0, -14.5]}>
          <coneGeometry args={[5 + (i % 2) * 2, 6 + (i % 3), 4]} />
        </mesh>
      ))}
      <mesh material={sunMat} position={[-3, 5.5, -14.4]}>
        <circleGeometry args={[2.2, 20]} />
      </mesh>

      {/* fireflies in the dusk */}
      <Fireflies />
    </group>
  );
}
