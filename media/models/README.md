# media/models/ — 3D source models (NOT shipped)

Raw `.glb` source models, grouped by what they're for. These are **unoptimized
source** downloads/scans. Nothing here is served directly: per the project
constraints you **crunch each model to PS1 fidelity** (`gltf-transform` →
vertex-snap-friendly, ≤128px `NearestFilter` textures, no mipmaps) and only the
**optimized derivative** lands in `public/models/` for shipping.

This file is the manifest: clean filename, the original filename it came from
(provenance), and notes. Group blurbs map to the roadmap in
[`../../CLAUDE.md`](../../CLAUDE.md).

## ⚠️ Licensing — read before shipping anything

These are third-party downloads/scans. **Verify each model's individual license
and attribution before any public build**, and log credits in a
`THIRD_PARTY_NOTICES.md`. Several models depict **other people's intellectual
property** and must **not** ship in a public build — they're kept only as
private style reference / placeholders, to be replaced with original parody
assets. Those are marked **⚠️ IP** below.

This squares with CLAUDE.md's #1 non-negotiable ("No copyrighted assets, copy,
logos, or marks… original parody only"): keeping them as local reference is
fine; shipping them is not.

---

## `mobius/` — Möbius-strip motif
Decorative motif threaded through the world to plug Luke's album *Mobius*.

| file | ← original |
|---|---|
| `cinta-de-mobius.glb` | `cinta_de_mobius.glb` |
| `mobius-strip-pendant.glb` | `mobius_strip_pendant.glb` |
| `mobius-v12.glb` | `mobius_v12.glb` |
| `the-mobius-strip.glb` | `the_mobius_strip.glb` |
| `triple-twist-mobius-strip.glb` | `triple_twist_mobius_strip.glb` |
| `woven-mobius-strip.glb` | `woven_mobius_strip.glb` |

## `greek-vaporwave/` — vaporwave-Greek statuary
For the **level below the shop** (Phase 3+). Columns, sculptures, lyre, jar,
mountains. (The "bust" for the beach-shop counter is `legacy/julius_caesar.glb`,
left in place to keep the legacy snapshot intact.)

| file | ← original | notes |
|---|---|---|
| `classical-greek-sculpture.glb` | `classical_greek_sculpture.glb` | |
| `greek-column.glb` | `greek_column.glb` | |
| `greek-doric-column.glb` | `greek_doric_column.glb` | |
| `ionic-column.glb` | `ionic_column.glb` | |
| `greek-jar.glb` | `greek_jar.glb` | |
| `greek-lyre.glb` | `greek_lyre.glb` | ~8MB — optimize |
| `greek-sculpture-sofokles-vaporwave.glb` | `greek_sculpture_scan_-_sofokles_vaporwave.glb` | ~18MB scan — optimize |
| `greek-underwater-broken-statue.glb` | `greek_underwater_broken_statue_3.glb` | ~10MB |
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
| file | ← original |
|---|---|
| `arcade-cabinet.glb` | `arcade_cabinet.glb` |
| `palm-tree.glb` | `palm_tree.glb` |
| `low-poly-fried-chicken-bucket.glb` | `low_poly_bucket_of_fried_chicken_psx_n64_style.glb` |

## `doors/` — doors & exit signage
"Doors everywhere" — the connective tissue between floors and rooms. Multiple
looks kept on purpose (wooden / metal / hospital / emergency / digital).

| file | ← original |
|---|---|
| `door-wood.glb` | `door_wood.glb` |
| `door-wooden-5mb.glb` | `door_wooden_-_5mb.glb` |
| `door-wooden-18mb.glb` | `door__wooden_18_mb.glb` |
| `door-with-frame.glb` | `door_with_frame.glb` |
| `door-digital.glb` | `door_handle_door_digital_door.glb` |
| `metal-door.glb` | `metal_door.glb` |
| `hospital-door.glb` | `hospital_door.glb` |
| `old-door.glb` | `old_door.glb` |
| `emergency-exit.glb` | `emergency_exit.glb` |
| `fire-escape-exit-doors.glb` | `fire_escape__exit_doors.glb` |
| `simple-exit-sign.glb` | `simple_exit_sign.glb` |

## `crt-tvs/` — CRT televisions
For the SGI machine room (the live-render CRT; cf. `src/world/MiniWorldPreview.tsx`).
`crt-tv-lowpoly.glb` (~0.1MB) is already PS1-ready.

| file | ← original | notes |
|---|---|---|
| `crt-tv-lowpoly.glb` | `crt-tv.glb` | tiny / low-poly — ideal source |
| `crt-tv.glb` | `crt_tv.glb` | |
| `retro-crt-tv.glb` | `retro_crt_tv.glb` | |
| `magnavox-crt-tv.glb` | `magnavox_19_crt_tv_-_rr1938_w122.glb` | ~14MB — optimize |

## `animatronics/` — animatronic horror (Phase 5 dread)
For the lower / dread levels (the rat turns, the machine sees you). Surface
levels stay goofy; save these for depth.

| file | ← original | notes |
|---|---|---|
| `roberta-animatronic.glb` | `roberta_animatronic_motion_ability.glb` | verify provenance |
| `customizable-animatronics-fazbear.glb` | `customizable_animatronics__fazbear.glb` | **⚠️ IP** — "Fazbear" = *Five Nights at Freddy's*. Reference only; don't ship. |
| `springbonnie-chuck-e-cheese-style.glb` | `springbonnie_shelf_chucke._cheese_style.glb` | **⚠️ IP** — "Spring Bonnie" (FNAF) + "Chuck E. Cheese". Reference only. |
| `nightmare-shrek-animatronic.glb` | `nightmare_shrek_fan_made_animatronic.glb` | **⚠️ IP** — Shrek (DreamWorks), fan-made. ~37MB. Reference only. |

## `levels/` — liminal / pool / backrooms environments
Full environments staged for the levels below the shop (Phase 3+): the pool
level + backrooms direction.

| file | ← original | notes |
|---|---|---|
| `liminal-space.glb` | `liminal_space.glb` | |
| `liminal-other-space.glb` | `liminal_other_space.glb` | |
| `dreamcore-liminal-space.glb` | `dreamcore_liminal_space.glb` | |
| `backrooms-vr.glb` | `backrooms_vr.glb` | ~19MB |
| `metro-tunnel.glb` | `metro_tunnel.glb` | ~44MB — optimize |
| `abandoned-pool.glb` | `abandoned_pool.glb` | ~49MB — optimize |
| `pool-6.glb` | `pool_6.glb` | ~46MB — optimize |
| `poolrooms.glb` | `poolrooms.glb` | |
| `poolrooms-alt.glb` | `poolrooms (1).glb` | distinct higher-detail variant (not a dup) |
| `max-and-ruby-house.glb` | `max_and_ruby_house.glb` | **⚠️ IP** — *Max & Ruby* (Nickelodeon). Flagged in CLAUDE.md. Reference only; don't ship. |
