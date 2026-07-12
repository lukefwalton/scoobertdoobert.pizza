# media/models/ — 3D source models (NOT shipped)

Raw `.glb` source models, grouped by what they're for. These are **unoptimized
source** downloads/scans. Nothing here is served directly: per the project
constraints you **crunch each model to PS1 fidelity** (`gltf-transform` →
vertex-snap-friendly, ≤128px `NearestFilter` textures, no mipmaps) and only the
**optimized derivative** lands in `public/models/` for shipping.

This file is the manifest: clean filename, the original filename it came from
(provenance), and notes. Group blurbs map to the roadmap in
[`../../docs/PHASES.md`](../../docs/PHASES.md) (asset direction in
[`../../docs/DESIGN.md`](../../docs/DESIGN.md)).

## ⚠️ Licensing — read before shipping anything

These are third-party downloads/scans. **Verify each model's individual license
and attribution before any public build**, and log credits in a
`THIRD_PARTY_NOTICES.md`. Earlier, a few source downloads depicted **other
people's intellectual property** (FNAF/Fazbear, Chuck E. Cheese, Shrek, Max &
Ruby); those were **removed from the tree and rewritten out of `main` history
on 2026-07-08**, before this repo went public — see the tombstones below and
the diligence note in `THIRD_PARTY_NOTICES.md` (old PR tip refs may still
retain the binaries until GC'd). Nothing on current `main` depicts a
third-party character.

This squares with CLAUDE.md's #1 non-negotiable ("No copyrighted assets, copy,
logos, or marks… original parody only"): keeping someone else's characters even
as private reference stopped being tenable once the repo was public.

---

## `mobius/` — Möbius-strip motif
Decorative motif threaded through the world to plug Luke's album *Mobius*.

| file | ← original | notes |
|---|---|---|
| `mobius-strip-pendant.glb` | `mobius_strip_pendant.glb` | **shipped** as `public/models/mobius-strip.glb`. CC Attribution — [sketchfab.com/3d-models/mobius-strip-pendant-16637a26cc65482385e1975e5f69797c](https://sketchfab.com/3d-models/mobius-strip-pendant-16637a26cc65482385e1975e5f69797c). See `THIRD_PARTY_NOTICES.md`. |
| `cinta-de-mobius.glb` | `cinta_de_mobius.glb` | unshipped candidate |
| `mobius-v12.glb` | `mobius_v12.glb` | unshipped candidate |
| `the-mobius-strip.glb` | `the_mobius_strip.glb` | unshipped candidate |
| `woven-mobius-strip.glb` | `woven_mobius_strip.glb` | unshipped candidate |

`triple-twist-mobius-strip.glb` (← `triple_twist_mobius_strip.glb`) was the
crunch source for the shipped `mobius-strip.glb` — **removed 2026-07-08**: its
license turned out to be **ShareAlike**, which this repo can't ship (ADDENDUM /
CLAUDE.md licensing rule). Replaced by `mobius-strip-pendant.glb` above, which
is properly CC Attribution.

## `greek-vaporwave/` — vaporwave-Greek statuary
For the **level below the shop** (Phase 3+). Columns, sculptures, lyre, jar,
mountains. (The previous hand-built site — including its Julius Caesar "bust" —
is preserved in git history, not the working tree. See `README.md`.)

| file | ← original | notes |
|---|---|---|
| `classical-greek-sculpture.glb` | `classical_greek_sculpture.glb` | shipped as `public/models/classical-greek-sculpture.glb`. CC Attribution, author **Moltaz** — [sketchfab.com/3d-models/classical-greek-sculpture-27110bb1a6b741789d30c565cf36e4c8](https://sketchfab.com/3d-models/classical-greek-sculpture-27110bb1a6b741789d30c565cf36e4c8) |
| `greek-column.glb` | `greek_column.glb` | unshipped. CC Attribution 4.0, author **Théo Lerbeil** — [sketchfab.com/3d-models/greek-column-45283d9f94e242ff89599e12b0500401](https://sketchfab.com/3d-models/greek-column-45283d9f94e242ff89599e12b0500401) |
| `greek-doric-column.glb` | `greek_doric_column.glb` | shipped as `public/models/greek-doric-column.glb`. CC Attribution — [sketchfab.com/3d-models/greek-doric-column-d294f4a24b834f418c7d01daeb49c727](https://sketchfab.com/3d-models/greek-doric-column-d294f4a24b834f418c7d01daeb49c727) |
| `ionic-column.glb` | `ionic_column.glb` | shipped as `public/models/ionic-column.glb`. Sketchfab Standard (Free), author **FOXYSCA** — [sketchfab.com/3d-models/ionic-column-2f01075ec52e4901a59d008f9256645b](https://sketchfab.com/3d-models/ionic-column-2f01075ec52e4901a59d008f9256645b) |
| `greek-jar.glb` | `greek_jar.glb` | shipped as `public/models/greek-jar.glb`. CC Attribution — [sketchfab.com/3d-models/greek-jar-f8d95e9ae0324e69b257a5e50adeca0e](https://sketchfab.com/3d-models/greek-jar-f8d95e9ae0324e69b257a5e50adeca0e) |
| `greek-lyre.glb` | `greek_lyre.glb` | ~8MB — optimize |
| `greek-sculpture-sofokles-vaporwave.glb` | `greek_sculpture_scan_-_sofokles_vaporwave.glb` | ~18MB scan — optimize. Unshipped. CC Attribution — [sketchfab.com/3d-models/greek-sculpture-scan-sofokles-vaporwave-32fd03fc110342598ae1da23e31afda4](https://sketchfab.com/3d-models/greek-sculpture-scan-sofokles-vaporwave-32fd03fc110342598ae1da23e31afda4) |
| `greek-underwater-broken-statue.glb` | `greek_underwater_broken_statue_3.glb` | ~10MB. Shipped as `public/models/greek-statue.glb`. Sketchfab Standard (Free) — [sketchfab.com/3d-models/greek-underwater-broken-statue-3-a48e8b1fc7bf4858a1cb6054eada7e7b](https://sketchfab.com/3d-models/greek-underwater-broken-statue-3-a48e8b1fc7bf4858a1cb6054eada7e7b) |
| `hades-head.glb` | `head_of_the_greek_god_hades.glb` | ~23MB scan — optimize |
| `vaporwave-mountains.glb` | `vaporwave_mountains.glb` | |

## `water/` — water & pool
Sea / pool surfaces. NB: the beach-shop water is currently **procedural**
(`src/world/Water.tsx`); these are alternates and feed the pool level.

| file | ← original |
|---|---|
| `plane-water-low.glb` | `plane_water_low.glb` |
| `water-wave-for-ar.glb` | `water_wave_for_ar.glb` |
| `kiddie-pool.glb` | `pool___kiddie.glb` |

## `props/` — set dressing
| file | ← original | notes |
|---|---|---|
| `palm-tree.glb` | `palm_tree.glb` | shipped as `public/models/palm-tree.glb`. CC Attribution — [sketchfab.com/3d-models/palm-tree-58cd53de211e4a97b6172c43b82aafca](https://sketchfab.com/3d-models/palm-tree-58cd53de211e4a97b6172c43b82aafca) |

`arcade-cabinet.glb` (← `arcade_cabinet.glb`, Lluc Guardiolaa, CC-BY-NC) was
**removed 2026-07-11**: NonCommercial can't ship on a public site, and in-world
cabinets are procedural now (`src/world/ArcadeCabinet.tsx`). See
`THIRD_PARTY_NOTICES.md`.
| `low-poly-fried-chicken-bucket.glb` | `low_poly_bucket_of_fried_chicken_psx_n64_style.glb` | |

## `doors/` — doors & exit signage
"Doors everywhere" — the connective tissue between floors and rooms. Numbered
simply (`door-1`…`door-10`); the **what it is** column keeps each one's original
identity so nothing's lost. Several distinct looks kept on purpose.

| file | ← original | what it is |
|---|---|---|
| `door-1.glb` | `door_wood.glb` | wooden |
| `door-2.glb` | `door_wooden_-_5mb.glb` | wooden |
| `door-3.glb` | `door__wooden_18_mb.glb` | wooden (heavy, ~7MB) |
| `door-4.glb` | `door_with_frame.glb` | with frame |
| `door-5.glb` | `door_handle_door_digital_door.glb` | digital / sci-fi |
| `door-6.glb` | `metal_door.glb` | metal |
| `door-7.glb` | `old_door.glb` | old |
| `door-8.glb` | `hospital_door.glb` | hospital |
| `door-9.glb` | `emergency_exit.glb` | emergency exit |
| `door-10.glb` | `fire_escape__exit_doors.glb` | fire-escape exit doors |
| `exit-sign.glb` | `simple_exit_sign.glb` | exit signage (not a door) |

## `crt-tvs/` — CRT televisions
For the SGI machine room (the live-render CRT; cf. `src/world/MiniWorldPreview.tsx`).
`crt-tv-lowpoly.glb` (~0.1MB) is already PS1-ready.

| file | ← original | notes |
|---|---|---|
| `crt-tv-lowpoly.glb` | `crt-tv.glb` | tiny / low-poly — ideal source. **Shipped** as `public/models/crt-tv.glb`. Sketchfab Standard (Free) — [sketchfab.com/3d-models/crt-tv-5f827ab96d184431a0179ceb7c463157](https://sketchfab.com/3d-models/crt-tv-5f827ab96d184431a0179ceb7c463157) |
| `crt-tv.glb` | `crt_tv.glb` | |
| `retro-crt-tv.glb` | `retro_crt_tv.glb` | |
| `magnavox-crt-tv.glb` | `magnavox_19_crt_tv_-_rr1938_w122.glb` | ~14MB — optimize |

## `animatronics/` — unshipped geometry scouts only
Third-party **character** scouts (FNAF/Fazbear, Chuck E. Cheese style, Shrek)
were **removed 2026-07-08** and purged from git history — never shippable, and
not something to expose in a public repo. Phase 5 dread uses original parody
geometry instead.

| file | ← original | notes |
|---|---|---|
| `roberta-animatronic.glb` | `roberta_animatronic_motion_ability.glb` | unshipped. CC Attribution, author **Nobilis the Palaeovespa** — [sketchfab.com/3d-models/roberta-animatronic-motion-ability-a18ff63416024f28bb8e307fc59b9c45](https://sketchfab.com/3d-models/roberta-animatronic-motion-ability-a18ff63416024f28bb8e307fc59b9c45). Original character (not someone else's IP); kept only as private mesh reference, never ships. |

## `levels/` — liminal / pool / backrooms environments
Full environments staged for the levels below the shop (Phase 3+): the pool
level + backrooms direction.

| file | ← original | notes |
|---|---|---|
| `liminal-space.glb` | `liminal_space.glb` | unshipped, provenance unconfirmed |
| `liminal-space-new.glb` | `liminal_space_new.glb` | **shipped** as `public/models/liminal-other-space.glb` (2026-07-08). CC Attribution — [sketchfab.com/3d-models/liminal-space-1-687e0c65c4654d89b1cd6d17eb428aee](https://sketchfab.com/3d-models/liminal-space-1-687e0c65c4654d89b1cd6d17eb428aee) |
| `liminal-spaces-poolroom.glb` | `liminal_spaces_poolroom.glb` | **shipped** as `public/models/abandoned-pool.glb` (2026-07-08) — a tiled swimming-pool room, replacing the old `abandoned-pool.glb` source below. CC Attribution — [sketchfab.com/3d-models/liminal-spaces-poolroom-7ae04483183a46aea8bd43583788a6be](https://sketchfab.com/3d-models/liminal-spaces-poolroom-7ae04483183a46aea8bd43583788a6be) |
| `dreamcore-liminal-space.glb` | `dreamcore_liminal_space.glb` | unshipped |
| `backrooms-vr.glb` | `backrooms_vr.glb` | ~19MB. Shipped as `public/models/backrooms-vr.glb`. CC Attribution — [sketchfab.com/3d-models/backrooms-vr-d9b98eca8d064d0eafcd7f5484bb61ed](https://sketchfab.com/3d-models/backrooms-vr-d9b98eca8d064d0eafcd7f5484bb61ed) |
| `metro-tunnel.glb` | `metro_tunnel.glb` | ~44MB — optimize. Shipped as `public/models/metro-tunnel.glb`. Sketchfab Standard (Free) — [sketchfab.com/3d-models/metro-tunnel-78d64477fc144b5292985f9661c1f64c](https://sketchfab.com/3d-models/metro-tunnel-78d64477fc144b5292985f9661c1f64c) |
| `abandoned-pool.glb` | `abandoned_pool.glb` | ~49MB — superseded, no longer the crunch source (see `liminal-spaces-poolroom.glb` above); kept unshipped as reference, provenance unconfirmed |
| `pool-6.glb` | `pool_6.glb` | ~46MB — optimize |
| `poolrooms.glb` | `poolrooms.glb` | |
| `poolrooms-alt.glb` | `poolrooms (1).glb` | distinct higher-detail variant (not a dup) |

`max-and-ruby-house.glb` (← `max_and_ruby_house.glb`) was **removed 2026-07-08**
and purged from git history — it's *Max & Ruby* (Nickelodeon) IP (flagged in
CLAUDE.md), never shippable, and not something to expose in a public repo.

`liminal-other-space.glb` (← `liminal_other_space.glb`) was **removed 2026-07-08**:
it was the crunch source for the shipped `liminal-other-space.glb`, but its
license/provenance couldn't be pinned down (Luke wasn't sure which of two
candidate Sketchfab listings it actually came from), so per the "unprovenanced
rips get dropped" policy it's gone rather than guessed-attributed. The shipped
file now comes from `liminal-space-new.glb` above.
