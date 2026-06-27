import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { PizzaPanChimes } from './PizzaPanChimes';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// BalboaRoom — up the path from the boardwalk into a bright midday SoCal park
// (the "Walking Balboa" stroll). Sweet + open: a gravel path through grass, a
// little tiled fountain burbling in the middle, a couple of benches, palms (in
// as room.props). The sunniest room in the wing — a relief beat. PS1 register.
// Its song ("walking-balboa") plays while you wander it.
// ───────────────────────────────────────────────────────────────────────────

// A wooden park bench — slats + two stubby legs. Faces the fountain.
function Bench({
  x,
  z,
  rotationY,
  mat,
}: {
  x: number;
  z: number;
  rotationY: number;
  mat: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh material={mat} position={[0, 0.45, 0]}>
        <boxGeometry args={[1.8, 0.12, 0.5]} />
      </mesh>
      <mesh material={mat} position={[0, 0.78, -0.22]}>
        <boxGeometry args={[1.8, 0.5, 0.1]} />
      </mesh>
      <mesh material={mat} position={[-0.75, 0.22, 0]}>
        <boxGeometry args={[0.14, 0.45, 0.5]} />
      </mesh>
      <mesh material={mat} position={[0.75, 0.22, 0]}>
        <boxGeometry args={[0.14, 0.45, 0.5]} />
      </mesh>
    </group>
  );
}

export function BalboaRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // Bright park grass, affine on the ground.
  const grassTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#5f8f43', '#6fa04c'); // two midday greens
    t.repeat.set(7, 7);
    return t;
  }, []);
  const grassMat = useMemo(
    () => makeAffineTexturedMaterial(grassTex, 9, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grassTex, fog.color, fog.near, fog.far],
  );
  // Pale gravel path running up the middle (-Z).
  const pathTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#c8bd9a', '#d6cca8');
    t.repeat.set(1, 9);
    return t;
  }, []);
  const pathMat = useMemo(
    () => makeAffineTexturedMaterial(pathTex, 2, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathTex, fog.color, fog.near, fog.far],
  );
  const stoneMat = useMemo(() => flatMat('#b7b1a4'), []);
  const benchMat = useMemo(() => flatMat('#6b4a2f'), []);
  const waterMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#7fc6e0', transparent: true, opacity: 0.85 }),
    [],
  );
  const jetMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#cdeaf4', transparent: true, opacity: 0.7 }),
    [],
  );
  const jet = useRef<THREE.Mesh>(null);

  useEffect(
    () => () => {
      grassTex.dispose();
      pathTex.dispose();
    },
    [grassTex, pathTex],
  );

  useFrame((state) => {
    // the fountain jet bobs a touch (a sweet little burble, no flashing)
    if (jet.current) jet.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 3.2) * 0.12;
  });

  return (
    <group>
      {/* bright midday sun: warm hemisphere + a high key light */}
      <hemisphereLight args={['#dff0ff', '#4d6a32', 0.95]} />
      <ambientLight intensity={0.5} color="#fff4dd" />
      <directionalLight position={[4, 9, 3]} intensity={0.7} color="#fff1cf" />

      {/* the lawn */}
      <mesh material={grassMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[room.dims.halfW * 2 + 30, room.dims.halfD * 2 + 30]} />
      </mesh>
      {/* the gravel path up the centre toward the park */}
      <mesh material={pathMat} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[2.6, room.dims.halfD * 2 + 8]} />
      </mesh>

      {/* the fountain in the middle of the path */}
      <group position={[0, 0, -1]}>
        {/* stone basin ring */}
        <mesh material={stoneMat} position={[0, 0.25, 0]}>
          <cylinderGeometry args={[2.1, 2.3, 0.5, 20]} />
        </mesh>
        {/* the pool of water */}
        <mesh material={waterMat} position={[0, 0.42, 0]}>
          <cylinderGeometry args={[1.85, 1.85, 0.12, 20]} />
        </mesh>
        {/* the centre pillar */}
        <mesh material={stoneMat} position={[0, 0.85, 0]}>
          <cylinderGeometry args={[0.28, 0.36, 1.3, 12]} />
        </mesh>
        {/* the burbling jet on top */}
        <mesh ref={jet} material={jetMat} position={[0, 1.85, 0]}>
          <cylinderGeometry args={[0.12, 0.22, 1.0, 10]} />
        </mesh>
      </group>

      {/* benches facing the fountain from either side of the path */}
      <Bench x={-3.4} z={-1} rotationY={Math.PI / 2} mat={benchMat} />
      <Bench x={3.4} z={-1} rotationY={-Math.PI / 2} mat={benchMat} />

      {/* the "play it" beat: a park-busker rack of tuned pizza pans you strike for
          Scoobert's pentatonic — the surface, sweet counterpart to the gallery's
          lyre, and the site's pizza→music thesis made playable ("the stroll is the
          music"). Left of the path, facing the walk up from the boardwalk. */}
      <PizzaPanChimes position={[-2.6, 0, 2.0]} rotationY={0.3} />
    </group>
  );
}
