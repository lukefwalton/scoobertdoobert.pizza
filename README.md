# scoobertdoobert.pizza

A fake late-90s **Electronic Pizza Storefront** that comes alive, falls backward
through web eras, and drops you into a low-poly PS1/N64 world — a pizza shop off
the coast of San Diego that is secretly the archive of **Scoobert Doobert**, a
philosopher's solo music project.

> A pizza shop off the coast of San Diego.
> (It is actually a solo music project by a philosopher.)

## The idea

Silicon Graphics built the Nintendo 64's graphics chip and, on its "Silicon
Surf" site, advertised navigable 3D worlds in the browser via VRML in 1996. That
promise never really arrived. This site ships it ~30 years late, as a haunted
pizza CD-ROM: a deliberately ugly 1996 storefront that, when you try to order,
"requires" the **Calzone Player™** plug-in — and installing it descends you into
a real-time 3D pizza shop on the seafloor.

## Architecture — fallback first

The plain HTML storefront **is** the fallback layer, and everything else is
progressive enhancement layered on top:

- **Works with JavaScript disabled.** `/` and `/text` are real, prerendered,
  crawlable HTML documents (via `vite-react-ssg`). The initial bundle contains
  **zero three.js**.
- **Every destination is a real `<a href>`, always** — on the storefront, on
  `/text`, and in the in-world pause menu. A link that exists only as 3D
  geometry doesn't count.
- **All WebGL lazy-loads** behind the Calzone Player install gag (a dynamic
  `import()`), so the storefront stays instant.
- **2026 backend under the 1996 skin:** the front door looks like garbage HTML,
  but the JSON-LD (`WebSite` + `MusicGroup` + `Person`), Open Graph/Twitter
  meta, and per-route canonicals underneath are pristine.
- **Mobile / `prefers-reduced-motion`** skip the descent and 3D entirely and get
  the storefront + the flat `/text` list.

See [`CLAUDE.md`](./CLAUDE.md) for the rules + PS1 hard constraints,
[`docs/PHASES.md`](./docs/PHASES.md) for the roadmap + live status, and
[`docs/DESIGN.md`](./docs/DESIGN.md) for the vision + systems. [`STRUCTURE.md`](./STRUCTURE.md)
maps the repo.

## Run

```bash
npm install
npm run dev        # vite dev server
npm run build      # static prerender via vite-react-ssg -> dist/ (+ postbuild smoke check)
npm run preview    # serve the built dist/ on :4173
npm run typecheck  # tsc --noEmit
```

## Where things live

- **Add or change a destination link** → `src/data/links.ts`. Single source of
  truth for the storefront menu, `/text`, the pause menu, and the hotspots.
  Every `href` must be real; never `#`.
- **Add or move an in-world hotspot** → `src/data/hotspots.ts`. Each hotspot
  points at a `links.ts` id, so links stay single-source — adding one is a data
  edit, never scene code.
- **Add or change an era floor** → `src/data/floors.ts` (the `FLOORS` array) +
  a template in `src/floors/`. The descent through web history is data-driven;
  see "Adding an era floor" below.
- **Add or change a 3D room** → `src/data/rooms.ts` (the `ROOMS` graph) + a
  geometry component in `src/world/`. Rooms connect through 3D **doors**; the
  beach shop is just `ROOMS[0]`. See "The 3D world — rooms" below.
- **Storefront copy / layout** → `src/floors/PlainFloor.tsx` (floor 0); the `/`
  route (`src/pages/Storefront.tsx`) is a thin host around `<FloorView>`.
- **The Calzone install / transition** → `src/components/Descent.tsx` (fires from
  the machine room, the bottom floor).
- **The 3D world** → `src/world/` (`World.tsx` is the lazy entry + room
  dispatcher; `ps1.ts` is the vertex-snap / affine / dither pipeline; `sim.ts`
  is the ported boids steering; `Rat.tsx` is the single-agent guide).
- **In-world HUD / pause menu** → `src/components/WorldHud.tsx`.
- **The link archive** (`/links`) → `links.md` (repo root, single source) parsed
  by `src/data/linkArchive.ts` and rendered by `src/pages/LinkArchive.tsx`. A
  crawlable directory of every Scoobert link; SEO surface + period easter egg.
- **Boot music** → `public/audio/boot.wav`, a degraded 8-bit bounce built from a
  master by `scripts/make-boot-audio.mjs`. The engine
  (`src/audio/engine.ts`) lazy-loads + decodes it; the music toggle stays
  disabled until it's ready, and if it never loads there's simply no music (no
  synth fallback).

## Repository layout

A full map lives in [`STRUCTURE.md`](./STRUCTURE.md); the short version:

