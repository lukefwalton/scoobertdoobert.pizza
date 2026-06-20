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

See [`CLAUDE.md`](./CLAUDE.md) for the full spec, the PS1 hard constraints, the
phase tracker, and the Phase 2 plan.

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
- **Storefront copy / layout** → `src/pages/Storefront.tsx`.
- **The descent gag** → `src/components/Descent.tsx`.
- **The 3D world** → `src/world/` (`World.tsx` is the lazy entry; `ps1.ts` is the
  vertex-snap / affine / dither pipeline; `sim.ts` is the ported boids steering).
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

```
├── index.html            # Vite entry (NOT the old site — that's in legacy/)
├── src/                  # the app
│   ├── pages/            # Storefront, TextOnly, LinkArchive (prerendered routes)
│   ├── components/       # Descent, BootLog, WorldHud, OrderForm, MuteToggle, …
│   ├── world/            # three.js world: World, ps1 pipeline, boids sim
│   ├── data/             # links.ts, hotspots.ts, linkArchive.ts (single sources)
│   ├── state/            # zustand stores (audio, scene)
│   ├── audio/            # the Web Audio engine
│   └── styles/
├── public/               # shipped static assets
│   ├── audio/boot.wav    # degraded boot loop (the only audio that ships)
│   ├── press/            # OG image + inline period photos (web-sized)
│   ├── 1101.html         # the /1101 "save san diego" Twine ARG
│   └── PIZZA.png, cursor.cur, brand/ …
├── api/order.ts          # Vercel function: opt-in email capture → Vercel Blob
├── scripts/              # build/verify tooling (shoot*, make-boot-audio, resize-image)
├── links.md              # source of truth for the /links archive
├── legacy/               # the previous hand-built site (preserved, not built)
└── CLAUDE.md             # durable spec + phase tracker + post-Phase-1 notes
```

**Source media** (full-res photo archive, song masters) is intentionally kept
**out of the build** — only the degraded/web-sized derivatives under `public/`
ship. Large masters/originals should nest under a `media/` tree (e.g.
`media/masters/`, `media/photos/`) rather than living loose at the repo root.

## Self-verification (Playwright)

```bash
npm run build && npm run preview &   # serve dist/ on :4173
npm run shoot           # storefront desktop/mobile/text + JS-DISABLED parity
npm run shoot:world     # enters the world, asserts canvas mounts, hotspot + modal pause
npm run shoot:descent   # full order -> install gag -> lands in the world
npm run shoot:fallback  # mobile + reduced-motion skip 3D, Continue -> /text
```

Screenshots land in `.shots/` (gitignored). The `postbuild` step
(`scripts/check-build.mjs`) fails the build if `/` or `/text` lose their real
content.

## Hosting

**Production target: Vercel** (static). `npm run build` emits `dist/`; Vercel
auto-detects the Vite preset and manages the domain from its dashboard. The
repo's root `CNAME` is a vestigial GitHub Pages artifact — safe to delete once
DNS points at Vercel. (The build output no longer carries a `CNAME`.)

## Assets & licensing

The code and visuals are **original or procedurally generated** — the boids sim,
the water and PS1 shaders, the room geometry, and the textures (canvas-drawn). No
third-party code or art is vendored, and no proprietary marks (Nintendo, SGI,
Pizza Hut, Doom, Cosmo Player) are used — original parody only. The **boot music**
is a deliberately degraded bounce of Scoobert Doobert's **own** tracks (Luke's
copyright), so shipping the lo-fi loop is fine. The `legacy/` folder preserves the
previous hand-built site for reference; it is not part of the build.

If/when richer assets get added (the Phase 2 Doom/Freedoom shrine), they'll be
**CC0 or BSD** (e.g. Freedoom), logged in a `THIRD_PARTY_NOTICES.md` with
credits, and kept isolated behind a lazy route — never mixed into reusable code.

## Status

**Phase 1 is complete** (storefront fallback, descent gag, the PS1 beach-shop
world, hotspots + pause menu, mobile/reduced-motion fallback), plus post-Phase-1
additions: real degraded boot music ("Jolly Roger Bay"), press photos + OG image,
the `/links` archive, lazy/gated audio, and opt-in email capture. Phase 2 — the
liminal era-ladder "levels" (each with its own track), the Doom/Freedoom shrine,
and the PositionalAudio jukebox — is queued in `CLAUDE.md`.
