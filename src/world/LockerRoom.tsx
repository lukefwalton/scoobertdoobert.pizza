import { useMemo } from 'react';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { FirstEntryReward } from './FirstEntryReward';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// LockerRoom — the reward behind the poolrooms' locked STAFF ONLY door. A small,
// safe, tiled changing room (off the descent, so it stays sweet). The action →
// challenge → reward loop's payoff: notice the key → open the door → the room
// hums you a soft chord and tips a little luck the first time you step in.
// ───────────────────────────────────────────────────────────────────────────

export function LockerRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const H = room.dims.height;
  const fog = fogFor(room);

  // Damp poolside tiling, dim.
  const tileTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#16302f', '#1d3d3a');
    t.repeat.set(3, 3);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(tileTex, 1, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tileTex, fog.color, fog.near, fog.far],
  );
  const wallTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#12292a', '#193432');
    t.repeat.set(Math.round(W / 1.2), 2);
    return t;
  }, [W]);
  const wallMat = useMemo(
    () => flatMat('#ffffff', { map: wallTex, side: THREE.DoubleSide }),
    [wallTex],
  );
  const ceilMat = useMemo(() => flatMat('#0d1f1f', { side: THREE.DoubleSide }), []);
  const lockerMat = useMemo(() => flatMat('#3a6f5e', { side: THREE.DoubleSide }), []);
  const lockerDark = useMemo(() => flatMat('#1c3a33', { side: THREE.DoubleSide }), []);

  // A row of lockers along the back (-Z) wall — flat boxes, faces alternating.
  const lockers = useMemo(() => {
    const out: { x: number; mat: THREE.Material }[] = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 1.0;
      out.push({ x, mat: i % 2 === 0 ? lockerMat : lockerDark });
    }
    return out;
  }, [lockerMat, lockerDark]);

  return (
    <group>
      <FirstEntryReward
        secret="locker-room"
        message="🍀 The locker hums — fortune kept here · +2 luck"
      />
      <ambientLight intensity={0.45} color="#bfeae2" />
      <pointLight position={[0, H - 0.5, 0]} intensity={0.55} distance={12} color="#cfeee8" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* lockers against the back wall */}
      {lockers.map((l, i) => (
        <mesh key={i} material={l.mat} position={[l.x, 1.05, -room.dims.halfD + 0.35]}>
          <boxGeometry args={[0.9, 2.0, 0.5]} />
        </mesh>
      ))}
      {/* a bench in the middle */}
      <mesh material={lockerDark} position={[0, 0.45, 0.6]}>
        <boxGeometry args={[2.4, 0.18, 0.5]} />
      </mesh>
    </group>
  );
}
