import { describe, it, expect } from 'vitest';
import { ratDialogue } from './dialogue';
import { QUESTS } from './quests';
import { CASSETTE_IDS } from './items';
import type { Progress } from '../state/progressStore';

const COLD: Progress = {
  visits: 1,
  everEnteredWorld: true,
  visitedRooms: ['shop'],
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
};

describe('ratDialogue', () => {
  it('always returns a non-empty greeting + a nudge', () => {
    const d = ratDialogue(COLD);
    expect(d.greeting.length).toBeGreaterThan(0);
    expect(d.nudge.length).toBeGreaterThan(0);
  });

  it('nudges toward the FIRST undone objective', () => {
    // Cold (in-world): enter-world is done, so the first undone is the next one.
    const firstUndone = QUESTS.find((q) => !q.done(COLD));
    expect(firstUndone).toBeDefined();
    expect(ratDialogue(COLD).nudge).toContain(firstUndone!.hint);
  });

  it('when everything is done, says there is nothing left to point at', () => {
    // Force every quest done by satisfying all the signals they read.
    const ALL: Progress = {
      ...COLD,
      luckEarned: 5,
      radioUnlocked: true,
      itemsHeld: ['pool-locker-key', 'hall-closet-key', ...CASSETTE_IDS],
      secretsFound: ['dice-monster', 'grass-cleared', 'danced:x'],
      visitedRooms: ['shop', 'terminus'],
    };
    expect(QUESTS.every((q) => q.done(ALL))).toBe(true);
    expect(ratDialogue(ALL).nudge).toMatch(/nothing left|enjoy it/i);
  });
});
