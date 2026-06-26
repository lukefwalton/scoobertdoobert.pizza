// Pure lose-condition predicates for the new cabinets, lifted out of their RAF
// loops so the SIGNATURE failure rules can be unit-tested deterministically (the
// games themselves are Playwright-smoked; these are the bits worth a fast, direct
// test, since lose-logic has been the regression-prone area). Tiny + dependency-free.

/** Burrito Belt LOCK-OUT: a piece locks with any cell above the top row (final
 *  board row < 0) → the belt is jammed immediately, rather than truncating the
 *  off-screen cells and continuing. `cells` are [row,col] offsets within the
 *  piece's n×n box; `row` is where that box's top-left sits in board rows. */
export function locksOut(cells: ReadonlyArray<readonly [number, number]>, row: number): boolean {
  return cells.some(([r]) => row + r < 0);
}

/** Pizza Radar FLOOR BREACH: any LIVE saucer has reached or passed the lose line
 *  (its y ≥ loseY) — checked right after a formation march step. */
export function breachesFloor(
  blips: ReadonlyArray<{ cy: number; alive: boolean }>,
  loseY: number,
): boolean {
  return blips.some((b) => b.alive && b.cy >= loseY);
}
