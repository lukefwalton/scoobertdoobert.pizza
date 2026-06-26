// ───────────────────────────────────────────────────────────────────────────
// src/data/lyrics.ts — the WORDS, as data. Verbatim lyrics for the catalog tracks
// that have them, keyed by jukebox slug (the same slug music.ts / jukebox.ts use).
//
// lyrics.json holds ONLY the lyric text now; each track's title + one-line meaning
// come from songMeta.ts (the canonical per-song blurb source), combined here so the
// reader/terminal still get a full { title, meaning, lyrics }. Baked from the songs'
// lukefwalton.com pages (a one-time extract, every line + the author's own spellings
// preserved) so this repo stays STANDALONE — it never reads the lfw repo.
//
// These are Luke's OWN words (© Luke F. Walton dba Scoobert Doobert), licensed to
// this repo like the music. Surfaced two ways: the pause-menu "read the words" panel
// for whatever's playing, and the terminal `lyrics` command. Instrumentals + covers
// have no entry (no words to show), so `hasLyrics` is the gate everywhere.
// ───────────────────────────────────────────────────────────────────────────
import lyricsData from './lyrics.json';
import { songMeta } from './songMeta';

export type Lyric = {
  /** The track's display title (from songMeta). */
  title: string;
  /** The one-line "what it's about" (from songMeta), or null. */
  meaning: string | null;
  /** The full verbatim lyric, newline-separated. */
  lyrics: string;
};

// slug → verbatim lyric text (title + meaning are joined in from songMeta).
const LYRIC_TEXT = lyricsData as Record<string, string>;

/** The full lyric record for a slug (title + meaning + words), or undefined. */
export const lyricFor = (slug: string): Lyric | undefined => {
  const text = LYRIC_TEXT[slug];
  if (text === undefined) return undefined;
  const m = songMeta(slug);
  return { title: m?.title ?? slug, meaning: m?.meaning ?? null, lyrics: text };
};

/** Every slug that has words, in a stable order. */
export const songsWithLyrics = (): string[] => Object.keys(LYRIC_TEXT);

/** slug → full Lyric, for every track with words (the lyric reader's catalog). */
export const LYRICS: Record<string, Lyric> = Object.fromEntries(
  songsWithLyrics().map((s) => [s, lyricFor(s)!]),
);

/** Does this jukebox slug have words on file (vs. an instrumental / cover)? */
export const hasLyrics = (slug: string | null | undefined): slug is string =>
  !!slug && slug in LYRIC_TEXT;

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
