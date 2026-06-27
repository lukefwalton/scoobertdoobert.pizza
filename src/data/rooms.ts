// ───────────────────────────────────────────────────────────────────────────
// src/data/rooms.ts — the 3D world graph: the ASSEMBLER + helpers.
//
// The Room TYPES + constants live in ./rooms/types.ts; the room DATA is split by
// region into ./rooms/{core,water,japan,surface,memorylane}.ts (so no single file
// is a 2000-line monolith). This file stitches them into ROOMS and owns the graph
// helpers (roomById, fogFor, spawnFacingInward), the map/descent metadata, the
// trap-door drop table, and the dev guardrails. It RE-EXPORTS ./rooms/types, so
// external code keeps importing { Room, RoomDoor, ROOM_FADE_MS, ... } from
// '../data/rooms' unchanged. Adding a room = drop it in the right wing file (+ a
// geometry component in src/world/); the ids/spawns/keys are guarded below.
//
// A door is a real 3D object you walk up to and step through (E / click), with a
// short fade. It carries the target room + which spawn to arrive at, so the graph
// is fully described in data and Controls/World just render the current node.
// ───────────────────────────────────────────────────────────────────────────
import { itemById } from './items';
import { type Room, type RoomDoor, type Spawn } from './rooms/types';
import { CORE_ROOMS } from './rooms/core';
import { WATER_ROOMS } from './rooms/water';
import { JAPAN_ROOMS } from './rooms/japan';
import { SURFACE_ROOMS } from './rooms/surface';
import { MEMORYLANE_ROOMS } from './rooms/memorylane';
import { STUDIO_ROOMS } from './rooms/studio';

// Re-export the types + shared constants so '../data/rooms' stays the one public
// module for the world graph (RoomKind, Room, RoomDoor, MOBIUS_BREAK, ROOM_FADE_MS,
// EYE, ROOM, …). Importers never need to know about the ./rooms/ split.
export * from './rooms/types';

// The world, assembled from its wings. Order is grouped by region for legibility;
// nothing depends on it except that the shop stays first (FIRST_ROOM = ROOMS[0]).
export const ROOMS: Room[] = [
  ...CORE_ROOMS,
  ...WATER_ROOMS,
  ...JAPAN_ROOMS,
  ...SURFACE_ROOMS,
  ...MEMORYLANE_ROOMS,
  ...STUDIO_ROOMS,
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
// descending). Ordered UNLUCKIEST → LUCKIEST: the trap door is a STAKES d20 now
// (see lib/luck), so a higher face — luck buys advantage — lands you somewhere
// less wrong. face 1 = the tightest dark, face 20 = the most navigable of the
// wrong rooms. Same face (+ crit) → same room, so the roll is the randomizer.
export type TrapDrop = { room: string; spawn: string; title: string };
const TRAP_DROP_ROOMS: TrapDrop[] = [
  { room: 'classified', spawn: 'default', title: 'Classified' }, // tightest, near-black
  { room: 'liminal', spawn: 'default', title: 'Liminal Space' },
  { room: 'mobius', spawn: 'default', title: 'The Long Corridor' },
  { room: 'dicepit', spawn: 'default', title: 'The Back Room' }, // warm felt, least wrong
];

// The nat 20 jackpot: a "soft landing." Instead of the deep-and-wrong rooms, a
// crit-lucky fall drops you clean THROUGH into the pastel daydream — the rarest,
// sweetest drop the storefront floor can give (luck makes the nat 20 likelier).
const TRAP_DROP_LUCKY: TrapDrop = { room: 'daydream', spawn: 'default', title: 'a soft landing' };

/** Map a d20 face (1..20) to a drop destination. The trap door is a STAKES roll:
 *  a natural 20 is the "soft landing" jackpot (into the daydream); otherwise the
 *  ladder is ordinal — the higher you roll, the kinder the landing. Same face (+
 *  crit) → same room, so the roll is the randomizer, never decorative. The bare
 *  `crit`-less call (tests, non-roll callers) maps purely ordinally. */
export function trapDropForRoll(face: number, crit?: 'nat20' | 'nat1' | null): TrapDrop {
  if (crit === 'nat20') return TRAP_DROP_LUCKY;
  const f = Math.max(1, Math.min(20, Math.floor(face)));
  const i = Math.min(
    TRAP_DROP_ROOMS.length - 1,
    Math.floor(((f - 1) / 20) * TRAP_DROP_ROOMS.length),
  );
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
  // san diego wing — Balboa Park spills into the city (east of the overlook):
  // the zoo, then North Park.
  zoo: { x: 1.8, y: -1.5 },
  northpark: { x: 1.6, y: -2.6 },
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
  // basement sessions wing — the recording studio down off the practice room
  // (west-and-deeper: backstage, where the records actually get made).
  liveroom: { x: 1.5, y: 3.6 },
  controlroom: { x: 0.2, y: 3.5 },
  tapevault: { x: 0.2, y: 4.7 },
  lounge: { x: 1.3, y: 4.8 },
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
