import { describe, it, expect } from 'vitest';
import { parseShard, selectShard } from './lib/shard.mjs';

// The shard split decides which smokes CI runs. A bug here doesn't go red — it SILENTLY
// SKIPS suites and still passes (a false green), so pin the two properties that matter:
// the shards COVER every suite and never OVERLAP.
describe('shoot:all sharding', () => {
  it('parses a valid i/N spec to a 0-based index + count', () => {
    expect(parseShard('1/4')).toEqual({ shardIdx: 0, shardCount: 4 });
    expect(parseShard('4/4')).toEqual({ shardIdx: 3, shardCount: 4 });
    expect(parseShard('1/1')).toEqual({ shardIdx: 0, shardCount: 1 });
  });

  it('rejects malformed / out-of-range specs', () => {
    for (const bad of ['0/4', '5/4', '1/0', 'a/4', '1', '2/1', '-1/3', '1/2/3', '1.5/4', '']) {
      expect(() => parseShard(bad), bad).toThrow();
    }
  });

  it('covers every suite exactly once (complete + disjoint) for N = 1..8', () => {
    const all = Array.from({ length: 60 }, (_, i) => `shoot:suite-${i}`);
    for (let n = 1; n <= 8; n++) {
      const seen = new Set();
      for (let i = 0; i < n; i++) {
        for (const s of selectShard(all, i, n)) {
          expect(seen.has(s), `${s} appeared in two shards (n=${n})`).toBe(false);
          seen.add(s);
        }
      }
      expect(seen.size, `missing suites at n=${n}`).toBe(all.length);
    }
  });

  it('a single shard (1/1) is the whole suite, in order', () => {
    const all = ['a', 'b', 'c', 'd'];
    expect(selectShard(all, 0, 1)).toEqual(all);
  });

  it('spreads adjacent (cost-similar) suites across different shards', () => {
    const all = Array.from({ length: 12 }, (_, i) => i);
    // Round-robin: neighbours k and k+1 never share a shard when n > 1.
    const shardOf = new Map();
    for (let i = 0; i < 4; i++) for (const k of selectShard(all, i, 4)) shardOf.set(k, i);
    for (let k = 0; k < all.length - 1; k++) {
      expect(shardOf.get(k)).not.toBe(shardOf.get(k + 1));
    }
  });
});
