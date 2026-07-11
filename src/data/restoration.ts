// ───────────────────────────────────────────────────────────────────────────
// src/data/restoration.ts — is a song discovered / restored? (pure, three-free)
//
// The DERIVED view of the audio museum's two per-track states, in the quests.ts
// philosophy: pure functions of a Progress snapshot, no store imports, no state
// of their own, so the terminal, the pause menu, the Listening Room, and the
// bench all agree by construction.
//
//  - DISCOVERED: seed (non-room) tracks are always discovered, the jukebox has
//    carried them from day one; `progressStore.discoveredSongs` only ever holds
//    room-songs (RoomMusic banks a find on entering the room that owns it).
//  - RESTORED: a bench rite at the control-room reel-to-reel banks the slug in
//    `progressStore.restoredSongs`, OR you simply hold the studio MASTER tape
//    (items.ts `master: true`). Holding the master IS the restoration: derived
//    from itemsHeld, so it's instant on pickup and retroactive for saves that
//    already carry one, with no migration (the progressStore no-migrations rule).
// ───────────────────────────────────────────────────────────────────────────
import { ITEMS } from './items';
import { JUKEBOX_TRACKS, isRoomSong } from './jukebox';
import type { Progress } from '../state/progressStore';

/** The studio master-tape items (items.ts `master: true`), id → track slug. */
export const MASTER_TAPES = ITEMS.filter((i) => i.master && i.track).map((i) => ({
  id: i.id,
  track: i.track as string,
}));

/** Does this track play its clean hi-fi variant? A bench rite banks it — or you
 *  hold its master tape (the master IS the restoration). */
export function isSongRestored(p: Progress, slug: string): boolean {
  return (
    p.restoredSongs.includes(slug) ||
    MASTER_TAPES.some((m) => m.track === slug && p.itemsHeld.includes(m.id))
  );
}

/** Has this track found the player yet? Seeds are always discovered; a room-song
 *  is discovered once its room banked it. RESTORED ⇒ DISCOVERED: pocketing a
 *  master also banks discoverSong going forward, but a save that held a master
 *  from BEFORE that side-effect existed must never read "???, not yet archived"
 *  under a HI-FI badge, so the derivation closes the loop itself. */
export function isSongDiscovered(p: Progress, slug: string): boolean {
  return !isRoomSong(slug) || p.discoveredSongs.includes(slug) || isSongRestored(p, slug);
}

/** How many catalog tracks play hi-fi (bench rites + held masters, deduped). */
export function restoredCount(p: Progress): number {
  return JUKEBOX_TRACKS.filter((t) => isSongRestored(p, t.slug)).length;
}
