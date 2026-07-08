# Engineering standards — scoobertdoobert.pizza

Conventions a review (human or bot) should hold this repo to. The authoritative,
longer-form rules live in [`CLAUDE.md`](../CLAUDE.md) (the constitution),
[`docs/DESIGN.md`](../docs/DESIGN.md) (the vision), and
[`docs/PHASES.md`](../docs/PHASES.md) (status). This file is the checkable digest.

## Hard lines (never cross)

- **JS-off storefront is the fallback and must stay fully crawlable.** Every
  primary destination is a real `<a href>` to a real URL — never `#`, never a
  geometry-only link. `src/data/links.ts` is the single source; every `href` is
  real. **JS-off** always gets the plain page (no descent, no 3D). **Mobile** now
  runs the full descent + 3D world with on-screen touch controls
  (`src/components/TouchControls.tsx`; gated on `isTouchDevice()` = `pointer:
  coarse`). **`prefers-reduced-motion`** is the one hard gate, and it's an
  **opt-in**, not a redirect: an entry point raises the `MotionConsent` gate
  ("this has motion — enter anyway?") with the flat `/text` list as the safe
  default (`src/lib/motionConsent.ts`); motion stays softened inside the world.
  The hidden trap door stays hidden under reduced-motion (a surprise drop is
  motion). (Policy lifted 2026-07 per CLAUDE.md's Mobile policy — "make the whole
  thing work on mobile.")
- **No copyrighted assets, copy, logos, or marks.** Original parody only (no
  Nintendo/SGI/Domino's/etc.). Steal the grammar, never the artifact.
- **Content is All Rights Reserved.** Music, lyrics, prose, art, likeness under
  `media/`, `public/audio|press|brand/`, and site copy are © Luke F. Walton, only
  *licensed* to this repo. Any OSS license ever added covers **source code only** —
  never add a repo-wide `LICENSE` that could read as covering the content.
- **The PS1/N64 look is a hard constraint**, not a style: low-res render target +
  `image-rendering: pixelated`, vertex snapping, affine texture mapping, distance
  fog, flat/vertex lighting, ordered dither. Textures: `NearestFilter`, no mipmaps;
  **≤128px is the default grain** for image/photo textures, generated text atlases
  / FX canvases may go up to **512px** (the hard, tripwire-tested ceiling), bought-
  GLB crunch at 256px is sanctioned, and two deliberate `LinearFilter` exceptions
  stand (`CoverArt`, `FrutigerRoom`) — see CLAUDE.md's amended PS1 constraints
  (2026-07-07, Luke). This applies to bought GLBs too.
- **Lazy-load all WebGL** behind the install gag; the initial storefront bundle
  ships **zero three.js** (asserted by `scripts/check-build.mjs`). Other heavy,
  debug-only deps (e.g. `leva`) are lazy too.
- **WCAG 2.3.1:** ≤3 flashes/sec, no full-field luminance flash. Blinks/flickers
  are slow smooth fades, gated behind `!prefers-reduced-motion` (a reduced-motion
  user only reaches the world by explicit opt-in, and motion is softened for them
  inside via the REDUCED caps). Audio dropouts fade, never spike (output limiter in
  `src/audio/engine.ts`).
- **The "machine sees you" dread beat is always FAKED** — never real camera/mic.
  (The only camera use permitted is a consensual, fully-local, never-transmitted
  instrument opt-in, firewalled from dread.)
- **Taste:** funny-uncanny, never traumatic. The surface (storefront/jukebox/
  garden) stays sweet; only the deep rooms get wrong. Restraint is the craft.

## Architecture & code conventions

- **Data-driven content.** Adding a link, room, floor, hotspot, or song must not
  require editing scene code. Rooms live in `src/data/rooms/*` (three-free data);
  geometry lives in `src/world/*`. Adding a room = a data entry + a `ROOM_SCENES`
  renderer + a `ROOM_MAP` node + a `dread.ts` base.
- **The room graph is guarded.** Every door targets a real room + an existing
  spawn; ids are unique; keys never gate the main descent. The **arrival-spawn
  contract** (you land facing INTO the room, the door behind you, never inside a
  door radius) is enforced by dev warnings in `rooms.ts` AND `rooms.test.ts` — a
  new room/spawn must keep those green.
- **`src/data/*` stays three-free** so it can be imported without pulling three
  into the storefront bundle (verified by the app-chunk check in the build).
- **Dispose GPU resources.** Every `new THREE.*Material/Texture/Geometry` in a
  room is registered with `useDispose(...)` (or disposed on unmount). No leaks.
- **Animation + audio ride the R3F clock / deltas**, never `Date.now()`/
  `setInterval` for frame logic; ambient schedulers freeze under
  `paused`/`transitioning`. All in-world audio is mute-aware and voice-capped
  (degrades to silence, never forces sound on; no synth fallback).
- **Modal a11y:** any `role="dialog"` overlay uses `useModalFocus` (focus first
  control on open, trap Tab, restore focus on close) + `aria-modal="true"`. The
  pause menu is the stated accessibility guarantee — it must always comply.
- **Test hooks are gated.** `window.__sdp*` globals only exist under the `?world`/
  `?debug` test entrances (`lib/testHooks.ts`). READ-ONLY state hooks may ride
  `?world`; ACTION hooks that teleport or bank progression must ride the narrower
  `?debug` gate.
- **A smoke per feature.** Every `shoot`/`shoot:*` script in `package.json` is a
  CI-gating Playwright smoke (auto-discovered by `shoot:all`). New in-world
  behavior gets a smoke that walks the REAL entry path (real door edges, real
  pickups), not just a `?room=` mount — the real path must be covered by *some*
  smoke. A smoke that must read the `?world`/`?debug` test globals (e.g.
  `__sdpCam`, gated to the test entrance by `testHooks.ts`) may ENTER via that
  entrance for its mechanics **provided the real entry path is covered by a sibling
  smoke** (e.g. `shoot:touch` proves the HUD mechanics under `?world` and also
  carries a real-path `order form → install → world` check; `shoot:descent` /
  `shoot:fallback` cover the mobile journey). Prefer concrete DOM/state waits over
  fixed sleeps.

## What CI enforces (`.github/workflows/ci.yml`)

`npm run typecheck` (src **and** `api/` via `tsconfig.api.json`) · `lint` ·
`format:check` · `test` (Vitest) · `build` (+ `check-build.mjs` asset/notice/
JSON-LD guards) · `shoot:all` (the full smoke suite). A PR is not done until all
are green.

## Review focus (where regressions hide)

- `src/world/Controls.tsx` + `TubeSlide.tsx` + `cameraRig.ts` + `inputFrozen.ts` —
  movement/jump state, scripted camera rides, input freeze, and heading handoff
  all meet here.
- Room graph edits in `src/data/rooms/*` — spawn radii/headings.
- Anything touching the JS-off storefront, the JSON-LD `@graph`, or the meta tags
  (the "2026 backend under a 1996 skin").
