// Pure shard math for shoot:all's `--shard=i/N`, factored out of shoot-all.mjs so it's
// unit-testable WITHOUT running the suite. A bug here fails by SILENTLY SKIPPING suites
// (a false green — worse than a red test), so the partition is pinned in shard.test.mjs.

/** Parse an `i/N` shard spec → { shardIdx (0-based), shardCount }. Throws on a bad spec. */
export function parseShard(spec) {
  const parts = String(spec).split('/');
  const [i, n] = parts.map(Number);
  if (
    parts.length !== 2 ||
    !Number.isInteger(i) ||
    !Number.isInteger(n) ||
    i < 1 ||
    n < 1 ||
    i > n
  ) {
    throw new Error(`bad --shard "${spec}" (want i/N with 1 <= i <= N)`);
  }
  return { shardIdx: i - 1, shardCount: n };
}

/** The slice of `all` that belongs to shard `shardIdx` of `shardCount`, round-robin so
 *  cost (the heavy WebGL walk-smokes) spreads evenly across shards. */
export function selectShard(all, shardIdx, shardCount) {
  return all.filter((_, k) => k % shardCount === shardIdx);
}
