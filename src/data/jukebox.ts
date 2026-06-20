// ───────────────────────────────────────────────────────────────────────────
// src/data/jukebox.ts — the jukebox catalog, as data.
//
// Scoobert's own songs, rendered "kinda fucked up": each master in
// media/masters/ is bounced to a tape-warbled, 8-bit / 11 kHz loop at
// /audio/jukebox/<slug>.wav by scripts/make-jukebox-audio.mjs (wow + flutter +
// a dragged slow-down + hiss, then the 8-bit crush). The jukebox room plays
// these in place of the ambient boot loop and cycles to the next on a click.
//
// SINGLE SOURCE: the catalog lives in jukebox.catalog.json — both this module
// (slug + display title) and the render script (slug + source master) read it,
// so a slug can't drift between "what gets rendered" and "what the app asks
// for". Add a song: drop its master in media/masters/, add a row to the JSON,
// then re-run `node scripts/make-jukebox-audio.mjs`. Array order = cycle order.
//
// These are Luke's OWN tracks (his copyright) — fine to ship degraded. Three-free
// so the HUD/store can import it.
// ───────────────────────────────────────────────────────────────────────────
import catalog from './jukebox.catalog.json';

export type JukeboxTrack = {
  /** Matches the rendered file at /audio/jukebox/<slug>.wav. */
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

/** The shipped loop for a track slug. */
export const jukeboxTrackUrl = (slug: string): string => `/audio/jukebox/${slug}.wav`;
