import { describe, it, expect } from 'vitest';
import { rollLuckyD20, critLabel, CRIT_MULT, LUCK_PER_ADVANTAGE } from './luck';

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
  it('with no luck, rolls a single plain die and spends nothing', () => {
    let calls = 0;
    const r = rollLuckyD20(0, () => {
      calls++;
      return 0;
    });
    // raw == face and lucky is false on a plain roll (luck never touched it).
    expect(r).toEqual({ face: 1, crit: 'nat1', luckSpent: 0, raw: 1, lucky: false });
    expect(calls).toBe(1); // exactly one die — no backend reroll without luck
    expect(rollLuckyD20(0, () => 0.999)).toEqual({
      face: 20,
      crit: 'nat20',
      luckSpent: 0,
      raw: 20,
      lucky: false,
    });
  });

  it('with luck, rolls with ADVANTAGE — two dice, keeps the higher — for one luck', () => {
    // first die → 1 (low), second (backend) die → 20. Advantage keeps the 20.
    const seq = [0, 0.999];
    let i = 0;
    const r = rollLuckyD20(3, () => seq[i++]);
    expect(r.face).toBe(20);
    expect(r.crit).toBe('nat20');
    expect(r.luckSpent).toBe(LUCK_PER_ADVANTAGE);
  });

  it('advantage keeps the higher even when the FIRST die was already the better one', () => {
    // first → 20, second → 2; still keeps 20 — and still pays the one luck (advantage
    // is committed before the dice land, exactly like declaring it at the table).
    const seq = [0.999, 0.05];
    let i = 0;
    const r = rollLuckyD20(1, () => seq[i++]);
    expect(r.face).toBe(20);
    expect(r.luckSpent).toBe(1);
    // The natural die already stood, so luck did NOT tip it — no payoff to show.
    expect(r.raw).toBe(20);
    expect(r.lucky).toBe(false);
  });

  it('flags `lucky` + reports the natural die only when advantage actually raised the roll', () => {
    // first → 3, second (backend) → 18; advantage keeps 18, and luck genuinely moved
    // it up off the 3, so this is the "🍀 luck tipped it (3→18)" payoff.
    const seq = [0.1, 0.85];
    let i = 0;
    const r = rollLuckyD20(1, () => seq[i++]);
    expect(r.face).toBe(18);
    expect(r.raw).toBe(3);
    expect(r.lucky).toBe(true);
  });

  it('spends at most one luck per roll, however big the bank, and rolls just two dice', () => {
    let calls = 0;
    const r = rollLuckyD20(99, () => {
      calls++;
      return 0; // every die is a 1
    });
    expect(r.luckSpent).toBe(LUCK_PER_ADVANTAGE);
    expect(calls).toBe(2); // advantage = exactly two dice, never more (not "super-advantage")
    expect(r.face).toBe(1);
    expect(r.crit).toBe('nat1'); // double 1s is still a crit fail
  });

  it('luck raises the average roll (statistically)', () => {
    const N = 4000;
    const rng = seeded(12345);
    let lucky = 0;
    let plain = 0;
    for (let i = 0; i < N; i++) lucky += rollLuckyD20(3, rng).face;
    for (let i = 0; i < N; i++) plain += rollLuckyD20(0, rng).face;
    expect(lucky / N).toBeGreaterThan(plain / N + 1); // advantage ≈ 13.8 vs plain ≈ 10.5
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
