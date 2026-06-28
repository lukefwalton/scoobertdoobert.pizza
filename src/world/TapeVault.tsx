import { useMemo } from 'react';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { useDispose } from '../lib/useDispose';
import { fogFor, type Room } from '../data/rooms';

// The Tape Vault — the studio's archive: dim, dusty, warm. Wall-to-wall shelving
// lined with tape reels + cassette spines, a single desk lamp pooling light. The
// collectible MASTER TAPES (Room.pickups) sit on the lower shelves — render via the
// shared pickup layer, so this is just the shelving + the mood. Hundreds of reels:
// "every song on Finding SD written, recorded, mixed and mastered in a single day."

// A shelving unit: a back + uprights + N shelves, lined with little reel discs and
// cassette-box spines so it reads as a packed archive.
function Shelf({
  x,
  z,
  rotationY,
  frame,
  reel,
  box,
}: {
  x: number;
  z: number;
  rotationY: number;
  frame: THREE.Material;
  reel: THREE.Material;
  box: THREE.Material;
}) {
  const shelves = [0.5, 1.2, 1.9, 2.6];
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      {/* uprights */}
      <mesh material={frame} position={[-1.4, 1.5, 0]}>
        <boxGeometry args={[0.1, 3.0, 0.5]} />
      </mesh>
      <mesh material={frame} position={[1.4, 1.5, 0]}>
        <boxGeometry args={[0.1, 3.0, 0.5]} />
      </mesh>
      {shelves.map((y, si) => (
        <group key={si}>
          <mesh material={frame} position={[0, y, 0]}>
            <boxGeometry args={[2.9, 0.06, 0.5]} />
          </mesh>
          {/* a row of reels + cassette spines on this shelf */}
          {Array.from({ length: 7 }, (_, i) => -1.2 + i * 0.4).map((rx, i) =>
            (i + si) % 3 === 0 ? (
              <mesh key={i} material={reel} position={[rx, y + 0.27, 0]} rotation-x={Math.PI / 2}>
                <cylinderGeometry args={[0.18, 0.18, 0.07, 12]} />
              </mesh>
            ) : (
              <mesh key={i} material={box} position={[rx, y + 0.2, 0]}>
                <boxGeometry args={[0.34, 0.4, 0.18]} />
              </mesh>
            ),
          )}
        </group>
      ))}
    </group>
  );
}

export function TapeVault({ room }: { room: Room }) {
  const fog = fogFor(room);

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#161009', '#1e160c');
    t.repeat.set(4, 4);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 4, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#1b140c', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#120c06'), []);
  const frameMat = useMemo(() => flatMat('#3a2a18'), []); // wooden shelving
  const reelMat = useMemo(() => flatMat('#2a2622'), []);
  const boxMat = useMemo(() => flatMat('#7a5a36'), []); // cassette/box spines (kraft)
  const lampMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd591' }), []);

  useDispose(floorTex);

  return (
    <group>
      <ambientLight intensity={0.3} color="#ffdca0" />
      {/* the one desk lamp, warm and pooled */}
      <pointLight position={[0, 2.2, -3]} intensity={0.6} distance={11} color="#ffc070" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* shelving down the back (-Z) wall + both side walls */}
      <Shelf x={0} z={-4.6} rotationY={0} frame={frameMat} reel={reelMat} box={boxMat} />
      <Shelf
        x={-4.6}
        z={-1.5}
        rotationY={Math.PI / 2}
        frame={frameMat}
        reel={reelMat}
        box={boxMat}
      />
      <Shelf
        x={4.6}
        z={-1.5}
        rotationY={-Math.PI / 2}
        frame={frameMat}
        reel={reelMat}
        box={boxMat}
      />

      {/* the lamp bulb glow up in the corner */}
      <mesh material={lampMat} position={[0, 2.4, -3]}>
        <sphereGeometry args={[0.12, 8, 8]} />
      </mesh>
    </group>
  );
}