```
├── index.html            # Vite entry (the old hand-built site lives in git history)
├── src/                  # the app
│   ├── pages/            # Storefront, TextOnly, LinkArchive, About (prerendered routes)
│   ├── components/       # Descent, BootLog, WorldHud, OrderForm, MuteToggle, …
│   ├── floors/           # the era-floor descent scenes (+ doors)
│   ├── world/            # three.js world: World, rooms, ps1 pipeline, boids sim
│   ├── data/             # links.ts, hotspots.ts, floors.ts, rooms.ts (single sources)
│   ├── state/            # zustand stores (audio, scene)
│   ├── audio/            # the Web Audio engine
│   ├── lib/ · styles/
├── public/               # shipped static assets (served at /)
│   ├── audio/boot.wav    # degraded boot loop (the only audio that ships)
│   ├── press/            # OG image + inline period photos (web-sized)
│   ├── 1101.html         # the /1101 "save san diego" Twine ARG
│   └── PIZZA.png, cursor.cur, brand/ …
├── api/order.ts          # Vercel function: opt-in email capture → Vercel Blob
├── scripts/              # build/verify tooling (shoot:all + the shoot:* suite, make-*-audio, …)
├── media/                # SOURCE originals, NOT shipped (see media/README.md)
│   ├── masters/          # masters wired into the site (boot loop + layer themes)
│   ├── music/            # full master catalog, by year/album
│   ├── sfx/              # sound effects (owned sitar takes)
│   ├── models/           # all .glb source models, grouped by theme (+ IP flags)
│   ├── photos/           # full-res photo archive, grouped by shoot
│   └── brand/            # brand-logo source
├── links.md              # source of truth for the /links archive
├── fun/                  # placeholder for a separate repo, not yet wired in
├── docs/                 # PHASES.md (roadmap + status) · DESIGN.md (vision + systems)
├── STRUCTURE.md          # the repo map ("start here")
└── CLAUDE.md             # the rules/guardrails (the constitution)
```

**Source media** (full-res photo archive, song masters, raw `.glb` models) lives
under **`media/`** and is intentionally kept **out of the build** — only the
degraded/web-sized/optimized derivatives under `public/` ship. See
[`media/README.md`](./media/README.md), [`media/models/README.md`](./media/models/README.md)
(model manifest + licensing flags), and [`media/music/README.md`](./media/music/README.md).

## The descent — era floors

Going down is going forward in web time. The `/` route is a thin host around
`<FloorView>`, which renders `FLOORS[currentFloor]` by template; each floor is a
real, usable links page you leave through a **door** into the next era:

```
1996 storefront (plain) → 1999 (starburst) → 2000 (tableLayout) → SGI machine
room (machineRoom) → [Calzone install] → the 3D beach shop.
```

The descent is data-driven, mirroring `links.ts` / `hotspots.ts`.

**To add a floor:** add a `Floor` entry to `src/data/floors.ts` (its `links` are
`links.ts` ids, resolved via `resolveLinks`), and — if its look is new — add a
template component in `src/floors/` plus a `case` in `FloorView`. That's it; no
scene code. The rot transition (`FloorTransition`) and progressive audio decay
(`audio.bendToDepth`) come for free, deepening with `currentFloor`.

- **Doors** (`FloorDoor`) are the connective tissue (the same metaphor used for
  the 3D room exits later). `descend()` / `ascend()` live in the scene store.
- **The install** relocated to the machine room (the bottom floor): its button
  calls `requestInstall()`, which jumps `Descent` straight to the installer →
  boot log → world. `exitWorld()` rewinds to floor 0.
- **Mobile / reduced-motion:** the era floors are universal (responsive; the rot
  is instant under reduced-motion). The 3D world is the one feature they skip —
  the machine room's CRT live render isn't mounted and Install hands off to
  `/text` (`TEXT_ONLY_PATH`) instead of the 3D world.

## The 3D world — rooms

Past the install, the world is a **graph of rooms joined by 3D doors** — the same
"doors all the way down" metaphor as the era floors. The beach shop is just
`ROOMS[0]`:

```
beach shop ⇄ back hall ⇄ jukebox room
                  ⇕
            classified room   (hidden — the rat knocks it open)
```

`src/data/rooms.ts` is the single source: each `Room` has `dims`, a fog/light
`palette`, named `spawns`, and `doors` (each door carries its target room + the
spawn to arrive at). It's deliberately **three-free** (it imports plain numbers
from `src/world/dims.ts`, never `three`) so the store and HUD can read room data
without pulling three.js into the storefront bundle.

**To add a room:** add a `Room` to `ROOMS`, a geometry component in `src/world/`
(its own lights + dressing), and a `case` in `World.tsx`'s `RoomScene`. Wire a
door at each end (and the matching arrival spawn). No other scene code.

- **Doors** (`src/world/Doors.tsx`) are real 3D objects. Walk up (proximity) and
  press **E** or click → `goToRoom` → a black-wipe fade → the room swaps behind
  the black → the camera re-spawns. `transitioning` freezes input for the whole
  wipe. Fade timing is single-sourced (`ROOM_FADE_MS` → the `--room-fade-ms` CSS
  var). A `hidden` door doesn't render until revealed.
