# media/music/ — the master catalog (NOT shipped)

The fuller archive of Scoobert Doobert master recordings, organized by
`year/album/`. These are **Luke's own recordings (his copyright)** — parody
song titles and all — so they're safe to keep and degrade, but they are
**source, not shipped**: only degraded/web-sized derivatives under `public/`
ever get served (see `../README.md`).

- **`media/masters/`** (sibling) = the handful of masters actually **wired into
  the site** (the boot loop + the per-layer themes).
- **`media/music/`** (here) = the broader catalog these were drawn from.

Convert WAVs → MP3 with `scripts/convert-music-to-mp3.sh` (defaults to this
folder).

## Folders renamed for the filesystem (originals preserved here)

| folder | ← original | why |
|---|---|---|
| `2018/finding-d/` | `2018/Finding $D/` | `$` is shell-unsafe |
| `2020/dragon-ball-sd/` | `2020/dragon-ball-SD/` | case-normalized |

## Tracklists (real titles)

A few `2019/to-sleep` filenames had `?` (illegal on Windows / in URLs) stripped.
The **real titles** — that album is a setting of Hamlet's "To be or not to be" —
are kept here:

| file | real title |
|---|---|
| `04 untitled.mp3` | `?` |
| `05 where did You set my love.mp3` | `where did You set my love?` |
| `06 to sleep.mp3` | `to sleep?` |
| `07 to journey.mp3` | `to journey?` |
| `08 is her's the better lot.mp3` | `is her's the better lot?` |
| `10 dad, are you o.k.mp3` | `dad, are you o.k.?` |

Every other filename is the real title verbatim (apostrophes, parens, and the
`é` in "Différance" are valid and were left as-is).

## Albums

- **2018 — Finding $D** (10 tracks)
- **2019 — to sleep** (14 tracks)
- **2020 — Dragon Ball SD** (11 tracks)
- **2020 — masks and monsters** (18 tracks)
