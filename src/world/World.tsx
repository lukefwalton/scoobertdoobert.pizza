import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PS1 } from './constants';
import { roomById, type Room } from '../data/rooms';
import { jukeboxTrackUrl } from '../data/music';
import { jukeboxTitle } from '../data/jukebox';
import { useSceneStore } from '../state/sceneStore';
import { useMusicStore } from '../state/musicStore';
import { useProgressStore } from '../state/progressStore';
import { announce } from '../state/toastStore';
import { noteToFreq } from '../lib/chimes';
import { useTipsyStore } from '../state/tipsyStore';
import { audio } from '../audio/engine';
import { ShopRoom } from './ShopRoom';
import { HallwayRoom } from './HallwayRoom';
import { JukeboxRoom } from './JukeboxRoom';
import { ClassifiedRoom } from './ClassifiedRoom';
import { PoolroomsRoom } from './PoolroomsRoom';
import { MobiusRoom } from './MobiusRoom';
import { DicePitRoom } from './DicePitRoom';
import { ShrineRoom } from './ShrineRoom';
import { PracticeRoom } from './PracticeRoom';
import { GrassRoom } from './GrassRoom';
import { GrassBattleRoom } from './GrassBattleRoom';
import { GroveRoom } from './GroveRoom';
import { FrutigerRoom } from './FrutigerRoom';
import { LockerRoom } from './LockerRoom';
import { ClosetRoom } from './ClosetRoom';
import { BoardwalkRoom } from './BoardwalkRoom';
import { OceanviewRoom } from './OceanviewRoom';
import { BalboaRoom } from './BalboaRoom';
import { GalleryRoom } from './GalleryRoom';
import { DaydreamRoom } from './DaydreamRoom';
import { MemoryLaneRoom } from './MemoryLaneRoom';
import { InternetRoom } from './InternetRoom';
import { MoonlightRoom } from './MoonlightRoom';
import { BestDayRoom } from './BestDayRoom';
import { CaliforniaRoom } from './CaliforniaRoom';
import { TidepoolsRoom } from './TidepoolsRoom';
import { ZooRoom } from './ZooRoom';
import { NorthParkRoom } from './NorthParkRoom';
import { ItemPickup } from './ItemPickup';
import { Wanderer } from './Wanderer';
import { MetroTunnelFx } from './MetroTunnelFx';
import { GlbRoom } from './GlbRoom';
import { GlbProp } from './GlbProp';
import { CeilingDrips } from './CeilingDrips';
import { Doors } from './Doors';
import { Paintings } from './CoverArt';
import { TvSet } from './TvSet';
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
    // Fade the carried SONG out in MUSIC rooms (their own bells/pads own the space),
    // and back up everywhere else — the room's instrument one-shots are unaffected.
    audio.setSongLevel(room.musicRoom ? 0 : 1);
  }, [room, scene, gl]);
  return null;
}

// A SONG-ROOM owns the loop voice while you're in it: entering plays the room's
// track (room.song, a jukebox slug); leaving hands the voice back to the user's
// preferred pick (musicStore.restorePreferred) — the exact override contract the
// jukebox cabinet uses on exit. The reward for finding the room is its song; a
// TEMPORARY override, never a permanent switch. Rooms with `musicRoom` instead
// FADE the carried song out for their own bells, so the two are mutually
// exclusive (guarded in music.test.ts). No R3F hooks, so it lives beside
// RoomEnvironment inside the Canvas and draws nothing.
function RoomMusic({ room }: { room: Room }) {
  useEffect(() => {
    if (!room.song) return;
    const song = room.song;
    void audio.playJukeboxTrack(jukeboxTrackUrl(song));
    // Exploration's reward is sound: finding a song-room UNLOCKS its track in the
    // jukebox forever (it's hidden there until found). Chime + announce ONLY on the
    // first find (discoverSong returns true once), so revisits stay quiet.
    if (useProgressStore.getState().discoverSong(song)) {
      announce(`♪ new song unlocked — ${jukeboxTitle(song)}`, 'luck');
      audio.playChime(noteToFreq('E', 5), 0.18, 0.08, 0.5);
      window.setTimeout(() => audio.playChime(noteToFreq('B', 5), 0.22, 0.08, 0.5), 150);
    }
    return () => {
      useMusicStore.getState().restorePreferred();
    };
  }, [room.song]);
  return null;
}

