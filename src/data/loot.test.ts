import { describe, it, expect } from 'vitest';
import { LOOT, lootById, lootDropsForRoom, lootDropById } from './loot';
import { ROOMS, roomById } from './rooms';

describe('loot catalog', () => {
  it('has the five named kinds, each with positive points + grow + a glyph', () => {
    const ids = LOOT.map((l) => l.id).sort();
    expect(ids).toEqual(['burrito', 'pizza', 'skateboard', 'surfboard', 'sushi']);
    for (const l of LOOT) {
      expect(l.points, l.id).toBeGreaterThan(0);
      expect(l.grow, l.id).toBeGreaterThan(0);
      expect(l.glyph.length, l.id).toBeGreaterThan(0);
    }
  });

  it('lootById resolves a real id and rejects a bogus one', () => {
    expect(lootById('pizza')?.label).toBe('Pizza Slice');
    expect(lootById('nope')).toBeUndefined();
  });
});

describe('loot scatter (deterministic, bounded, resolvable)', () => {
  const stockable = ROOMS.filter((r) => !r.glb && r.kind !== 'grassbattle');

  it('stocks every procedural room with drops, none in a GLB level / battle frame', () => {
    expect(stockable.length).toBeGreaterThan(0);
    for (const r of stockable) expect(lootDropsForRoom(r).length, r.id).toBeGreaterThan(0);
    for (const r of ROOMS.filter((x) => x.glb || x.kind === 'grassbattle')) {
      expect(lootDropsForRoom(r), r.id).toEqual([]);
    }
  });

  it('is deterministic (same room → identical drops) and ids are unique + namespaced', () => {
    for (const r of stockable) {
      const a = lootDropsForRoom(r);
      const b = lootDropsForRoom(r);
      expect(b).toEqual(a);
      const ids = a.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const d of a) {
        expect(d.id.startsWith(`${r.id}::`)).toBe(true);
        expect(lootById(d.type), `${r.id} ${d.type}`).toBeDefined();
      }
    }
  });

  it('keeps every drop inside the camera clamp (never in a wall)', () => {
    for (const r of stockable) {
      for (const d of lootDropsForRoom(r)) {
        const [x, , z] = d.position;
        expect(Math.abs(x), `${d.id} x`).toBeLessThanOrEqual(r.dims.halfW - 1.4 + 1e-6);
        expect(Math.abs(z), `${d.id} z`).toBeLessThanOrEqual(r.dims.halfD - 1.4 + 1e-6);
      }
    }
  });

  it('resolves a drop id back to its drop; bogus ids → undefined', () => {
    const room = stockable[0];
    const first = lootDropsForRoom(room)[0];
    expect(lootDropById(first.id)).toEqual(first);
    expect(lootDropById(`${roomById(room.id).id}::99999`)).toBeUndefined();
    expect(lootDropById('garbage-no-separator')).toBeUndefined();
  });
});
