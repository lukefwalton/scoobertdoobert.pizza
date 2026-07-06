import { describe, it, expect } from 'vitest';
import { buildYouRows } from './youStrip';
import type { RankWindow } from './leaderboardCore';

// A window where the player would slot at rank 2 (between AAA 100 and BOB 90).
const win: RankWindow = {
  rank: 2,
  index: 1,
  gap: 10,
  neighbors: [
    { rank: 1, initials: 'AAA', score: 100 },
    { rank: 2, initials: 'BOB', score: 90 },
    { rank: 3, initials: 'CAT', score: 40 },
  ],
};

describe('buildYouRows', () => {
  it('splices the synthetic YOU row at score order', () => {
    const rows = buildYouRows(win, 70, '', false); // 70 sits between BOB 90 and CAT 40
    expect(rows.map((r) => r.initials)).toEqual(['AAA', 'BOB', 'YOU', 'CAT']);
    expect(rows.find((r) => r.self)).toMatchObject({ initials: 'YOU', score: 70, rank: 2 });
  });

  it('PREVIEW: never dedups — typed initials matching a real neighbor keep that row', () => {
    // Before signing, nothing is stored, so a typed 'BOB' at score 90 must NOT hide the
    // real BOB 90 neighbor (the collision the review flagged).
    const rows = buildYouRows(win, 90, 'BOB', false);
    const realBob = rows.filter((r) => !r.self && r.initials === 'BOB' && r.score === 90);
    expect(realBob).toHaveLength(1); // the real neighbor survives
    expect(rows.find((r) => r.self)).toMatchObject({ initials: 'YOU', score: 90 }); // preview self = "YOU"
  });

  it('POST-submit: drops the player’s own now-stored row so YOU is not duplicated', () => {
    // After submitting BOB 90, that row is on the board among the neighbors; the synthetic
    // YOU row replaces it (labelled with the signed initials), so BOB appears exactly once.
    const rows = buildYouRows(win, 90, 'BOB', true);
    const bob = rows.filter((r) => r.initials === 'BOB' && r.score === 90);
    expect(bob).toHaveLength(1);
    expect(bob[0].self).toBe(true); // the one BOB row is the highlighted YOU
  });

  it('POST-submit: a DIFFERENT player sharing initials+score is not lost', () => {
    // Two BOB 90 rows (the player + someone else): drop only ONE, keep the other — no
    // distinct neighbor vanishes.
    const twoBobs: RankWindow = {
      ...win,
      neighbors: [
        { rank: 1, initials: 'AAA', score: 100 },
        { rank: 2, initials: 'BOB', score: 90 },
        { rank: 2, initials: 'BOB', score: 90 },
      ],
    };
    const rows = buildYouRows(twoBobs, 90, 'BOB', true);
    const bobs = rows.filter((r) => r.initials === 'BOB' && r.score === 90);
    expect(bobs).toHaveLength(2); // one real neighbor + the synthetic self
    expect(bobs.filter((r) => r.self)).toHaveLength(1);
  });

  it('places YOU last when it is the lowest score, first when it is the highest', () => {
    expect(buildYouRows(win, 10, '', false).at(-1)).toMatchObject({ self: true }); // lowest → last
    expect(buildYouRows(win, 999, '', false)[0]).toMatchObject({ self: true }); // highest → first
  });
});
