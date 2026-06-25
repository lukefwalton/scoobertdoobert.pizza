// ───────────────────────────────────────────────────────────────────────────
// src/data/rooms.ts — the 3D world, as data.
//
// Phase 2 made the FLAT descent data-driven (floors.ts). Phase 3 does the same
// for the 3D world: the beach shop is no longer the only room, it's ROOMS[0].
// Rooms connect through DOORS — the same metaphor as the floor doors, all the
// way down. Adding a room = add a ROOMS entry (+ one geometry component in
// src/world/rooms/ if its look is new). Never special-case a room in scene code.
//
// A door is a real 3D object you walk up to and step through (E / click), with a
// short fade. It carries the target room + which spawn to arrive at, so the
// graph is fully described here and Controls/World just render the current node.
// ───────────────────────────────────────────────────────────────────────────
import { ROOM } from '../world/dims';
import { itemById } from './items';

export type RoomKind =
  | 'shop'
  | 'hallway'
  | 'jukebox'
  | 'classified'
  | 'poolrooms'
  | 'liminal'
  | 'mobius'
  | 'dicepit'
  | 'shrine'
  | 'metro'
  | 'practice'
  | 'grass'
  | 'grassbattle'
  | 'grove'
  | 'frutiger'
  | 'lockerroom'
  | 'closet'
  // The Boardwalk wing — a sweet SoCal surface branch off the shop (NOT the
  // descent): a golden-hour pier, a moonlit beach, a park path. Each plays its
  // own Scoobert song (Room.song) — the reward for wandering out is the music.
  | 'boardwalk'
  | 'oceanview'
  | 'balboa'
  // The Sunken Gallery wing — a submerged vaporwave-classical hall of crunched
  // greek statuary off the poolrooms (funny-uncanny, never traumatic), opening
  // onto a sweet pastel daydream breather. Each plays its own song (Room.song).
  | 'gallery'
  | 'daydream'
  // The Memory Lane wing — a digital-nostalgia branch off the classified file
  // room: a corridor of glowing CRTs showing old-web fragments, opening into a
  // dark server-void where drifting data motes are "all my friends." Mildly
  // eerie-warm, NOT dread. Each plays its own song (Room.song).
  | 'memorylane'
  | 'internet'
  // The Moonlight wing — a sweet night→day pair extending the boardwalk's SoCal
  // surface: a moonlit dance plaza out on the pier, opening onto a bright "best
  // day ever" carnival end. Pure surface goof (taste-safe). Each plays its own
  // song (Room.song) — the reward for strolling further is the music.
  | 'moonlight'
  | 'bestday'
  // The California wing — a sweet golden-hour pair up the park path: a coastal
  // overlook on the road, drifting down into a hazy tidepool daydream. Pure
  // surface goof (taste-safe). Each plays its own song (Room.song).
  | 'california'
  | 'tidepools';

/** How many forward laps it takes for the Möbius corridor to "break on its own"
 *  and reveal the way onward (the `revealOn: 'mobius'` door). Kept low — the loop
 *  is the bit, not a grind (friction budget). */
export const MOBIUS_BREAK = 3;

/** A GLB level: a (wide-permission, crunched) model loaded as the room geometry,
 *  lazy-loaded behind the loader minigame. See GlbRoom / LevelLoader, and
 *  THIRD_PARTY_NOTICES.md for asset provenance. */
export type RoomGlb = {
  /** Crunched derivative under public/models/ (NOT the raw media/models source). */
  url: string;
  /** Target horizontal footprint (world units) to auto-fit the model into. */
  fit?: number;
  /** Extra yaw to orient the model. */
  rotationY?: number;
  /** Where the loader's TURN BACK bounces the player if the GLB fails to load.
   *  Explicit so recovery isn't coupled to door array order (a reordered/added
   *  door must never silently change the safe exit). Falls back to the first
   *  door, then the shop, if omitted. */
  recoverTo?: { to: string; spawn?: string };
};

/** Where the camera stands when it arrives. yaw is radians about +Y (π faces -Z). */
export type Spawn = { position: [number, number, number]; yaw: number };

/** A wandering, dancing entity (Wanderer) placed in a (GLB) level. */
export type RoomEntity = {
  /** Stable id (the dance test hook keys on it + React keying). */
  id: string;
  /** Which low-poly body to render. */
  body: 'blob' | 'lurker' | 'mop';
  /** Friendly name for the "dance along" prompt + reward (defaults from body). */
  label?: string;
  /** Start position on the floor [x, z] (y is the floor). */
  spawn: [number, number];
  /** Get this close → it stops to dance (default 3). */
  danceRadius?: number;
  /** Roam speed (default 2.2). */
  speed?: number;
};

export type RoomDoor = {
  /** Stable id, unique within the world. */
  id: string;
  /** Target room id. */
  to: string;
  /** Spawn id to arrive at in the target room (defaults to 'default'). */
  toSpawn?: string;
  /** World position of the doorway (sits flush in a wall). */
  position: [number, number, number];
  /** Rotation about +Y so the frame lies in its wall and the opening faces in. */
  rotationY: number;
  /** Verb phrase for the prompt: rendered as `Press E to {label}`. */
  label: string;
  /** Hidden until revealed (the rat's secret panel — Phase 3 ckpt 4). */
  hidden?: boolean;
  /** What makes a `hidden` door appear. 'secret' = the rat knocked
   *  (secretRevealed); 'mobius' = the loop broke (mobiusLoops ≥ MOBIUS_BREAK).
   *  Defaults to 'secret'. */
  revealOn?: 'secret' | 'mobius';
  /** Or reveal — for good — once a durable progress secret is earned
   *  (progressStore.secretsFound includes this id), e.g. the grove path that opens
   *  after you beat the grass goblin. Takes precedence over revealOn when set. */
  revealSecret?: string;
  /** If set, this door is a PAINTING PORTAL: it renders as a big framed album cover
   *  (CoverArt.FramedCover) instead of a doorway and LUNGES at you on entry (the
   *  SM64 dive). The slug resolves against src/data/albums. */
  albumSlug?: string;
  /** LOCKED until the player holds this items.ts key id. The door still renders +
   *  prompts (you can SEE it's there); E / click just announces "locked" until you
   *  have the key. SECRET / SIDE TIER ONLY — never a main-descent door (friction
   *  budget); the dev guard below rejects a requiresKey door that targets a
   *  descent room. */
  requiresKey?: string;
  /** How close (world units) to trigger the prompt. */
  radius?: number;
};

/** A decorative album cover hung on a wall (room.paintings) — showcase art, no
 *  interaction (portals are doors with `albumSlug`). Positioned + rotated to sit
 *  flush on a wall; references an album by slug (src/data/albums). */
export type RoomPainting = {
  slug: string;
  position: [number, number, number];
  /** Rotation about +Y so the cover faces into the room. */
  rotationY?: number;
  /** Edge length in world units (covers are square). Defaults to ~2.4. */
  size?: number;
};

/** A crunched GLB placed as set-dressing in a room (GlbProp renders it). */
export type RoomProp = {
  /** Crunched derivative under public/models/ (NOT the raw media/models source). */
  url: string;
  /** Base position (the model's feet sit here). */
  position: [number, number, number];
  /** Target largest dimension in world units (auto-scales the model). */
  fit?: number;
  rotationY?: number;
  /** Idle Y-spin (rad/s) — e.g. a slowly turning Möbius strip. */
  spin?: number;
  /** Emissive boost (0..1) so a prop reads against a DIM room instead of going
   *  to black under PS1 flat lighting (the Möbius strip in the dark corridor). */
  glow?: number;
};

export type RoomPalette = {
  /** Canvas clear / sky color. */
  background: string;
  /** Fog color (usually == background so geometry dissolves into it). */
  fog: string;
  fogNear: number;
  fogFar: number;
};

export type Room = {
  id: string;
  kind: RoomKind;
  /** Shown in the HUD's quiet corner label. */
  title: string;
  /** Interior half-extents the camera is clamped inside. */
  dims: { halfW: number; halfD: number; height: number; eye: number };
  palette: RoomPalette;
  /** If set, this room IS a GLB level (GlbRoom renders it behind the loader). */
  glb?: RoomGlb;
  /** Render ambient water dripping from the ceiling (the watery descent's
   *  aftermath). Opt-in per room so it isn't coupled to a room kind. */
  drips?: boolean;
  /** A MUSIC room: the room's own audio (a sound garden, the furin) should own the
   *  space, so the loop-voice SONG fades out while you're here (audio.setSongLevel).
   *  Instrument one-shots, which hit master directly, are unaffected. */
  musicRoom?: boolean;
  /** The loop-voice SONG this room plays while you're inside it (a jukebox.catalog
   *  slug). On enter, the room becomes that track; on exit, your preferred pick
   *  returns (musicStore.restorePreferred) — a TEMPORARY override, never a new
   *  collectible or a permanent switch. "Exploration's reward is sound": finding the
   *  place gives you its song. Mutually exclusive with `musicRoom` (which FADES the
   *  carried song out for rooms that own the space with their own bells). Typos +
   *  the song/musicRoom conflict are guarded in music.test.ts. */
  song?: string;
  /** GLB set-dressing placed in the room (GlbProp). Crunched models from the
   *  trove — provenance in THIRD_PARTY_NOTICES.md. */
  props?: RoomProp[];
  /** Album covers hung on the walls as framed showcase paintings (CoverArt). */
  paintings?: RoomPainting[];
  /** A CRT television (TvSet) — the far side of an album's painting: click it to
   *  play that record's music videos in the modal player. */
  tv?: { position: [number, number, number]; rotationY?: number; albumSlug: string };
  /** Collectible items lying in the room (ItemPickup). Durable: each disappears
   *  for good once taken (progressStore.itemsHeld). */
  pickups?: { itemId: string; position: [number, number, number] }[];
  /** Wandering entities (Wanderer) — roam the room and DANCE (never attack) when
   *  you get close. GLB liminal levels ONLY: a funny-uncanny relief beat against
   *  the dread down there (the contrast is the point); the sweet procedural rooms
   *  don't need them. Desktop + motion-OK is automatic (the world only mounts
   *  there). The dev guard warns if this is set on a non-GLB room. */
  entities?: RoomEntity[];
  /** Named arrival points (doors reference these by id). 'default' is required. */
  spawns: Record<string, Spawn> & { default: Spawn };
  doors: RoomDoor[];
};

