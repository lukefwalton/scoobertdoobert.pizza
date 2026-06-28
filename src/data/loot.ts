// ───────────────────────────────────────────────────────────────────────────
// src/data/loot.ts — LOOT, as data (three-free, like links.ts/rooms.ts).
//
// The goofy collectathon layer: pizza slices, surfboards, skateboards, burritos,
// sushi — "random shit at different levels" you hoover up for PIZZA POINTS (and,
// lol, to grow taller). Two parts:
//   • LOOT — the catalog: what each kind IS (glyph, points, how much it grows you).
//   • lootDropsForRoom(room) — a DETERMINISTIC scatter of drops across a room,
//     seeded by the room id, so a room always stocks the same loot (stable ids for
//     the "taken this run" set, and reproducible for the smoke). Loot RESPAWNS each
//     descent (the taken set is ephemeral — scoreStore), so it stays replayable.
//
// Placement stays inside the camera clamp and dodges spawns + doors, so a drop is
// never in a wall, on your arrival point, or blocking a doorway. GLB levels are
// skipped for now (their floors aren't flat-predictable); every procedural room
// gets stocked.
// ───────────────────────────────────────────────────────────────────────────
import { roomById, type Room } from './rooms';

export type LootType = {
  /** Stable id (a LootDrop.type + the scoreStore note/awarding key). */
  id: string;
  /** Pause-menu / prompt label (sweet storefront voice). */
  label: string;
  /** Emoji shown in the grab prompt + the score toast. */
  glyph: string;
  /** Base points (before the combo multiplier). Bigger, sillier things = more. */
  points: number;
  /** How much taller pocketing one makes you (world units of eye height). The
   *  surfboard lifting you more than a pizza slice is the whole joke. */
  grow: number;
  /** Flat-material body color + an emissive accent so it glints "pick me up." */
  color: string;
  accent: string;
};

// The five the brief named — pizza, surfboards, skateboards, burritos, sushi.
// Points + grow scale loosely with how absurd it is to be holding one.
export const LOOT: LootType[] = [
  {
    id: 'pizza',
    label: 'Pizza Slice',
    glyph: '🍕',
    points: 10,
    grow: 0.05,
    color: '#e8b44a',
    accent: '#c0391f',
  },
  {
    id: 'burrito',
    label: 'Burrito',
    glyph: '🌯',
    points: 15,
    grow: 0.06,
    color: '#d8b27a',
    accent: '#8a5a2a',
  },
  {
    id: 'sushi',
    label: 'Sushi',
    glyph: '🍣',
    points: 20,
    grow: 0.07,
    color: '#efe7d2',
    accent: '#e7714e',
  },
  {
    id: 'skateboard',
    label: 'Skateboard',
    glyph: '🛹',
    points: 25,
    grow: 0.09,
    color: '#7a5230',
    accent: '#39c5c0',
  },
  {
    id: 'surfboard',
    label: 'Surfboard',
    glyph: '🏄',
    points: 30,
    grow: 0.12,
    color: '#f25f8a',
    accent: '#ffe24a',
  },
];

const LOOT_BY_ID = new Map(LOOT.map((l) => [l.id, l]));
export const lootById = (id: string): LootType | undefined => LOOT_BY_ID.get(id);

export type LootDrop = {
  /** `${roomId}::${index}` — stable per (room, scatter slot). */
  id: string;
  /** A LOOT id. */
  type: string;
  position: [number, number, number];
};

// Loot floats at about waist height so it reads as "pick me up" and bobs clear of
// the floor.
const LOOT_Y = 0.8;

// ── deterministic seeded RNG (FNV-1a hash → mulberry32) ──────────────────────
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<string, LootDrop[]>();

/**
 * The loot scattered in a room: deterministic (seeded by room id), inside the
 * camera clamp, never on a spawn or a doorway. Skips GLB levels and the transient
 * grass-battle frame. Cached per room id (placement never changes within a build).
 */
export function lootDropsForRoom(room: Room): LootDrop[] {
  const hit = cache.get(room.id);
  if (hit) return hit;

  // No loot in GLB levels (unpredictable floors) or the battle frame.
  if (room.glb || room.kind === 'grassbattle') {
    cache.set(room.id, []);
    return [];
  }

  const { halfW, halfD } = room.dims;
  // Stay off the walls and out of the door radius / spawn space.
  const innerW = Math.max(0, halfW - 1.4);
  const innerD = Math.max(0, halfD - 1.4);
  const area = innerW * innerD * 4;
  const count = Math.max(2, Math.min(7, Math.round(area / 42)));

  // Avoid points: every spawn + every door (xz only).
  const avoid: Array<[number, number, number]> = [];
  for (const sp of Object.values(room.spawns)) avoid.push([sp.position[0], sp.position[2], 2.2]);
  for (const d of room.doors) avoid.push([d.position[0], d.position[2], 2.6]);

  const rng = mulberry32(hashString(room.id));
  const drops: LootDrop[] = [];
  let slot = 0;
  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let tries = 0; tries < 16 && !placed; tries++) {
      const x = (rng() * 2 - 1) * innerW;
      const z = (rng() * 2 - 1) * innerD;
      const clear = avoid.every(([ax, az, r]) => Math.hypot(x - ax, z - az) > r);
      if (!clear && tries < 15) continue; // last try: take it anyway rather than drop one
      const type = LOOT[slot % LOOT.length].id;
      drops.push({ id: `${room.id}::${slot}`, type, position: [x, LOOT_Y, z] });
      slot++;
      placed = true;
    }
  }
  cache.set(room.id, drops);
  return drops;
}

/** Resolve a drop id (`roomId::index`) back to its drop — the click / P paths only
 *  carry the id. Deterministic placement makes this a regeneration + lookup. */
export function lootDropById(id: string): LootDrop | undefined {
  const sep = id.lastIndexOf('::');
  if (sep < 0) return undefined;
  const roomId = id.slice(0, sep);
  return lootDropsForRoom(roomById(roomId)).find((d) => d.id === id);
}
