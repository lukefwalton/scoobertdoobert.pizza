import { describe, it, expect, vi } from 'vitest';
import {
  ROOMS,
  ROOM_MAP,
  MAIN_DESCENT,
  roomById,
  trapDropForRoll,
  fogFor,
  FIRST_ROOM,
  spawnFacingInward,
} from './rooms';

describe('rooms graph', () => {
  it('roomById returns the match, and soft-falls-back to the shop on an unknown id', () => {
    expect(roomById('shop').id).toBe('shop');
    expect(roomById('jukebox').id).toBe('jukebox');
    // A bad id must never throw (it runs every frame) — it warns once + falls back.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(roomById('no-such-room').id).toBe(FIRST_ROOM);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('every door targets a real room and a spawn that exists there', () => {
    for (const room of ROOMS) {
      for (const door of room.doors) {
        const target = ROOMS.find((r) => r.id === door.to);
        expect(target, `${room.id} door "${door.id}" -> unknown room "${door.to}"`).toBeDefined();
        const spawn = door.toSpawn ?? 'default';
        expect(target!.spawns[spawn], `room "${door.to}" missing spawn "${spawn}"`).toBeDefined();
      }
    }
  });

  it('trapDropForRoll maps a d20 face to a real drop, stable + clamped over the whole range', () => {
    expect(trapDropForRoll(1)).toEqual(trapDropForRoll(1)); // same face -> same drop
    // out-of-range faces clamp into 1..20 rather than returning undefined
    for (const face of [0, -5, 21, 999]) expect(trapDropForRoll(face)).toBeDefined();
    // every face resolves to a room + spawn that actually exist in the graph
    for (let face = 1; face <= 20; face++) {
      const drop = trapDropForRoll(face);
      expect(roomById(drop.room).id).toBe(drop.room);
      expect(roomById(drop.room).spawns[drop.spawn]).toBeDefined();
    }
  });

  it('trapDropForRoll is an ordinal luck ladder: higher face lands kinder, nat 20 is the soft landing', () => {
    // ordinal: the lowest roll is the tightest dark, the highest the most navigable
    expect(trapDropForRoll(1).room).toBe('classified');
    expect(trapDropForRoll(20).room).toBe('dicepit');
    // the ladder never gets *less* kind as the face climbs (indices monotonic)
    const order = ['classified', 'liminal', 'mobius', 'dicepit'];
    let prev = 0;
    for (let face = 1; face <= 20; face++) {
      const idx = order.indexOf(trapDropForRoll(face).room);
      expect(idx).toBeGreaterThanOrEqual(prev);
      prev = idx;
    }
    // the nat 20 jackpot overrides the face entirely — a soft landing in the daydream
    const lucky = trapDropForRoll(1, 'nat20');
    expect(lucky.room).toBe('daydream');
    expect(roomById(lucky.room).spawns[lucky.spawn]).toBeDefined();
    expect(trapDropForRoll(20, 'nat20').room).toBe('daydream');
    // a crit fail is just the ordinary low end, not special-cased
    expect(trapDropForRoll(1, 'nat1').room).toBe('classified');
  });

  it('every room has pause-menu map coords (and no stray ids in ROOM_MAP)', () => {
    for (const room of ROOMS) {
      expect(ROOM_MAP[room.id], `room "${room.id}" missing a ROOM_MAP entry`).toBeDefined();
    }
    const ids = new Set(ROOMS.map((r) => r.id));
    for (const id of Object.keys(ROOM_MAP)) {
      expect(ids.has(id), `ROOM_MAP has "${id}" which is not a real room`).toBe(true);
    }
  });

  // The friction-budget hard line (CLAUDE.md): a key may only gate SIDE/SECRET
  // content — the main descent has zero hard gates. The dev guard in rooms.ts
  // throws on this too, but the smokes only fail on console.error, so this is
  // the CI-blocking half the docs always claimed existed.
  it('no door locks a MAIN_DESCENT room behind a key', () => {
    for (const room of ROOMS) {
      for (const door of room.doors) {
        if (!door.requiresKey) continue;
        expect(
          MAIN_DESCENT.has(door.to),
          `door "${door.id}" in "${room.id}" locks main-descent room "${door.to}" behind key "${door.requiresKey}"`,
        ).toBe(false);
      }
    }
    // ...and the set itself stays anchored to real rooms (a renamed room id would
    // silently un-protect its descent slot).
    for (const id of MAIN_DESCENT) {
      expect(roomById(id).id, `MAIN_DESCENT lists "${id}" which is not a real room`).toBe(id);
    }
  });

  it('fogFor projects the room palette into the material fog shape', () => {
    const shop = roomById('shop');
    expect(fogFor(shop)).toEqual({
      color: shop.palette.fog,
      near: shop.palette.fogNear,
      far: shop.palette.fogFar,
    });
  });
});

