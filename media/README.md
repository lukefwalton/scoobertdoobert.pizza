# media/ — source originals (NOT shipped)

Heavy source material, kept out of the build. **Only web-sized / degraded
derivatives under `public/` are ever served.** If this tree gets heavy, consider
Git LFS — but originals don't belong in the deploy, only their derivatives.

| folder | what | ships as |
|---|---|---|
| `masters/` | the few song masters **wired into the site** (boot loop + per-layer themes) | `public/audio/boot.wav` (degraded 8-bit bounce via `scripts/make-boot-audio.mjs`) |
| `music/` | the **fuller master catalog**, one folder per album — see [`music/README.md`](music/README.md) | derivatives only |
| `sfx/` | **sound effects** (the owned sitar takes) | degraded derivatives only |
| `models/` | all **3D source models** (`.glb`), grouped by theme — see [`models/README.md`](models/README.md) | optimized → `public/models/` (crunch to PS1 first) |
| `photos/` | full-resolution **press/photo archive** | web-sized picks → `public/press/` |
| `brand/` | brand-logo source files | currently **byte-identical to `public/brand/`** — treat this as the source-of-record for re-exports |

## `masters/` — active masters
`Jolly Roger Bay (64)` = layer #1 / the world (the current `boot.wav`);
`Information` = down a layer; `1101` = the `/save-san-diego` ARG. These are the
same songs as the **KŌAN** LP in `music/koan/`, but different bounces.

## `photos/` — archive, grouped by shoot
Already grouped by shoot/source (provenance kept in the folder names, e.g.
`Shots from Tokyo`, `Edited Myles`, `Studio Close Ups`, `Mask 1`/`Mask 2`,
`For indiemono July 2025`, …). Individual filenames keep their original
credit/sequence strings (e.g. `credit_myles_pettengill_…`) on purpose — don't
rename them; the credit is the provenance.

## ⚠️ Licensing
`models/` contains third-party downloads, some depicting other people's IP —
**read [`models/README.md`](models/README.md) before shipping any model.** The
music is Luke's own recordings (his copyright).
