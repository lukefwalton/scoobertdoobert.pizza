# Music — how the songs live in the site

Everything about *which Scoobert song is heard where* is **data**. You should
never have to touch a 3D room or the audio engine to add a song or move one
around. This is the map.

## The pieces

| File | What it owns |
|---|---|
| `src/data/jukebox.catalog.json` | **The catalog.** One row per song: `{ slug, title, source }`. `source` is the master; `slug` is the shipped filename; `title` is the jukebox/switcher label. |
| `src/data/music.ts` | **The semantic layer.** The boot loop, the **CUES** (which song plays at each spot), and the switcher's `LOOP_OPTIONS`. Edit cues here. |
| `scripts/make-jukebox-audio.mjs` | Renders each catalog row → a degraded, tape-warbled, lo-fi **MP3** loop in `public/audio/jukebox/<slug>.mp3` **and** its clean **HI-FI** twin in `public/audio/jukebox/hifi/<slug>.mp3` (the restoration reward — 44.1 kHz stereo, no tape pass). `--hifi-only` renders just the hi-fi set (the lo-fi pass seeds random hiss, so re-running it churns shipped bytes). |
| `src/lib/trackSource.ts` | **The one restored-aware url chooser.** Every play site resolves a slug through `playbackUrlFor(slug)` / `cuePlaybackUrl(cue)` — a RESTORED track (bench rite or held master; `src/data/restoration.ts`) plays its hi-fi file everywhere, automatically. Never build a track url by hand. |
| `src/data/songMeta.json` | The liner notes: `{ title, meaning, year, album }` per slug — the Listening Room placards, `/catalog`, and the terminal read it. |
| `scripts/make-boot-audio.mjs` | Renders the single storefront/boot ambience → `public/audio/boot.mp3`. |
| `public/audio/**` | The shipped MP3s (only MP3 — no WAV in this repo). |

## Add a song to the jukebox

1. Put the master where the catalog can see it — a bare filename in
   `media/masters/`, **or** a path under `media/` (e.g.
   `music/2023/mob/07 Underwater.mp3`).
2. Add a row to `src/data/jukebox.catalog.json`:
   ```json
   { "slug": "underwater", "title": "UNDERWATER", "source": "music/2023/mob/07 Underwater.mp3" }
   ```
   - `slug` is the output filename + the id everything references. Lowercase, hyphenated, unique.
   - Array **order = the jukebox cycle order** and the switcher order.
3. Render it: `node scripts/make-jukebox-audio.mjs` (decodes in headless Chromium —
   no ffmpeg needed; preflights for missing masters / duplicate slugs). This
   writes BOTH bounces — the lo-fi loop and the `hifi/` twin.
4. Give it liner notes: a `src/data/songMeta.json` entry (`title` / `meaning` /
   `year` / `album` — the albums.json slug whose cover represents it, or null).
   `songMeta.test` fails the build until every catalog slug has one.
5. Done. The song now appears in the in-world **jukebox**, the d20 selector, the
   **pause-menu song switcher**, the **Listening Room** exhibit wall, and
   **/catalog** automatically. No code changes.

## Move a song (change what plays where)

The non-jukebox spots read **named cues** from `src/data/music.ts`. To change
what a spot plays, edit one slug:

```ts
export const CUES = {
  diceReward: 'best-day-ever',     // the dice-monster win stinger
  practiceDemo: 'jolly-roger-bay', // the sealed demo the practice game unlocks
  pokeSample: 'best-day-ever',     // the loop the Poke face-stretch instrument warps
};
```

A dev-mode guardrail warns if a cue points at a slug that isn't in the catalog,
so typos surface loudly instead of as silence in-world.

## The song switcher (the user shifting songs)

The **pause menu** (Esc, in the 3D world) has a `◀ ♪ NOW PLAYING ▶` control,
backed by `src/state/musicStore.ts`. It steps through `LOOP_OPTIONS` — the **boot
loop**, then the whole catalog — and swaps the world's loop voice live, from
anywhere. It's session-scoped: the boot loop is always the default on a fresh
visit. (The in-world jukebox cabinet is the diegetic version of the same idea.)

## Making the music *more* present — ideas that are now cheap

Because it's all data:

- **Per-zone ambience.** Add an optional `track` to a floor (`floors.ts`) or room
  (`rooms.ts`) and have the conductor swap the loop voice on entry — the descent
  would then walk the album. (The switcher + `musicStore.setIndex` already give
  you the swap primitive.)
- **Lyrics.** Drop a `lyrics` field on catalog rows (or a sibling JSON) and the
  jukebox readout / the sealed-demo reveal could scroll a line. (Luke has every
  lyric at lukefwalton.com.)
- **More cues.** Any new "play it here" spot is one line in `CUES`.

## The format rule

**No WAV in this repo.** The render scripts keep the 8-bit / 11 kHz tape crunch
and then compress to a small low-bitrate MP3 (`scripts/lib/mp3.mjs`). The engine
trims MP3 codec-delay silence at the loop points so loops stay seamless.
