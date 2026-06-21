import { describe, it, expect } from 'vitest';
import { CulturesSim, noteToFreq } from './cultures';

describe('cultures noteToFreq', () => {
  it('matches the octave-4 reference and transposes by octave', () => {
    expect(noteToFreq('A', 4)).toBeCloseTo(440, 2);
    expect(noteToFreq('D', 3)).toBeCloseTo(146.83, 2);
  });
});

describe('CulturesSim', () => {
  it('seeds one cell per chord tone, each in-bounds with a real frequency', () => {
    const sim = new CulturesSim();
    expect(sim.cells).toHaveLength(5);
    for (const c of sim.cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(1);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThanOrEqual(1);
      expect(c.freq).toBeGreaterThan(0);
      expect(Number.isFinite(c.vx + c.vy)).toBe(true);
    }
  });

  it('keeps every cell on screen across a long run', () => {
    const sim = new CulturesSim();
    for (let i = 0; i < 600; i++) sim.step(1 / 60);
    for (const c of sim.cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(1);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeLessThanOrEqual(1);
      expect(Number.isFinite(c.vx + c.vy)).toBe(true);
    }
  });

  it('breeds a valid child note when two cells touch, then respects the cooldown', () => {
    const sim = new CulturesSim();
    // Force the D and F# cells onto the same spot — pair "D-F#" → child "A".
    sim.cells[0].x = sim.cells[1].x = 0.5;
    sim.cells[0].y = sim.cells[1].y = 0.5;
    const events = sim.step(1 / 60);
    const bred = events.find((e) => e.a === 0 && e.b === 1);
    expect(bred).toBeTruthy();
    expect(bred!.note).toBe('A');
    expect(bred!.freq).toBeGreaterThan(0);
    expect(bred!.pan).toBeGreaterThanOrEqual(-1);
    expect(bred!.pan).toBeLessThanOrEqual(1);

    // Immediately overlapping again must NOT re-fire that pair (cooldown holds).
    sim.cells[0].x = sim.cells[1].x = 0.5;
    sim.cells[0].y = sim.cells[1].y = 0.5;
    const again = sim.step(1 / 60).find((e) => e.a === 0 && e.b === 1);
    expect(again).toBeFalsy();
  });

  it('pulls cells toward the pointer when stirring', () => {
    const sim = new CulturesSim();
    sim.pointer = { x: 0.5, y: 0.5, active: true };
    const before = sim.cells.map((c) => Math.hypot(c.x - 0.5, c.y - 0.5));
    for (let i = 0; i < 120; i++) sim.step(1 / 60);
    const after = sim.cells.map((c) => Math.hypot(c.x - 0.5, c.y - 0.5));
    const avgBefore = before.reduce((s, d) => s + d, 0) / before.length;
    const avgAfter = after.reduce((s, d) => s + d, 0) / after.length;
    expect(avgAfter).toBeLessThan(avgBefore);
  });
});
