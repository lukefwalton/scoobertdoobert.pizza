import { describe, it, expect } from 'vitest';
import {
  rollLuckyD20,
  critLabel,
  critBanner,
  luckTag,
  CRIT_MULT,
  LUCK_PER_ADVANTAGE,
} from './luck-core';

// A seeded rng for the pure roll: each call returns the next value in the sequence
// (wrapping). Each seq(...) gets its own cursor, so tests don't bleed into each other.
const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length];
};

describe('luck-core: crit framing', () => {
  it('labels crits and nothing else', () => {
    expect(critLabel('nat20')).toBe('NAT 20');
    expect(critLabel('nat1')).toBe('CRIT FAIL');
    expect(critLabel(null)).toBeNull();
  });

  it('frames nat 20 with a STAR and nat 1 with a SKULL, so they can never drift', () => {
    expect(critBanner('nat20')).toBe('★ NAT 20 ★');
    expect(critBanner('nat1')).toBe('☠ CRIT FAIL ☠');
    expect(critBanner(null)).toBeNull();
  });

  it('the crit swing is 3×', () => expect(CRIT_MULT).toBe(3));
});

describe('luck-core: rollLuckyD20 (pure, seedable)', () => {
  it('with no luck, rolls a single plain d20 and spends nothing', () => {
    const r = rollLuckyD20(0, seq(0)); // 0 → face 1
    expect(r.face).toBe(1);
    expect(r.crit).toBe('nat1');
    expect(r.luckSpent).toBe(0);
  });

  it('with luck, rolls TWO dice and keeps the higher, spending one luck', () => {
    // first die 0.1 → face 3, second 0.95 → face 20; advantage keeps 20 (nat 20)
    const r = rollLuckyD20(1, seq(0.1, 0.95));
    expect(r.face).toBe(20);
    expect(r.crit).toBe('nat20');
    expect(r.luckSpent).toBe(LUCK_PER_ADVANTAGE);
  });

  it('under advantage the crit reads the KEPT face, not the discarded first die', () => {
    // First die rolls a 1 (a nat 1 if it stood), second rolls 13; advantage keeps 13,
    // so the crit must be null — the thrown-away first die does NOT crit-fail the roll.
    const r = rollLuckyD20(1, seq(0, 0.6));
    expect(r.face).toBe(13);
    expect(r.crit).toBeNull();
    expect(r.luckSpent).toBe(1);
  });

  it('every face lands in 1..20', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollLuckyD20(i % 2, Math.random);
      expect(r.face).toBeGreaterThanOrEqual(1);
      expect(r.face).toBeLessThanOrEqual(20);
    }
  });

  it('reports the natural die and flags `lucky` when advantage improved the roll', () => {
    // no luck: raw == face, never lucky.
    const plain = rollLuckyD20(0, seq(0.5)); // → 11
    expect(plain.raw).toBe(plain.face);
    expect(plain.lucky).toBe(false);
    // luck that moved it up (3 → 20): raw is the natural die, lucky is true.
    const tipped = rollLuckyD20(1, seq(0.1, 0.95));
    expect(tipped.raw).toBe(3);
    expect(tipped.face).toBe(20);
    expect(tipped.lucky).toBe(true);
  });
});

describe('luck-core: luckTag (the visible payoff)', () => {
  it('shows the natural → kept face only when luck actually tipped the roll', () => {
    expect(luckTag(rollLuckyD20(1, seq(0.1, 0.95)))).toBe(' · 🍀 luck tipped it (3→20)');
  });

  it('is empty for a plain roll, an untipped advantage roll, and undefined', () => {
    expect(luckTag(rollLuckyD20(0, seq(0.9)))).toBe(''); // no luck
    expect(luckTag(rollLuckyD20(1, seq(0.95, 0.1)))).toBe(''); // advantage, but the first die stood
    expect(luckTag(undefined)).toBe(''); // a forced/test roll with no luck info
  });
});
