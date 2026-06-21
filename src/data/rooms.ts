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
  | 'grove';

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
  /** How close (world units) to trigger the prompt. */
  radius?: number;
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
  /** GLB set-dressing placed in the room (GlbProp). Crunched models from the
   *  trove — provenance in THIRD_PARTY_NOTICES.md. */
  props?: RoomProp[];
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
    spawns: {
      // The establishing shot: facing the window/sea (-Z), the boids out the
      // glass. Kept clear of the back-hall door's 3.2 radius so the door is
      // something you discover by turning around, not an instant prompt at spawn.
      default: { position: [0, EYE, ROOM.halfD - 3.5], yaw: Math.PI },
      // Arriving back from the hall: a step clear of the back door (outside its
      // 3.2 radius) so you land IN the room, not on its prompt, and a held E
      // can't immediately bounce you back through it. Faces the sea.
      fromHall: { position: [0, EYE, ROOM.halfD - 4.5], yaw: Math.PI },
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
    ],
  },
  {
    id: 'hallway',
    kind: 'hallway',
    title: 'Back Hall',
    // Long, narrow, low — a corridor, not a maze (3D-Maze red brick).
    dims: { halfW: 2.6, halfD: 16, height: 4, eye: EYE },
    palette: { background: '#150c0c', fog: '#2a0f0f', fogNear: 3, fogFar: 24 },
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
    },
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
    // An old arcade cabinet humming in the corner of the music shrine.
    props: [
      {
        url: '/models/arcade-cabinet.glb',
        position: [-3.6, 0, -4.4],
        fit: 2.5,
        rotationY: 0.7,
        glow: 0.3,
      },
    ],
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
    },
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
    id: 'shrine',
    kind: 'shrine',
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
    title: 'The Hidden Grove',
    // The reward for beating the goblin (Luke: "winning gives you a new room"). A
    // hush after the bright field — dusk settling cool and blue, a single glowing
    // thing at the centre, and the reward-is-sound spine: a soft chord on arrival.
    dims: { halfW: 8, halfD: 9, height: 8, eye: EYE },
    palette: { background: '#33514c', fog: '#27433f', fogNear: 5, fogFar: 30 },
    spawns: {
      default: { position: [0, EYE, 6.5], yaw: Math.PI },
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

const BY_ID = new Map(ROOMS.map((r) => [r.id, r]));

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

// Dev guardrail: every door must point at a real room + an existing spawn, and
// room/door ids must be unique (a duplicate would silently win in BY_ID or
// confuse the nearest-door tracking). Surface graph typos at the source.
if (import.meta.env?.DEV) {
  if (BY_ID.size !== ROOMS.length) {
    console.warn('[rooms] duplicate room id(s) — BY_ID collapsed entries');
  }
  const doorIds = new Set<string>();
  for (const room of ROOMS) {
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
    }
    // Every spawn should land OUTSIDE every door's radius in its room — else you
    // arrive standing in a prompt and a held E could bounce you back. A lot of
    // the anti-bounce behavior rides on these offsets, so guard them as data.
    for (const [spawnId, spawn] of Object.entries(room.spawns)) {
      for (const door of room.doors) {
        const dx = spawn.position[0] - door.position[0];
        const dz = spawn.position[2] - door.position[2];
        if (Math.hypot(dx, dz) < (door.radius ?? 3.2)) {
          console.warn(
            `[rooms] spawn "${room.id}.${spawnId}" sits inside door "${door.id}" radius — arrival will prompt/bounce`,
          );
        }
      }
    }
  }
}
