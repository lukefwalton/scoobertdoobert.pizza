import { describe, it, expect } from 'vitest';
import { ROOMS } from './rooms';
import { LOOKABLES, lookablesForRoom, resolveLookablePos } from './lookables';

describe('lookables', () => {
  it('every room has at least one lookable (the one-per-room guarantee)', () => {
    const missing = ROOMS.filter((r) => lookablesForRoom(r.id).length === 0).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it('every lookable points at a real room', () => {
    const ids = new Set(ROOMS.map((r) => r.id));
    const orphans = LOOKABLES.filter((l) => !ids.has(l.room)).map((l) => l.id);
    expect(orphans).toEqual([]);
  });

  it('lookable ids are unique', () => {
    const ids = LOOKABLES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('stories stay terse (<= 160 chars) and non-empty', () => {
    const bad = LOOKABLES.filter((l) => !l.story.trim() || l.story.length > 160).map((l) => l.id);
    expect(bad).toEqual([]);
  });

  it('resolves a position that sits inside every room, off the floor', () => {
    for (const r of ROOMS) {
      for (const l of lookablesForRoom(r.id)) {
        const [x, y, z] = resolveLookablePos(l, r.dims);
        expect(Math.abs(x)).toBeLessThanOrEqual(r.dims.halfW);
        expect(Math.abs(z)).toBeLessThanOrEqual(r.dims.halfD);
        expect(y).toBeGreaterThan(0);
      }
    }
  });
});