// The ARRIVAL-SPAWN CONTRACT (the "control feels true" pillar): when a door drops
// you somewhere, you must land facing INTO the room with the door you came through
// behind you — never staring at it, or walking straight forward would bounce you
// right back the way you came ("wrong side of the map"). These are the machine-
// checked halves of the dev-time guard in rooms.ts, run in CI so a future
// spawn/door edit can't silently reintroduce the bounce.
describe('room arrival-spawn contract', () => {
  for (const room of ROOMS) {
    for (const [spawnId, spawn] of Object.entries(room.spawns)) {
      it(`${room.id}.${spawnId} lands outside every door radius`, () => {
        for (const door of room.doors) {
          // Hidden doors aren't active at arrival (you can't walk through one until
          // its trigger/secret reveals it, by which point you've moved), so they're
          // not a spawn hazard — the escape-room level door can sit behind the reel.
          if (door.hidden) continue;
          const dx = spawn.position[0] - door.position[0];
          const dz = spawn.position[2] - door.position[2];
          const dist = Math.hypot(dx, dz);
          expect(
            dist,
            `spawn sits inside door "${door.id}" radius — arrival prompts/bounces`,
          ).toBeGreaterThanOrEqual(door.radius ?? 3.2);
        }
      });

      it(`${room.id}.${spawnId} does not face a nearby door`, () => {
        const fwdX = Math.sin(spawn.yaw);
        const fwdZ = Math.cos(spawn.yaw);
        for (const door of room.doors) {
          if (door.hidden) continue; // inactive at arrival (see the radius test above)
          const dx = door.position[0] - spawn.position[0];
          const dz = door.position[2] - spawn.position[2];
          const dist = Math.hypot(dx, dz);
          if (dist >= 8 || dist < 1e-6) continue; // only a close door you'd walk into
          const dot = (fwdX * dx + fwdZ * dz) / dist; // forward · (spawn→door)
          expect(
            dot,
            `spawn faces door "${door.id}" (dot ${dot.toFixed(2)}) — forward walks back through it`,
          ).toBeLessThanOrEqual(0.8);
        }
      });
    }
  }
});

describe('spawnFacingInward', () => {
  const dims = { halfW: 8, halfD: 8, eye: 2.4 };

  it('faces -Z (yaw π) for a +Z-wall door and steps inward', () => {
    const s = spawnFacingInward({ position: [0, 0, 7.9] }, dims, 4.5);
    expect(s.yaw).toBeCloseTo(Math.PI);
    expect(s.position[2]).toBeCloseTo(7.9 - 4.5);
    expect(s.position[0]).toBeCloseTo(0);
    expect(s.position[1]).toBe(2.4);
  });

  it('faces +X (yaw π/2) for a -X-wall door', () => {
    const s = spawnFacingInward({ position: [-7.9, 0, 0] }, dims, 4.5);
    expect(s.yaw).toBeCloseTo(Math.PI / 2);
    expect(s.position[0]).toBeCloseTo(-7.9 + 4.5);
  });

  it('the derived spawn faces away from its own door (door ends up behind you)', () => {
    const door = { position: [0, 0, -7.9] as [number, number, number] };
    const s = spawnFacingInward(door, dims, 4.5);
    const fwdX = Math.sin(s.yaw);
    const fwdZ = Math.cos(s.yaw);
    const dx = door.position[0] - s.position[0];
    const dz = door.position[2] - s.position[2];
    const dot = (fwdX * dx + fwdZ * dz) / Math.hypot(dx, dz);
    expect(dot).toBeLessThan(0);
  });
});
