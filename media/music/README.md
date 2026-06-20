# media/music/ — the master catalog (NOT shipped)

The archive of Scoobert Doobert master recordings, **one folder per album/EP**
(`media/music/<album>/`). These are **Luke's own recordings (his copyright)** —
parody titles and all — so safe to keep and degrade, but **source, not
shipped**: only degraded/web-sized derivatives under `public/` are served.

- **`media/masters/`** (sibling) = the few tracks **wired into the site** (boot
  loop + per-layer themes). Same *songs* as the **KŌAN** LP below, but different
  bounces (verified: not byte-identical).
- **`media/sfx/`** (sibling) = sound effects (the owned sitar takes).

Convert WAVs → MP3 with `scripts/convert-music-to-mp3.sh` (defaults to this folder).

## The MÖBIUS arc

`mob` · `i` · `us` · **MOBIUS** — a four-album arc; the first three names run
together into **MÖBIUS** (the album motif threaded through the site). Two are
done so far. **`moonlight-beach`** is the earlier LP that *sets up* the arc (its
track 10 is the upside-down "möbius" gag). The capstone **MOBIUS** album isn't in
this archive yet — no folder until its files land.

> **Why album-keyed (not `year/album/`)?** The newly-added archive came with no
> release-year info, so grouping by album avoids guessing. Year lives in the
> table below. Give me the missing years and I can switch the tree to
> `media/music/<year>/<album>/` if you prefer.

## Albums

| folder | album | year | notes |
|---|---|---|---|
| `mob/` | MÖB | 2023 | MÖBIUS arc #1; was `newnewmusic/MP3 (1)` — Stories, MEMORY LAN, Sunlight, DMV, Aliens, … All I Need |
| `i/` | I | 2024 | MÖBIUS arc #2; was `newnewmusic/MP3s` — daydreaming, time with u, the cycle, … golden state of mind |
| `us/` | US | 2025 | MÖBIUS arc #3; singles incl. AFTER PARTY, PARTY, JAZZ FLUTE, LOL… — each in a per-song subfolder with master + instrumental |
| `moonlight-beach/` | Moonlight Beach (LP) | 2023 | sets up the MÖBIUS arc; track 10's title is the upside-down "möbius" gag |
| `koan/` | KŌAN (LP) | ? | the LP the site's themes come from — "Information", "Jolly Roger Bay (64)", "1101" |
| `big-hug/` | Big Hug (LP) | ? | |
| `little-hug/` | Little Hug (EP) | ? | |
| `friends-covering-friends/` | Friends Covering Friends (with Okudaxij) | ? | 2-track covers split |
| `finding-d/` | Finding $D | 2018 | `$` dropped from the folder name |
| `to-sleep/` | to sleep | 2019 | a setting of Hamlet's "to be or not to be" |
| `dragon-ball-sd/` | Dragon Ball SD | 2020 | |
| `masks-and-monsters/` | masks and monsters | 2020 | |

## Filenames sanitized (real titles preserved here)

`?` is illegal on Windows / in URLs, so it was stripped from the filename; the
real title is kept here.

| file | real title |
|---|---|
| `i/11 see you again.mp3` | `see you again?` |
| `i/14 where did the sun go.mp3` | `where did the sun go?` |
| `to-sleep/04 untitled.mp3` | `?` |
| `to-sleep/05 where did You set my love.mp3` | `where did You set my love?` |
| `to-sleep/06 to sleep.mp3` | `to sleep?` |
| `to-sleep/07 to journey.mp3` | `to journey?` |
| `to-sleep/08 is her's the better lot.mp3` | `is her's the better lot?` |
| `to-sleep/10 dad, are you o.k.mp3` | `dad, are you o.k.?` |

`moonlight-beach/Track 10_mobius_LP Ver.mp3` — the original title was stylized
**upside-down**: `spuǝ ʇᴉ ʍoɥ ʇoN` (reads "Not how it ends" — a möbius gag).

Everything else is the real title verbatim — apostrophes, parens, `!`, the `é`
in "Différance", the Japanese in KŌAN's "無門関", and joke titles like KŌAN's
"08 Slow Jam.wav (Stolen Off of Napster)" are all valid and left as-is.
