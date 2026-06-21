import * as THREE from 'three';
import type { Room } from '../data/rooms';

/**
 * The interior shell every box-shaped room drew by hand: a floor + ceiling + four
 * walls, as snapped/flat planes sized off the room's half-extents. Five rooms
 * (hallway, dicepit, mobius, jukebox, classified) built this identical six-plane
 * cage inline — only the materials differed — so it lives here once. Each room
 * still supplies its own materials and renders its own dressing alongside it.
 *
 * `sides` are the ±X long walls; `ends` the ±Z walls (defaults to `sides`). Every
 * wall material is DoubleSide, so a plane's facing/rotation is cosmetic; one fixed
 * convention is used, screenshot-verified to match the hand-built rooms.
 */
export function RoomBox({
  dims,
  floor,
  ceiling,
  sides,
  ends = sides,
}: {
  dims: Room['dims'];
  floor: THREE.Material;
  ceiling: THREE.Material;
  sides: THREE.Material;
  ends?: THREE.Material;
}) {
  const W = dims.halfW;
  const D = dims.halfD;
  const H = dims.height;
  return (
    <group>
      <mesh material={floor} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      <mesh material={ceiling} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      <mesh material={sides} rotation-y={Math.PI / 2} position={[-W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={sides} rotation-y={-Math.PI / 2} position={[W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={ends} position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={ends} rotation-y={Math.PI} position={[0, H / 2, D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
    </group>
  );
}
