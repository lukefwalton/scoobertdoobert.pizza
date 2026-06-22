import { describe, it, expect } from 'vitest';
import { rollLuckyD20, critLabel, CRIT_MULT, MAX_LUCK_PER_ROLL } from './luck';

// A tiny deterministic PRNG so the statistical test can't flake.
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('rollLuckyD20', () => {
  it('with no luck, rolls a single die in 1..20 and spends nothing', () => {
    expect(rollLuckyD20(0, () => 0)).toEqual({ face: 1, crit: 'nat1', luckSpent: 0 });
    expect(rollLuckyD20(0, () => 0.999)).toEqual({ face: 20, crit: 'nat20', luckSpent: 0 });
  });

  it('spends luck for advantage on a bad base roll and keeps the best die', () => {
    // base → 1 (bad), then two advantage rerolls → 11, then 20. Keeps 20.
    const seq = [0, 0.5, 0.95];
    let i = 0;
    const r = rollLuckyD20(2, () => seq[i++]);
    expect(r.face).toBe(20);
    expect(r.crit).toBe('nat20');
    expect(r.luckSpent).toBe(2);
  });

  it('does NOT spend luck on an already-good base roll', () => {
    // base → 15 (>= the help threshold), so no advantage even with luck banked.
    const r = rollLuckyD20(3, () => 0.7); // 1 + floor(0.7*20) = 15
    expect(r.face).toBe(15);
    expect(r.luckSpent).toBe(0);
  });

  it('never spends more than MAX_LUCK_PER_ROLL even with a big bank', () => {
    let calls = 0;
    const r = rollLuckyD20(99, () => {
      calls++;
      return 0; // every die is a 1
    });
    expect(r.luckSpent).toBe(MAX_LUCK_PER_ROLL);
    expect(calls).toBe(1 + MAX_LUCK_PER_ROLL); // base + the advantage dice
    expect(r.face).toBe(1);
    expect(r.crit).toBe('nat1');
  });

  it('luck raises the average roll (statistically)', () => {
    const N = 4000;
    const rng = seeded(12345);
    let lucky = 0;
    let plain = 0;
    for (let i = 0; i < N; i++) lucky += rollLuckyD20(3, rng).face;
    for (let i = 0; i < N; i++) plain += rollLuckyD20(0, rng).face;
    expect(lucky / N).toBeGreaterThan(plain / N + 1);
  });
});

describe('crit constants + labels', () => {
  it('exposes a 3x crit multiplier and readable labels', () => {
    expect(CRIT_MULT).toBe(3);
    expect(critLabel('nat20')).toBe('NAT 20');
    expect(critLabel('nat1')).toBe('CRIT FAIL');
    expect(critLabel(null)).toBeNull();
  });
});
