import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GalleryRoom — the Sunken Gallery. A flooded vaporwave-classical hall reached
// from the poolrooms: a colonnade of crunched greek columns (in as room.props)
// down a wet-marble nave, knee-deep still water underfoot, dim cold light. Funny-
// uncanny, never traumatic (taste guardrail) — the contrast with the pastel
// daydream beyond it is the point. PS1 register: flat-shaded, vertex-snapped,
// affine marble floor, fogged. The statuary is data (room.props); this builds
// the shell, the flood sheet, and the light.
// ───────────────────────────────────────────────────────────────────────────

export function GalleryRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const fog = fogFor(room);

  // Wet dark-marble floor — affine so it swims underfoot.
  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#0c2429', '#123338'); // two deep teals
    t.repeat.set(5, 5);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 5, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  // Dim marble walls, large blocks.
  const wallTex = useMemo(() => {
    const t = makeCheckerTexture(4, '#16383d', '#1c454a');
    t.repeat.set(Math.round(W / 1.5), 2);
    return t;
  }, [W]);
  const wallMat = useMemo(
    () => flatMat('#ffffff', { map: wallTex, side: THREE.DoubleSide }),
    [wallTex],
  );
  const ceilMat = useMemo(() => flatMat('#081a1e', { side: THREE.DoubleSide }), []);
  const plinthMat = useMemo(() => flatMat('#1a4248'), []);
  // The flood sheet — a translucent still water plane just above the floor.
  const waterMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#1d525a',
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    [],
  );
  const water = useRef<THREE.Mesh>(null);

  useEffect(
    () => () => {
      floorTex.dispose();
      wallTex.dispose();
    },
    [floorTex, wallTex],
  );

  useFrame((state) => {
    // a barely-there breathing shimmer on the flood (no flashing — it's a still,
    // calm uncanny, not a strobe)
    if (water.current)
      water.current.position.y = 0.06 + Math.sin(state.clock.elapsedTime * 0.6) * 0.015;
  });

  return (
    <group>
      {/* dim, cold light: a faint blue ambient + two pale shafts down the nave */}
      <ambientLight intensity={0.32} color="#9fd4dd" />
      <pointLight position={[0, H - 0.6, -3]} intensity={0.5} distance={16} color="#bfeef4" />
      <pointLight position={[0, H - 0.6, 5]} intensity={0.42} distance={14} color="#aee0e8" />
      {/* a low key from the far "light" (the daydream beyond the -Z archway) */}
      <directionalLight position={[0, 3, -10]} intensity={0.4} color="#dff6ec" />

      {/* the hall shell */}
      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* the knee-deep flood across the floor */}
      <mesh ref={water} material={waterMat} rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <planeGeometry args={[W * 2 - 0.4, D * 2 - 0.4]} />
      </mesh>

      {/* a low plinth runs down the centre line — the sculpture (a prop) sits on it */}
      <mesh material={plinthMat} position={[0, 0.25, -3.5]}>
        <boxGeometry args={[2.2, 0.5, 2.2]} />
      </mesh>
    </group>
  );
}
