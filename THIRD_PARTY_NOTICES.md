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
| `liminal-other-space.glb` | `levels/liminal-space-new.glb` | 1.06 MB → 54.1 KB (optimize: meshopt, 128px) — replaces the old unprovenanced `liminal-other-space.glb` source (removed 2026-07-08) | [liminal-space-1](https://sketchfab.com/3d-models/liminal-space-1-687e0c65c4654d89b1cd6d17eb428aee) | Sketchfab (uploader per source page) | CC Attribution |
| `abandoned-pool.glb` | `levels/liminal-spaces-poolroom.glb` | 1.44 MB → 51.88 KB (optimize: meshopt, 128px) — replaces the old unprovenanced 49MB `abandoned-pool.glb` source (superseded 2026-07-08) | [liminal-spaces-poolroom](https://sketchfab.com/3d-models/liminal-spaces-poolroom-7ae04483183a46aea8bd43583788a6be) | Sketchfab (uploader per source page) | CC Attribution |
| `palm-tree.glb` | `props/palm-tree.glb` | 391 KB → 77 KB (optimize: meshopt, 128px) | [palm-tree](https://sketchfab.com/3d-models/palm-tree-58cd53de211e4a97b6172c43b82aafca) | Sketchfab (uploader per source page) | CC Attribution |
| `arcade-cabinet.glb` | `props/arcade-cabinet.glb` | 4.01 MB → 110.08 KB (optimize: meshopt, 128px) | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `mobius-strip.glb` | `mobius/mobius-strip-pendant.glb` | 1.56 MB → 124.52 KB (optimize: meshopt, 128px) — replaces `mobius/triple-twist-mobius-strip.glb` (removed 2026-07-08: ShareAlike, can't ship — see CLAUDE.md licensing rule) | [mobius-strip-pendant](https://sketchfab.com/3d-models/mobius-strip-pendant-16637a26cc65482385e1975e5f69797c) | Sketchfab (uploader per source page) | CC Attribution |
| `greek-statue.glb` | `greek-vaporwave/greek-underwater-broken-statue.glb` | 9.98 MB → 361 KB (optimize: meshopt, 128px) | [greek-underwater-broken-statue-3](https://sketchfab.com/3d-models/greek-underwater-broken-statue-3-a48e8b1fc7bf4858a1cb6054eada7e7b) | Sketchfab (uploader per source page) | Sketchfab Standard (Free) |
| `metro-tunnel.glb` | `levels/metro-tunnel.glb` | 46.4 MB → 1.42 MB (optimize: meshopt, 128px) — the tunnel deep below the wayside shrine | [metro-tunnel](https://sketchfab.com/3d-models/metro-tunnel-78d64477fc144b5292985f9661c1f64c) | Sketchfab (uploader per source page) | Sketchfab Standard (Free) |
| `backrooms-vr.glb` | `levels/backrooms-vr.glb` | 19.8 MB → 0.83 MB (optimize: meshopt, 128px) — "End of the Line", the backrooms terminus of the metro tunnel | [backrooms-vr](https://sketchfab.com/3d-models/backrooms-vr-d9b98eca8d064d0eafcd7f5484bb61ed) | Sketchfab (uploader per source page) | CC Attribution |
| `crt-tv.glb` | `crt-tvs/crt-tv-lowpoly.glb` | 101 KB → 25 KB (optimize: meshopt, 128px) | [crt-tv](https://sketchfab.com/3d-models/crt-tv-5f827ab96d184431a0179ceb7c463157) | Sketchfab (uploader per source page) | Sketchfab Standard (Free) |
| `greek-doric-column.glb` | `greek-vaporwave/greek-doric-column.glb` | 1.6 MB → 154 KB (optimize: meshopt, 256px) — the Sunken Gallery colonnade | [greek-doric-column](https://sketchfab.com/3d-models/greek-doric-column-d294f4a24b834f418c7d01daeb49c727) | Sketchfab (uploader per source page) | CC Attribution |
| `ionic-column.glb` | `greek-vaporwave/ionic-column.glb` | 2.24 MB → 260 KB (optimize: meshopt, 256px) — the Sunken Gallery colonnade | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `classical-greek-sculpture.glb` | `greek-vaporwave/classical-greek-sculpture.glb` | 2.77 MB → 514 KB (optimize: meshopt, 256px) — the Sunken Gallery centrepiece | **TODO(license)** | **TODO(license)** | **TODO(license)** |
| `greek-jar.glb` | `greek-vaporwave/greek-jar.glb` | 1.22 MB → 146 KB (optimize: meshopt, 256px) — Sunken Gallery dressing | [greek-jar](https://sketchfab.com/3d-models/greek-jar-f8d95e9ae0324e69b257a5e50adeca0e) | Sketchfab (uploader per source page) | CC Attribution |

**Rejected candidate (2026-07-08):** a CC Attribution ["arcade-game-space-invaders"](https://sketchfab.com/3d-models/arcade-game-space-invaders-d3959de1a78747f58fb46915e111a265)
model was tried as the `arcade-cabinet.glb` source, but its emissive/marquee
texture turned out to be literal *Space Invaders* screen art, scoring chart, and
wordmark — the CC license covers the scan, not Taito/Midway's IP baked into the
texture. Reverted to the original `props/arcade-cabinet.glb` source (still
unverified license, but a generic synthwave-robot design with no depicted
third-party IP). The rejected source is kept at
`media/models/props/arcade-cabinet-space-invaders.glb`, marked **⚠️ IP,
reference-only** — see `media/models/README.md`.

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
