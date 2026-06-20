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

export type RoomKind = 'shop' | 'hallway';

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
      // Spawn in the middle, facing the window/sea (-Z) — the establishing shot.
      default: { position: [0, EYE, ROOM.halfD - 1.5], yaw: Math.PI },
      // Arriving back from the hall: just inside the back door, facing the sea.
      fromHall: { position: [0, EYE, ROOM.halfD - 2.2], yaw: Math.PI },
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
      default: { position: [0, EYE, 14], yaw: Math.PI },
      // Arriving from the shop: at the shop end, facing down the hall (-Z).
      fromShop: { position: [0, EYE, 14], yaw: Math.PI },
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
    ],
  },
];

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

// Dev guardrail: every door must point at a real room + an existing spawn, or
// you'd walk into a soft-fallback. Surface graph typos at the source.
if (import.meta.env?.DEV) {
  for (const room of ROOMS) {
    for (const door of room.doors) {
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
