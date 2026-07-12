# Third-party notices

Third-party assets/code bundled into the **shipped** site (`public/` → `dist/`).
Every shipped `.glb` under `public/models/` must have an exact **source URL**,
**author**, and **license** in the table below. CI (`scripts/check-build.mjs`)
fails the build if any shipped model is missing a complete row — placeholders
like `TODO(license)` are not allowed.

> Source `.glb` files live (unshipped) in `media/models/`; only the crunched
> derivatives under `public/models/` actually ship. Early source downloads that
> depicted third-party characters (Max & Ruby, FNAF/Fazbear, Shrek, Chuck E.
> Cheese style) were **removed from the tree and rewritten out of `main`
> history on 2026-07-08**, before this repo went public — nothing on current
> `main` depicts someone else's characters. **Diligence note (2026-07-11):** a
> fresh unauthenticated clone confirms those four GLBs are absent from `main`
> tip and unreachable via `HEAD` ancestry, but **~116 closed GitHub PR tip refs
> still retain the binaries**. Until those PR refs are deleted / GC'd by GitHub,
> the purge is complete for `main` only, not repository-wide.

## 3D models — `public/models/`

| shipped file | source `.glb` (in `media/models/`) | crunched | source URL | author | license |
|---|---|---|---|---|---|
| `liminal-other-space.glb` | `levels/liminal-space-new.glb` | 1.06 MB → 54.1 KB (optimize: meshopt, 128px) — replaces the old unprovenanced `liminal-other-space.glb` source (removed 2026-07-08) | [liminal-space-1](https://sketchfab.com/3d-models/liminal-space-1-687e0c65c4654d89b1cd6d17eb428aee) | loghawk360 | CC Attribution |
| `abandoned-pool.glb` | `levels/liminal-spaces-poolroom.glb` | 1.44 MB → 51.88 KB (optimize: meshopt, 128px) — replaces the old unprovenanced 49MB `abandoned-pool.glb` source (superseded 2026-07-08) | [liminal-spaces-poolroom](https://sketchfab.com/3d-models/liminal-spaces-poolroom-7ae04483183a46aea8bd43583788a6be) | alex.andain.777 | CC Attribution |
| `palm-tree.glb` | `props/palm-tree.glb` | 391 KB → 77 KB (optimize: meshopt, 128px) | [palm-tree](https://sketchfab.com/3d-models/palm-tree-58cd53de211e4a97b6172c43b82aafca) | Arvid Klint | CC Attribution |
| `mobius-strip.glb` | `mobius/mobius-strip-pendant.glb` | 1.56 MB → 124.52 KB (optimize: meshopt, 128px) — replaces `mobius/triple-twist-mobius-strip.glb` (removed 2026-07-08: ShareAlike, can't ship — see CLAUDE.md licensing rule) | [mobius-strip-pendant](https://sketchfab.com/3d-models/mobius-strip-pendant-16637a26cc65482385e1975e5f69797c) | sc8di | CC Attribution |
| `greek-statue.glb` | `greek-vaporwave/greek-underwater-broken-statue.glb` | 9.98 MB → 361 KB (optimize: meshopt, 128px) | [greek-underwater-broken-statue-3](https://sketchfab.com/3d-models/greek-underwater-broken-statue-3-a48e8b1fc7bf4858a1cb6054eada7e7b) | assetfactory | Sketchfab Standard (Free) |
| `metro-tunnel.glb` | `levels/metro-tunnel.glb` | 46.4 MB → 1.42 MB (optimize: meshopt, 128px) — the tunnel deep below the wayside shrine | [metro-tunnel](https://sketchfab.com/3d-models/metro-tunnel-78d64477fc144b5292985f9661c1f64c) | Mahmoud-11223344 | Sketchfab Standard (Free) |
| `backrooms-vr.glb` | `levels/backrooms-vr.glb` | 19.8 MB → 0.83 MB (optimize: meshopt, 128px) — "End of the Line", the backrooms terminus of the metro tunnel | [backrooms-vr](https://sketchfab.com/3d-models/backrooms-vr-d9b98eca8d064d0eafcd7f5484bb61ed) | carlcapu9 | CC Attribution |
| `crt-tv.glb` | `crt-tvs/crt-tv-lowpoly.glb` | 101 KB → 25 KB (optimize: meshopt, 128px) | [crt-tv](https://sketchfab.com/3d-models/crt-tv-5f827ab96d184431a0179ceb7c463157) | SketchyBot | Sketchfab Standard (Free) |
| `greek-doric-column.glb` | `greek-vaporwave/greek-doric-column.glb` | 1.6 MB → 154 KB (optimize: meshopt, 256px) — the Sunken Gallery colonnade | [greek-doric-column](https://sketchfab.com/3d-models/greek-doric-column-d294f4a24b834f418c7d01daeb49c727) | ChrisCLP | CC Attribution |
| `ionic-column.glb` | `greek-vaporwave/ionic-column.glb` | 2.24 MB → 260 KB (optimize: meshopt, 256px) — the Sunken Gallery colonnade | [ionic-column](https://sketchfab.com/3d-models/ionic-column-2f01075ec52e4901a59d008f9256645b) | FOXYSCA | Sketchfab Standard (Free) |
| `classical-greek-sculpture.glb` | `greek-vaporwave/classical-greek-sculpture.glb` | 2.77 MB → 514 KB (optimize: meshopt, 256px) — the Sunken Gallery centrepiece | [classical-greek-sculpture](https://sketchfab.com/3d-models/classical-greek-sculpture-27110bb1a6b741789d30c565cf36e4c8) | Moltaz | CC Attribution |
| `greek-jar.glb` | `greek-vaporwave/greek-jar.glb` | 1.22 MB → 146 KB (optimize: meshopt, 256px) — Sunken Gallery dressing | [greek-jar](https://sketchfab.com/3d-models/greek-jar-f8d95e9ae0324e69b257a5e50adeca0e) | Davide Specchi | CC Attribution |

**Arcade cabinets are procedural** (`src/world/ArcadeCabinet.tsx`) — no third-party
cabinet GLB ships. Two candidates were tried and deleted:

- **2026-07-08:** a CC Attribution
  ["arcade-game-space-invaders"](https://sketchfab.com/3d-models/arcade-game-space-invaders-d3959de1a78747f58fb46915e111a265)
  model — its emissive/marquee texture was literal *Space Invaders* screen art,
  scoring chart, and wordmark (the CC license covers the scan, not Taito/Midway's
  IP baked into the texture).
- **2026-07-11:** Lluc Guardiolaa's
  ["arcade-cabinet"](https://sketchfab.com/3d-models/arcade-cabinet-122e641e25ee4fe9904fc79399d822b0)
  (synthwave-robot side art) — **CC-BY-NC**, which this site cannot ship
  (`docs/DESIGN.md`). Source + crunched binaries removed.

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
