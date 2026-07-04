import { describe, it, expect } from 'vitest';
import { QUESTS, questStatus, questsDone, type Quest } from './quests';
import { CASSETTE_IDS } from './items';
import type { Progress } from '../state/progressStore';

// A cold/zero Progress — nothing done yet.
const COLD: Progress = {
  visits: 0,
  everEnteredWorld: false,
  visitedRooms: [],
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
};

describe('quests', () => {
  it('every quest is undone on a cold progress', () => {
    for (const { quest, done } of questStatus(COLD)) {
      expect(done, `${quest.id} should be undone when nothing is recorded`).toBe(false);
    }
    expect(questsDone(COLD)).toBe(0);
  });

  it('quest ids are unique and each has a label + hint', () => {
    const ids = new Set<string>();
    for (const q of QUESTS) {
      expect(ids.has(q.id), `duplicate quest id "${q.id}"`).toBe(false);
      ids.add(q.id);
      expect(q.label.length).toBeGreaterThan(0);
      expect(q.hint.length).toBeGreaterThan(0);
    }
  });

  it('each quest can be individually satisfied (its predicate keys off real progress)', () => {
    // Flip exactly the progress each quest reads and assert ONLY it (or at least it)
    // turns done — proves the predicate is wired to a real, reachable signal.
    const flips: Record<string, Partial<Progress>> = {
      'enter-world': { everEnteredWorld: true },
      'learn-jump': { secretsFound: ['jump-unlocked'] },
      'earn-luck': { luckEarned: 1 },
      'unlock-radio': { radioUnlocked: true },
      'ride-slide': { secretsFound: ['garden-slide'] },
      'play-turtle': { secretsFound: ['turtle-stage'] },
      'find-locker-key': { itemsHeld: ['pool-locker-key'] },
      'find-closet-key': { itemsHeld: ['hall-closet-key'] },
      'collect-tapes': { itemsHeld: [...CASSETTE_IDS] },
      'beat-dice': { secretsFound: ['dice-monster'] },
      'clear-goblin': { secretsFound: ['grass-cleared'] },
      'dance-with-entity': { secretsFound: ['danced:deep-lurker'] },
      'reach-terminus': { visitedRooms: ['terminus'] },
    };
    for (const q of QUESTS) {
      const flip = flips[q.id];
      expect(flip, `test missing a flip for quest "${q.id}"`).toBeDefined();
      const p: Progress = { ...COLD, ...flip };
      expect((q as Quest).done(p), `${q.id} should be done after its flip`).toBe(true);
    }
  });

  it('questsDone counts completed objectives', () => {
    const p: Progress = { ...COLD, everEnteredWorld: true, radioUnlocked: true };
    expect(questsDone(p)).toBe(2);
  });
});
