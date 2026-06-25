import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// ZooRoom — Balboa Park's San Diego Zoo, as a flock of low-poly FLAMINGOS wading
// a little pond: pink ellipsoid bodies, S-curved necks, black-tipped beaks, the
// iconic one-legged stance; some standing, some dipped to feed. A low rail, lush
// bushes, palms. Bright + sweet (taste guardrail). Plays "my-friend-scoobert".
// ───────────────────────────────────────────────────────────────────────────

// Shared flamingo materials — one set for the whole flock (cheap + consistent).
function useFlamingoMats() {
  return useMemo(() => {
    const pink = flatMat('#f5849e');
    const pinkDark = flatMat('#e26a86'); // shaded underbody / tail
    const leg = flatMat('#f0a0b0');
    const beak = flatMat('#f2c0a0'); // pale pink beak
    const beakTip = flatMat('#23201e'); // black tip
    const eye = flatMat('#1a1614');
    return { pink, pinkDark, leg, beak, beakTip, eye };
  }, []);
}
type FMats = ReturnType<typeof useFlamingoMats>;

// One flamingo. `feeding` curls the neck down to the water; otherwise it stands
// tall. `phase` offsets a gentle idle sway (slow — WCAG-safe, no strobe).
function Flamingo({
  position,
  rotationY = 0,
  feeding = false,
  phase = 0,
  mats,
}: {
  position: [number, number, number];
  rotationY?: number;
  feeding?: boolean;
  phase?: number;
  mats: FMats;
}) {
  const headGrp = useRef<THREE.Group>(null);
  const bodyGrp = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    // a slow idle: the standing ones sway their head, the feeding ones bob a touch
    if (headGrp.current) headGrp.current.rotation.z = Math.sin(t * 0.8) * 0.06;
    if (bodyGrp.current) bodyGrp.current.position.y = Math.sin(t * 0.6) * 0.03;
  });

  // neck segments: a stack of short cylinders bent into an S (standing) or a
  // downward arc (feeding). Each entry is [x, y, z, rotX, len].
  const neck: [number, number, number, number, number][] = feeding
    ? [
        [0, 1.7, 0.15, 0.5, 0.6],
        [0, 2.0, 0.5, 1.1, 0.6],
        [0, 1.9, 0.95, 1.7, 0.6],
      ]
    : [
        [0, 1.8, 0.1, -0.2, 0.6],
        [0, 2.35, 0.18, 0.15, 0.6],
        [0, 2.85, 0.35, 0.6, 0.55],
      ];
  const head = feeding ? [0, 1.75, 1.25] : [0, 3.05, 0.6];
  const beakDir = feeding ? 1.9 : 1.0; // pitch of the beak

  return (
    <group position={position} rotation-y={rotationY}>
      {/* one leg straight down + a tucked stub (the one-legged stance) */}
      <mesh material={mats.leg} position={[0.12, 0.7, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1.4, 6]} />
      </mesh>
      <mesh material={mats.leg} position={[-0.18, 1.15, 0]} rotation-z={0.7}>
        <cylinderGeometry args={[0.05, 0.05, 0.5, 6]} />
      </mesh>

      <group ref={bodyGrp}>
        {/* body — a pink ellipsoid */}
        <mesh material={mats.pink} position={[0, 1.55, 0]} scale={[0.62, 0.52, 0.95]}>
          <sphereGeometry args={[1, 12, 8]} />
        </mesh>
        {/* a little raised tail at the back */}
        <mesh material={mats.pinkDark} position={[0, 1.7, -0.85]} rotation-x={-0.5}>
          <coneGeometry args={[0.28, 0.6, 6]} />
        </mesh>

        {/* the neck segments */}
        {neck.map((seg, i) => (
          <mesh
            key={i}
            material={mats.pink}
            position={[seg[0], seg[1], seg[2]]}
            rotation-x={seg[3]}
          >
            <cylinderGeometry args={[0.12, 0.13, seg[4], 6]} />
          </mesh>
        ))}

        {/* head + black-tipped beak */}
        <group ref={headGrp} position={[head[0], head[1], head[2]]}>
          <mesh material={mats.pink}>
            <sphereGeometry args={[0.2, 8, 6]} />
          </mesh>
          <mesh material={mats.eye} position={[0.12, 0.05, 0.05]}>
            <sphereGeometry args={[0.04, 5, 4]} />
          </mesh>
          {/* beak: a pale cone with a black tip, angled down-forward */}
          <mesh material={mats.beak} position={[0, -0.05, 0.22]} rotation-x={beakDir}>
            <coneGeometry args={[0.09, 0.34, 6]} />
          </mesh>
          <mesh material={mats.beakTip} position={[0, -0.13, 0.36]} rotation-x={beakDir}>
            <coneGeometry args={[0.05, 0.16, 6]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// A low rounded bush — flat-shaded green blob.
function Bush({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  const mat = useMemo(() => flatMat('#4e7a3a'), []);
  return (
    <mesh material={mat} position={position} scale={[s, s * 0.7, s]}>
      <icosahedronGeometry args={[0.8, 0]} />
    </mesh>
  );
}

export function ZooRoom({ room }: { room: Room }) {
  const fog = fogFor(room);
  const mats = useFlamingoMats();

  // Lush grass floor.
  const grassTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#6f9a48', '#7aa850');
    t.repeat.set(8, 8);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(grassTex, 10, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grassTex, fog.color, fog.near, fog.far],
  );
  const pondMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#4aa3b8',
        transparent: true,
        opacity: 0.85,
        fog: true,
      }),
    [],
  );
  const railMat = useMemo(() => flatMat('#caa46a'), []);

  useEffect(() => {
    return () => {
      grassTex.dispose();
      pondMat.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    };
  }, [grassTex, pondMat, mats]);

  // the flock — placed in + around the pond (centred near [0,0,-3]).
  const flock = useMemo(
    () =>
      [
        { position: [-2.2, 0, -2], rotationY: 0.6, feeding: false, phase: 0 },
        { position: [-0.4, 0, -3.4], rotationY: -0.4, feeding: true, phase: 1.2 },
        { position: [1.6, 0, -2.3], rotationY: -1.2, feeding: false, phase: 2.1 },
        { position: [2.8, 0, -3.8], rotationY: 1.0, feeding: false, phase: 0.7 },
        { position: [0.6, 0, -4.6], rotationY: 2.4, feeding: true, phase: 3.3 },
        { position: [-1.8, 0, -4.4], rotationY: 0.2, feeding: false, phase: 1.8 },
        { position: [-3.4, 0, -3.6], rotationY: -0.8, feeding: true, phase: 2.7 },
      ] as {
        position: [number, number, number];
        rotationY: number;
        feeding: boolean;
        phase: number;
      }[],
    [],
  );

  return (
    <group>
      {/* bright lush midday */}
      <hemisphereLight args={['#dff0c8', '#6a7a48', 0.85]} />
      <ambientLight intensity={0.55} color="#eaf4d8" />
      <directionalLight position={[3, 8, -4]} intensity={0.55} color="#fffce8" />

      {/* the grass */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[room.dims.halfW * 2 + 40, room.dims.halfD * 2 + 30]} />
      </mesh>

      {/* the flamingo pond — a shallow disc the birds wade in */}
      <mesh material={pondMat} rotation-x={-Math.PI / 2} position={[-0.4, 0.02, -3.3]}>
        <circleGeometry args={[4.4, 28]} />
      </mesh>

      {/* the flock */}
      {flock.map((f, i) => (
        <Flamingo
          key={i}
          position={f.position}
          rotationY={f.rotationY}
          feeding={f.feeding}
          phase={f.phase}
          mats={mats}
        />
      ))}

      {/* a low enclosure rail across the front + bushes dressing the edges */}
      <mesh material={railMat} position={[0, 0.6, 1.5]}>
        <boxGeometry args={[16, 0.1, 0.1]} />
      </mesh>
      {[-7, -5.5, 5.5, 7].map((x) => (
        <mesh key={x} material={railMat} position={[x, 0.3, 1.5]}>
          <boxGeometry args={[0.12, 0.6, 0.12]} />
        </mesh>
      ))}
      <Bush position={[-6, 0.4, -1]} s={1.3} />
      <Bush position={[6.2, 0.4, -1.5]} s={1.5} />
      <Bush position={[4.5, 0.35, -6]} s={1.1} />
      <Bush position={[-5, 0.35, -6.5]} s={1.2} />
    </group>
  );
}
