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
  | 'mobius';

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
  /** How close (world units) to trigger the prompt. */
  radius?: number;
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
    spawns: {
      // The establishing shot: facing the window/sea (-Z), the boids out the
      // glass. Kept clear of the back-hall door's 3.2 radius so the door is
      // something you discover by turning around, not an instant prompt at spawn.
      default: { position: [0, EYE, ROOM.halfD - 3.5], yaw: Math.PI },
      // Arriving back from the hall: a step clear of the back door (outside its
      // 3.2 radius) so you land IN the room, not on its prompt, and a held E
      // can't immediately bounce you back through it. Faces the sea.
      fromHall: { position: [0, EYE, ROOM.halfD - 4.5], yaw: Math.PI },
      // Arriving back up from the pool: by the +X pool door, clear of its radius,
      // facing the window/room.
      fromPool: { position: [ROOM.halfW - 4.5, EYE, 3.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'shop-to-hall',
        to: 'hallway',
        toSpawn: 'fromShop',
        // Back wall (+Z), opposite the window. "EMPLOYEES ONLY."
        position: [0, 0, ROOM.halfD - 0.05],
        rotationY: 0,
        label: 'enter the back hall',
        radius: 3.2,
      },
      {
        id: 'shop-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromShop',
        // Right (+X) wall, toward the back — a stairwell down to the level below.
        position: [ROOM.halfW - 0.05, 0, 3.5],
        rotationY: -Math.PI / 2,
        label: 'go down to the pool',
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
    spawns: {
      // Enter near the door (+Z), a step clear of its radius, facing the jukebox
      // across the room (-Z) so you walk toward it and the song swells.
      default: { position: [0, EYE, 3.5], yaw: Math.PI },
      fromHall: { position: [0, EYE, 3.5], yaw: Math.PI },
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
    ],
  },
  {
    id: 'classified',
    kind: 'classified',
    title: 'Classified',
    // Tiny, cold, claustrophobic — the X-Files file room of rejected demos.
    dims: { halfW: 4, halfD: 4, height: 3.2, eye: EYE },
    palette: { background: '#0a1410', fog: '#0c1812', fogNear: 2, fogFar: 15 },
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
    spawns: {
      // Arrive on the deck just past the +Z wall (clear of the return door),
      // facing -Z across the still pool toward the far wall.
      default: { position: [0, EYE, 5], yaw: Math.PI },
      fromShop: { position: [0, EYE, 5], yaw: Math.PI },
      // Climbing back up out of the liminal level — you surface near the centre
      // door, a step clear of its radius, facing the room (-Z).
      fromLiminal: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Stumbling back out of the looping corridor: by the +X door, facing into
      // the room (-X), clear of every door radius.
      fromMobius: { position: [4.5, EYE, 5], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'pool-to-shop',
        to: 'shop',
        toSpawn: 'fromPool',
        position: [0, 0, 8.95], // +Z wall
        rotationY: 0,
        label: 'back up to the shop',
        radius: 3.2,
      },
      {
        id: 'pool-to-liminal',
        to: 'liminal',
        toSpawn: 'fromPool',
        // DEAD CENTRE, standing on the false water — the only way deeper is to
        // walk out across the pool to it (PoolroomsRoom renders the water). Faces
        // +Z toward the entry so you walk straight into it.
        position: [0, 0, 0],
        rotationY: 0,
        label: 'step through the door on the water',
        radius: 2.8,
      },
      {
        id: 'pool-to-mobius',
        to: 'mobius',
        toSpawn: 'fromPool',
        position: [8.95, 0, 5], // +X wall, near the entry end
        rotationY: -Math.PI / 2,
        label: 'down the long corridor',
        radius: 3.2,
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
        to: 'shop',
        toSpawn: 'fromPool',
        // A door in the -X wall near the far end that ISN'T there until the loop
        // breaks (MOBIUS_BREAK laps) — then you step through and pop out somewhere
        // else entirely (the shop). The "walk far enough and you're elsewhere" beat.
        position: [-2.5, 0, -9],
        rotationY: Math.PI / 2,
        label: 'step through the door that wasn’t there',
        hidden: true,
        revealOn: 'mobius',
        radius: 2.8,
      },
    ],
  },
];

// The jukebox's world position (the music source). Lives here so JukeboxRoom can
// place the object and the proximity-audio can measure distance to the same spot.
export const JUKEBOX_POS: [number, number, number] = [0, 1.2, -5.5];

// The blank panel in the hall's left wall the rat knocks open. The Rat steers to
// this spot to knock; HallwayRoom draws the seam here; the hidden
// 'hall-to-classified' door sits in the same wall (see ROOMS above).
export const SECRET_PANEL: [number, number, number] = [-2.4, 1.4, -2];

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

/** A door's spawn, resolved against the target room (falls back to 'default'). */
export function doorSpawn(door: RoomDoor): Spawn {
  const target = roomById(door.to);
  return target.spawns[door.toSpawn ?? 'default'] ?? target.spawns.default;
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
