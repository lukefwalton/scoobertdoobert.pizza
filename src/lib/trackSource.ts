// ───────────────────────────────────────────────────────────────────────────
// src/lib/trackSource.ts — WHICH file a track plays: lo-fi, or the restored hi-fi.
//
// THE one restored-aware chooser. Every "play this catalog slug" call site
// (jukebox dial, Room.song, cassette pickups, the cues, album dives) resolves
// its url here, so a restored track plays its clean variant EVERYWHERE without
// each caller re-implementing the check. Lives in lib (not data/) because it
// reads the live progress store — data/jukebox.ts stays pure.
// ───────────────────────────────────────────────────────────────────────────
import { hifiTrackUrl, jukeboxTrackUrl } from '../data/jukebox';
import { CUES, type CueName } from '../data/music';
import { isSongRestored } from '../data/restoration';
import { useProgressStore } from '../state/progressStore';

/** The url this slug should play RIGHT NOW: hi-fi once restored, else lo-fi. */
export function playbackUrlFor(slug: string): string {
  return isSongRestored(useProgressStore.getState(), slug)
    ? hifiTrackUrl(slug)
    : jukeboxTrackUrl(slug);
}

/** Restored-aware url for a named cue (data/music CUES). */
export function cuePlaybackUrl(cue: CueName): string {
  return playbackUrlFor(CUES[cue]);
}
