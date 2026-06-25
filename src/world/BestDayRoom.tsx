import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { Water } from './Water';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// BestDayRoom — inland off the moonlight plaza into a bright "best day ever"
// morning: warm sand, a big low sun with a shimmer on bright water, and a few
// chunky pixel clouds drifting. The sweet daytime counterpart to the moonlit
// plaza (the night→day contrast is the point). Outdoor + open (no RoomBox).
// Plays "best-day-ever".
// ───────────────────────────────────────────────────────────────────────────

// A few chunky pixel clouds drifting slow across the sky. Plain emissive quads so
// they read flat + blocky under the low-res render; they wrap around in X.
function Clouds({ count = 5 }: { count?: number }) {
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fdfbff', transparent: true, opacity: 0.92 }),
    [],
  );
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: -16 + i * 7,
        y: 8 + (i % 3) * 2.4,
        z: -20 - (i % 2) * 4,
        w: 4 + (i % 3),
        speed: 0.25 + (i % 3) * 0.08,
      })),
    [count],
  );
  useFrame((_, dt) => {
    for (let i = 0; i < refs.current.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      m.position.x += seeds[i].speed * dt;
      if (m.position.x > 20) m.position.x = -20; // wrap
    }
  });
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group>
      {seeds.map((s, i) => (
        <mesh
          key={i}
          ref={(el) => (refs.current[i] = el)}
          material={mat}
          position={[s.x, s.y, s.z]}
        >
          <planeGeometry args={[s.w, s.w * 0.5]} />
        </mesh>
      ))}
    </group>
  );
}

export function BestDayRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // Bright warm sand.
  const sandTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#e8d9a8', '#f0e4bc');
    t.repeat.set(8, 8);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(sandTex, 10, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sandTex, fog.color, fog.near, fog.far],
  );
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff4cf' }), []);
  const glimmerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.55 }),
    [],
  );
  const glimmer = useRef<THREE.Mesh>(null);

  useEffect(() => () => sandTex.dispose(), [sandTex]);

  useFrame((state) => {
    if (glimmer.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.4) * 0.09;
      glimmer.current.scale.x = s;
    }
  });

  return (
    <group>
      {/* bright warm day: a sunny hemisphere + a high key */}
      <hemisphereLight args={['#fff2cf', '#bfe0d0', 0.85]} />
      <ambientLight intensity={0.55} color="#fff0d0" />
      <directionalLight position={[3, 7, -8]} intensity={0.6} color="#fff6da" />

      {/* the bright beach */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 2]}>
        <planeGeometry args={[room.dims.halfW * 2 + 40, room.dims.halfD * 2 + 30]} />
      </mesh>

      {/* bright morning sea */}
      <Water
        base="#2f9fc4"
        crest="#e8fbff"
        fog={room.palette.fog}
        fogNear={room.palette.fogNear}
        fogFar={room.palette.fogFar}
        y={-0.9}
        z={-22}
      />

      {/* sun shimmer on the water */}
      <mesh
        ref={glimmer}
        material={glimmerMat}
        rotation-x={-Math.PI / 2}
        position={[3, -0.85, -14]}
      >
        <planeGeometry args={[2.6, 20]} />
      </mesh>

      {/* the big low sun */}
      <mesh material={sunMat} position={[3, 7, -25]}>
        <circleGeometry args={[2.3, 24]} />
      </mesh>

      <Clouds />
    </group>
  );
}
