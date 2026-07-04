import { Suspense, useEffect, useMemo, type ReactElement } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PS1 } from './constants';
import { roomById, ROOMS, type Room, type RoomKind } from '../data/rooms';
import { lootDropsForRoom } from '../data/loot';
import { useScoreStore } from '../state/scoreStore';
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
import { KitchenRoom } from './KitchenRoom';
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
import { GrassroomsRoom } from './GrassroomsRoom';
import { GroveRoom } from './GroveRoom';
import { FrutigerRoom } from './FrutigerRoom';
import { LockerRoom } from './LockerRoom';
import { ClosetRoom } from './ClosetRoom';
import { BoardwalkRoom } from './BoardwalkRoom';
import { OceanviewRoom } from './OceanviewRoom';
import { BalboaRoom } from './BalboaRoom';
import { GalleryRoom } from './GalleryRoom';
import { DaydreamRoom } from './DaydreamRoom';
import { ThereminRoom } from './ThereminRoom';
import { MemoryLaneRoom } from './MemoryLaneRoom';
import { InternetRoom } from './InternetRoom';
import { MoonlightRoom } from './MoonlightRoom';
import { BestDayRoom } from './BestDayRoom';
import { CaliforniaRoom } from './CaliforniaRoom';
import { TidepoolsRoom } from './TidepoolsRoom';
import { ZooRoom } from './ZooRoom';
import { NorthParkRoom } from './NorthParkRoom';
import { GardenRoom } from './GardenRoom';
import { GrottoRoom } from './GrottoRoom';
import { BambooRoom } from './BambooRoom';
import { TurtleRoom } from './TurtleRoom';
import { TubesRoom } from './TubesRoom';
import { MainStreetRoom } from './MainStreetRoom';
import { DinerRoom } from './DinerRoom';
import { LiveRoom } from './LiveRoom';
import { ControlRoom } from './ControlRoom';
import { TapeVault } from './TapeVault';
import { Lounge } from './Lounge';
import { ItemPickup } from './ItemPickup';
import { LootPickup } from './LootPickup';
import { Wanderer } from './Wanderer';
import { MetroTunnelFx } from './MetroTunnelFx';
import { GlbRoom } from './GlbRoom';
import { GlbProp } from './GlbProp';
import { CeilingDrips } from './CeilingDrips';
import { Doors } from './Doors';
import { Paintings } from './CoverArt';
import { TvSet } from './TvSet';
import { Controls } from './Controls';
import { PickupController } from './PickupController';
import { DreadVisuals } from './DreadVisuals';
import { RoomFireball } from './RoomFireball';
import { RoomLight } from './RoomLight';
import { CollectBursts } from './CollectBursts';

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

// The room-kind → scene registry. Each PROCEDURAL room kind renders its own scene
// component (its geometry + lights). Adding a room kind is one entry here (+ the
// component + a ROOMS entry), never a new switch case. GLB-level kinds (liminal,
// metro) aren't here — those rooms render through GlbRoom below (room.glb), so the
// registry only covers procedural kinds; a missing kind falls back to the shop
// (matching the old switch default). A DEV guard (bottom of file) warns if any
// non-GLB room's kind lacks an entry, so a typo can't silently render the shop.
type RoomRenderer = (room: Room) => ReactElement;
export const ROOM_SCENES: Partial<Record<RoomKind, RoomRenderer>> = {
  shop: () => <ShopRoom />,
  kitchen: (room) => <KitchenRoom room={room} />,
  hallway: (room) => <HallwayRoom room={room} />,
  jukebox: (room) => <JukeboxRoom room={room} />,
  classified: (room) => <ClassifiedRoom room={room} />,
  poolrooms: (room) => <PoolroomsRoom room={room} />,
  mobius: (room) => <MobiusRoom room={room} />,
  dicepit: (room) => <DicePitRoom room={room} />,
  shrine: (room) => <ShrineRoom room={room} />,
  practice: (room) => <PracticeRoom room={room} />,
  grass: (room) => <GrassRoom room={room} />,
  grassbattle: (room) => <GrassBattleRoom room={room} />,
  grassrooms: (room) => <GrassroomsRoom room={room} />,
  grove: (room) => <GroveRoom room={room} />,
  frutiger: () => <FrutigerRoom />,
  lockerroom: (room) => <LockerRoom room={room} />,
  closet: (room) => <ClosetRoom room={room} />,
  boardwalk: (room) => <BoardwalkRoom room={room} />,
  oceanview: (room) => <OceanviewRoom room={room} />,
  balboa: (room) => <BalboaRoom room={room} />,
  gallery: (room) => <GalleryRoom room={room} />,
  daydream: (room) => <DaydreamRoom room={room} />,
  theremin: (room) => <ThereminRoom room={room} />,
  memorylane: (room) => <MemoryLaneRoom room={room} />,
  internet: (room) => <InternetRoom room={room} />,
  moonlight: (room) => <MoonlightRoom room={room} />,
  bestday: (room) => <BestDayRoom room={room} />,
  california: (room) => <CaliforniaRoom room={room} />,
  tidepools: (room) => <TidepoolsRoom room={room} />,
  zoo: (room) => <ZooRoom room={room} />,
  northpark: (room) => <NorthParkRoom room={room} />,
  garden: (room) => <GardenRoom room={room} />,
  grotto: (room) => <GrottoRoom room={room} />,
  bamboo: (room) => <BambooRoom room={room} />,
  turtle: (room) => <TurtleRoom room={room} />,
  tubes: (room) => <TubesRoom room={room} />,
  mainstreet: (room) => <MainStreetRoom room={room} />,
  diner: (room) => <DinerRoom room={room} />,
  // The Basement Sessions — the recording-studio wing (off the practice room).
  liveroom: (room) => <LiveRoom room={room} />,
  controlroom: (room) => <ControlRoom room={room} />,
  tapevault: (room) => <TapeVault room={room} />,
  lounge: (room) => <Lounge room={room} />,
};

