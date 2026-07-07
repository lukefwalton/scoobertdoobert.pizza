import { describe, it, expect } from 'vitest';
import { fortuneForRoll, fortuneByRank, FORTUNES } from './omikuji';

describe('omikuji: fortuneForRoll', () => {
  it('pins the extremes to the crits (the BAD/GREAT swing always reads)', () => {
    // A nat 20 is always 大吉; a nat 1 is always 凶 — regardless of the raw face value
    // (advantage can land a crit on any nominal face path, so key off the crit).
    expect(fortuneForRoll(20, 'nat20').id).toBe('daikichi');
    expect(fortuneForRoll(1, 'nat1').id).toBe('kyo');
  });

  it('climbs the ladder with the face between the crits', () => {
    expect(fortuneForRoll(19, null).id).toBe('daikichi'); // 17..19
    expect(fortuneForRoll(14, null).id).toBe('kichi'); // 12..16
    expect(fortuneForRoll(10, null).id).toBe('chu'); // 8..11
    expect(fortuneForRoll(5, null).id).toBe('sue'); // 4..7
    expect(fortuneForRoll(2, null).id).toBe('kyo'); // 1..3
  });

  it('is total over every d20 face (a fortune for all of 1..20)', () => {
    for (let face = 1; face <= 20; face++) {
      const f = fortuneForRoll(face, null);
      expect(FORTUNES[f.id]).toBe(f); // returns a real, registered fortune
    }
  });

  it('only blessings pay out luck; the middling/bad draws cost nothing (taste-safe)', () => {
    expect(FORTUNES.daikichi.luck).toBeGreaterThan(0);
    expect(FORTUNES.kichi.luck).toBeGreaterThan(0);
    expect(FORTUNES.chu.luck).toBe(0);
    expect(FORTUNES.sue.luck).toBe(0);
    expect(FORTUNES.kyo.luck).toBe(0); // a curse never costs you luck — losing never hard-fails
  });

  it('ranks are 1..5 worst→best and round-trip through fortuneByRank (the trophy case)', () => {
    expect(FORTUNES.kyo.rank).toBe(1);
    expect(FORTUNES.daikichi.rank).toBe(5);
    for (const f of Object.values(FORTUNES)) expect(fortuneByRank(f.rank)).toBe(f);
    expect(fortuneByRank(0)).toBeNull(); // 0 = none drawn yet → no trophy slip
    expect(fortuneByRank(6)).toBeNull(); // out of range
  });
});
