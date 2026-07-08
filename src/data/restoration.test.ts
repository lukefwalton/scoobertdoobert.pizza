import { describe, it, expect } from 'vitest';
import { MASTER_TAPES, isSongDiscovered, isSongRestored, restoredCount } from './restoration';
import { JUKEBOX_TRACKS, isRoomSong } from './jukebox';
import { ITEMS } from './items';
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

describe('the master tapes (items.ts master: true)', () => {
  it('every master tape carries a real catalog track', () => {
    expect(MASTER_TAPES.length).toBeGreaterThan(0);
    const slugs = new Set(JUKEBOX_TRACKS.map((t) => t.slug));
    for (const m of MASTER_TAPES) {
      expect(slugs.has(m.track), `${m.id} → unknown track "${m.track}"`).toBe(true);
    }
  });

  it('only track-carrying items may be masters (the type says so; the data agrees)', () => {
    for (const i of ITEMS) {
      if (i.master) expect(i.track, `${i.id} is master:true but has no track`).toBeTruthy();
    }
  });
});

describe('isSongDiscovered — seeds always, room-songs once found', () => {
  it('every seed (non-room) track is discovered cold', () => {
    for (const t of JUKEBOX_TRACKS) {
      if (!isRoomSong(t.slug)) expect(isSongDiscovered(COLD, t.slug)).toBe(true);
    }
  });

  it('a room-song is hidden cold, discovered once its room banked it', () => {
    const roomSong = JUKEBOX_TRACKS.find((t) => isRoomSong(t.slug))!;
    expect(isSongDiscovered(COLD, roomSong.slug)).toBe(false);
    expect(isSongDiscovered({ ...COLD, discoveredSongs: [roomSong.slug] }, roomSong.slug)).toBe(
      true,
    );
  });
});

describe('isSongRestored — bench rites OR a held master', () => {
  it('nothing is restored cold', () => {
    for (const t of JUKEBOX_TRACKS) expect(isSongRestored(COLD, t.slug)).toBe(false);
    expect(restoredCount(COLD)).toBe(0);
  });

  it('a bench rite restores its slug', () => {
    const p = { ...COLD, restoredSongs: ['information'] };
    expect(isSongRestored(p, 'information')).toBe(true);
    expect(restoredCount(p)).toBe(1);
  });

  it('holding a master tape IS the restoration (derived, retroactive)', () => {
    const m = MASTER_TAPES[0];
    const p = { ...COLD, itemsHeld: [m.id] };
    expect(isSongRestored(p, m.track)).toBe(true);
    expect(restoredCount(p)).toBe(1);
  });

  it('a bench rite + the same held master count ONCE', () => {
    const m = MASTER_TAPES[0];
    const p = { ...COLD, itemsHeld: [m.id], restoredSongs: [m.track] };
    expect(restoredCount(p)).toBe(1);
  });
});

describe('restored ⇒ discovered (the retroactive-master coherence rule)', () => {
  it('a held master discovers its room-song even if discoverSong never ran', () => {
    const roomSongMaster = MASTER_TAPES.find((m) => isRoomSong(m.track));
    expect(roomSongMaster, 'expected at least one master carrying a room-song').toBeTruthy();
    const p = { ...COLD, itemsHeld: [roomSongMaster!.id] };
    expect(isSongRestored(p, roomSongMaster!.track)).toBe(true);
    expect(isSongDiscovered(p, roomSongMaster!.track)).toBe(true); // never ??? under a HI-FI badge
  });
});
