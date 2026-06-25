// ───────────────────────────────────────────────────────────────────────────
// src/data/lyrics.ts — the WORDS, as data. Verbatim lyrics for the catalog tracks
// that have them, keyed by jukebox slug (the same slug music.ts / jukebox.ts use).
//
// Baked into lyrics.json from the songs' lukefwalton.com pages (a one-time extract,
// preserving every line + the author's own spellings) so this repo stays STANDALONE
// — it never reads the lfw repo at build or run time. These are Luke's OWN words
// (© Luke F. Walton dba Scoobert Doobert), licensed to this repo like the music.
//
// Surfaced two ways: the pause-menu "read the words" panel for whatever's playing,
// and the terminal `lyrics` command. Instrumentals + covers have no entry (by
// design — there are no words to show), so `hasLyrics` is the gate everywhere.
// ───────────────────────────────────────────────────────────────────────────
import data from './lyrics.json';

export type Lyric = {
  /** The track's display title (as published). */
  title: string;
  /** The one-line "what it's about" liftline (the song page's `meaning`), or null. */
  meaning: string | null;
  /** The full verbatim lyric, newline-separated. */
  lyrics: string;
};

export const LYRICS = data as Record<string, Lyric>;

/** Does this jukebox slug have words on file (vs. an instrumental / cover)? */
export const hasLyrics = (slug: string | null | undefined): slug is string =>
  !!slug && slug in LYRICS;

/** The lyric record for a slug, or undefined. */
export const lyricFor = (slug: string): Lyric | undefined => LYRICS[slug];

/** Every slug that has words, in a stable order (catalog/insertion order). */
export const songsWithLyrics = (): string[] => Object.keys(LYRICS);

/** Fuzzy-resolve a user query (a slug, slug prefix, or title substring) to a slug
 *  that has lyrics — for the forgiving terminal `lyrics <name>` command. */
export function findLyricSlug(query: string): string | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const slugs = songsWithLyrics();
  return (
    slugs.find((s) => s === q) ??
    slugs.find((s) => s.startsWith(q)) ??
    slugs.find((s) => s.replace(/-/g, ' ').includes(q) || LYRICS[s].title.toLowerCase().includes(q))
  );
}
