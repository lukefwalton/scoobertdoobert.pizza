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
