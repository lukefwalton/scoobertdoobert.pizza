import { useMemo } from 'react';
import * as THREE from 'three';
import { applyVertexSnap, makeAffineTexturedMaterial, makeBrickTexture, makeCheckerTexture } from './ps1';
import type { Room } from '../data/rooms';

// The back hall — a long, narrow, low red-brick corridor (the Windows 3D-Maze
// nod, a corridor not a maze). Over-evenly lit with a few dim ceiling pools so
// it reads liminal/backrooms: nostalgic and a beat wrong. Doors at each end are
// rendered separately (Doors.tsx); this is just the shell + dressing.
function flatMat(color: string, map?: THREE.Texture): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, map, flatShading: true, side: THREE.DoubleSide });
  applyVertexSnap(m, 64);
  return m;
}

export function HallwayRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const fog = { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };

  const brickTex = useMemo(() => {
    const t = makeBrickTexture('#7d2b22', '#241008', 6);
    t.repeat.set(Math.round(D / 1.6), 2);
    return t;
  }, [D]);
  const endTex = useMemo(() => {
    const t = makeBrickTexture('#6f271f', '#241008', 6);
    t.repeat.set(2, 2);
    return t;
  }, []);
  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#2c2422', '#3a302c'); // dingy concrete tiles
    t.repeat.set(2, Math.round(D / 2));
    return t;
  }, [D]);

  // Affine floor (the PS1 swim) with the hall's own dark fog, not the shop's cyan.
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 1, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#ffffff', brickTex), [brickTex]);
  const endMat = useMemo(() => flatMat('#ffffff', endTex), [endTex]);
  const ceilMat = useMemo(() => flatMat('#160d0c'), []);
  const signMat = useMemo(() => flatMat('#caa14a'), []);

  return (
    <group>
      {/* dim neutral fill + warm pools so it's lit but wrong */}
      <ambientLight intensity={0.42} color="#caa6a0" />
      <pointLight position={[0, H - 0.4, D - 6]} intensity={0.5} distance={16} color="#ffd9a8" />
      <pointLight position={[0, H - 0.4, -D + 6]} intensity={0.45} distance={16} color="#ffcfa0" />

      {/* floor */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* ceiling */}
      <mesh material={ceilMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* side walls (the long brick runs) */}
      <mesh material={wallMat} rotation-y={Math.PI / 2} position={[-W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={-Math.PI / 2} position={[W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      {/* end walls (doors are cut visually by sitting in front of these) */}
      <mesh material={endMat} position={[0, H / 2, D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={endMat} rotation-y={Math.PI} position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>

      {/* ceiling light strips — the "fluorescents" (bright flat quads) */}
      {[-D + 4, -D + 12, D - 12, D - 4].map((z) => (
        <mesh key={z} material={signMat} rotation-x={Math.PI / 2} position={[0, H - 0.02, z]}>
          <planeGeometry args={[1.1, 2.4]} />
        </mesh>
      ))}
    </group>
  );
}
