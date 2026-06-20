import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PS1 } from './constants';
import { roomById, type Room } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { ShopRoom } from './ShopRoom';
import { HallwayRoom } from './HallwayRoom';
import { JukeboxRoom } from './JukeboxRoom';
import { ClassifiedRoom } from './ClassifiedRoom';
import { PoolroomsRoom } from './PoolroomsRoom';
import { MobiusRoom } from './MobiusRoom';
import { DicePitRoom } from './DicePitRoom';
import { GlbRoom } from './GlbRoom';
import { GlbProp } from './GlbProp';
import { CeilingDrips } from './CeilingDrips';
import { Doors } from './Doors';
import { Controls } from './Controls';
import { DreadVisuals } from './DreadVisuals';

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
  // GLB levels (lazy-loaded; suspends until decoded). The DOM LoaderGame masks
  // the wait and offers TAP-TO-ENTER (see LevelLoader / GlbRoom). Keyed by
  // room.id so a future GLB→GLB hop force-remounts GlbRoom (fresh useGLTF +
  // mount effect) rather than reusing the instance and inheriting a stale
  // ready/error signal — same component type, different model.
  if (room.glb)
    return (
      <>
        <GlbRoom key={room.id} room={room} />
        {/* Ambient water dripping from the ceiling — opt-in per room (room.drips),
            not coupled to the room kind, so a future liminal room can skip it. */}
        {room.drips && <CeilingDrips bounds={room.dims} />}
      </>
    );
  switch (room.kind) {
    case 'hallway':
      return <HallwayRoom room={room} />;
    case 'jukebox':
      return <JukeboxRoom room={room} />;
    case 'classified':
      return <ClassifiedRoom room={room} />;
    case 'poolrooms':
      return <PoolroomsRoom room={room} />;
    case 'mobius':
      return <MobiusRoom room={room} />;
    case 'dicepit':
      return <DicePitRoom room={room} />;
    case 'shop':
    default:
      return <ShopRoom />;
  }
}

// GLB set-dressing for the current room (room.props). Each prop is small + loads
// fast; its own Suspense (null fallback) so a prop never gates the room, and each
// GlbProp has an error boundary so a bad one can't crash the scene.
function RoomProps({ room }: { room: Room }) {
  if (!room.props?.length) return null;
  return (
    <Suspense fallback={null}>
      {room.props.map((spec) => (
        <GlbProp key={spec.url} spec={spec} />
      ))}
    </Suspense>
  );
}

// The 3D world. Default export so it can be code-split behind a dynamic import —
// three.js never enters the initial bundle. Low dpr + pixelated CSS gives the
// low-res render crunch; `flat` disables tone mapping for flat PS1 color. The
// rendered room is data-driven (currentRoom): the shop is just ROOMS[0].
export default function World() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const currentSpawn = useSceneStore((s) => s.currentSpawn);
  const room = roomById(currentRoom);
  // Boot the camera AT the current room's spawn (not a hardcoded pose), so the
  // very first frame is already correct — no post-paint snap, and no door-prompt
  // flash from briefly sitting inside a door radius. Controls owns it after mount.
  const spawn = room.spawns[currentSpawn] ?? room.spawns.default;

  return (
    <Canvas
      dpr={PS1.dpr}
      flat
      gl={{ antialias: false, powerPreference: 'low-power' }}
      camera={{ fov: 72, near: 0.1, far: 220, position: spawn.position }}
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
      {/* Suspense for GLB levels (useGLTF). Fallback is null — the DOM
          LoaderGame (LevelLoader) covers the wait. No-op for procedural rooms. */}
      <Suspense fallback={null}>
        <RoomScene room={room} />
      </Suspense>
      <RoomProps room={room} />
      <Doors />
      <Controls />
      {/* After <Controls/> so its useFrame runs last — layers the dread fog +
          bob/shake on top of the camera Controls just positioned. */}
      <DreadVisuals />
    </Canvas>
  );
}
