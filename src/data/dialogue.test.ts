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
  pizzaPointsBest: 0,
  radioUnlocked: false,
  luckEarned: 0,
  luckSpent: 0,
  itemsHeld: [],
  discoveredSongs: [],
  knownSpells: [],
  spellSlotsGained: 0,
  spellSlotsSpent: 0,
  bestFortune: 0,
  lootTotals: {},
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

  it('shares a rat tidbit, deterministic by visit count (rotates on return)', () => {
    const d = ratDialogue(COLD);
    expect(d.tidbit.length).toBeGreaterThan(0);
    // Same visit count → same tidbit; a later visit → (eventually) a different one.
    expect(ratDialogue({ ...COLD, visits: 1 }).tidbit).toBe(d.tidbit);
    const laters = [2, 3, 4, 5, 6, 7, 8].map((v) => ratDialogue({ ...COLD, visits: v }).tidbit);
    expect(laters.some((t) => t !== d.tidbit)).toBe(true);
  });

  it('when everything is done, says there is nothing left to point at', () => {
    // Force every quest done by satisfying all the signals they read.
    const ALL: Progress = {
      ...COLD,
      luckEarned: 5,
      radioUnlocked: true,
      itemsHeld: ['pool-locker-key', 'hall-closet-key', ...CASSETTE_IDS],
      secretsFound: [
        'dice-monster',
        'grass-cleared',
        'danced:x',
        'garden-slide',
        'turtle-stage',
        'jump-unlocked',
        // earn-luck / unlock-radio now key off the ritual secrets, not luckEarned /
        // radioUnlocked, so the "everything done" fixture must include them too.
        'shrine-clap',
        'jukebox-roll',
        // the BONUS objectives (QUESTS.every needs them, though the rat's nudge
        // deliberately ignores bonus objectives — "nothing left" either way): the
        // 1101 ARG and the shrine fortune draw.
        'saved-san-diego',
        'omikuji-drawn',
      ],
      visitedRooms: ['shop', 'terminus'],
    };
    expect(QUESTS.every((q) => q.done(ALL))).toBe(true);
    expect(ratDialogue(ALL).nudge).toMatch(/nothing left|enjoy it/i);
  });
});
