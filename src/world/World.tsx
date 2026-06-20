import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM, PS1 } from './constants';
import { roomById, type Room } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { ShopRoom } from './ShopRoom';
import { HallwayRoom } from './HallwayRoom';
import { Doors } from './Doors';
import { Controls } from './Controls';

// Per-room background + fog. The world graph (rooms.ts) carries each room's
// palette; this pushes it onto the scene whenever the current room changes, so
// stepping through a door also steps the light/fog mood.
function RoomEnvironment({ room }: { room: Room }) {
  const { scene, gl } = useThree();
  useEffect(() => {
    const bg = new THREE.Color(room.palette.background);
    scene.background = bg;
    gl.setClearColor(bg);
    const fog = (scene.fog as THREE.Fog | null) ?? new THREE.Fog(0x000000, 1, 10);
    fog.color.set(room.palette.fog);
    fog.near = room.palette.fogNear;
    fog.far = room.palette.fogFar;
    scene.fog = fog;
  }, [room, scene, gl]);
  return null;
}

// Which room geometry to render. Each room kind owns its own scene + lights, so
// adding a room is: a ROOMS entry + a case here (+ a geometry component).
function RoomScene({ room }: { room: Room }) {
  switch (room.kind) {
    case 'hallway':
      return <HallwayRoom room={room} />;
    case 'shop':
    default:
      return <ShopRoom />;
  }
}

// The 3D world. Default export so it can be code-split behind a dynamic import —
// three.js never enters the initial bundle. Low dpr + pixelated CSS gives the
// low-res render crunch; `flat` disables tone mapping for flat PS1 color. The
// rendered room is data-driven (currentRoom): the shop is just ROOMS[0].
export default function World() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const room = roomById(currentRoom);

  return (
    <Canvas
      dpr={PS1.dpr}
      flat
      gl={{ antialias: false, powerPreference: 'low-power' }}
      camera={{ fov: 72, near: 0.1, far: 220, position: [0, ROOM.eye, ROOM.halfD - 1.5] }}
      onCreated={({ scene, gl }) => {
        const bg = new THREE.Color(room.palette.background);
        scene.background = bg;
        scene.fog = new THREE.Fog(bg.clone(), room.palette.fogNear, room.palette.fogFar);
        gl.setClearColor(bg);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        imageRendering: 'pixelated',
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      <RoomEnvironment room={room} />
      <RoomScene room={room} />
      <Doors />
      <Controls />
    </Canvas>
  );
}
