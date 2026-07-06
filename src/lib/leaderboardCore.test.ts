import { describe, it, expect } from 'vitest';
import {
  MAX_SCORE,
  RANKED_TOP,
  invKey,
  scorePath,
  parseScorePath,
  rankFor,
  windowAround,
  cleanInitials,
  validateSubmission,
  SCORE_PREFIX,
} from './leaderboardCore';

describe('leaderboard score-path encoding (race-free storage)', () => {
  it('round-trips score + initials through the pathname', () => {
    const path = scorePath(12345, 'ABC', 'k3j4l5');
    expect(path.startsWith(SCORE_PREFIX)).toBe(true);
    expect(parseScorePath(path)).toEqual({ initials: 'ABC', score: 12345 });
  });

  it('higher scores sort FIRST lexically (so a single list returns the top board)', () => {
    const scores = [10, 5000, 100, 999_999, 0];
    const paths = scores.map((s, i) => scorePath(s, 'AAA', `id${i}`));
    const recovered = [...paths]
      .sort() // lexical ascending == score descending, by construction
      .map((p) => parseScorePath(p)!.score);
    expect(recovered).toEqual([999_999, 5000, 100, 10, 0]);
  });

  it('invKey is fixed-width and inverted', () => {
    expect(invKey(MAX_SCORE)).toBe('00000000');
    expect(invKey(0)).toBe(String(MAX_SCORE).padStart(8, '0'));
    expect(invKey(10).length).toBe(invKey(999_999).length);
  });

  it('rejects malformed pathnames', () => {
    expect(parseScorePath('other/prefix/123-ABC-x.json')).toBeNull();
    expect(parseScorePath(`${SCORE_PREFIX}notanumber-ABC-x.json`)).toBeNull();
    expect(parseScorePath(`${SCORE_PREFIX}00012345-ab-x.json`)).toBeNull(); // bad initials
  });
});

describe('rankFor', () => {
  const board = [{ score: 100 }, { score: 90 }, { score: 90 }, { score: 50 }];
  it('is (# strictly greater) + 1, ties shared', () => {
    expect(rankFor(board, 100)).toBe(1);
    expect(rankFor(board, 90)).toBe(2); // both 90s rank 2
    expect(rankFor(board, 50)).toBe(4);
    expect(rankFor(board, 200)).toBe(1);
    expect(rankFor(board, 10)).toBe(5);
  });
  it('flags not-ranked when beyond the top cutoff', () => {
    const big = Array.from({ length: RANKED_TOP }, () => ({ score: 1000 }));
    expect(rankFor(big, 10) > RANKED_TOP).toBe(true); // rank RANKED_TOP+1 → not ranked
  });
});

describe('windowAround', () => {
  const board = [
    { initials: 'AAA', score: 100 },
    { initials: 'BBB', score: 90 },
    { initials: 'CCC', score: 90 },
    { initials: 'DDD', score: 50 },
    { initials: 'EEE', score: 20 },
  ];
  it('rank matches rankFor and the gap points to the next-higher entry', () => {
    const w = windowAround(board, 60, 5);
    expect(w.rank).toBe(rankFor(board, 60)); // 3 strictly above → rank 4
    expect(w.rank).toBe(4);
    expect(w.index).toBe(3);
    expect(w.gap).toBe(30); // the next-higher score is 90 → 90 - 60
  });
  it('gap is 0 at the top (nobody to climb toward)', () => {
    expect(windowAround(board, 100).gap).toBe(0); // ties the top → none strictly above
    expect(windowAround(board, 200).rank).toBe(1);
    expect(windowAround(board, 200).gap).toBe(0);
  });
  it('tags neighbors with their COMPETITION rank (ties shared, matching rankFor)', () => {
    const w = windowAround(board, 60, 1); // index 3, radius 1 → slice [2,4)
    expect(w.neighbors).toEqual([
      { rank: 2, initials: 'CCC', score: 90 }, // tied with BBB (90) → both #2, not ordinal #3
      { rank: 4, initials: 'DDD', score: 50 }, // two 90s above → #4 (1-2-2-4)
    ]);
  });
  it('gives EVERY tied neighbor the same rank (competition, never ordinal)', () => {
    const w = windowAround(board, 95, 5); // slots between 100 and the 90s
    const byScore = (s: number) => w.neighbors.filter((n) => n.score === s).map((n) => n.rank);
    expect(byScore(100)).toEqual([1]);
    expect(byScore(90)).toEqual([2, 2]); // both 90s share #2 — the bug was 2,3
    expect(byScore(50)).toEqual([4]); // ties above push it to #4, not #3
    expect(byScore(20)).toEqual([5]);
    // and each neighbor's rank equals rankFor for its own score (single source of truth)
    for (const n of w.neighbors) expect(n.rank).toBe(rankFor(board, n.score));
  });
  it('ranks an UNSTORED score below the whole board', () => {
    const w = windowAround(board, 10, 5);
    expect(w.rank).toBe(6); // all 5 above → rank 6
    expect(w.gap).toBe(10); // next-higher 20 → 20 - 10
    expect(w.neighbors.at(-1)).toEqual({ rank: 5, initials: 'EEE', score: 20 });
  });
});

describe('validateSubmission + cleanInitials', () => {
  it('cleans initials to 3 uppercase letters', () => {
    expect(cleanInitials('a1b2c3')).toBe('ABC');
    expect(cleanInitials('  zz ')).toBe('ZZ');
    expect(cleanInitials(null)).toBe('');
  });
  it('accepts a good submission', () => {
    expect(validateSubmission('abc', 1234)).toEqual({ ok: true, initials: 'ABC', score: 1234 });
  });
  it('rejects with DISTINCT reasons', () => {
    expect(validateSubmission('ab', 100)).toEqual({ ok: false, error: 'bad_initials' });
    expect(validateSubmission('ASS', 100)).toEqual({ ok: false, error: 'rejected' });
    expect(validateSubmission('ABC', 0)).toEqual({ ok: false, error: 'bad_score' });
    expect(validateSubmission('ABC', -5)).toEqual({ ok: false, error: 'bad_score' });
    expect(validateSubmission('ABC', MAX_SCORE + 1)).toEqual({ ok: false, error: 'bad_score' });
    expect(validateSubmission('ABC', Number.NaN)).toEqual({ ok: false, error: 'bad_score' });
  });
});
