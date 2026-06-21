// ───────────────────────────────────────────────────────────────────────────
// src/data/music.ts — MUSIC, as data. The ONE place that decides which Scoobert
// song is heard where.
//
// The jukebox catalog lives in jukebox.catalog.json (slug + title + master) and
// is loaded by jukebox.ts. THIS file is the semantic layer on top: the boot
// ambience, and the CUES that name which catalog song plays at each spot in the
// world. A collaborator makes the music more present by editing data HERE — never
// a hardcoded slug buried in a room component.
//
//   Add a song:   drop its master, add a row to jukebox.catalog.json, run
//                 `node scripts/make-jukebox-audio.mjs`. It joins the jukebox AND
//                 the pause-menu song switcher automatically.
//   Move a song:  change one slug in CUES below — that's the whole edit.
//
// See docs/MUSIC.md.
// ───────────────────────────────────────────────────────────────────────────
import { JUKEBOX_TRACKS, jukeboxTrackUrl, type JukeboxTrack } from './jukebox';

export { JUKEBOX_TRACKS, jukeboxTrackUrl };
export type { JukeboxTrack };

/** The ambient loop under the storefront + the world's default voice. Rendered
 *  separately to /audio/boot.mp3 from its own master (make-boot-audio.mjs) — it
 *  is NOT a catalog slug, so it's named here for the switcher's "Boot Loop" row. */
export const BOOT = { url: '/audio/boot.mp3', title: 'BOOT LOOP' } as const;

/** CUES — which catalog song plays at each non-jukebox spot. Every value is a
 *  jukebox slug. Change what's heard where by editing one line. */
export const CUES = {
  /** The dice-monster win stinger (DicePitRoom). */
  diceReward: 'best-day-ever',
  /** The sealed demo the practice-room sequence game unlocks (PracticeRoom). */
  practiceDemo: 'jolly-roger-bay',
  /** The source loop the Poke face-stretch instrument warps (FaceStretch). */
  pokeSample: 'best-day-ever',
} as const;
export type CueName = keyof typeof CUES;

/** The shipped MP3 url for a cue. */
export const cueUrl = (cue: CueName): string => jukeboxTrackUrl(CUES[cue]);

/** The LOOP_OPTIONS index for an actually-playing url (null/boot → 0). Lets the
 *  music store mirror the engine's real loop voice. */
export const loopIndexForUrl = (url: string | null): number => {
  if (!url) return 0;
  const i = JUKEBOX_TRACKS.findIndex((t) => jukeboxTrackUrl(t.slug) === url);
  return i >= 0 ? i + 1 : 0; // +1: LOOP_OPTIONS[0] is the boot loop
};

/** The loop-voice options the pause-menu song switcher steps through: the boot
 *  loop, then the whole catalog (slug null = the boot loop). */
export type LoopOption = { slug: string | null; title: string };
export const LOOP_OPTIONS: LoopOption[] = [
  { slug: null, title: BOOT.title },
  ...JUKEBOX_TRACKS.map((t) => ({ slug: t.slug, title: t.title })),
];

// Dev guardrail: every cue must point at a real catalog slug, so a typo shows up
// loudly at the source instead of as silence in-world.
if (import.meta.env?.DEV) {
  const slugs = new Set(JUKEBOX_TRACKS.map((t) => t.slug));
  for (const [name, slug] of Object.entries(CUES)) {
    if (!slugs.has(slug)) console.warn(`[music] cue "${name}" → unknown slug "${slug}"`);
  }
}
