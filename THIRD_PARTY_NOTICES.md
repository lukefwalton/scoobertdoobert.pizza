# Third-party notices

Third-party assets/code bundled into the **shipped** site (`public/` → `dist/`).
Luke has indicated these were obtained under wide/permissive terms; this file is
the checklist to **drop in the exact source URL + license + author** for each, so
the public repo carries proper attribution. Anything not yet filled in is marked
**TODO(license)**.

> Source `.glb` files live (unshipped) in `media/models/`; only the crunched
> derivatives under `public/models/` actually ship. The `media/models/README.md`
> manifest flags models that are clearly someone else's IP (e.g. Max & Ruby,
> FNAF/Fazbear, Shrek) — those are **reference-only and must not ship**.

## 3D models — `public/models/`

| shipped file | source `.glb` (in `media/models/`) | crunched | source URL | author | license |
|---|---|---|---|---|---|
| `liminal-other-space.glb` | `levels/liminal-other-space.glb` | 6.14 MB → 0.55 MB (gltf-transform: weld/simplify/prune/texture-compress/meshopt) | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `abandoned-pool.glb` | `levels/abandoned-pool.glb` | 51.7 MB → 5.2 MB (optimize: meshopt, 128px) — the deep level behind the loader | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `palm-tree.glb` | `props/palm-tree.glb` | 391 KB → 77 KB (optimize: meshopt, 128px) | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `arcade-cabinet.glb` | `props/arcade-cabinet.glb` | 4.01 MB → 110 KB (optimize: meshopt, 128px) | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `mobius-strip.glb` | `mobius/triple-twist-mobius-strip.glb` | 113 KB → 13 KB (optimize: meshopt, 128px) | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `greek-statue.glb` | `greek-vaporwave/greek-underwater-broken-statue.glb` | 9.98 MB → 361 KB (optimize: meshopt, 128px) | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `metro-tunnel.glb` | `levels/metro-tunnel.glb` | 46.4 MB → 1.42 MB (optimize: meshopt, 128px) — the tunnel deep below the wayside shrine | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `backrooms-vr.glb` | `levels/backrooms-vr.glb` | 19.8 MB → 0.83 MB (optimize: meshopt, 128px) — "End of the Line", the backrooms terminus of the metro tunnel | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `crt-tv.glb` | `crt-tvs/crt-tv-lowpoly.glb` | 101 KB → 25 KB (optimize: meshopt, 128px) | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `greek-doric-column.glb` | `greek-vaporwave/greek-doric-column.glb` | 1.6 MB → 154 KB (optimize: meshopt, 256px) — the Sunken Gallery colonnade | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `ionic-column.glb` | `greek-vaporwave/ionic-column.glb` | 2.24 MB → 260 KB (optimize: meshopt, 256px) — the Sunken Gallery colonnade | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `classical-greek-sculpture.glb` | `greek-vaporwave/classical-greek-sculpture.glb` | 2.77 MB → 514 KB (optimize: meshopt, 256px) — the Sunken Gallery centrepiece | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `greek-jar.glb` | `greek-vaporwave/greek-jar.glb` | 1.22 MB → 146 KB (optimize: meshopt, 256px) — Sunken Gallery dressing | **TODO(license)** | **TODO(license)** | **TODO(license)** |

## Minigames (arcade cabinets)

The arcade games are **original code and original art** — no third-party game
code or assets are bundled. They implement the *mechanics* (the public-domain
grammar) of classic arcade games, never any specific game's code, sprites, names,
or trade dress (no marks):

- **Crusteroids** (`src/components/Crusteroids.tsx`) — Asteroids mechanics.
- **Slice Breaker** (`src/components/SliceBreaker.tsx`) — Breakout mechanics.
- **Jazz Snake** (`src/components/JazzSnake.tsx`) — Snake mechanics.
- **Scoobert's Pizza Run** (`src/components/RunnerGame.tsx`) — endless-runner.

Each is a self-contained `<canvas>` + 2D context (no engine, no three.js); all
art is drawn procedurally in code, and all sound is synthesised through the
site's own audio engine. The classic mechanics they riff on are decades-old and
not themselves copyrightable; we deliberately took inspiration from MIT-licensed
reference implementations (e.g. Kidel/HTML5-JS-Games, dmcinnes/HTML5-Asteroids)
for *how the mechanics work*, but wrote our own files rather than vendoring code
— matching this repo's "copy technique in as our own files" rule.

## Tooling

- **gltf-transform** (`@gltf-transform/cli`, MIT) — used at author-time to crunch
  source models to PS1 fidelity. Dev dependency only; not shipped.

## How models are crunched

```
npx gltf-transform optimize \
  media/models/levels/<name>.glb \
  public/models/<name>.glb \
  --compress meshopt --texture-size 256
```

Then at runtime `GlbRoom` forces `NearestFilter` + no mipmaps on every texture
and vertex-snaps every material, so a downloaded environment matches the world's
PS1 look. Add a row above for each new model shipped, and fill in its license.
