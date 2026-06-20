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

export type RoomKind = 'shop' | 'hallway' | 'jukebox' | 'classified';

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

export function roomById(id: string): Room {
  const r = BY_ID.get(id);
  if (!r) {
    // Fail soft to the shop rather than crash the world on a bad link.
    if (import.meta.env?.DEV) console.warn(`[rooms] unknown room id "${id}", falling back to shop`);
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
  }
}