// Which room geometry to render. GLB levels short-circuit (lazy useGLTF); every
// procedural kind comes from the ROOM_SCENES registry above.
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
  return (ROOM_SCENES[room.kind] ?? ROOM_SCENES.shop!)(room);
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

// Loot drops scattered in the current room (loot.ts) — the pizza-points
// collectathon. Each LootPickup renders nothing once taken (this run); the next
// descent restocks (the taken set is ephemeral). Sibling of RoomPickups; loot.ts
// returns [] for GLB levels, so this is a no-op there.
function RoomLoot({ room }: { room: Room }) {
  const drops = useMemo(() => lootDropsForRoom(room), [room]);
  if (!drops.length) return null;
  return (
    <>
      {drops.map((d) => (
        <LootPickup key={d.id} id={d.id} type={d.type} position={d.position} />
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

  // Each descent is a fresh arcade RUN: zero the score / combo / height and restock
  // loot (the taken set is ephemeral). Runs once on mount (entering the world); the
  // durable best (progressStore.pizzaPointsBest) survives, recorded as you climb.
  useEffect(() => {
    useScoreStore.getState().resetRun();
  }, []);

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
      <RoomLoot room={room} />
      <Entities room={room} />
      {room.paintings && <Paintings list={room.paintings} />}
      {room.tv && <TvSet {...room.tv} />}
      <Doors />
      {/* Proximity pickups: publishes the "Press P to grab" prompt + auto-grabs on
          walk-over (the meshes themselves are RoomPickups; this is the controller). */}
      <PickupController />
      <Controls />
      {/* After <Controls/> so its useFrame runs last — layers the dread fog +
          bob/shake on top of the camera Controls just positioned. */}
      <DreadVisuals />
      {/* The spell effects — mounted once, each ignites on the cast nonce (gated
          on which spell). Read the live room for their dims (spread / mote height). */}
      <RoomFireball room={room} />
      <RoomLight room={room} />
      {/* The collect-burst pool: a pop of light + sparks wherever anything is
          grabbed (loot, items, skill orbs) — one place, all pickups get the juice. */}
      <CollectBursts />
    </Canvas>
  );
}

// Dev guardrail: every PROCEDURAL room (not a GLB level) must have a ROOM_SCENES
// renderer, or it silently falls back to the shop. Surfaces a missing/typo'd kind
// at the source as the registry grows (the switch's old default hid this).
if (import.meta.env?.DEV) {
  for (const room of ROOMS) {
    if (!room.glb && !ROOM_SCENES[room.kind]) {
      console.warn(
        `[world] room "${room.id}" kind "${room.kind}" has no ROOM_SCENES renderer → falls back to the shop`,
      );
    }
  }
}