- **The rat** (`src/world/Rat.tsx`) is one steering agent: it leads you down the
  hall (seeks a point ahead) and flees if you crowd it. Come far enough and it
  knocks a blank panel — `revealSecret()` opens the hidden **classified** door.
- **The jukebox** is the music payoff: the loop (the site's own song) ducks by
  camera distance (`audio.setProximityGain`) so it swells as you approach. The
  drei `<PositionalAudio>` + real-catalog swap drops in at `JUKEBOX_POS` later.
- Everything else (FP controls, pause menu, the always-reachable links list)
  works in every room; the pause menu is the accessibility guarantee.

## Self-verification (Playwright)

```bash
npm run build
npm run shoot:all       # build once, run EVERY smoke against one preview server
# …or a single suite (each starts/expects its own preview on :4173):
npm run shoot           # storefront desktop/mobile/text + JS-DISABLED parity
npm run shoot:world     # enters the world, asserts canvas mounts, hotspot + modal pause, intro × dismiss
npm run shoot:descent   # storefront → 1999 → 2000 → machine room → install → world → exit; + mobile→/text
npm run shoot:rooms     # shop → hall (rat knocks the secret) → classified → jukebox; doors, wipes, audio duck
npm run shoot:fallback  # mobile + reduced-motion skip 3D, Continue -> /text + /about route
```

**`shoot:all` is the CI gate** (`.github/workflows/ci.yml`): it builds, starts
one `vite preview`, and runs every `shoot:*` script — **auto-discovered from
`package.json`**, so the rule is simply: *a `shoot` or `shoot:*` script is a smoke
suite and runs in CI; anything else under `scripts/` (e.g. `make-*`, `lib/`) is a
helper and isn't.* Add a new `shoot:<name>` script and it's covered automatically.
A failed suite is **retried once** (these are full-browser, frame-timed smokes on
a shared runner — a real regression still fails the retry; a one-off slow-runner
blip self-heals, and the retry is logged). The repeated GLB-loader entry +
hold-and-poll door-walk flows live once in `scripts/lib/smoke.mjs`.

Screenshots land in `.shots/` (gitignored). The `postbuild` step
(`scripts/check-build.mjs`) fails the build if `/` or `/text` lose their real
content.

## Hosting

**Production target: Vercel** (static). `npm run build` emits `dist/`; Vercel
auto-detects the Vite preset and manages the domain from its dashboard. The
repo's root `CNAME` is a vestigial GitHub Pages artifact — safe to delete once
DNS points at Vercel. (The build output no longer carries a `CNAME`.)

## Copyright & licensing

**Scoobert Doobert's creative content — the music, lyrics, words, copy,
biography, likeness, photographs, and artwork — is © Luke F. Walton dba Scoobert
Doobert, all rights reserved.** It is only *licensed to* this repository so the
site can display and play it; being in this repo never changes its copyright.
There is currently **no open-source license** on the repo (all rights reserved by
default), and any future code license would cover the **source code only**, never
the creative content. See [`LICENSE`](./LICENSE) for the full statement.

The code and visuals are **original or procedurally generated** — the boids sim,
the water and PS1 shaders, the room geometry, and the textures (canvas-drawn). No
third-party code or art is vendored, and no proprietary marks (Nintendo, SGI,
Pizza Hut, Doom, Cosmo Player) are used — original parody only. The **boot music**
is a deliberately degraded bounce of Scoobert Doobert's **own** tracks (Luke's
copyright), so shipping the lo-fi loop is fine. (The previous hand-built site was
removed from the tree; it's preserved in git history.)

If/when richer assets get added (the Phase 2 Doom/Freedoom shrine), they'll be
**CC0 or BSD** (e.g. Freedoom), logged in a `THIRD_PARTY_NOTICES.md` with
credits, and kept isolated behind a lazy route — never mixed into reusable code.

## Status

**Phases 1–3 are complete.** Phase 1: the dead-plain storefront fallback, the
descent gag, the PS1 beach-shop world, hotspots + pause menu, mobile/reduced-
motion fallback — plus real degraded boot music ("Jolly Roger Bay"), press
photos + OG image, the `/links` archive, lazy/gated audio, and opt-in email
capture. **Phase 2:** the data-driven era-floor descent — storefront → 1999
starburst → 2000 table-layout → SGI machine room (with a live CRT render of the
world) → the Calzone install → the 3D shop, all connected by doors. **Phase 3:**
the world grew from one room into a graph — beach shop ⇄ rat hall ⇄ jukebox room
(the loop ducks to the jukebox as you approach), with the boids-driven rat that
leads you down the hall and knocks open the one secret: a hidden classified file
room of rejected demos. 3D doors are the room exits.

Next (roadmap in `docs/PHASES.md`; vision in `docs/DESIGN.md`): **Phase 4** a
hidden terminal, **Phase 5** the `unease` dread conductor, then wiring up `fun/`.
Liminal / pool / backrooms level GLBs (`media/models/levels/`,
`media/models/greek-vaporwave/`) are staged for the levels below the shop.
