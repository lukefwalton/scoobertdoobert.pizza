import { describe, it, expect } from 'vitest';
import { locksOut, breachesFloor } from './arcadeRules';

// The two cabinets' signature lose rules, pinned deterministically (the RAF game
// loops route through exactly these predicates).

describe('locksOut — Burrito Belt lock-out (jam if a cell locks above row 0)', () => {
  // A T-piece's cells in its 3×3 box: [0,1] is the filled TOP-row cell.
  const T = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
  ] as const;

  it('jams when the piece locks at the spawn row (-1) — its top cell is above row 0', () => {
    expect(locksOut(T, -1)).toBe(true);
  });

  it('does NOT jam when every cell sits on the board (row 0+)', () => {
    expect(locksOut(T, 0)).toBe(false);
    expect(locksOut(T, 5)).toBe(false);
  });

  it('an I-piece (cells only in box row 1) at -1 lands on row 0 — not a lock-out', () => {
    const I = [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ] as const;
    expect(locksOut(I, -1)).toBe(false);
    expect(locksOut(I, -2)).toBe(true); // pushed one higher → its row-1 cells hit row -1
  });
});

describe('breachesFloor — Pizza Radar floor breach (live saucer reaches the lose line)', () => {
  const L = 100;

  it('is true when a LIVE saucer reaches or passes the lose line', () => {
    expect(breachesFloor([{ cy: 100, alive: true }], L)).toBe(true);
    expect(breachesFloor([{ cy: 130, alive: true }], L)).toBe(true);
  });

  it('ignores DEAD saucers, even past the line', () => {
    expect(breachesFloor([{ cy: 140, alive: false }], L)).toBe(false);
  });

  it('is false while every live saucer is still above the line', () => {
    expect(
      breachesFloor(
        [
          { cy: 40, alive: true },
          { cy: 99, alive: true },
        ],
        L,
      ),
    ).toBe(false);
  });

  it('is false for an empty / fully-cleared field', () => {
    expect(breachesFloor([], L)).toBe(false);
  });
});
