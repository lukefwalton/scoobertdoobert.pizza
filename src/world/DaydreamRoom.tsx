import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeAffineTexturedMaterial, makeCheckerTexture, flatMat } from './ps1';
import { useDispose } from '../lib/useDispose';
import { Theremin } from './Theremin';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// DaydreamRoom — the pastel breather at the top of the Sunken Gallery: you climb
// out of the murk into a soft watercolor sky. Open + bright (no RoomBox cage):
// a pale cloud deck underfoot, fluffy cloud banks drifting by, a big soft sun,
// and chunky drifting motes. Deliberately SWEET (taste guardrail — the contrast
// with the gallery is the whole point). Its song ("watercolor-sky") plays here.
// ───────────────────────────────────────────────────────────────────────────

// A fluffy cloud bank — a clutch of overlapping soft boxes that drifts slowly on
// its own phase. Flat pastel, no shadows; reads as a chunky PS1 cloud.
function Cloud({
  x,
  y,
  z,
  scale,
  drift,
  mat,
}: {
  x: number;
  y: number;
  z: number;
  scale: number;
  drift: number;
  mat: THREE.Material;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current)
      ref.current.position.x = x + Math.sin(state.clock.elapsedTime * 0.12 + drift) * 2.2;
  });
  return (
    <group ref={ref} position={[x, y, z]} scale={scale}>
      <mesh material={mat} position={[0, 0, 0]}>
        <boxGeometry args={[2.4, 1.1, 1.4]} />
      </mesh>
      <mesh material={mat} position={[1.1, 0.2, 0.2]}>
        <boxGeometry args={[1.6, 0.9, 1.2]} />
      </mesh>
      <mesh material={mat} position={[-1.2, 0.1, -0.1]}>
        <boxGeometry args={[1.5, 0.8, 1.1]} />
      </mesh>
    </group>
  );
}

// Drifting pastel motes — chunky points that bob, a soft daydream shimmer.
function Motes({ count = 40 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const sprite = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  }, []);
  const seed = useMemo(() => {
    const base = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      base[i * 3] = (Math.random() - 0.5) * 20;
      base[i * 3 + 1] = 1 + Math.random() * 6;
      base[i * 3 + 2] = -12 + Math.random() * 18;
      phase[i] = Math.random() * Math.PI * 2;
    }
    return { base, phase };
  }, [count]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(seed.base.slice(), 3));
    return g;
  }, [seed]);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#fff3ff',
        map: sprite,
        size: 0.3,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
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
      arr[i * 3 + 1] = seed.base[i * 3 + 1] + Math.sin(t * 0.5 + seed.phase[i]) * 0.5;
    }
    attr.needsUpdate = true;
  });
  useDispose(geom, mat, sprite);
  return <points ref={ref} geometry={geom} material={mat} />;
}

export function DaydreamRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // The cloud deck — a soft pale floor, faintly affine so it drifts a touch.
  const deckTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#e7defb', '#f1ebff'); // pale lavender/white
    t.repeat.set(6, 6);
    return t;
  }, []);
  const deckMat = useMemo(
    () => makeAffineTexturedMaterial(deckTex, 8, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckTex, fog.color, fog.near, fog.far],
  );
  const cloudMat = useMemo(() => flatMat('#fbf4ff', { side: THREE.DoubleSide }), []);
  const cloudPink = useMemo(() => flatMat('#f7dcef', { side: THREE.DoubleSide }), []);
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff1d6' }), []);

  useDispose(deckTex);

  return (
    <group>
      {/* soft, bright daydream light — pastel sky hemisphere, gentle warm key */}
      <hemisphereLight args={['#f2e9ff', '#cdbce8', 1.0]} />
      <ambientLight intensity={0.6} color="#fdf6ff" />
      <directionalLight position={[3, 7, -4]} intensity={0.5} color="#fff0e8" />

      {/* the cloud deck you stand on */}
      <mesh material={deckMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[room.dims.halfW * 2 + 24, room.dims.halfD * 2 + 24]} />
      </mesh>

      {/* drifting cloud banks around the deck */}
      <Cloud x={-7} y={3.2} z={-8} scale={1.4} drift={0} mat={cloudMat} />
      <Cloud x={8} y={4} z={-10} scale={1.7} drift={1.5} mat={cloudPink} />
      <Cloud x={-9} y={1.8} z={2} scale={1.1} drift={3} mat={cloudMat} />
      <Cloud x={9} y={2.4} z={4} scale={1.3} drift={4.2} mat={cloudMat} />
      <Cloud x={0} y={5} z={-13} scale={2} drift={2.4} mat={cloudPink} />

      {/* a big soft sun low in the pastel haze */}
      <mesh material={sunMat} position={[4, 5.5, -15]}>
        <circleGeometry args={[3.2, 24]} />
      </mesh>

      <Motes />

      {/* A theremin you play by walking near it — the ethereal cousin of The Aerial's,
          set out on the cloud deck (a dreamy proximity instrument suits the watercolor
          sky). Reuses the shipped component + its sustained-voice engine; it sings over
          the room's song only when you approach, and fades as you drift off — a quiet
          "play it" reward in the breather. */}
      <Theremin position={[5, 0, -2]} rotationY={-0.4} />
    </group>
  );
}
