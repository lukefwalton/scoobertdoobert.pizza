// ───────────────────────────────────────────────────────────────────────────
// src/data/jukebox.ts — the jukebox catalog, as data.
//
// Scoobert's own songs, rendered "kinda fucked up": each master in
// media/masters/ is bounced to a tape-warbled, 8-bit / 11 kHz loop at
// /audio/jukebox/<slug>.wav by scripts/make-jukebox-audio.mjs (wow + flutter +
// a dragged slow-down + hiss, then the 8-bit crush). The jukebox room plays
// these in place of the ambient boot loop and cycles to the next on a click.
//
// These are Luke's OWN tracks (his copyright) — fine to ship degraded. Add a
// song: drop its master in media/masters/, add it to TRACKS in the render
// script AND here (same slug), then re-run `node scripts/make-jukebox-audio.mjs`.
// Array order is the cycle order. Three-free so the HUD/store can import it.
// ───────────────────────────────────────────────────────────────────────────

export type JukeboxTrack = {
  /** Matches the rendered file at /audio/jukebox/<slug>.wav. */
  slug: string;
  /** Shown on the jukebox's amber readout — keep it short, it's a tiny screen. */
  title: string;
};

// Open on "Information" (not the ambient Jolly Roger Bay boot loop) so stepping
// up to the jukebox swaps to a clearly different song — the machine feels alive.
export const JUKEBOX_TRACKS: JukeboxTrack[] = [
  { slug: 'information', title: 'INFORMATION' },
  { slug: '1101', title: '1101' },
  { slug: 'best-day-ever', title: 'BEST DAY EVER' },
  { slug: 'jolly-roger-bay', title: 'JOLLY ROGER BAY' },
];

/** The shipped loop for a track slug. */
export const jukeboxTrackUrl = (slug: string): string => `/audio/jukebox/${slug}.wav`;
