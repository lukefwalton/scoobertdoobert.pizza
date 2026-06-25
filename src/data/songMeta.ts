// ───────────────────────────────────────────────────────────────────────────
// src/data/songMeta.ts — the one-line liner notes for the catalog, as data. Keyed
// by jukebox slug: each track's `title`, its `meaning` (the "what it's about"
// liftline), and its `year`. Baked verbatim from the songs' lukefwalton.com pages
// (a one-time extract) so this repo stays STANDALONE.
//
// This is the CANONICAL per-song meaning source — the lyric reader (lyrics.ts), the
// pause-menu "now playing" subtitle, and the terminal `song` command all read it,
// so a track's blurb lives in exactly one place. Covers ALL catalog songs
// (instrumentals + covers too), where lyrics.json only covers ones with words.
// Luke's content (© Luke F. Walton dba Scoobert Doobert), like the music.
// ───────────────────────────────────────────────────────────────────────────
import data from './songMeta.json';

export type SongMeta = {
  /** Display title (as published). */
  title: string;
  /** The one-line "what it's about", or null. */
  meaning: string | null;
  /** Release year, or null. */
  year: number | null;
};

export const SONG_META = data as Record<string, SongMeta>;

/** The full meta record for a jukebox slug, or undefined. */
export const songMeta = (slug: string): SongMeta | undefined => SONG_META[slug];

/** The one-line meaning for a slug (null if none / unknown song). */
export const songMeaning = (slug: string): string | null => SONG_META[slug]?.meaning ?? null;

/** The published title for a slug (falls back to the slug itself). */
export const songTitle = (slug: string): string => SONG_META[slug]?.title ?? slug;
