import { describe, it, expect } from 'vitest';
import {
  QUESTS,
  questStatus,
  questsDone,
  completionPct,
  allQuestsDone,
  type Quest,
} from './quests';
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
  restoredSongs: [],
  knownSpells: [],
  spellSlotsGained: 0,
  spellSlotsSpent: 0,
  bestFortune: 0,
  lootTotals: {},
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
      'earn-luck': { secretsFound: ['shrine-clap'] },
      'draw-fortune': { secretsFound: ['omikuji-drawn'] },
      'unlock-radio': { secretsFound: ['jukebox-roll'] },
      'ride-slide': { secretsFound: ['garden-slide'] },
      'play-turtle': { secretsFound: ['turtle-stage'] },
      'find-locker-key': { itemsHeld: ['pool-locker-key'] },
      'find-closet-key': { itemsHeld: ['hall-closet-key'] },
      'collect-tapes': { itemsHeld: [...CASSETTE_IDS] },
      'beat-dice': { secretsFound: ['dice-monster'] },
      'clear-goblin': { secretsFound: ['grass-cleared'] },
      'dance-with-entity': { secretsFound: ['danced:deep-lurker'] },
      'reach-terminus': { visitedRooms: ['terminus'] },
      'saved-san-diego': { secretsFound: ['saved-san-diego'] },
    };
    for (const q of QUESTS) {
      const flip = flips[q.id];
      expect(flip, `test missing a flip for quest "${q.id}"`).toBeDefined();
      const p: Progress = { ...COLD, ...flip };
      expect((q as Quest).done(p), `${q.id} should be done after its flip`).toBe(true);
    }
  });

  it('questsDone counts completed objectives', () => {
    const p: Progress = { ...COLD, everEnteredWorld: true, secretsFound: ['jukebox-roll'] };
    expect(questsDone(p)).toBe(2);
  });

  it('a BONUS objective shows in the To-Do list but never counts toward completion', () => {
    const bonuses = QUESTS.filter((q) => q.bonus);
    expect(
      bonuses.length,
      'expected at least one bonus quest (the ARG, the fortune)',
    ).toBeGreaterThan(0);
    // Each bonus, done on its OWN, reads done in the list — but the scored count, the
    // %, and the finale gate all stay at zero (a bonus can't move the ★100% bar). We
    // satisfy every bonus via its flip so this holds however many bonuses exist.
    const bonusFlips: Record<string, Partial<Progress>> = {
      'saved-san-diego': { secretsFound: ['saved-san-diego'] },
      'draw-fortune': { secretsFound: ['omikuji-drawn'] },
    };
    for (const b of bonuses) {
      const flip = bonusFlips[b.id];
      expect(flip, `test missing a flip for bonus quest "${b.id}"`).toBeDefined();
      const p: Progress = { ...COLD, ...flip };
      expect(questStatus(p).find((q) => q.quest.id === b.id)?.done).toBe(true);
      expect(questsDone(p)).toBe(0);
      expect(completionPct(p)).toBe(0);
      expect(allQuestsDone(p)).toBe(false);
    }
  });

  it('the shrine/jukebox objectives ignore the coarse progress flags (the audit fix)', () => {
    const earnLuck = QUESTS.find((q) => q.id === 'earn-luck')!;
    const unlockRadio = QUESTS.find((q) => q.id === 'unlock-radio')!;
    // NEGATIVE: luck earned elsewhere (a tape / a dance) must NOT complete "Pay your
    // respects", and a tape that flips radioUnlocked must NOT complete "Tune the
    // radio" — the exact false-positives this fix removes.
    expect(earnLuck.done({ ...COLD, luckEarned: 5 })).toBe(false);
    expect(unlockRadio.done({ ...COLD, radioUnlocked: true })).toBe(false);
    // POSITIVE: they complete off the ritual secret set at the actual site.
    expect(earnLuck.done({ ...COLD, secretsFound: ['shrine-clap'] })).toBe(true);
    expect(unlockRadio.done({ ...COLD, secretsFound: ['jukebox-roll'] })).toBe(true);
  });
});