// Which room geometry to render. Each room kind owns its own scene + lights, so
// adding a room is: a ROOMS entry + a case here (+ a geometry component).
function RoomScene({ room }: { room: Room }) {
  // GLB levels (lazy-loaded; suspends until decoded). The DOM LevelLoader covers
  // a slow load and AUTO-ENTERS the instant it resolves (see LevelLoader / GlbRoom). Keyed by
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
        {/* Kind-specific procedural dressing layered over a GLB level: the metro
            tunnel's shitty-fake shinkansen + 青函トンネル neon + flooded floor. */}
        {room.kind === 'metro' && <MetroTunnelFx room={room} />}
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
    case 'shrine':
      return <ShrineRoom room={room} />;
    case 'practice':
      return <PracticeRoom room={room} />;
    case 'grass':
      return <GrassRoom room={room} />;
    case 'grassbattle':
      return <GrassBattleRoom room={room} />;
    case 'grove':
      return <GroveRoom room={room} />;
    case 'frutiger':
      return <FrutigerRoom />;
    case 'lockerroom':
      return <LockerRoom room={room} />;
    case 'closet':
      return <ClosetRoom room={room} />;
    case 'boardwalk':
      return <BoardwalkRoom room={room} />;
    case 'oceanview':
      return <OceanviewRoom room={room} />;
    case 'balboa':
      return <BalboaRoom room={room} />;
    case 'gallery':
      return <GalleryRoom room={room} />;
    case 'daydream':
      return <DaydreamRoom room={room} />;
    case 'memorylane':
      return <MemoryLaneRoom room={room} />;
    case 'internet':
      return <InternetRoom room={room} />;
    case 'moonlight':
      return <MoonlightRoom room={room} />;
    case 'bestday':
      return <BestDayRoom room={room} />;
    case 'california':
      return <CaliforniaRoom room={room} />;
    case 'tidepools':
      return <TidepoolsRoom room={room} />;
    case 'zoo':
      return <ZooRoom room={room} />;
    case 'northpark':
      return <NorthParkRoom room={room} />;
    case 'shop':
    default:
      return <ShopRoom />;
  }
}

// GLB set-dressing for the current room (room.props). Each prop is small + loads
// fast; each gets its OWN Suspense (null fallback) so one slow prop never hides
// its siblings or gates the room, and its own error boundary (in GlbProp) so a
// bad one can't crash the scene. Keyed by url+index so the same GLB can appear
// twice in a room without a key clash.
function RoomProps({ room }: { room: Room }) {
  if (!room.props?.length) return null;
  return (
    <>
      {room.props.map((spec, i) => (
        <Suspense key={`${spec.url}#${i}`} fallback={null}>
          <GlbProp spec={spec} />
        </Suspense>
      ))}
    </>
  );
}

// Collectible items lying in the current room (room.pickups). Each ItemPickup
// renders nothing once held, so taken items just vanish. Works for procedural +
// GLB rooms alike (a sibling of RoomScene, like RoomProps).
function RoomPickups({ room }: { room: Room }) {
  if (!room.pickups?.length) return null;
  return (
    <>
      {room.pickups.map((p) => (
        <ItemPickup key={p.itemId} itemId={p.itemId} position={p.position} />
      ))}
    </>
  );
}

// Wandering, dancing entities for the current room (room.entities) — GLB levels
// only, by data. A sibling of RoomScene (like RoomProps), so they overlay GLB
// geometry. Gated to desktop + motion-OK for free: the whole World only mounts
// there (mobile/reduced-motion gets /text instead).
function Entities({ room }: { room: Room }) {
  if (!room.entities?.length) return null;
  return (
    <>
      {room.entities.map((e) => (
        <Wanderer
          key={e.id}
          id={e.id}
          body={e.body}
          label={e.label}
          bounds={room.dims}
          spawn={e.spawn}
          danceRadius={e.danceRadius}
          speed={e.speed}
        />
      ))}
    </>
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

  // When the WHOLE world unmounts (return to storefront / exit), un-duck the shared
  // loop voice. RoomEnvironment fades the carried song to 0 in music rooms, but that
  // level lives on the audio singleton and survives the world teardown — so without
  // this, exiting from the grove or shrine would strand the storefront's boot loop
  // silently ducked. Smoothed (fades back, never spikes); WorldMount unmounts the
  // whole subtree on exitWorld, so this runs exactly once on the way out.
  useEffect(() => () => audio.setSongLevel(1), []);

  // The North Park "too many beers" gag: a gentle, gradual full-frame blur (no
  // strobe, no flash — WCAG-safe) layered on the canvas via CSS, fading back on
  // its own after a few seconds (see tipsyStore). Off everywhere else.
  const tipsy = useTipsyStore((s) => s.blurry);

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
        filter: tipsy ? 'blur(5px) saturate(1.15)' : 'none',
        transition: 'filter 0.6s ease-in-out',
      }}
    >
      <RoomEnvironment room={room} />
      <RoomMusic room={room} />
      {/* Suspense for GLB levels (useGLTF). Fallback is null — the DOM
          LevelLoader covers the wait. No-op for procedural rooms. */}
      <Suspense fallback={null}>
        <RoomScene room={room} />
      </Suspense>
      <RoomProps room={room} />
      <RoomPickups room={room} />
      <Entities room={room} />
      {room.paintings && <Paintings list={room.paintings} />}
      {room.tv && <TvSet {...room.tv} />}
      <Doors />
      <Controls />
      {/* After <Controls/> so its useFrame runs last — layers the dread fog +
          bob/shake on top of the camera Controls just positioned. */}
      <DreadVisuals />
    </Canvas>
  );
}
