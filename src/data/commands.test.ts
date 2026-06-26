import { describe, it, expect } from 'vitest';
import { lookupCommand } from './commands';
import type { Progress } from '../state/progressStore';

// The terminal's game-layer readouts (`luck`, `spells`) are pure functions of the
// progress snapshot the Terminal hands them — so they unit-test directly, no store.
const base: Progress = {
  visits: 0,
  everEnteredWorld: false,
  visitedRooms: [],
  secretsFound: [],
  maxFloor: 0,
  maxUnease: 0,
  clearedGames: [],
  arcadeHigh: 0,
  arcadeHighs: {},
  radioUnlocked: false,
  luckEarned: 0,
  luckSpent: 0,
  itemsHeld: [],
  discoveredSongs: [],
  knownSpells: [],
  spellSlotsGained: 0,
  spellSlotsSpent: 0,
};
const run = (name: string, over: Partial<Progress> = {}) =>
  lookupCommand(name)!
    .run({ args: [], history: [], progress: { ...base, ...over } })
    .output.join('\n');

describe('terminal `luck`', () => {
  it('reports banked luck = earned − spent and explains advantage when you have some', () => {
    const out = run('luck', { luckEarned: 5, luckSpent: 2 });
    expect(out).toContain('banked .............. 3');
    expect(out).toMatch(/second die/i); // explains the advantage mechanic
  });

  it('tells you how to earn it (shrine) when you have none', () => {
    const out = run('luck');
    expect(out).toContain('banked .............. 0');
    expect(out).toMatch(/shrine/i);
    expect(out).toMatch(/honest/i);
  });

  it('never shows negative luck even if spent exceeds earned (defensive)', () => {
    expect(run('luck', { luckEarned: 1, luckSpent: 9 })).toContain('banked .............. 0');
  });
});

describe('terminal `spells`', () => {
  it('shows an empty spellbook with no spells learned', () => {
    expect(run('spells')).toMatch(/empty/i);
  });

  it('lists learned spells with their cast key, cantrip/slot tag, and a slot readout', () => {
    const out = run('spells', {
      knownSpells: ['fireball', 'light'],
      spellSlotsGained: 3,
      spellSlotsSpent: 1,
    });
    expect(out).toContain('Fireball');
    expect(out).toContain('[f]');
    expect(out).toContain('Light');
    expect(out).toContain('[l]');
    expect(out).toContain('cantrip'); // Light is a cantrip
    expect(out).toContain('2/3'); // clamp(3 - 1) of MAX 3
  });

  it('ignores unknown spell ids without crashing', () => {
    const out = run('spells', { knownSpells: ['fireball', 'bogus-spell'] });
    expect(out).toContain('Fireball');
    expect(out).not.toContain('bogus-spell');
  });

  it('clamps the slot readout to the max', () => {
    expect(
      run('spells', { knownSpells: ['light'], spellSlotsGained: 99, spellSlotsSpent: 0 }),
    ).toContain('3/3');
  });
});

describe('terminal `roll`', () => {
  it('always rolls a d20 face in 1..20 (any luck)', () => {
    for (let i = 0; i < 300; i++) {
      const out = run('roll', { luckEarned: i % 4, luckSpent: 0 });
      const m = out.match(/d20 → (\d+)/);
      expect(m).toBeTruthy();
      const face = Number(m![1]);
      expect(face).toBeGreaterThanOrEqual(1);
      expect(face).toBeLessThanOrEqual(20);
    }
  });

  it('notes your luck as a free peek (nothing spent) when you have some', () => {
    const outs = Array.from({ length: 40 }, () => run('roll', { luckEarned: 3, luckSpent: 0 }));
    expect(outs.every((o) => /luck/i.test(o) && /nothing spent/i.test(o))).toBe(true);
  });

  it('does not invoke advantage when you have no luck', () => {
    const outs = Array.from({ length: 40 }, () => run('roll'));
    expect(outs.every((o) => !/second die/i.test(o))).toBe(true);
  });
});

describe('terminal: the new readouts are discoverable', () => {
  it('lists `luck`, `spells`, and `roll` in `help`', () => {
    const out = run('help');
    expect(out).toMatch(/\bluck\b/);
    expect(out).toMatch(/\bspells\b/);
    expect(out).toMatch(/\broll\b/);
  });
});
