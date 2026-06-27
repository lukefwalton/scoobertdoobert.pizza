import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { DrumKit } from './DrumKit';
import { StudioKeys } from './StudioKeys';
import { fogFor, type Room } from '../data/rooms';

// The Live Room — the head of the Basement Sessions wing: a cosy, dim tracking
// room where the records get made. RoomBox shell in warm wood + carpet, a couple of
// amp stacks, a rug, and a mic stand with a bathrobe slung over it (the lore: he
// tracked a whole LP alone in one). It mounts the two playable instruments — the
// DrumKit (rhythm) and the StudioKeys (melody) — the wing's "play it" reward.

function Amp({
  x,
  z,
  rotationY,
  mat,
  grille,
}: {
  x: number;
  z: number;
  rotationY: number;
  mat: THREE.Material;
  grille: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      {/* head + cab stacked */}
      <mesh material={mat} position={[0, 1.5, 0]}>
        <boxGeometry args={[1.0, 1.2, 0.6]} />
      </mesh>
      <mesh material={grille} position={[0, 1.5, 0.31]}>
        <boxGeometry args={[0.82, 1.0, 0.04]} />
      </mesh>
      <mesh material={mat} position={[0, 0.45, 0]}>
        <boxGeometry args={[1.06, 0.32, 0.66]} />
      </mesh>
    </group>
  );
}

export function LiveRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  const carpetTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#2a1d12', '#34251a'); // warm brown shag
    t.repeat.set(5, 5);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(carpetTex, 6, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carpetTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#241a12', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#160f09'), []);
  const ampMat = useMemo(() => flatMat('#171515'), []);
  const grilleMat = useMemo(() => flatMat('#3a3228'), []);
  const rugMat = useMemo(() => flatMat('#7a2f24'), []); // a red area rug under the kit
  const standMat = useMemo(() => flatMat('#1a1a1e'), []);
  const robeMat = useMemo(() => flatMat('#b8b2c8'), []); // the bathrobe (soft grey-lilac)

  useEffect(() => () => carpetTex.dispose(), [carpetTex]);

  return (
    <group>
      {/* warm, dim practice-lamp light — enough to read the kit on the rug */}
      <ambientLight intensity={0.5} color="#ffe6bf" />
      <pointLight position={[0, 3.4, 0]} intensity={0.8} distance={20} color="#ffcf8a" />
      <pointLight position={[-2.2, 2.6, -3.4]} intensity={0.5} distance={12} color="#ffb060" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* the red rug the kit sits on */}
      <mesh material={rugMat} position={[-2.2, 0.03, -3.2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.4, 3.0]} />
      </mesh>

      {/* amp stacks along the back (-Z) wall */}
      <Amp x={-5.4} z={-6.0} rotationY={0.5} mat={ampMat} grille={grilleMat} />
      <Amp x={5.4} z={-6.0} rotationY={-0.5} mat={ampMat} grille={grilleMat} />
      <Amp x={0} z={-6.4} rotationY={0} mat={ampMat} grille={grilleMat} />

      {/* a mic stand with the bathrobe slung over it (he tracked a whole LP in one) */}
      <group position={[0.2, 0, -1.6]}>
        <mesh material={standMat} position={[0, 0.9, 0]}>
          <cylinderGeometry args={[0.03, 0.05, 1.8, 8]} />
        </mesh>
        <mesh material={standMat} position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 12]} />
        </mesh>
        {/* the mic */}
        <mesh material={standMat} position={[0.12, 1.7, 0]} rotation-z={-0.5}>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 8]} />
        </mesh>
        {/* the robe draped over the boom */}
        <mesh material={robeMat} position={[-0.18, 1.2, 0.02]} rotation-z={0.2}>
          <boxGeometry args={[0.4, 0.9, 0.16]} />
        </mesh>
      </group>

      {/* the playable pair: rhythm (left) + melody (right), facing the player who
          arrives looking -Z. The reward for finding the basement: you can jam. */}
      <DrumKit position={[-2.2, 0, -3.4]} rotationY={0.32} />
      <StudioKeys position={[2.6, 0, -2.6]} rotationY={-0.34} />
    </group>
  );
}
