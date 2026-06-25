import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { Water } from './Water';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// CaliforniaRoom — up the park path onto a golden-hour coast-road overlook: warm
// amber sand, a low gold sun shimmering on the sea, a guardrail of little posts
// along the edge. Sweet surface goof (taste guardrail). Outdoor + open (no
// RoomBox). Plays "i-live-in-california".
// ───────────────────────────────────────────────────────────────────────────

// The iconic California Tower (Balboa Park, San Diego) — a low-poly PS1 parody of
// the real public landmark: an ornate cream square shaft, a stepped belfry with
// dark arch openings, a little cupola dome + finial, and beside it the famous
// blue-and-gold TILED STAR DOME on its drum. The grammar of the silhouette, blocky
// and flat — no copyrighted mark, just the real San Diego skyline this site sits off.
function CaliforniaTower({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const stoneMat = useMemo(() => flatMat('#d8ccb2'), []); // weathered cream stone
  const trimMat = useMemo(() => flatMat('#c4b694'), []); // slightly darker trim
  const archMat = useMemo(() => flatMat('#3a3020'), []); // dark belfry openings
  const finialMat = useMemo(() => flatMat('#b8a472'), []);

  // The blue/gold mosaic dome — a NearestFilter checker reads as tile under the
  // low-res render.
  const tileTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#1f5fa8', '#e8c24a'); // cobalt + gold
    t.repeat.set(4, 2);
    return t;
  }, []);
  const tileMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tileTex, fog: true }),
    [tileTex],
  );

  useEffect(() => () => tileTex.dispose(), [tileTex]);

  // Four dark arch openings around a belfry box of half-width hw at height y.
  const arches = (hw: number, y: number, w: number, h: number) =>
    [
      [0, y, hw],
      [0, y, -hw],
      [hw, y, 0],
      [-hw, y, 0],
    ].map((p, i) => (
      <mesh
        key={i}
        material={archMat}
        position={[p[0], p[1], p[2]]}
        rotation-y={i >= 2 ? Math.PI / 2 : 0}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
    ));

  return (
    <group position={position}>
      {/* the tall square shaft */}
      <mesh material={stoneMat} position={[0, 4, 0]}>
        <boxGeometry args={[2.6, 8, 2.6]} />
      </mesh>
      {/* a string-course ledge */}
      <mesh material={trimMat} position={[0, 8.1, 0]}>
        <boxGeometry args={[2.9, 0.3, 2.9]} />
      </mesh>
      {/* lower belfry with arch openings */}
      <mesh material={stoneMat} position={[0, 9, 0]}>
        <boxGeometry args={[2.2, 1.8, 2.2]} />
      </mesh>
      {arches(1.11, 9, 0.7, 1.2)}
      {/* upper belfry, inset */}
      <mesh material={stoneMat} position={[0, 10.5, 0]}>
        <boxGeometry args={[1.6, 1.4, 1.6]} />
      </mesh>
      {arches(0.81, 10.5, 0.5, 0.95)}
      {/* the cupola dome + finial */}
      <mesh material={trimMat} position={[0, 11.5, 0]}>
        <sphereGeometry args={[0.95, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={finialMat} position={[0, 12.7, 0]}>
        <boxGeometry args={[0.12, 1, 0.12]} />
      </mesh>

      {/* the adjacent tiled star dome on its drum, off to the side + lower */}
      <group position={[3.1, 0, 0.4]}>
        <mesh material={stoneMat} position={[0, 3, 0]}>
          <cylinderGeometry args={[1.7, 1.7, 6, 12]} />
        </mesh>
        {/* the drum cornice */}
        <mesh material={trimMat} position={[0, 6.1, 0]}>
          <cylinderGeometry args={[1.9, 1.9, 0.3, 12]} />
        </mesh>
        {/* the mosaic dome */}
        <mesh material={tileMat} position={[0, 6.2, 0]}>
          <sphereGeometry args={[1.75, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {/* a small finial cross-post */}
        <mesh material={finialMat} position={[0, 8.2, 0]}>
          <boxGeometry args={[0.1, 0.9, 0.1]} />
        </mesh>
      </group>
    </group>
  );
}

// A line of low guardrail posts along the seaward edge — the "coast road" tell.
function Guardrail({ z = -7 }: { z?: number }) {
  const postMat = useMemo(() => flatMat('#7a5a3a'), []);
  const railMat = useMemo(() => flatMat('#9a7048'), []);
  const xs = useMemo(() => Array.from({ length: 9 }, (_, i) => -8 + i * 2), []);
  return (
    <group position={[0, 0, z]}>
      {/* the rail */}
      <mesh material={railMat} position={[0, 0.7, 0]}>
        <boxGeometry args={[17, 0.12, 0.12]} />
      </mesh>
      {xs.map((x) => (
        <mesh key={x} material={postMat} position={[x, 0.4, 0]}>
          <boxGeometry args={[0.14, 0.8, 0.14]} />
        </mesh>
      ))}
    </group>
  );
}

export function CaliforniaRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // Warm amber sand/asphalt shoulder.
  const groundTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#d8a05e', '#e2ae6e');
    t.repeat.set(8, 8);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(groundTex, 10, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groundTex, fog.color, fog.near, fog.far],
  );
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff0c4' }), []);
  const glimmerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffd98f', transparent: true, opacity: 0.55 }),
    [],
  );
  const glimmer = useRef<THREE.Mesh>(null);

  useEffect(() => () => groundTex.dispose(), [groundTex]);

  useFrame((state) => {
    if (glimmer.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.3) * 0.08;
      glimmer.current.scale.x = s;
    }
  });

  return (
    <group>
      {/* golden hour: a warm hemisphere + a low amber key */}
      <hemisphereLight args={['#ffdca0', '#9a6a3a', 0.75]} />
      <ambientLight intensity={0.5} color="#ffd9a0" />
      <directionalLight position={[-2, 5, -9]} intensity={0.55} color="#ffcf8a" />

      {/* the warm shoulder */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 2]}>
        <planeGeometry args={[room.dims.halfW * 2 + 40, room.dims.halfD * 2 + 30]} />
      </mesh>

      {/* the golden sea */}
      <Water
        base="#3a86a8"
        crest="#ffe6b0"
        fog={room.palette.fog}
        fogNear={room.palette.fogNear}
        fogFar={room.palette.fogFar}
        y={-0.9}
        z={-22}
      />

      {/* gold shimmer on the water under the sun */}
      <mesh
        ref={glimmer}
        material={glimmerMat}
        rotation-x={-Math.PI / 2}
        position={[-2, -0.85, -14]}
      >
        <planeGeometry args={[2.6, 20]} />
      </mesh>

      {/* the low sun */}
      <mesh material={sunMat} position={[-2, 6, -25]}>
        <circleGeometry args={[2.2, 24]} />
      </mesh>

      {/* the iconic California Tower rising on the right, over the palms */}
      <CaliforniaTower position={[4.2, 0, -6]} />

      <Guardrail />
    </group>
  );
}
