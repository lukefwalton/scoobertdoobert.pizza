import { describe, it, expect } from 'vitest';
import { ChimesSim, noteToFreq, MIN_COUNT, MAX_COUNT } from './chimes';

describe('noteToFreq', () => {
  it('returns the octave-4 reference frequencies', () => {
    expect(noteToFreq('A', 4)).toBeCloseTo(440, 2);
    expect(noteToFreq('D', 4)).toBeCloseTo(293.66, 2);
  });

  it('halves an octave down and doubles an octave up', () => {
    expect(noteToFreq('A', 3)).toBeCloseTo(220, 2);
    expect(noteToFreq('A', 5)).toBeCloseTo(880, 2);
  });

  it('falls back to 440 for an unknown note', () => {
    expect(noteToFreq('Q', 4)).toBe(440);
  });
});

describe('ChimesSim', () => {
  it('builds the requested number of pendulums, clamped to range', () => {
    expect(new ChimesSim(12).pendulums).toHaveLength(12);
    expect(new ChimesSim(99).count).toBe(MAX_COUNT);
    expect(new ChimesSim(1).count).toBe(MIN_COUNT);
  });

  it('assigns ascending frequencies so higher pendulums are brighter', () => {
    const sim = new ChimesSim(12);
    const first = sim.pendulums[0].freq;
    const last = sim.pendulums[sim.count - 1].freq;
    expect(last).toBeGreaterThan(first);
    for (const p of sim.pendulums) expect(Number.isFinite(p.freq)).toBe(true);
  });

  it('produces strikes within a couple of seconds, all panned in [-1, 1]', () => {
    const sim = new ChimesSim(12);
    let total = 0;
    for (let i = 0; i < 120; i++) {
      for (const s of sim.step(1 / 60)) {
        total++;
        expect(s.pan).toBeGreaterThanOrEqual(-1);
        expect(s.pan).toBeLessThanOrEqual(1);
        expect(s.freq).toBeGreaterThan(0);
      }
    }
    expect(total).toBeGreaterThan(0);
  });

  it('is deterministic — identical stepping yields identical strikes', () => {
    const a = new ChimesSim(10);
    const b = new ChimesSim(10);
    const sigA: string[] = [];
    const sigB: string[] = [];
    for (let i = 0; i < 200; i++) {
      for (const s of a.step(1 / 60)) sigA.push(`${i}:${s.index}`);
      for (const s of b.step(1 / 60)) sigB.push(`${i}:${s.index}`);
    }
    expect(sigA.length).toBeGreaterThan(0);
    expect(sigA).toEqual(sigB);
  });

  it('emits nothing while frozen and decays the strike glow', () => {
    const sim = new ChimesSim(8);
    for (let i = 0; i < 60; i++) sim.step(1 / 60); // build up some flash
    sim.frozen = true;
    const before = Math.max(...sim.pendulums.map((p) => p.flash));
    let strikes = 0;
    for (let i = 0; i < 30; i++) strikes += sim.step(1 / 60).length;
    const after = Math.max(...sim.pendulums.map((p) => p.flash));
    expect(strikes).toBe(0);
    expect(after).toBeLessThanOrEqual(before);
  });

  it('reset re-launches every pendulum to full swing in phase', () => {
    const sim = new ChimesSim(8);
    for (let i = 0; i < 100; i++) sim.step(1 / 60);
    sim.reset();
    expect(sim.time).toBe(0);
    for (const p of sim.pendulums) expect(p.theta).toBeCloseTo(sim.swingAmp, 6);
  });
});
