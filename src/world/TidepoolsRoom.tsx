import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { Water } from './Water';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// TidepoolsRoom ("Daydreaming") — drift down off the coast road to a hazy bright
// lagoon: shallow still water, a soft high sun, a scatter of low tide rocks to
// sit among. The sweet breather at the bottom of the California wing (taste
// guardrail). Outdoor + open (no RoomBox). Plays "daydreaming".
// ───────────────────────────────────────────────────────────────────────────

// A few low, rounded tide rocks poking out of the shallows — flat-shaded blobs.
function Rocks() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8fa39a', fog: true }), []);
  const rocks = useMemo(
    () =>
      [
        { p: [-3.5, -0.2, -3], s: 1.2 },
        { p: [2.5, -0.25, -5], s: 1.6 },
        { p: [4.5, -0.15, -2], s: 0.9 },
        { p: [-1.5, -0.2, -6], s: 1.1 },
      ] as { p: [number, number, number]; s: number }[],
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} material={mat} position={r.p} scale={[r.s, r.s * 0.5, r.s]}>
          <icosahedronGeometry args={[0.6, 0]} />
        </mesh>
      ))}
    </group>
  );
}

export function TidepoolsRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // Pale wet sand under a bright haze.
  const sandTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#cfe0cf', '#dcebdc');
    t.repeat.set(8, 8);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(sandTex, 10, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sandTex, fog.color, fog.near, fog.far],
  );
  const sunMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fffdf2', transparent: true, opacity: 0.95 }),
    [],
  );
  const glimmerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#f2fbff', transparent: true, opacity: 0.5 }),
    [],
  );
  const glimmer = useRef<THREE.Mesh>(null);

  useEffect(() => () => sandTex.dispose(), [sandTex]);

  useFrame((state) => {
    if (glimmer.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.1) * 0.07;
      glimmer.current.scale.x = s;
    }
  });

  return (
    <group>
      {/* hazy bright noon: a soft mint hemisphere + a gentle high key */}
      <hemisphereLight args={['#eafff4', '#a6c4b4', 0.85]} />
      <ambientLight intensity={0.6} color="#eafff0" />
      <directionalLight position={[2, 7, -7]} intensity={0.5} color="#ffffff" />

      {/* the pale lagoon floor */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 2]}>
        <planeGeometry args={[room.dims.halfW * 2 + 40, room.dims.halfD * 2 + 30]} />
      </mesh>

      {/* the shallow still lagoon — bright mint, gentle */}
      <Water
        base="#5fc7c0"
        crest="#eafdff"
        fog={room.palette.fog}
        fogNear={room.palette.fogNear}
        fogFar={room.palette.fogFar}
        y={-0.6}
        z={-20}
      />

      {/* sun shimmer on the still water */}
      <mesh
        ref={glimmer}
        material={glimmerMat}
        rotation-x={-Math.PI / 2}
        position={[2, -0.55, -13]}
      >
        <planeGeometry args={[2.4, 18]} />
      </mesh>

      {/* the soft high sun */}
      <mesh material={sunMat} position={[2, 8, -24]}>
        <circleGeometry args={[2.6, 24]} />
      </mesh>

      <Rocks />
    </group>
  );
}
