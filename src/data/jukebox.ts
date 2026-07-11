// ───────────────────────────────────────────────────────────────────────────
// src/data/jukebox.ts — the jukebox catalog, as data.
//
// Scoobert's own songs, rendered "kinda fucked up": each `source` master is
// bounced to a tape-warbled, 8-bit / 11 kHz loop at /audio/jukebox/<slug>.mp3 by
// scripts/make-jukebox-audio.mjs (wow + flutter + a dragged slow-down + hiss,
// then the 8-bit crush, then a low-bitrate MP3: small + lo-fi, no WAV). The
// jukebox room plays these in place of the ambient boot loop and cycles on a click.
//
// SINGLE SOURCE: the catalog lives in jukebox.catalog.json, both this module
// (slug + display title) and the render script (slug + source master) read it,
// so a slug can't drift between "what gets rendered" and "what the app asks
// for". `source` is a bare filename in media/masters/ OR a path under media/
// (e.g. "music/2023/mob/07 Underwater.mp3"). Add a song: add a row to the JSON,
// then re-run `node scripts/make-jukebox-audio.mjs`. Array order = cycle order.
//
// These are Luke's OWN tracks (his copyright), fine to ship degraded. Three-free
// so the HUD/store can import it.
// ───────────────────────────────────────────────────────────────────────────
import catalog from './jukebox.catalog.json';
import { ROOM_SONG_SLUGS } from './rooms';

export type JukeboxTrack = {
  /** Matches the rendered file at /audio/jukebox/<slug>.mp3. */
  slug: string;
  /** Shown on the jukebox's amber readout — keep it short, it's a tiny screen. */
  title: string;
};

// Open on "Information" (the JSON's first row, not the ambient boot loop) so
// stepping up to the jukebox swaps to a clearly different song — the machine
// feels alive. The `source` field (the master filename) is only the render
// script's concern; the app needs slug + title.
export const JUKEBOX_TRACKS: JukeboxTrack[] = (catalog as { slug: string; title: string }[]).map(
  ({ slug, title }) => ({ slug, title }),
);

/** The shipped lo-fi loop for a track slug. */
export const jukeboxTrackUrl = (slug: string): string => `/audio/jukebox/${slug}.mp3`;

/** The clean HI-FI variant (the restoration reward), same 18 s of the same
 *  master, rendered without the tape pass / hiss / crush (44.1 kHz stereo). */
export const hifiTrackUrl = (slug: string): string => `/audio/jukebox/hifi/${slug}.mp3`;

/** Is this url the hi-fi variant of a track? */
export const isHifiUrl = (url: string): boolean => url.startsWith('/audio/jukebox/hifi/');

/** The catalog slug behind either variant's url (null for boot/non-jukebox). */
export const slugForTrackUrl = (url: string | null): string | null => {
  if (!url) return null;
  const m = /^\/audio\/jukebox\/(?:hifi\/)?([^/]+)\.mp3$/.exec(url);
  return m ? m[1] : null;
};

/** Is this a "find it in its room" song (owned by some Room.song), vs an
 *  always-available seed track? */
export const isRoomSong = (slug: string): boolean => ROOM_SONG_SLUGS.has(slug);

/** The display title for a slug (for the "new song" announce); the slug itself
 *  if it somehow isn't in the catalog. */
export const jukeboxTitle = (slug: string): string =>
  JUKEBOX_TRACKS.find((t) => t.slug === slug)?.title ?? slug;

/** The tracks the JUKEBOX may show + cycle, given what the player has DISCOVERED:
 *  every seed (non-room) track, plus any room-song they've already found in its
 *  room. Room-songs stay HIDDEN until found ("exploration's reward is sound") — the
 *  reward for wandering into a room is that its track joins your jukebox forever.
 *  Catalog order is preserved. Only the jukebox UI is filtered; the engine's
 *  LOOP_OPTIONS / boot loop / Room.song override playback are untouched. */
export const visibleJukeboxTracks = (discovered: readonly string[]): JukeboxTrack[] => {
  const found = new Set(discovered);
  return JUKEBOX_TRACKS.filter((t) => !ROOM_SONG_SLUGS.has(t.slug) || found.has(t.slug));
};
