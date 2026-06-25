import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { CultureMotes } from './CultureMotes';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture, makeTextTexture } from './ps1';
import { fogFor, type Room } from '../data/rooms';

// "Where the Friends Live" — the far end of memory lane: a dark hall of server
// racks fading into cool fog, where the drifting data motes (the /cultures sim,
// reused as ambience) bloom soft notes when they brush past you. The conceit of
// "all my friends live on the internet" made literal + sweet — the lights in the
// dark are the friends. Warm-eerie, never dread (taste guardrail).

// Three phosphor LED tints, shared across every rack so the whole hall blinks on
// a few cheap materials rather than one-per-dot.
const LED_COLORS = ['#6affa0', '#ffd24a', '#5ad6ff'];

// A server rack: a dark cabinet with a front column of blinking status LEDs.
function Rack({
  position,
  rotationY,
  ledMats,
}: {
  position: [number, number, number];
  rotationY: number;
  ledMats: THREE.MeshBasicMaterial[];
}) {
  const bodyMat = useMemo(() => flatMat('#0a0e17'), []);
  const faceMat = useMemo(() => flatMat('#11161f'), []);
  // A 2×7 grid of tiny LED quads, each assigned one of the shared blink materials.
  const dots = useMemo(() => {
    const out: { x: number; y: number; mat: THREE.MeshBasicMaterial }[] = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 2; c++) {
        const idx = (r * 2 + c + position[0] + position[2]) | 0;
        out.push({
          x: -0.18 + c * 0.36,
          y: 0.6 + r * 0.34,
          mat: ledMats[((idx % 3) + 3) % 3],
        });
      }
    }
    return out;
  }, [ledMats, position]);
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh material={bodyMat} position={[0, 1.5, 0]}>
        <boxGeometry args={[1.2, 3, 0.8]} />
      </mesh>
      <mesh material={faceMat} position={[0, 1.5, 0.42]}>
        <planeGeometry args={[1.0, 2.8]} />
      </mesh>
      {dots.map((d, i) => (
        <mesh key={i} material={d.mat} position={[d.x, d.y, 0.44]}>
          <planeGeometry args={[0.09, 0.09]} />
        </mesh>
      ))}
    </group>
  );
}

export function InternetRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#04070d', '#070c15');
    t.repeat.set(4, 4);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 4, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#04060c', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#03050a'), []);

  // The shared blinking LED materials (additive so they read as lights).
  const ledMats = useMemo(
    () =>
      LED_COLORS.map(
        (c) =>
          new THREE.MeshBasicMaterial({
            color: c,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ledMats[0].opacity = 0.55 + 0.4 * (Math.sin(t * 3.1) > 0 ? 1 : 0.2);
    ledMats[1].opacity = 0.55 + 0.4 * (Math.sin(t * 2.2 + 1.5) > 0.3 ? 1 : 0.2);
    ledMats[2].opacity = 0.55 + 0.4 * (Math.sin(t * 4.0 + 3) > -0.2 ? 1 : 0.2);
  });

  // A "♥ HOME" sign deep in the void — the warm beat that keeps the dark sweet.
  const signTex = useMemo(
    () => makeTextTexture('all my friends\nare in here', { fg: '#ff7ad6', w: 256, h: 128 }),
    [],
  );
  const signMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: signTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [signTex],
  );

  // Two rows of racks receding down the hall, facing the centre aisle.
  const racks = useMemo(() => {
    const zs = [2, -1, -4, -7];
    const out: { position: [number, number, number]; rotationY: number }[] = [];
    for (const z of zs) {
      out.push({ position: [-5, 0, z], rotationY: -Math.PI / 2 }); // -X row faces +X
      out.push({ position: [5, 0, z], rotationY: Math.PI / 2 }); // +X row faces -X
    }
    return out;
  }, []);

  return (
    <group>
      <ambientLight intensity={0.12} color="#3a5e7a" />
      <pointLight position={[0, 3.5, 3]} intensity={0.4} distance={18} color="#4a7fd6" />
      <pointLight position={[0, 3, -6]} intensity={0.35} distance={16} color="#5ad6ff" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {racks.map((r, i) => (
        <Rack key={i} position={r.position} rotationY={r.rotationY} ledMats={ledMats} />
      ))}

      {/* the warm sign on the far -Z wall */}
      <mesh material={signMat} position={[0, 2, -8.9]}>
        <planeGeometry args={[3.2, 1.6]} />
      </mesh>

      {/* drifting data motes — the friends. Pure additive ambience (mute-aware). */}
      <CultureMotes bounds={room.dims} />
    </group>
  );
}
