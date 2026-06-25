import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture, makeTextTexture } from './ps1';
import { fogFor, type Room } from '../data/rooms';

// Memory Lane — a long, narrow corridor of old-web fragments. The CRT sets are
// GLB props (room.props); this lays the corridor shell, the bruised indigo glow,
// and a row of humming "monitor" screens running period web detritus (UNDER
// CONSTRUCTION, a hit counter, a guestbook plea). Warm-eerie nostalgia, never
// dread — the screens GLOW (additive) so the dark hall reads as cosy, not sinister.

// Deterministic old-web fragments, tinted in the three CRT phosphor families.
const FRAGMENTS: { text: string; color: string }[] = [
  { text: 'WELCOME!', color: '#5ad6ff' },
  { text: 'UNDER\nCONSTRUCTION', color: '#ffd24a' },
  { text: 'YOU ARE\nVISITOR', color: '#6affa0' },
  { text: '000137', color: '#ff7ad6' },
  { text: 'BEST VIEWED\nIN NETSCAPE', color: '#5ad6ff' },
  { text: 'SIGN MY\nGUESTBOOK', color: '#ffd24a' },
  { text: '<HOME>', color: '#6affa0' },
  { text: '© 1999', color: '#ff7ad6' },
];

// A single glowing wall screen: a dark bezel + an additive text panel that pulses
// faintly like a CRT that can't hold a steady refresh.
function Screen({
  text,
  color,
  position,
  faceX,
}: {
  text: string;
  color: string;
  position: [number, number, number];
  faceX: 1 | -1; // +1 sits on +X wall facing -X; -1 sits on -X wall facing +X
}) {
  const tex = useMemo(() => makeTextTexture(text, { fg: color, w: 256, h: 128 }), [text, color]);
  const screenMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [tex],
  );
  const bezelMat = useMemo(() => flatMat('#0b0814'), []);
  // Subtle, deterministic CRT breathing (no strobe — WCAG-safe).
  useFrame((state) => {
    const t = state.clock.elapsedTime + position[2]; // phase-offset per screen
    screenMat.opacity = 0.78 + 0.18 * Math.sin(t * 2.3);
  });
  return (
    <group position={position} rotation-y={faceX === 1 ? -Math.PI / 2 : Math.PI / 2}>
      <mesh material={bezelMat}>
        <planeGeometry args={[1.5, 1.05]} />
      </mesh>
      <mesh material={screenMat} position={[0, 0, 0.02]}>
        <planeGeometry args={[1.28, 0.82]} />
      </mesh>
    </group>
  );
}

export function MemoryLaneRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const fog = fogFor(room);

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#120a1f', '#1a1030');
    t.repeat.set(2, 6); // long hall: stretch the grid down +Z
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 2, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#0e0a1c', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#080611'), []);

  // The corridor glow drifts between two phosphor tints so the hall never sits
  // dead — magenta near the mouth, cyan deeper in.
  const warm = useRef<THREE.PointLight>(null);
  const cool = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (warm.current) warm.current.intensity = 0.5 + 0.1 * Math.sin(t * 1.7);
    if (cool.current) cool.current.intensity = 0.5 + 0.1 * Math.sin(t * 1.3 + 2);
  });

  // Lay the screens down both walls, alternating sides, marching -Z down the hall.
  const screens = useMemo(() => {
    const zs = [6, 3, 0, -3, -6, -9, 5, -1.5];
    return FRAGMENTS.map((f, i) => {
      const faceX: 1 | -1 = i % 2 === 0 ? -1 : 1; // even → -X wall, odd → +X wall
      const x = faceX === 1 ? W - 0.08 : -W + 0.08;
      const y = 1.7 + (i % 3) * 0.45; // stagger heights a little
      return { ...f, faceX, position: [x, y, zs[i]] as [number, number, number] };
    });
  }, [W]);

  return (
    <group>
      <ambientLight intensity={0.16} color="#9a86c8" />
      <pointLight ref={warm} position={[0, 2.6, 7]} intensity={0.5} distance={16} color="#ff7ad6" />
      <pointLight
        ref={cool}
        position={[0, 2.6, -7]}
        intensity={0.5}
        distance={16}
        color="#5ad6ff"
      />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {screens.map((s, i) => (
        <Screen key={i} text={s.text} color={s.color} position={s.position} faceX={s.faceX} />
      ))}
    </group>
  );
}
