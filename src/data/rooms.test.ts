import { describe, it, expect, vi } from 'vitest';
import { ROOMS, roomById, trapDropForRoll, fogFor, FIRST_ROOM } from './rooms';

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

  it('fogFor projects the room palette into the material fog shape', () => {
    const shop = roomById('shop');
    expect(fogFor(shop)).toEqual({
      color: shop.palette.fog,
      near: shop.palette.fogNear,
      far: shop.palette.fogFar,
    });
  });
});
