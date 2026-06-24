import { useMemo } from 'react';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { FirstEntryReward } from './FirstEntryReward';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// ClosetRoom — the reward behind the hallway's locked supply-closet door (sibling
// of LockerRoom). A cramped utility cupboard off the back hall: shelves, a mop
// bucket, a forgotten tip jar. Safe side nook (off the descent) — first entry
// hums a chord + tips luck (FirstEntryReward), then it's quiet.
// ───────────────────────────────────────────────────────────────────────────

export function ClosetRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const H = room.dims.height;
  const fog = fogFor(room);

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#2a241c', '#322b20');
    t.repeat.set(2, 2);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 1, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#241f18', '#2c261d');
    t.repeat.set(Math.round(W / 1.2), 2);
    return t;
  }, [W]);
  const wallMat = useMemo(
    () => flatMat('#ffffff', { map: wallTex, side: THREE.DoubleSide }),
    [wallTex],
  );
  const ceilMat = useMemo(() => flatMat('#15110c', { side: THREE.DoubleSide }), []);
  const shelfMat = useMemo(() => flatMat('#6a5a3e', { side: THREE.DoubleSide }), []);
  const bucketMat = useMemo(() => flatMat('#557a6a', { side: THREE.DoubleSide }), []);
  const jarMat = useMemo(() => {
    const m = flatMat('#c9b24a');
    m.emissive.set('#3a300c');
    return m;
  }, []);

  // Three shelf planks up the back (-Z) wall.
  const shelfYs = [0.6, 1.3, 2.0];

  return (
    <group>
      <FirstEntryReward
        secret="supply-closet"
        message="🍀 A forgotten tip jar — finders keepers · +2 luck"
      />
      <ambientLight intensity={0.4} color="#e8dcc0" />
      <pointLight position={[0, H - 0.4, 0.5]} intensity={0.5} distance={10} color="#ffe6b0" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* shelves on the back wall */}
      {shelfYs.map((y) => (
        <mesh key={y} material={shelfMat} position={[0, y, -room.dims.halfD + 0.3]}>
          <boxGeometry args={[W * 1.4, 0.08, 0.4]} />
        </mesh>
      ))}
      {/* a mop bucket in the corner */}
      <mesh material={bucketMat} position={[-W + 0.7, 0.35, -room.dims.halfD + 0.8]}>
        <cylinderGeometry args={[0.35, 0.28, 0.7, 10]} />
      </mesh>
      {/* the forgotten tip jar, glinting on the middle shelf */}
      <mesh material={jarMat} position={[0.8, shelfYs[1] + 0.25, -room.dims.halfD + 0.3]}>
        <cylinderGeometry args={[0.18, 0.18, 0.4, 10]} />
      </mesh>
    </group>
  );
}
