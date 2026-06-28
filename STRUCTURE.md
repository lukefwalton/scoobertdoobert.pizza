# Repository structure — start here

A map of the repo, grouped by purpose. For *what the project is*, read
[`README.md`](README.md); for the rules/guardrails read [`CLAUDE.md`](CLAUDE.md),
the roadmap + live status [`docs/PHASES.md`](docs/PHASES.md), and the vision +
systems [`docs/DESIGN.md`](docs/DESIGN.md). This file is just **where everything
lives and why**.

Everything sorts into four buckets:

1. **The app** — `src/`, `index.html`, `api/`
2. **Shipped assets** — `public/` (served as-is, URL-mapped)
3. **Source assets (NOT shipped)** — `media/` (heavy originals; only degraded
   derivatives ever reach `public/`)
4. **Config + docs + content** — root files

```
scoobertdoobert.pizza/
│
├── README.md              # what the project is + how to run it
├── CLAUDE.md              # the rules/guardrails (the constitution)
├── STRUCTURE.md           # ← you are here: the repo map
├── docs/                  # PHASES.md (roadmap + live status) · DESIGN.md (vision + systems)
├── links.md               # source of truth for the /links archive (?raw-imported)
│
├── index.html             # Vite entry (the live site; the old hand-built site is in git history)
├── package.json · tsconfig*.json · vite.config.ts · vercel.json · CNAME · .gitignore
│
├── src/                   # ── THE APP (Vite + React + TS + three.js) ──
│   ├── main.tsx · routes.tsx · vite-env.d.ts
│   ├── pages/             # routed, prerendered pages (Storefront, TextOnly, LinkArchive, About)
│   ├── components/        # shared UI (Descent, BootLog, WorldHud, OrderForm, MuteToggle, …)
│   ├── floors/            # the era-floor descent scenes (Plain→Starburst→Table→MachineRoom, doors)
│   ├── world/             # the three.js world: World, rooms, ps1 pipeline, boids sim, Rat, Doors
│   ├── data/              # SINGLE SOURCES: links.ts, hotspots.ts, floors.ts, rooms.ts, linkArchive.ts
│   ├── state/             # zustand stores (scene, audio, progress, score, dread, race, …)
│   ├── audio/             # Web Audio engine
│   ├── lib/               # pure helpers (luck, doorTravel, pickups, leaderboardCore, useDispose, testHooks, …)
│   └── styles/            # CSS
│
├── api/                   # Vercel serverless functions (order.ts — email opt-in; score.ts — leaderboard)
├── scripts/               # build + verify tooling (shoot:* Playwright smokes, make-*-audio, make-gifs, check-build; shared flows in scripts/lib/)
│
├── public/                # ── SHIPPED STATIC ASSETS (served at /) ──
│   ├── audio/             # boot.mp3 (boot loop) + jukebox/*.mp3 (degraded loops)
│   ├── models/            # PS1-crunched 3D GLBs (see THIRD_PARTY_NOTICES.md)
│   ├── gifs/              # our own GIF89a-encoded animated GIFs (+ static twins)
│   ├── textures/          # canvas/baked textures shipped for the world
│   ├── brand/             # logos used on the site
│   ├── press/             # OG card + inline period photos (web-sized)
│   ├── 1101.html           # ARG / Twine page (/savesandiego rewrites here, see vercel.json)
│   └── PIZZA.png · cursor.cur · logo-sd.jpg
│
└── media/                 # ── SOURCE ORIGINALS (NOT shipped) ── see media/README.md
│   ├── masters/           # the few masters wired into the site (boot loop + layer themes)
│   ├── music/             # full master catalog, by year/album    → media/music/README.md
│   ├── sfx/               # sound effects (owned sitar takes)
│   ├── models/            # all .glb source models by theme     → media/models/README.md
│   ├── photos/            # full-res photo archive, grouped by shoot
│   └── brand/             # brand-logo source (full set; public/brand/ ships only the used logo)
```

## "I want to… → go here"

| Task | Where |
|---|---|
| Add / change a destination link | `src/data/links.ts` |
| Add / move an in-world hotspot | `src/data/hotspots.ts` |
| Add / change an era floor | `src/data/floors.ts` + a template in `src/floors/` |
| Add / change a 3D room | `src/data/rooms/<wing>.ts` (data, split by region) + geometry in `src/world/`; types in `src/data/rooms/types.ts`, assembled by `src/data/rooms.ts` |
| Edit storefront copy/layout | `src/floors/PlainFloor.tsx` |
| Touch the Calzone install / descent | `src/components/Descent.tsx` |
| Add to the `/links` archive | `links.md` (root) |
| Add a 3D model | drop source in `media/models/<theme>/`, crunch to PS1, ship derivative in `public/models/` |
| Add/swap site audio | source in `media/`, ship the degraded derivative in `public/audio/` |

## Conventions (so it stays legible)

- **`media/` is source, `public/` is shipped.** Heavy originals never deploy;
  only their degraded/optimized derivatives under `public/` do.
- **Models:** kebab-case filenames, grouped by theme under `media/models/`. The
  manifest there records each file's original name + flags third-party **IP that
  must not ship**. Crunch to PS1 fidelity before shipping; derivatives go to
  `public/models/`.
- **Single sources of truth** live in `src/data/` (and `links.md` for the
  archive) — adding content is a data edit, not scene code.
- **The old hand-built site is frozen in git history**, not a `legacy/` dir in
  the tree — reference its assets (like the bust) from history by copy if needed.