// Single source for the door-transition timing: the black-wipe commit (JS
// setTimeout in WorldHud) and the overlay's CSS opacity transition both read
// this, injected as the `--room-fade-ms` custom property, so the visual fade and
// the room swap can't drift apart.
export const ROOM_FADE_MS = 230;

const EYE = ROOM.eye;

export const ROOMS: Room[] = [
  {
    id: 'shop',
    kind: 'shop',
    title: 'Beach Pizza Shop',
    dims: { halfW: ROOM.halfW, halfD: ROOM.halfD, height: ROOM.height, eye: EYE },
    // The tropical-shallow cyan of floor one (unchanged — the shop is ROOMS[0]).
    palette: { background: '#1f8fb5', fog: '#1f8fb5', fogNear: 6, fogFar: 64 },
    // A potted palm by the window — it IS a beach pizza shop.
    props: [{ url: '/models/palm-tree.glb', position: [5.6, 0, -5.4], fit: 4.4, rotationY: 0.5 }],
    // A lost cassette sits on the counter — the first rung of the music ladder.
    pickups: [{ itemId: 'tape-mystery-machine', position: [-4, 0.7, 0] }],
    spawns: {
      // The establishing shot: facing the window/sea (-Z), the boids out the
      // glass. Kept clear of the back-hall door's 3.2 radius so the door is
      // something you discover by turning around, not an instant prompt at spawn.
      default: { position: [0, EYE, ROOM.halfD - 3.5], yaw: Math.PI },
      // Arriving back from the hall: a step clear of the back door (outside its
      // 3.2 radius) so you land IN the room, not on its prompt, and a held E
      // can't immediately bounce you back through it. Faces the sea.
      fromHall: { position: [0, EYE, ROOM.halfD - 4.5], yaw: Math.PI },
      // Stepping back IN off the boardwalk: by the +X side door, a step clear of
      // its radius, facing into the shop (-X). The wing is a LATERAL surface exit
      // (out to the beach), not a way down — the descent rule is untouched.
      fromBoardwalk: { position: [ROOM.halfW - 4.5, EYE, 3], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'shop-to-hall',
        to: 'hallway',
        toSpawn: 'fromShop',
        // Back wall (+Z), opposite the window. "EMPLOYEES ONLY." The shop is the
        // TOP lobby — its only way on is INTO the building (the hall → the music),
        // never a stairwell down right here. You FIND the way down by going
        // deeper (past the jukebox), not from the lobby. (Luke's descent rule.)
        position: [0, 0, ROOM.halfD - 0.05],
        rotationY: 0,
        label: 'enter the back hall',
        radius: 3.2,
      },
      {
        id: 'shop-to-boardwalk',
        to: 'boardwalk',
        toSpawn: 'fromShop',
        // A screen door in the +X wall — OUT back onto the boardwalk. A sweet
        // surface side-trip (the literal "pizza shop off the coast"), never the
        // way down. The visitor finds it by turning from the sea-window.
        position: [ROOM.halfW - 0.05, 0, 3],
        rotationY: -Math.PI / 2, // +X wall, opening faces -X into the shop
        label: 'step out onto the boardwalk',
        radius: 3,
      },
    ],
  },
  {
    id: 'hallway',
    kind: 'hallway',
    title: 'Back Hall',
    // Long, narrow, low — a corridor, not a maze (3D-Maze red brick).
    dims: { halfW: 2.6, halfD: 16, height: 4, eye: EYE },
    palette: { background: '#150c0c', fog: '#2a0f0f', fogNear: 3, fogFar: 24 },
    // A gallery corridor — Scoobert's covers hung large down both walls (the SM64
    // grammar; Luke: "places throughout, large on the walls with borders").
    paintings: [
      { slug: 'moonlight-beach', position: [2.45, 2.0, 9], rotationY: -Math.PI / 2, size: 1.8 },
      { slug: 'swamis', position: [2.45, 2.0, 3.5], rotationY: -Math.PI / 2, size: 1.8 },
      { slug: 'koan', position: [2.45, 2.0, -6.5], rotationY: -Math.PI / 2, size: 1.8 },
      { slug: 'to-sleep', position: [2.45, 2.0, -11.5], rotationY: -Math.PI / 2, size: 1.8 },
      { slug: 'i', position: [-2.45, 2.0, 9], rotationY: Math.PI / 2, size: 1.8 },
      { slug: 'dragon-ball-sd', position: [-2.45, 2.0, -8.5], rotationY: Math.PI / 2, size: 1.8 },
    ],
    spawns: {
      default: { position: [0, EYE, 12.5], yaw: Math.PI },
      // Arriving from the shop: a step into the hall (clear of the return door's
      // 3.2 radius), facing down the corridor (-Z) toward the music.
      fromShop: { position: [0, EYE, 12.5], yaw: Math.PI },
      // Arriving back from the jukebox: at the far (-Z) end, facing the shop (+Z).
      fromJuke: { position: [0, EYE, -12.5], yaw: 0 },
      // Stepping back out of the classified room: in the hall by the panel,
      // facing on toward the music (clear of the hidden door's radius).
      fromClassified: { position: [0, EYE, -5.5], yaw: Math.PI },
      // Stepping back out of the supply closet: mid-corridor, facing on down toward
      // the music (clear of the +X closet door's radius — narrow hall, so face
      // ALONG it, not at the near wall).
      fromCloset: { position: [0, EYE, 6], yaw: Math.PI },
    },
    // The brass closet key sits on the corridor floor by the +X wall — pocket it
    // to open the SUPPLY door a few steps down. A side reward off the hall, never
    // on the way deeper (friction budget; key + lock in the same room). A cassette
    // rests against the other wall, further down the gallery.
    pickups: [
      { itemId: 'hall-closet-key', position: [1.6, 0.5, 9] },
      { itemId: 'tape-internet', position: [-1.6, 0.7, -3] },
    ],
    doors: [
      {
        id: 'hall-to-shop',
        to: 'shop',
        toSpawn: 'fromHall',
        // Shop end (+Z).
        position: [0, 0, 15.9],
        rotationY: 0,
        label: 'return to the shop',
        radius: 3.2,
      },
      {
        id: 'hall-to-juke',
        to: 'jukebox',
        toSpawn: 'fromHall',
        // Far end (-Z) — where the music's coming from.
        position: [0, 0, -15.9],
        rotationY: Math.PI,
        label: 'follow the music',
        radius: 3.2,
      },
      {
        id: 'hall-to-classified',
        to: 'classified',
        toSpawn: 'fromHall',
        // A blank panel in the left (-X) wall, mid-hall. Hidden until the rat
        // knocks it open (secretRevealed). Faces +X into the corridor.
        position: [-2.5, 0, -2],
        rotationY: Math.PI / 2,
        label: 'slip through the gap',
        hidden: true,
        radius: 2.8,
      },
      {
        id: 'hall-to-closet',
        to: 'closet',
        toSpawn: 'fromHall',
        // A "SUPPLY" door in the +X wall, mid-hall. LOCKED until you pocket the
        // brass key off the corridor floor. Faces -X into the corridor.
        position: [2.5, 0, 4],
        rotationY: -Math.PI / 2,
        label: 'open the SUPPLY closet',
        requiresKey: 'hall-closet-key',
        radius: 2.4,
      },
    ],
  },
  {
    id: 'jukebox',
    kind: 'jukebox',
    title: 'The Jukebox',
    // Taller than the other rooms: headroom for the marquee, and the extra
    // volume makes the payoff room feel like a little shrine.
    dims: { halfW: 6, halfD: 7, height: 5.5, eye: EYE },
    // Warm, dim, womb-like — the payoff room. Deep magenta dark, close fog.
    palette: { background: '#190b1d', fog: '#2a1233', fogNear: 4, fogFar: 28 },
    // The arcade cabinet humming in the corner is procedural now (an <ArcadeCabinet>
    // in JukeboxRoom — a real CRT + joystick, not the old generic GLB).
    // A cassette left on the jukebox's side — fitting that the music room hides one.
    pickups: [{ itemId: 'tape-moonlight', position: [3.6, 0.7, -3] }],
    spawns: {
      // Enter near the door (+Z), a step clear of its radius, facing the jukebox
      // across the room (-Z) so you walk toward it and the song swells.
      default: { position: [0, EYE, 3.5], yaw: Math.PI },
      fromHall: { position: [0, EYE, 3.5], yaw: Math.PI },
      // Stepping back out of the practice room: by the -X stage door, facing into
      // the room (+X), clear of every door radius.
      fromPractice: { position: [-2.5, EYE, 0], yaw: Math.PI / 2 },
      // Climbing back UP from the pool: by the +X stair door, a step clear of its
      // radius, facing into the room (-X).
      fromPool: { position: [2.5, EYE, 0], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'juke-to-hall',
        to: 'hallway',
        toSpawn: 'fromJuke',
        position: [0, 0, 6.95],
        rotationY: 0,
        label: 'back to the hall',
        radius: 3.2,
      },
      {
        id: 'juke-to-practice',
        to: 'practice',
        toSpawn: 'fromJuke',
        // A STAGE DOOR in the -X wall — backstage, where the music gets made.
        position: [-5.95, 0, 0],
        rotationY: Math.PI / 2, // in the -X wall, opening faces +X into the room
        label: 'slip backstage',
        radius: 3.0,
      },
      {
        id: 'juke-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromAbove',
        // A STAIRWELL DOWN in the +X wall — the way deeper is found PAST the music,
        // not back in the shop lobby (Luke's descent rule). The level below.
        position: [5.95, 0, 0],
        rotationY: -Math.PI / 2, // in the +X wall, opening faces -X into the room
        label: 'take the stairs down to the pool',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'practice',
    kind: 'practice',
    title: 'The Practice Room',
    // Backstage from the jukebox shrine: where the music gets MADE. A warm, SAFE
    // relief room (a "play it" reward, kept sweet) — a wall of pads you can
    // actually play, and a 4-track that calls a phrase to play back (the sequence
    // door-game → clearGame unlock of a sealed demo). Procedural PS1.
    dims: { halfW: 6, halfD: 6, height: 4.5, eye: EYE },
    // Warm amber, cosy — a sibling to the jukebox's womb, deliberately sweet.
    palette: { background: '#1c130a', fog: '#2a1d0e', fogNear: 5, fogFar: 30 },
    spawns: {
      // Just inside the +Z door, clear of its radius, facing the pad wall (-Z).
      default: { position: [0, EYE, 2.5], yaw: Math.PI },
      fromJuke: { position: [0, EYE, 2.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'practice-to-juke',
        to: 'jukebox',
        toSpawn: 'fromPractice',
        position: [0, 0, 5.95], // +Z wall — back out to the jukebox
        rotationY: 0,
        label: 'back to the jukebox',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'classified',
    kind: 'classified',
    title: 'Classified',
    // Tiny, cold, claustrophobic — the X-Files file room of rejected demos.
    dims: { halfW: 4, halfD: 4, height: 3.2, eye: EYE },
    palette: { background: '#0a1410', fog: '#0c1812', fogNear: 2, fogFar: 15 },
    // A dead CRT in the corner of the file room (the surveillance tell).
    props: [
      {
        url: '/models/crt-tv.glb',
        position: [-2.5, 0, -2.9],
        fit: 1.2,
        rotationY: 0.6,
        glow: 0.35,
      },
    ],
    spawns: {
      // Just inside the door, facing the cabinets at the back (-Z).
      default: { position: [0, EYE, 0.6], yaw: Math.PI },
      fromHall: { position: [0, EYE, 0.6], yaw: Math.PI },
      // Back out of memory lane: by the -X service door, facing +X into the room,
      // clear of the door radius (and the cabinets, which sit further back in -Z).
      fromMemoryLane: { position: [-1.6, EYE, 0.4], yaw: Math.PI / 2 },
    },
    doors: [
      {
        id: 'classified-to-hall',
        to: 'hallway',
        toSpawn: 'fromClassified',
        position: [0, 0, 3.95],
        rotationY: 0,
        label: 'back out to the hall',
        radius: 2.6,
      },
      // A service hatch behind the filing cabinets — the wing's mouth. Off the main
      // descent; no key (a side branch, never gating the way down).
      {
        id: 'classified-to-memorylane',
        to: 'memorylane',
        toSpawn: 'fromClassified',
        position: [-3.95, 0, 0], // -X wall, mid-room
        rotationY: Math.PI / 2,
        label: 'a hatch into the back wiring',
        radius: 1.8,
      },
    ],
  },
  {
    id: 'poolrooms',
    kind: 'poolrooms',
    title: 'The Poolrooms',
    // Bigger + a touch lower-ceilinged than the shop; room to skirt the pool.
    dims: { halfW: 9, halfD: 9, height: 4.5, eye: EYE },
    // Pale aqua, over-lit, close-ish fog — liminal is BRIGHT and empty, not dark.
    palette: { background: '#bfe3ea', fog: '#cfe9ef', fogNear: 5, fogFar: 38 },
    // A broken greek statue standing in the false water — vaporwave-liminal.
    // Off-centre so it never blocks the centre door down.
    props: [
      { url: '/models/greek-statue.glb', position: [3.4, 0, -2.6], fit: 3.4, rotationY: -0.6 },
    ],
    spawns: {
      // Arrive on the deck just past the +Z wall (clear of the return door),
      // facing -Z across the still pool toward the far wall.
      default: { position: [0, EYE, 5], yaw: Math.PI },
      // Arriving DOWN the stairs from the jukebox (the level above), on the deck.
      fromAbove: { position: [0, EYE, 5], yaw: Math.PI },
      // Climbing back up out of the liminal level — you surface near the centre
      // door, a step clear of its radius, facing the room (-Z).
      fromLiminal: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Stumbling back out of the looping corridor: by the +X door, facing into
      // the room (-X), clear of every door radius.
      fromMobius: { position: [4.5, EYE, 5], yaw: -Math.PI / 2 },
      // Back out of the dice pit: by the -X door, facing into the room (+X).
      fromDicepit: { position: [-4.5, EYE, 5], yaw: Math.PI / 2 },
      // Surfacing back from the wayside shrine: by the -Z torii door, a step
      // clear of its radius, facing into the room (+Z).
      fromJapan: { position: [0, EYE, -4.5], yaw: 0 },
      // Stepping back out of the staff locker room: by the -X locker door (far
      // end), facing +X into the room, clear of its radius.
      fromLocker: { position: [-4.45, EYE, -5], yaw: Math.PI / 2 },
      // Surfacing back up from the sunken gallery: by the +X gallery door (far
      // end), facing -X into the room, clear of every door radius.
      fromGallery: { position: [4.45, EYE, -5], yaw: -Math.PI / 2 },
    },
    // The rusted locker key rests on the deck — pocket it to open the STAFF ONLY
    // door in the far -X wall. Off the main descent (a side reward), so it never
    // gates the way deeper (friction budget). A cassette sits further along the deck.
    pickups: [
      { itemId: 'pool-locker-key', position: [-3, 0.5, 2] },
      { itemId: 'tape-japan', position: [3.5, 0.7, -2] },
    ],
    doors: [
      {
        id: 'pool-to-juke',
        to: 'jukebox',
        toSpawn: 'fromPool',
        position: [0, 0, 8.95], // +Z wall — back UP the stairs to the music
        rotationY: 0,
        label: 'back up the stairs to the music',
        radius: 3.2,
      },
      // NOTE: there is no down-door here in the lobby. The way DOWN to the liminal
      // is FOUND by going deep into the long corridor (mobius) and breaking the
      // loop — its 'mobius-onward' door drops you down. (Luke's rule: the lobby
      // sends you up; you earn down by going deeper.)
      {
        id: 'pool-to-mobius',
        to: 'mobius',
        toSpawn: 'fromPool',
        position: [8.95, 0, 5], // +X wall, near the entry end
        rotationY: -Math.PI / 2,
        label: 'down the long corridor',
        radius: 3.2,
      },
      {
        id: 'pool-to-dicepit',
        to: 'dicepit',
        toSpawn: 'default',
        position: [-8.95, 0, 5], // -X wall, near the entry end
        rotationY: Math.PI / 2,
        label: 'duck into the back room',
        radius: 3.2,
      },
      {
        id: 'pool-to-locker',
        to: 'lockerroom',
        toSpawn: 'fromPool',
        // The "DEEP END · STAFF ONLY" door in the far end of the -X wall (the
        // dicepit door is the near end). LOCKED until you pick up the rusted key
        // off the deck — a self-contained side puzzle (key + lock one room apart),
        // never on the way down.
        position: [-8.95, 0, -5],
        rotationY: Math.PI / 2, // in the -X wall, opening faces +X into the room
        label: 'open the STAFF ONLY door',
        requiresKey: 'pool-locker-key',
        radius: 3.0,
      },
      {
        id: 'pool-to-japan',
        to: 'shrine',
        toSpawn: 'default',
        // A torii half-sunk in the false water on the far (-Z) wall — HIDDEN
        // until the rat has shown you the building keeps secrets (secretRevealed,
        // same reveal as the classified panel). The country on the other side.
        position: [0, 0, -8.95],
        rotationY: Math.PI,
        label: 'step through the half-sunk torii',
        hidden: true,
        revealOn: 'secret',
        radius: 3.0,
      },
      {
        id: 'pool-to-gallery',
        to: 'gallery',
        toSpawn: 'fromPool',
        // A flooded archway at the far end of the +X wall (the mobius door is the
        // near end) — down into a sunken hall of statuary. A side branch, visible
        // (not hidden) and unlocked: the greek statue in the pool is the wink.
        position: [8.95, 0, -5],
        rotationY: -Math.PI / 2, // +X wall, opening faces -X into the room
        label: 'wade into the sunken gallery',
        radius: 3,
      },
    ],
  },
  {
    id: 'liminal',
    kind: 'liminal',
    title: 'Liminal Space',
    // A real (wide-permission) GLB environment, crunched + lazy-loaded behind the
    // loader minigame. Provenance tracked in THIRD_PARTY_NOTICES.md.
    glb: {
      url: '/models/liminal-other-space.glb',
      fit: 18,
      // If the model fails to load, send the player back up to the pool.
      recoverTo: { to: 'poolrooms', spawn: 'fromLiminal' },
    },
    // You rode the waterfall down — water drips from this ceiling (CeilingDrips).
    drips: true,
    dims: { halfW: 8.5, halfD: 8.5, height: 6, eye: EYE },
    // Pale beige nothing — the backrooms register.
    palette: { background: '#d6cfb8', fog: '#d6cfb8', fogNear: 6, fogFar: 34 },
    spawns: {
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromPool: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Climbing back up out of the abandoned pool — by the -Z door, facing +Z.
      fromDeep: { position: [0, EYE, -4.5], yaw: 0 },
    },
    // A couple of wanderers drift the beige nothing — they emerge from the fog and
    // dance when you reach them (the relief beat).
    entities: [
      { id: 'liminal-blob', body: 'blob', spawn: [-3.5, -2] },
      { id: 'liminal-mop', body: 'mop', spawn: [3.5, -4] },
    ],
    doors: [
      {
        id: 'liminal-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromLiminal',
        position: [0, 0, 8.45], // +Z wall (dims.halfD)
        rotationY: 0,
        label: 'back up to the pool',
        radius: 3.2,
      },
      {
        id: 'liminal-to-deep',
        to: 'deeppool',
        toSpawn: 'fromLiminal',
        position: [0, 0, -8.45], // far (-Z) wall — deeper still (GLB → GLB)
        rotationY: Math.PI,
        label: 'go down to the deep end',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'deeppool',
    kind: 'liminal',
    title: 'The Abandoned Pool',
    // The bitter bottom of the water descent — a heavy (52 MB → 5 MB crunched)
    // GLB environment, lazy-loaded behind the loader minigame (this is the load
    // the minigame earns its keep on). A GLB → GLB hop down from the liminal.
    glb: {
      url: '/models/abandoned-pool.glb',
      fit: 22,
      recoverTo: { to: 'liminal', spawn: 'fromDeep' },
    },
    drips: true, // still dripping, deeper down
    dims: { halfW: 9, halfD: 9, height: 6.5, eye: EYE },
    // Cold drained teal-black — the deep end, lights long dead.
    palette: { background: '#0a1518', fog: '#0e1c1f', fogNear: 5, fogFar: 30 },
    spawns: {
      default: { position: [0, EYE, 5], yaw: Math.PI },
      fromLiminal: { position: [0, EYE, 5], yaw: Math.PI },
    },
    // One lurker haunts the drained deep end — slower, a single big eye.
    entities: [{ id: 'deep-lurker', body: 'lurker', spawn: [-2, -3], speed: 1.6 }],
    doors: [
      {
        id: 'deep-to-liminal',
        to: 'liminal',
        toSpawn: 'fromDeep',
        position: [0, 0, 8.95], // +Z wall
        rotationY: 0,
        label: 'climb back up',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'mobius',
    kind: 'mobius',
    title: 'The Long Corridor',
    // A long narrow hall — the Scooby-Doo loop. Walk to the far door and you come
    // out the near one, the same corridor scrolling by (toSpawn 'loop' re-enters
    // at the start). Always a way out: turn around, the way back is right there.
    dims: { halfW: 2.6, halfD: 14, height: 4, eye: EYE },
    // Faded motel green — nostalgic, OVER-lit, a beat wrong (bright is the comic
    // register). MobiusRoom dims it and tightens the dressing as unease rises.
    palette: { background: '#3a4630', fog: '#4a573a', fogNear: 6, fogFar: 40 },
    // A real Möbius strip turning mid-corridor — the album motif made literal.
    // Glows so it reads against the dim corridor.
    props: [
      { url: '/models/mobius-strip.glb', position: [0, 2.3, -2], fit: 1.8, spin: 0.5, glow: 0.55 },
    ],
    spawns: {
      // Fresh arrival from the pool, AND the loop re-entry, both land at the +Z
      // start facing -Z down the corridor — so a forward lap drops you right back
      // here. MobiusRoom tells them apart by the spawn id (fresh resets the lap
      // count; 'loop' counts another lap), not the pose.
      default: { position: [0, EYE, 10], yaw: Math.PI },
      fromPool: { position: [0, EYE, 10], yaw: Math.PI },
      loop: { position: [0, EYE, 10], yaw: Math.PI },
    },
    doors: [
      {
        id: 'mobius-out',
        to: 'poolrooms',
        toSpawn: 'fromMobius',
        position: [0, 0, 13.9], // +Z (start) end — the way back, always there
        rotationY: 0,
        label: 'go back to the pool',
        radius: 3.2,
      },
      {
        id: 'mobius-loop',
        to: 'mobius',
        toSpawn: 'loop',
        position: [0, 0, -13.9], // far (-Z) end — walk forward → loop to the start
        rotationY: Math.PI,
        label: 'keep going',
        radius: 3.2,
      },
      {
        id: 'mobius-onward',
        to: 'liminal',
        toSpawn: 'fromPool',
        // A door in the -X wall near the far end that ISN'T there until the loop
        // breaks (MOBIUS_BREAK laps) — then the wall opens onto a stair DOWN to the
        // liminal. This is the level's way down: you FIND it by going deep into the
        // corridor and breaking the loop, not from the pool lobby (Luke's rule).
        // The "walk far enough and the floor drops away" beat.
        position: [-2.5, 0, -9],
        rotationY: Math.PI / 2,
        label: 'step through the door that wasn’t there',
        hidden: true,
        revealOn: 'mobius',
        radius: 2.8,
      },
    ],
  },
  {
    id: 'dicepit',
    kind: 'dicepit',
    title: 'The Back Room',
    // A dim felt-and-stone gambling nook. Big enough to walk AROUND the monster
    // once it bloats to its stuck size; tall enough it never bursts the ceiling.
    dims: { halfW: 6, halfD: 6, height: 5.5, eye: EYE },
    // Warm dark plum — a back-room card table, the opposite of the bright pool.
    palette: { background: '#1a1018', fog: '#241620', fogNear: 4, fogFar: 26 },
    spawns: {
      // Just inside the +Z door, facing -Z toward the table + the thing.
      default: { position: [0, EYE, 2.5], yaw: Math.PI },
      fromPool: { position: [0, EYE, 2.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'dicepit-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromDicepit',
        position: [0, 0, 5.9], // +Z wall
        rotationY: 0,
        label: 'back out to the pool',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'lockerroom',
    kind: 'lockerroom',
    title: 'Staff Locker Room',
    // The little reward behind the poolrooms' locked STAFF ONLY door: a damp,
    // tiled changing room, lights half-dead. A SAFE side nook (off the descent),
    // so it stays sweet — the payoff for noticing the key, not a dread beat. On
    // first entry the room hums you a soft chord and tips a little luck (the
    // reward IS sound; the clap-ritual luck faucet's quiet cousin).
    dims: { halfW: 5, halfD: 5, height: 3.2, eye: EYE },
    // Pale poolside teal gone dim + enclosed — a sibling of the bright poolrooms.
    palette: { background: '#16302f', fog: '#1b3a38', fogNear: 3, fogFar: 18 },
    spawns: {
      // A clear stride in from the +Z door (radius 2.6), facing -Z at the lockers.
      default: { position: [0, EYE, 1.4], yaw: Math.PI },
      fromPool: { position: [0, EYE, 1.4], yaw: Math.PI },
    },
    doors: [
      {
        id: 'locker-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromLocker',
        position: [0, 0, 4.95], // +Z wall — back out to the pool deck
        rotationY: 0,
        label: 'back out to the pool',
        radius: 2.6,
      },
    ],
  },
  {
    id: 'closet',
    kind: 'closet',
    title: 'Supply Closet',
    // The little reward behind the hallway's locked SUPPLY door: a cramped utility
    // cupboard — shelves, a mop bucket, a forgotten tip jar. Safe side nook (off
    // the descent); first entry hums a chord + tips luck (ClosetRoom).
    dims: { halfW: 3.5, halfD: 3.5, height: 3, eye: EYE },
    // Dim dusty amber — a back-of-house cupboard.
    palette: { background: '#1c160e', fog: '#241d12', fogNear: 3, fogFar: 16 },
    spawns: {
      // A clear stride in from the +Z door (radius 2.4), facing -Z at the shelves.
      default: { position: [0, EYE, 0.6], yaw: Math.PI },
      fromHall: { position: [0, EYE, 0.6], yaw: Math.PI },
    },
    doors: [
      {
        id: 'closet-to-hall',
        to: 'hallway',
        toSpawn: 'fromCloset',
        position: [0, 0, 3.4], // +Z wall — back out to the corridor
        rotationY: 0,
        label: 'back out to the hall',
        radius: 2.4,
      },
    ],
  },
  {
    id: 'shrine',
    kind: 'shrine',
    musicRoom: true, // the furin breather owns the space — the carried song fades out here
    title: 'Wayside Shrine',
    // The one OUTDOOR, *sweet* deep room — a rural dusk: a torii path, a little
    // shrine, a country railway crossing. A breather among the bitter depths
    // (taste guardrail: the contrast is the point). Procedural scaffold for now;
    // the tracks run off into the fog toward a future metro-tunnel GLB hookup
    // (Luke: "connect to the tunnel GLB cuz of trains"). Reached via the hidden
    // torii in the poolrooms — discovered, not on the main path.
    dims: { halfW: 11, halfD: 15, height: 9, eye: EYE },
    // Warm hazy golden-hour; fog dissolves the open edges so no walls are needed.
    palette: { background: '#e6c08a', fog: '#e6c08a', fogNear: 8, fogFar: 58 },
    spawns: {
      // Step out from under the entrance torii at the near (+Z) end, facing down
      // the path (-Z) toward the shrine. Clear of the return door's 3.2 radius.
      default: { position: [0, EYE, 11], yaw: Math.PI },
      fromPool: { position: [0, EYE, 11], yaw: Math.PI },
      // Climbing back up out of the metro tunnel — beside the +X portal where the
      // tracks go under, a step clear of its door radius, facing back into the
      // room (-X) toward the shrine.
      fromTunnel: { position: [6.8, EYE, 2], yaw: -Math.PI / 2 },
      // Coming back in from the tall grass — beside the -X torii, a step clear of
      // its door radius, facing +X back into the shrine grounds.
      fromGrass: { position: [-6.8, EYE, 6], yaw: Math.PI / 2 },
    },
    doors: [
      {
        id: 'shrine-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromJapan',
        position: [0, 0, 14.95], // +Z (entrance) wall — back through the torii
        rotationY: 0,
        label: 'step back through the torii',
        radius: 3.2,
      },
      {
        id: 'shrine-to-tunnel',
        to: 'metro-tunnel',
        toSpawn: 'fromShrine',
        // The +X end of the level crossing, where the rails run underground —
        // follow them down into the metro tunnel (Luke: "connect to the tunnel
        // cuz of trains"). The shrine breather's one way DEEPER. The portal
        // geometry that frames this sits at the same spot in ShrineRoom.
        position: [10.6, 0, 2], // TRACK_Z = 2 in ShrineRoom
        rotationY: -Math.PI / 2, // in the +X wall, opening faces -X into the room
        label: 'follow the tracks into the tunnel',
        radius: 3.2,
      },
      {
        id: 'shrine-to-grass',
        to: 'grassfield',
        toSpawn: 'fromShrine',
        // A little vermilion torii on the open -X side frames a path off into an
        // overgrown field. NOT hidden — once you've found the shrine, the grass
        // (and the wild thing in it) is an easy step away (Luke: "shouldn't be
        // that hard to get a goblin fight").
        position: [-10.6, 0, 6],
        rotationY: Math.PI / 2, // in the -X edge, opening faces +X into the room
        label: 'wander into the tall grass',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'grassfield',
    kind: 'grass',
    title: 'The Tall Grass',
    // An overgrown lot off the shrine's torii (Luke: "it's off the torii gates").
    // Knee-high grass you wade through under the same golden-hour haze as the
    // shrine — and sometimes it rustles and a wild GOBLIN leaps out (the
    // dice-filtered encounter; DiceMonster + the d20 roll-off, screen-to-black
    // Pokémon-style). A SWEET surface space (taste guardrail): goofy grass, the
    // ambush is a game, losing never hard-fails. Winning opens a new room.
    dims: { halfW: 14, halfD: 16, height: 9, eye: EYE },
    palette: { background: '#e6c08a', fog: '#d8b87f', fogNear: 7, fogFar: 46 },
    spawns: {
      // Step out from under the torii at the +Z (shrine) end, facing into the
      // field (-Z), a step clear of the return door's radius.
      default: { position: [0, EYE, 11.5], yaw: Math.PI },
      fromShrine: { position: [0, EYE, 11.5], yaw: Math.PI },
      // Back in the field's heart after a lost/fled battle — a beat to breathe
      // before the grass can rustle again.
      fromBattle: { position: [0, EYE, 2], yaw: Math.PI },
      // Stepping back out of the hidden grove.
      fromGrove: { position: [0, EYE, 5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'grass-to-shrine',
        to: 'shrine',
        toSpawn: 'fromGrass',
        position: [0, 0, 15.5], // +Z (entrance) torii — back to the shrine grounds
        rotationY: 0,
        label: 'step back through the torii',
        radius: 3.2,
      },
      {
        id: 'grass-to-grove',
        to: 'grove',
        toSpawn: 'default',
        // Opens FOR GOOD once you've beaten the grass goblin (the 'grass-cleared'
        // unlock) — a trodden path at the field's far edge, so the new room is
        // durably yours, not a one-shot you can only reach by re-fighting.
        position: [0, 0, -15.5], // -Z far edge of the field
        rotationY: Math.PI, // faces +Z back into the field
        label: 'take the opened path to the grove',
        hidden: true,
        revealSecret: 'grass-cleared',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'grassbattle',
    kind: 'grassbattle',
    title: 'A Wild Goblin!',
    // The Pokémon beat: the grass rustled and a wild GOBLIN leapt out. You're
    // dropped here (via the screen-to-black room fade) to roll the d20 against it —
    // the SAME dice-monster as the pit (shared monsterStore; it's the one goblin,
    // bigger every time it wins). Win → a path opens (the grove). Lose/flee → back
    // to the field, no penalty (taste guardrail: losing never hard-fails).
    dims: { halfW: 9, halfD: 10, height: 8, eye: EYE },
    palette: { background: '#c9a765', fog: '#b08f51', fogNear: 6, fogFar: 30 },
    spawns: {
      // Facing the goblin across the trampled grass.
      default: { position: [0, EYE, 5.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'battle-flee',
        to: 'grassfield',
        toSpawn: 'fromBattle',
        position: [0, 0, 9.4], // behind you — turn tail and bolt back into the field
        rotationY: 0,
        label: 'flee back into the grass',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'grove',
    kind: 'grove',
    musicRoom: true, // the sound garden owns the space — the carried song fades out here
    title: 'The Hidden Grove',
    // The reward for beating the goblin (Luke: "winning gives you a new room"). A
    // hush after the bright field — dusk settling cool and blue, a single glowing
    // thing at the centre, and the reward-is-sound spine: a soft chord on arrival.
    dims: { halfW: 8, halfD: 9, height: 8, eye: EYE },
    palette: { background: '#33514c', fog: '#27433f', fogNear: 5, fogFar: 30 },
    spawns: {
      // A clear stride past the +Z door you arrive through (radius 3.0), facing
      // -Z into the sound garden toward the painting — never standing ON the exit.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Stepping back out of the bright vista — past the orb at the far end,
      // facing +Z back across the sound garden, clear of the door radius.
      fromFrutiger: { position: [0, EYE, -5], yaw: 0 },
    },
    doors: [
      {
        id: 'grove-to-grass',
        to: 'grassfield',
        toSpawn: 'fromGrove',
        position: [0, 0, 8.4],
        rotationY: 0,
        label: 'leave the grove',
        radius: 3.0,
      },
      {
        id: 'grove-to-frutiger',
        to: 'frutiger',
        toSpawn: 'default',
        // Past the sound garden, at the grove's far end: an album-cover PAINTING you
        // DIVE INTO (the SM64 portal) — the deeper reward beyond the reward (the
        // Frutiger pocket), earned by clearing the goblin. The cover lunges at you
        // as you step through (CoverArt.FramedCover, Doors.tsx).
        position: [0, 0, -8.4],
        rotationY: Math.PI,
        label: 'dive into the painting',
        // Moonlight Beach — its cover matches the glossy beach-paradise behind it,
        // and diving plays its track (Ocean View) as the world's soundtrack.
        albumSlug: 'moonlight-beach',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'frutiger',
    kind: 'frutiger',
    title: 'Aqua Hill',
    // The Frutiger Aero pocket (Luke, 2026-06-22: "frutiger levels") — an
    // impossibly optimistic glossy-2008 hillside found through a too-clean door in
    // the beige backrooms: blue sky, puffy clouds, rolling green Bliss hills, a low
    // sun + lens flare, floating glossy aqua bubbles, and a serene gel "media-
    // player creature." The ONE zone where the PS1 crunch is LIFTED (Luke's call):
    // it renders clean + glossy (FrutigerRoom bumps the pixel ratio while mounted),
    // the sweet opposite of the wrong depths next door — the contrast is the point.
    dims: { halfW: 14, halfD: 14, height: 16, eye: EYE },
    palette: { background: '#86c5ef', fog: '#cfe8fb', fogNear: 18, fogFar: 95 },
    // A CRT on the hillside plays Moonlight Beach's videos — the album whose cover
    // is the painting you dove through to get here (its track is already playing).
    tv: { position: [5.5, 0, 5], rotationY: 0.5, albumSlug: 'moonlight-beach' },
    spawns: {
      // Step out onto the hillside a clear stride past the +Z (door) end (radius
      // 3.2), facing -Z down the slope into the open blue vista — not standing in
      // the return door's prompt the instant you dive through.
      default: { position: [0, EYE, 9.5], yaw: Math.PI },
      fromGrove: { position: [0, EYE, 9.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'frutiger-to-grove',
        to: 'grove',
        toSpawn: 'fromFrutiger',
        position: [0, 0, 13.5], // +Z wall — back through into the grove
        rotationY: 0,
        label: 'back through into the grove',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'metro-tunnel',
    kind: 'metro',
    title: 'Metro Tunnel',
    // Deeper than the sweet shrine breather: the country tracks run underground
    // into an abandoned transit tunnel — a real (wide-permission) GLB level,
    // crunched (46 MB → 1.4 MB) + lazy-loaded behind the loader minigame, like
    // the abandoned pool. Provenance in THIRD_PARTY_NOTICES.md. Reached by
    // following the shrine's rails (Luke: "connect to the tunnel cuz of trains").
    glb: {
      url: '/models/metro-tunnel.glb',
      fit: 26,
      // If the model fails to load, send the player back up to the shrine.
      recoverTo: { to: 'shrine', spawn: 'fromTunnel' },
    },
    drips: true, // underground damp, deep down — the flooded undersea tunnel
    dims: { halfW: 9, halfD: 12, height: 6.5, eye: EYE },
    // Cold dead-transit dark, tinted deep-sea teal — the Seikan is UNDERSEA, so
    // this is where the line meets the water (MetroTunnelFx floods the floor).
    palette: { background: '#08161c', fog: '#0b2630', fogNear: 5, fogFar: 28 },
    spawns: {
      // Arrive at the +Z mouth, facing -Z down the length of the tunnel.
      default: { position: [0, EYE, 8.5], yaw: Math.PI },
      fromShrine: { position: [0, EYE, 8.5], yaw: Math.PI },
      // Climbing back UP the line from the terminus — by the -Z end door, facing
      // +Z back up the tunnel toward the shrine.
      fromEnd: { position: [0, EYE, -8.5], yaw: 0 },
    },
    // Something shuffles along the flooded platform.
    entities: [{ id: 'tunnel-mop', body: 'mop', spawn: [-3, -1], speed: 1.8 }],
    doors: [
      {
        id: 'tunnel-to-shrine',
        to: 'shrine',
        toSpawn: 'fromTunnel',
        position: [0, 0, 11.9], // +Z wall — climb back up to the surface crossing
        rotationY: 0,
        label: 'climb back up to the shrine',
        radius: 3.2,
      },
      {
        id: 'tunnel-to-end',
        to: 'terminus',
        toSpawn: 'fromTunnel',
        // The far (-Z) end, where the rails run off into the fog — follow the
        // line to where it stops. The tunnel's one way DEEPER.
        position: [0, 0, -11.9],
        rotationY: Math.PI, // in the -Z wall, opening faces +Z into the tunnel
        label: 'follow the tracks to the end of the line',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'terminus',
    kind: 'liminal',
    title: 'End of the Line',
    // Where the undersea metro line finally stops — it lets out into the
    // backrooms. A real (wide-permission) GLB level, crunched (19.8 MB → 0.83 MB)
    // + lazy-loaded behind the loader minigame, like the deep pool. Provenance in
    // THIRD_PARTY_NOTICES.md. The bitter bottom of the train thread.
    glb: {
      url: '/models/backrooms-vr.glb',
      fit: 24,
      recoverTo: { to: 'metro-tunnel', spawn: 'fromEnd' },
    },
    drips: true, // the flooded undersea tunnel leaks in down here too
    dims: { halfW: 10, halfD: 10, height: 5.5, eye: EYE },
    // The sickly fluorescent yellow-beige of the backrooms, gone dim + damp.
    palette: { background: '#15140a', fog: '#262212', fogNear: 5, fogFar: 26 },
    spawns: {
      // Step off the platform a clear stride past the return door, facing -Z into
      // the endless rooms.
      default: { position: [0, EYE, 6.5], yaw: Math.PI },
      fromTunnel: { position: [0, EYE, 6.5], yaw: Math.PI },
    },
    // The backrooms are not as empty as they look — two dancers in the yellow.
    entities: [
      { id: 'terminus-blob', body: 'blob', spawn: [-4, -3] },
      { id: 'terminus-lurker', body: 'lurker', spawn: [4, -5], speed: 1.8 },
    ],
    doors: [
      {
        id: 'end-to-tunnel',
        to: 'metro-tunnel',
        toSpawn: 'fromEnd',
        position: [0, 0, 9.9], // +Z wall — back up the line
        rotationY: 0,
        label: 'back up the tunnel',
        radius: 3.2,
      },
    ],
  },
  // ── The Boardwalk wing ──────────────────────────────────────────────────────
  // A sweet SoCal SURFACE branch off the shop (the literal "pizza shop off the
  // coast of San Diego"): step out back onto a golden-hour boardwalk, then wander
  // down to a moonlit beach or up a park path. Off the descent, kept goofy + safe
  // (taste guardrail — the surface stays sweet). Each room plays its own Scoobert
  // song while you're in it (Room.song) — the reward for wandering is the music.
  {
    id: 'boardwalk',
    kind: 'boardwalk',
    title: 'The Boardwalk',
    // Open + airy, room to stroll the pier. No closed walls (an outdoor room, like
    // the shrine): the sea is out past the -Z edge, the town up the +X path.
    dims: { halfW: 9, halfD: 9, height: 6, eye: EYE },
    // Golden hour: warm peach sky, soft far fog so the sea fades into the dusk.
    palette: { background: '#e7b27a', fog: '#f0cb98', fogNear: 12, fogFar: 80 },
    // Potted palms by the rail. (The boardwalk arcade cabinet is procedural — an
    // <ArcadeCabinet> in BoardwalkRoom, a real CRT + joystick.)
    props: [
      { url: '/models/palm-tree.glb', position: [-6.2, 0, -4], fit: 4.6, rotationY: 0.4 },
      { url: '/models/palm-tree.glb', position: [6.4, 0, -3], fit: 4.2, rotationY: -0.7 },
    ],
    // The boardwalk plays its namesake track.
    song: 'boardwalk',
    spawns: {
      // Step out of the shop onto the pier, facing the sea (-Z) — the establishing
      // view down the boardwalk toward the water. Clear of the +Z shop door. Coming
      // back up off the beach lands here too: you're back on the pier facing the sea.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromShop: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromOcean: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Back from the park path: by the -X gate (mid-pier), facing +X into the
      // boardwalk, clear of every door radius.
      fromBalboa: { position: [-4.45, EYE, 4.5], yaw: Math.PI / 2 },
      // Back off the moonlight plaza: by the +X gate (mid-pier), facing -X into the
      // boardwalk, clear of every door radius.
      fromMoonlight: { position: [4.45, EYE, 4.5], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'boardwalk-to-shop',
        to: 'shop',
        toSpawn: 'fromBoardwalk',
        position: [0, 0, 8.95], // +Z — back inside the shop
        rotationY: 0,
        label: 'back inside the shop',
        radius: 3.2,
      },
      {
        id: 'boardwalk-to-ocean',
        to: 'oceanview',
        toSpawn: 'fromBoardwalk',
        position: [0, 0, -8.95], // -Z — straight down the pier to the tide line
        rotationY: Math.PI,
        label: 'walk down to the tide',
        radius: 3.2,
      },
      {
        id: 'boardwalk-to-balboa',
        to: 'balboa',
        toSpawn: 'fromBoardwalk',
        position: [-8.95, 0, 4.5], // -X gate, level with the spawn — up to the park
        rotationY: Math.PI / 2,
        label: 'follow the path to the park',
        radius: 3.2,
      },
      {
        id: 'boardwalk-to-moonlight',
        to: 'moonlight',
        toSpawn: 'fromBoardwalk',
        position: [8.95, 0, 4.5], // +X gate, level with the spawn — out to the plaza
        rotationY: -Math.PI / 2,
        label: 'out onto the dance floor',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'oceanview',
    kind: 'oceanview',
    title: 'Moonlight Beach',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Nocturnal contrast to the golden boardwalk: deep moonlit blue, the tide
    // line out past the -Z edge. Sweet, still — a sit-and-watch breather.
    palette: { background: '#123150', fog: '#173a5e', fogNear: 10, fogFar: 70 },
    song: 'ocean-view',
    spawns: {
      // Arrive at the top of the beach, facing the moonlit water (-Z). Clear of the
      // +Z steps back up.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromBoardwalk: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'ocean-to-boardwalk',
        to: 'boardwalk',
        toSpawn: 'fromOcean',
        position: [0, 0, 8.95], // +Z — back up the steps to the boardwalk
        rotationY: 0,
        label: 'back up to the boardwalk',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'balboa',
    kind: 'balboa',
    title: 'Park Path',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // A bright SoCal park midday — sky blue, palms, a little fountain. Sweet + open.
    palette: { background: '#86b6d6', fog: '#a6cce0', fogNear: 11, fogFar: 80 },
    // Palms line the path.
    props: [
      { url: '/models/palm-tree.glb', position: [-5.6, 0, -3.5], fit: 5, rotationY: 0.3 },
      { url: '/models/palm-tree.glb', position: [5.8, 0, -5], fit: 4.6, rotationY: -0.5 },
    ],
    song: 'walking-balboa',
    spawns: {
      // Arrive on the path, facing up into the park (-Z). Clear of the +Z gate back.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromBoardwalk: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Back down off the coast road: by the -Z gate, facing +Z back into the park,
      // clear of every door radius.
      fromCalifornia: { position: [0, EYE, -4.5], yaw: 0 },
    },
    doors: [
      {
        id: 'balboa-to-boardwalk',
        to: 'boardwalk',
        toSpawn: 'fromBalboa',
        position: [0, 0, 8.95], // +Z — back down to the boardwalk
        rotationY: 0,
        label: 'back to the boardwalk',
        radius: 3.2,
      },
      {
        id: 'balboa-to-california',
        to: 'california',
        toSpawn: 'fromBalboa',
        position: [0, 0, -8.95], // -Z — up the path to the coast road
        rotationY: Math.PI,
        label: 'up to the coast road',
        radius: 3.2,
      },
    ],
  },
  // ── The Sunken Gallery wing ─────────────────────────────────────────────────
  // Wade out of the poolrooms' false water into a submerged hall of vaporwave-
  // classical statuary (crunched greek GLBs): a colonnade, a centre sculpture, a
  // broken statue in the murk. Funny-uncanny, NEVER traumatic — dim deep-sea teal,
  // still water, drips. It opens at the far end onto a sweet pastel daydream — the
  // taste-guardrail breather. Each room plays its own song (Room.song).
  {
    id: 'gallery',
    kind: 'gallery',
    title: 'The Sunken Gallery',
    dims: { halfW: 10, halfD: 10, height: 6, eye: EYE },
    // Submerged museum teal — dim, close-ish fog, statues looming out of the murk.
    palette: { background: '#0f2e34', fog: '#123c42', fogNear: 5, fogFar: 36 },
    drips: true, // it's flooded — water drips from the vaulted dark
    song: 'underwater',
    // A colonnade of crunched greek columns (doric + ionic alternating) down both
    // sides, a sculpture on the centre line, a broken statue + amphorae in the
    // murk. All lazy GLB props (each its own Suspense) — provenance in
    // THIRD_PARTY_NOTICES.md. The IP-flagged trove models are NOT used.
    props: [
      { url: '/models/ionic-column.glb', position: [-5.5, 0, -6], fit: 5.2 },
      { url: '/models/greek-doric-column.glb', position: [5.5, 0, -6], fit: 5.2 },
      { url: '/models/ionic-column.glb', position: [-5.5, 0, 0], fit: 5.2 },
      { url: '/models/greek-doric-column.glb', position: [5.5, 0, 0], fit: 5.2 },
      { url: '/models/ionic-column.glb', position: [-5.5, 0, 6], fit: 5.2 },
      { url: '/models/greek-doric-column.glb', position: [5.5, 0, 6], fit: 5.2 },
      {
        url: '/models/classical-greek-sculpture.glb',
        position: [0, 0, -3.5],
        fit: 3.6,
        rotationY: Math.PI,
      },
      { url: '/models/greek-statue.glb', position: [-2.8, 0, 2.5], fit: 3.2, rotationY: 0.5 },
      { url: '/models/greek-jar.glb', position: [3, 0, 3.5], fit: 1.4, rotationY: -0.4 },
      { url: '/models/greek-jar.glb', position: [2.2, 0, -7], fit: 1.2, rotationY: 0.8 },
    ],
    spawns: {
      // Wade in from the poolrooms at the +Z end, facing -Z down the colonnade
      // toward the light at the far end. Clear of the +Z return door.
      default: { position: [0, EYE, 5.5], yaw: Math.PI },
      fromPool: { position: [0, EYE, 5.5], yaw: Math.PI },
      // Back from the daydream: at the -Z end, facing +Z back up the hall.
      fromDaydream: { position: [0, EYE, -5.5], yaw: 0 },
    },
    doors: [
      {
        id: 'gallery-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromGallery',
        position: [0, 0, 9.9], // +Z — back up to the poolrooms
        rotationY: 0,
        label: 'wade back up to the poolrooms',
        radius: 3.2,
      },
      {
        id: 'gallery-to-daydream',
        to: 'daydream',
        toSpawn: 'fromGallery',
        position: [0, 0, -9.9], // -Z far end — toward the light
        rotationY: Math.PI,
        label: 'step toward the light',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'daydream',
    kind: 'daydream',
    title: 'Daydream',
    dims: { halfW: 9, halfD: 9, height: 8, eye: EYE },
    // Pastel watercolor sky — soft lavender, bright, far gentle fog. The sweet
    // breather after the murk (taste guardrail: the contrast is the point).
    palette: { background: '#c4b6ea', fog: '#dccff4', fogNear: 9, fogFar: 64 },
    song: 'watercolor-sky',
    spawns: {
      // Surface onto the cloud deck, facing out into the pastel haze (-Z), clear
      // of the +Z door back down into the gallery.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromGallery: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'daydream-to-gallery',
        to: 'gallery',
        toSpawn: 'fromDaydream',
        position: [0, 0, 8.95], // +Z — back down into the gallery
        rotationY: 0,
        label: 'back down into the gallery',
        radius: 3.2,
      },
    ],
  },
  // ── The Memory Lane wing ────────────────────────────────────────────────────
  // Through a hatch behind the classified room's cabinets: a long corridor of
  // humming CRTs running old-web fragments (UNDER CONSTRUCTION, a hit counter, a
  // guestbook), opening at the far end into a dark server-void where drifting data
  // motes bloom soft notes — "all my friends live on the internet." Warm-eerie
  // digital nostalgia, never dread (taste guardrail). Each plays its own song.
  {
    id: 'memorylane',
    kind: 'memorylane',
    title: 'Memory Lane',
    // A long, narrow corridor — you walk the length of it past the screens.
    dims: { halfW: 4, halfD: 11, height: 4, eye: EYE },
    // CRT dusk: deep indigo black washed in monitor glow, close fog so the far end
    // is just a smear of light down the hall.
    palette: { background: '#140d22', fog: '#1b1330', fogNear: 4, fogFar: 30 },
    song: 'memory-lan',
    // A row of old CRT sets facing in off both walls, humming, mid-corridor.
    props: [
      {
        url: '/models/crt-tv.glb',
        position: [-3, 0, 4],
        fit: 1.3,
        rotationY: Math.PI / 2,
        glow: 0.4,
      },
      {
        url: '/models/crt-tv.glb',
        position: [3, 0, 1],
        fit: 1.3,
        rotationY: -Math.PI / 2,
        glow: 0.4,
      },
      {
        url: '/models/crt-tv.glb',
        position: [-3, 0, -3],
        fit: 1.3,
        rotationY: Math.PI / 2,
        glow: 0.4,
      },
      {
        url: '/models/crt-tv.glb',
        position: [3, 0, -6],
        fit: 1.3,
        rotationY: -Math.PI / 2,
        glow: 0.4,
      },
    ],
    spawns: {
      // Step out of the hatch at the +Z end, facing -Z down the corridor toward the
      // far light. Clear of the +Z return door (radius 3.2).
      default: { position: [0, EYE, 7.4], yaw: Math.PI },
      fromClassified: { position: [0, EYE, 7.4], yaw: Math.PI },
      // Back up the cables from the servers: at the -Z end, facing +Z back up the
      // corridor, clear of the -Z door radius.
      fromInternet: { position: [0, EYE, -7.4], yaw: 0 },
    },
    doors: [
      {
        id: 'memorylane-to-classified',
        to: 'classified',
        toSpawn: 'fromMemoryLane',
        position: [0, 0, 10.95], // +Z — back through the hatch
        rotationY: 0,
        label: 'back through the hatch',
        radius: 3.2,
      },
      {
        id: 'memorylane-to-internet',
        to: 'internet',
        toSpawn: 'fromMemoryLane',
        position: [0, 0, -10.95], // -Z — follow the cables down into the servers
        rotationY: Math.PI,
        label: 'follow the cables into the dark',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'internet',
    kind: 'internet',
    title: 'Where the Friends Live',
    // A wide, dark void — server racks fading into the distance.
    dims: { halfW: 9, halfD: 9, height: 5, eye: EYE },
    // Near-black, cool blue; close-ish fog so the racks loom out of the dark and
    // the drifting data motes read as little lights in the void.
    palette: { background: '#05080f', fog: '#070d18', fogNear: 5, fogFar: 34 },
    song: 'all-my-friends-live-on-the-internet',
    spawns: {
      // Arrive at the +Z mouth of the hall, facing -Z into the racks. Clear of the
      // +Z door back up the corridor.
      default: { position: [0, EYE, 5], yaw: Math.PI },
      fromMemoryLane: { position: [0, EYE, 5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'internet-to-memorylane',
        to: 'memorylane',
        toSpawn: 'fromInternet',
        position: [0, 0, 8.95], // +Z — back up the cables to memory lane
        rotationY: 0,
        label: 'back up the cables',
        radius: 3.2,
      },
    ],
  },
  // ── The Moonlight wing ──────────────────────────────────────────────────────
  // Off the +X end of the boardwalk: a moonlit dance plaza out on the pier (string
  // lights, a checker dance floor, the sea + moon out the back), opening inland
  // onto a bright "best day ever" carnival morning. A sweet night→day pair — pure
  // surface goof (taste guardrail). Each plays its own song (Room.song).
  {
    id: 'moonlight',
    kind: 'moonlight',
    title: 'Moonlight Plaza',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Moonlit, but festive — a warmer indigo than the cold ocean beach, lit by
    // string bulbs. Soft far fog so the sea fades into the night.
    palette: { background: '#1b1d3e', fog: '#262a52', fogNear: 11, fogFar: 75 },
    props: [
      { url: '/models/palm-tree.glb', position: [-6.2, 0, -3], fit: 4.4, rotationY: 0.5 },
      { url: '/models/palm-tree.glb', position: [6.4, 0, -2], fit: 4, rotationY: -0.6 },
    ],
    song: 'dancing-in-the-moonlight',
    spawns: {
      // Step onto the plaza at the -Z (seaward) end, facing +Z up the pier across
      // the dance floor toward the morning gate. Clear of every door radius.
      default: { position: [0, EYE, -4.5], yaw: 0 },
      fromBoardwalk: { position: [0, EYE, -4.5], yaw: 0 },
      // Back from the morning: by the +Z gate, facing -Z back across the plaza,
      // clear of every door radius.
      fromBestday: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'moonlight-to-boardwalk',
        to: 'boardwalk',
        toSpawn: 'fromMoonlight',
        position: [0, 0, -8.95], // -Z gate (seaward end) — back to the boardwalk
        rotationY: Math.PI,
        label: 'back to the boardwalk',
        radius: 3.2,
      },
      {
        id: 'moonlight-to-bestday',
        to: 'bestday',
        toSpawn: 'fromMoonlight',
        position: [0, 0, 8.95], // +Z gate — inland, toward the morning
        rotationY: 0,
        label: 'chase the morning',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'bestday',
    kind: 'bestday',
    title: 'The Best Day Ever',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Bright cheerful day — sky blue, warm sun, gentle far fog. The sweet daytime
    // counterpart to the moonlit plaza (the contrast is the point).
    palette: { background: '#8fc7e8', fog: '#b6dcf0', fogNear: 12, fogFar: 85 },
    props: [
      { url: '/models/palm-tree.glb', position: [-6.5, 0, -3], fit: 5, rotationY: 0.3 },
      { url: '/models/palm-tree.glb', position: [6.6, 0, -4], fit: 4.6, rotationY: -0.6 },
    ],
    song: 'best-day-ever',
    spawns: {
      // Arrive at the north edge facing -Z out into the sunny morning. Clear of the
      // +Z door back into the night.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromMoonlight: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'bestday-to-moonlight',
        to: 'moonlight',
        toSpawn: 'fromBestday',
        position: [0, 0, 8.95], // +Z — back into the moonlight
        rotationY: 0,
        label: 'back into the moonlight',
        radius: 3.2,
      },
    ],
  },
  // ── The California wing ─────────────────────────────────────────────────────
  // Up the park path past balboa onto a golden-hour coast road overlook, then
  // drift down to a hazy sunlit tidepool — a sweet "daydreaming" breather. Pure
  // surface goof (taste guardrail). Each plays its own song (Room.song).
  {
    id: 'california',
    kind: 'california',
    title: 'I Live in California',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Golden hour on the coast highway: warm amber sky, soft far fog so the sea
    // melts into the haze.
    palette: { background: '#f0b274', fog: '#f6cf9c', fogNear: 12, fogFar: 82 },
    props: [
      { url: '/models/palm-tree.glb', position: [-6.4, 0, -2], fit: 5.2, rotationY: 0.4 },
      // a foreground palm framing the tower from the right (clear of its dome)
      { url: '/models/palm-tree.glb', position: [8, 0, -0.5], fit: 4.6, rotationY: -0.5 },
    ],
    song: 'i-live-in-california',
    // (The California Tower itself is procedural — see CaliforniaRoom.)
    spawns: {
      // Arrive at the +Z (park) end of the overlook, facing -Z out toward the sea
      // + the lower tidepool gate. Clear of every door radius.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromBalboa: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Back up from the tidepools: by the -Z gate, facing +Z back up the road,
      // clear of every door radius.
      fromTidepools: { position: [0, EYE, -4.5], yaw: 0 },
    },
    doors: [
      {
        id: 'california-to-balboa',
        to: 'balboa',
        toSpawn: 'fromCalifornia',
        position: [0, 0, 8.95], // +Z — back down the path to the park
        rotationY: 0,
        label: 'back down to the park',
        radius: 3.2,
      },
      {
        id: 'california-to-tidepools',
        to: 'tidepools',
        toSpawn: 'fromCalifornia',
        position: [0, 0, -8.95], // -Z — down to the tidepools
        rotationY: Math.PI,
        label: 'down to the tidepools',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'tidepools',
    kind: 'tidepools',
    title: 'Daydreaming',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Hazy bright noon over a shallow lagoon — soft mint + cream, a shimmer on the
    // still water. The sweet drift at the bottom of the wing.
    palette: { background: '#bfe3d6', fog: '#d6efe6', fogNear: 11, fogFar: 78 },
    props: [{ url: '/models/palm-tree.glb', position: [-6.6, 0, -3], fit: 4.6, rotationY: 0.6 }],
    song: 'daydreaming',
    spawns: {
      // Arrive at the +Z edge of the lagoon, facing -Z out across the still water.
      // Clear of the +Z gate back up the road.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromCalifornia: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'tidepools-to-california',
        to: 'california',
        toSpawn: 'fromTidepools',
        position: [0, 0, 8.95], // +Z — back up the coast road
        rotationY: 0,
        label: 'back up the coast road',
        radius: 3.2,
      },
    ],
  },
];

// ── Trap doors (the storefront's d20 random-drop) ──────────────────────────
// The "soft spot in the floor" on the dead-plain storefront drops you, via an
// interstitial d20 roll, straight into the BOTTOM of the back rooms — skipping
// the descent entirely. This is the drop table the die rolls on: the deep,
// wrong rooms only (never the safe surface — shop/hallway/jukebox), so wherever
// you land it's already too far down. Each is a real room id + a valid spawn.
//
// Deliberately the PROCEDURAL deep rooms + the medium liminal GLB — NOT the
// heaviest deeppool GLB: a whimsical storefront click shouldn't spring a 5 MB
// download on a casual visitor (the abandoned pool stays something you EARN by
// descending). The d20 face maps onto this list (face → list index), so the
// number the die lands on genuinely decides where the floor drops you.
export type TrapDrop = { room: string; spawn: string; title: string };
const TRAP_DROP_ROOMS: TrapDrop[] = [
  { room: 'classified', spawn: 'default', title: 'Classified' },
  { room: 'dicepit', spawn: 'default', title: 'The Back Room' },
  { room: 'mobius', spawn: 'default', title: 'The Long Corridor' },
  { room: 'liminal', spawn: 'default', title: 'Liminal Space' },
];

/** Map a d20 face (1..20) to a drop destination. The face decides — same face,
 *  same room — so the roll isn't decorative: it's the randomizer. */
export function trapDropForRoll(face: number): TrapDrop {
  const i = (Math.max(1, Math.min(20, Math.floor(face))) - 1) % TRAP_DROP_ROOMS.length;
  return TRAP_DROP_ROOMS[i];
}

// The jukebox's world position (the music source). Lives here so JukeboxRoom can
// place the object and the proximity-audio can measure distance to the same spot.
export const JUKEBOX_POS: [number, number, number] = [0, 1.2, -5.5];

// The blank panel in the hall's left wall the rat knocks open. The Rat steers to
// this spot to knock; HallwayRoom draws the seam here; the hidden
// 'hall-to-classified' door sits in the same wall (see ROOMS above).
export const SECRET_PANEL: [number, number, number] = [-2.4, 1.4, -2];

/** A room's fog as the plain { color, near, far } object the affine material
 *  factory (makeAffineTexturedMaterial) and the <fog> primitive consume. Every
 *  procedural room built this same literal off room.palette by hand; one helper
 *  keeps it DRY without pulling three into this (deliberately three-free) module. */
export function fogFor(room: Room): { color: string; near: number; far: number } {
  return { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };
}

/** Derive an arrival spawn that stands `back` units IN FRONT of a door and faces
 *  the room INTERIOR (the inward normal of the wall the door sits on) — i.e. the
 *  door is behind you and walking forward takes you into the room, never back
 *  through it. The single source for "arrive facing in", so a hand-authored yaw
 *  can't silently contradict the door it pairs with.
 *
 *  Which wall the door is on is read from geometry (its nearest extent), NOT from
 *  `rotationY` — `rotationY` orients the visible frame and its relationship to
 *  "inward" differs between X- and Z-walls, so it can't be trusted for facing.
 *
 *  CAVEAT: correct for WIDE rooms / the big GLB levels, where facing straight in
 *  is what you want. NOT for a narrow corridor or a side-wall door, where you
 *  want to face ALONG the room rather than at the near wall a step away — author
 *  those by hand (and the dev guard below leaves them alone). */
export function spawnFacingInward(
  door: Pick<RoomDoor, 'position'>,
  dims: { halfW: number; halfD: number; eye: number },
  back = 4.5,
): Spawn {
  // The door sits on whichever wall it's nearest (largest fraction of that
  // half-extent); inward is that wall's interior-pointing normal.
  const fracX = Math.abs(door.position[0]) / dims.halfW;
  const fracZ = Math.abs(door.position[2]) / dims.halfD;
  let inX = 0;
  let inZ = 0;
  if (fracX >= fracZ)
    inX = door.position[0] > 0 ? -1 : 1; // ±X wall → face the other way
  else inZ = door.position[2] > 0 ? -1 : 1; // ±Z wall
  return {
    position: [door.position[0] + inX * back, dims.eye, door.position[2] + inZ * back],
    // fwd = (sin yaw, cos yaw) in Controls, so yaw = atan2(inX, inZ) faces inward.
    yaw: Math.atan2(inX, inZ),
  };
}

const BY_ID = new Map(ROOMS.map((r) => [r.id, r]));

/** Every jukebox slug that some room OWNS as its `Room.song`. These are the
 *  "exploration's reward is sound" tracks: HIDDEN from the jukebox until you find
 *  the room that plays them (see jukebox.ts `visibleJukeboxTracks` + the discovery
 *  hook in World's RoomMusic). Catalog songs NOT in here are the always-available
 *  seed. Derived from the room graph, so adding a song-room needs no second list. */
export const ROOM_SONG_SLUGS: ReadonlySet<string> = new Set(
  ROOMS.map((r) => r.song).filter((s): s is string => typeof s === 'string'),
);

/** The starting room — the beach shop. */
export const FIRST_ROOM = ROOMS[0].id;

const warnedMissingRoom = new Set<string>();

export function roomById(id: string): Room {
  const r = BY_ID.get(id);
  if (!r) {
    // Fail soft to the shop rather than crash the world on a bad id — but
    // surface it LOUDLY once (dev and prod) so a typo as the graph grows shows
    // up as an error, not a silent "why am I back in the shop?" content bug.
    // One-shot per id: roomById runs every frame, so don't spam the console.
    if (!warnedMissingRoom.has(id)) {
      warnedMissingRoom.add(id);
      console.error(`[rooms] unknown room id "${id}" — falling back to "${ROOMS[0].id}"`);
    }
    return ROOMS[0];
  }
  return r;
}

// 2D layout for the pause-menu map (WorldMap): x = spread, y = DEPTH (down). Not
// geographic — a readable node graph. The water thread runs down the centre-left,
// the shrine/grass thread branches right off the poolrooms hub. Every room id
// must have an entry (asserted in rooms.test) so the map can never miss a node.
export const ROOM_MAP: Record<string, { x: number; y: number }> = {
  // boardwalk wing — a sweet SURFACE branch out the side of the shop (left, up
  // top: it's not a descent, it's a stroll out to the beach + park).
  boardwalk: { x: 3, y: 0.3 },
  balboa: { x: 1.4, y: 0 },
  oceanview: { x: 2.4, y: 1.1 },
  // moonlight wing — a night→day pair off the +X (east) end of the boardwalk,
  // trailing up and away from the descent (still pure surface).
  moonlight: { x: 3.7, y: -0.7 },
  bestday: { x: 4.5, y: -1.4 },
  // california wing — up the park path (north of balboa), drifting down to the
  // tidepool daydream. Still pure surface.
  california: { x: 0.6, y: -0.9 },
  tidepools: { x: -0.4, y: -1.6 },
  // water / main descent (centre)
  shop: { x: 5, y: 0 },
  hallway: { x: 5, y: 1.2 },
  closet: { x: 6.6, y: 1.5 },
  classified: { x: 3, y: 1.6 },
  jukebox: { x: 5, y: 2.4 },
  // memory lane wing — a side branch WEST off the classified file room, deeper
  // into the machine's wiring (the dark server-void past the CRT corridor).
  memorylane: { x: 1.5, y: 1.4 },
  internet: { x: 0.3, y: 1.9 },
  practice: { x: 3, y: 2.8 },
  poolrooms: { x: 5, y: 3.6 },
  // sunken gallery wing — a side branch off the poolrooms (right), dipping then
  // rising into the pastel daydream.
  gallery: { x: 6.8, y: 3.2 },
  daydream: { x: 8, y: 2.6 },
  dicepit: { x: 3.2, y: 4.0 },
  lockerroom: { x: 2.2, y: 4.6 },
  mobius: { x: 5, y: 4.8 },
  liminal: { x: 5, y: 6.0 },
  deeppool: { x: 5, y: 7.2 },
  // shrine / grass thread (right branch off the pool)
  shrine: { x: 7, y: 4.4 },
  'metro-tunnel': { x: 7, y: 5.6 },
  terminus: { x: 7, y: 6.8 },
  grassfield: { x: 8.6, y: 4.9 },
  grassbattle: { x: 9.8, y: 5.4 },
  grove: { x: 8.6, y: 5.9 },
  frutiger: { x: 9.8, y: 6.4 },
};

// The MAIN DESCENT — the rooms on the way down (the jaunt). Keys may never gate
// these (friction budget: the descent has zero hard gates); a requiresKey door
// must target SIDE/SECRET content only. Enforced by the dev guard below + the
// unit test, so the rule is code, not discipline.
export const MAIN_DESCENT: ReadonlySet<string> = new Set([
  'shop',
  'hallway',
  'jukebox',
  'poolrooms',
  'mobius',
  'liminal',
  'deeppool',
  'shrine',
  'metro-tunnel',
  'terminus',
]);

// Dev guardrail: every door must point at a real room + an existing spawn, and
// room/door ids must be unique (a duplicate would silently win in BY_ID or
// confuse the nearest-door tracking). Surface graph typos at the source.
if (import.meta.env?.DEV) {
  if (BY_ID.size !== ROOMS.length) {
    console.warn('[rooms] duplicate room id(s) — BY_ID collapsed entries');
  }
  const doorIds = new Set<string>();
  for (const room of ROOMS) {
    // Dancing entities belong only in the GLB liminal levels (taste: a relief beat
    // against their dread; the sweet procedural rooms don't get them).
    if (room.entities?.length && !room.glb) {
      console.warn(
        `[rooms] room "${room.id}" has entities but is not a GLB level — wanderers are for the deep liminal levels only`,
      );
    }
    // Every pickup item id must resolve in items.ts, or it can never be displayed
    // or used — surface a typo loudly in dev rather than ship a dead collectible.
    for (const pickup of room.pickups ?? []) {
      if (!itemById(pickup.itemId)) {
        console.warn(
          `[rooms] room "${room.id}" pickup "${pickup.itemId}" has no items.ts entry — it can't be shown or used`,
        );
      }
    }
    for (const door of room.doors) {
      if (doorIds.has(door.id)) console.warn(`[rooms] duplicate door id "${door.id}"`);
      doorIds.add(door.id);
      const target = BY_ID.get(door.to);
      if (!target) {
        console.warn(`[rooms] door "${door.id}" in "${room.id}" → unknown room "${door.to}"`);
      } else if (door.toSpawn && !target.spawns[door.toSpawn]) {
        console.warn(
          `[rooms] door "${door.id}" → "${door.to}" wants spawn "${door.toSpawn}" which doesn't exist`,
        );
      }
      // A key must never gate the way DOWN (friction budget) — only side/secret doors.
      if (door.requiresKey && MAIN_DESCENT.has(door.to)) {
        console.warn(
          `[rooms] door "${door.id}" locks a MAIN-DESCENT room ("${door.to}") behind key "${door.requiresKey}" — keys may only gate side/secret content`,
        );
      }
      // …and the key it wants must be a real items.ts id, or the door is an
      // unwinnable lock (no pickup could ever satisfy it).
      if (door.requiresKey && !itemById(door.requiresKey)) {
        console.warn(
          `[rooms] door "${door.id}" requires key "${door.requiresKey}" which has no items.ts entry — it could never be opened`,
        );
      }
    }
    // Every spawn should land OUTSIDE every door's radius in its room — else you
    // arrive standing in a prompt and a held E could bounce you back. A lot of
    // the anti-bounce behavior rides on these offsets, so guard them as data.
    // SECOND guard (the missing half): a spawn must not FACE a nearby door, or
    // walking straight forward walks you right back through it — the exact "wrong
    // side / bounce back" bug. We only flag a door that's both CLOSE (<8u) and
    // squarely AHEAD (forward·toward-door > 0.8, ~within 37°), so facing along a
    // corridor past a far side-wall door (e.g. the hall's classified panel) or
    // angling across a hub toward a non-return door is left alone.
    for (const [spawnId, spawn] of Object.entries(room.spawns)) {
      const fwdX = Math.sin(spawn.yaw);
      const fwdZ = Math.cos(spawn.yaw);
      for (const door of room.doors) {
        const dx = spawn.position[0] - door.position[0];
        const dz = spawn.position[2] - door.position[2];
        const dist = Math.hypot(dx, dz);
        if (dist < (door.radius ?? 3.2)) {
          console.warn(
            `[rooms] spawn "${room.id}.${spawnId}" sits inside door "${door.id}" radius — arrival will prompt/bounce`,
          );
        } else if (dist < 8) {
          const dot = (fwdX * -dx + fwdZ * -dz) / dist; // forward · (spawn→door)
          if (dot > 0.8) {
            console.warn(
              `[rooms] spawn "${room.id}.${spawnId}" faces door "${door.id}" (dot ${dot.toFixed(2)}) — walking forward bounces back through it`,
            );
          }
        }
      }
    }
  }
}
