# scoobertdoobert.pizza — Phase 1 build spec (durable agent context)

This file is the durable context for the project. Re-read it every session.
The ADDENDUM and WORKING AGREEMENT sections below supersede anything they
contradict above them.

---

## What this is

A fake late-90s SGI-flavored "electronic storefront" for a pizza shop that comes
alive, falls backward through web eras, and drops you into a low-poly PS1/N64
world: a pizza shop off the coast of San Diego that is secretly the archive of
**Scoobert Doobert**, a philosopher's solo music project.

**Thesis (this is the spine, lean on it):** Silicon Graphics built the Nintendo
64's graphics chip and, on its "Silicon Surf" site, advertised navigable 3D
worlds in the browser via VRML in 1996. That promise never arrived. This site
ships it ~30 years late, as a haunted pizza CD-ROM. The boot screen tagline is:

> A pizza shop off the coast of San Diego.
> (It is actually a solo music project by a philosopher.)

This is **scoobertdoobert.pizza**, the goblin-mode music site. It is NOT
lukefwalton.com (the credible entity hub). Different repo, different rules.
Here, weird is the point.

## Non-negotiables — architecture

- **The plain HTML storefront IS the fallback layer.** It must fully work with
  JavaScript disabled: real `<a href>` links to real destinations, crawlable,
  semantic. With `prefers-reduced-motion` or on mobile, the user just gets this
  page — no descent, no 3D. Build it FIRST. Everything else is progressive
  enhancement layered on top.
- **Every primary destination is a real anchor in the DOM, always** — even when
  it is also a 3D object. A link that exists only as geometry is invisible to
  crawlers and screen readers and does not count.
- **Lazy-load all WebGL behind the fake plugin-install gag.** The storefront
  loads instantly with zero three.js in the initial bundle.
- **No copyrighted assets, copy, logos, or marks.** Not Nintendo, SGI, Pizza
  Hut, Microsoft, Doom, Cosmo Player. Original parody only. Steal the *grammar*
  of these references, never the artifacts. (e.g. the VRML plugin is "Calzone
  Player™," not "Cosmo Player.")
- **Keep this repo standalone — no dependency on any Surmado/corp repo.** WebGL
  technique ported from `brand-web` (water, boids) is copied in as this
  project's own standalone files, re-homed and self-contained. Do not import
  from, submodule, or symlink the corp repo. This is a personal project; corp
  code must not physically live in or be pulled by it.

## 2026 backend under the 1996 skin

The site LOOKS like 1996. Underneath it is a 2026 site, and that contrast is
part of the joke:

- **Structured data:** a clean, valid JSON-LD `@graph` (WebSite + MusicGroup +
  Person, enriched with genre / description / foundingLocation). Semantically
  rich, mostly invisible, never bloated. Extend per era/page; don't pad.
- **Great meta:** canonical, description, robots, full Open Graph + Twitter card,
  theme-color, favicon. Keep accurate as content grows.
- **Semantic HTML + a11y:** real landmarks, heading order, alt text, focus
  management. The retro look never costs crawlability or accessibility.

## Always-reachable links (the pause menu)

Inside the 3D world the three hotspots are not the only way out. A game-style
**pause menu** (Esc, or an on-screen menu button) overlays the full `links.ts`
destination list as real anchors, plus "return to storefront" and the mute
toggle. It is both the in-world nav and the accessibility guarantee: every
destination is one keypress away, always, even in 3D.

## Stack

- Vite + React + TypeScript
- three.js + @react-three/fiber + @react-three/drei
- 98.css for windowed dialog chrome (used in the world + later floors)
- zustand for the small amount of scene/game state
- Deploy: Vercel (static)

## The PS1/N64 look = HARD constraints

Without these the scene will read as a clean modern render, which is wrong. All
required:

- Render to a low-res target (~320×240 or 426×240), upscale with
  `image-rendering: pixelated`.
- **Vertex snapping:** round clip-space xy to a coarse grid in the vertex shader.
- **Affine texture mapping:** multiply UVs by `position.w` so perspective
  correction drops out — this is the texture wobble.
- Textures ≤128px, `THREE.NearestFilter`, no mipmaps.
- Distance fog with a near far-plane to fake draw distance.
- Limited color depth via an ordered-dither post pass.
- Flat/vertex lighting or baked vertex colors. No PBR, no soft shadows.
- Reference implementations to follow (do not copy assets, just technique): the
  Codrops "PS1 jitter shader with react-three-fiber" tutorial and Roman
  Liutikov's "PS1 graphics in three.js" post.

## Audio is first-class (this is a musician's site, not a portfolio)

- Boot chime = a deliberately degraded, MIDI-ized version of a real Scoobert
  track (placeholder for now; real file dropped in later).
- Jukebox hotspot streams the real catalog; volume rises as you approach (drei
  `<PositionalAudio>`).
- The descent transition pitch-bends the boot loop downward as the era "ages."

## Content model — data-driven

Adding a link or room must never require editing scene code. Single source of
truth: `src/data/links.ts` and `src/data/hotspots.ts` (see those files).

## Era ladder (structure for later phases — informs Phase 1 transition only)

Spawn descends through real web eras, aging as it goes: 1994 black-and-white
form → 1996 serif storefront → 1999 starburst-headline → 2000 table-layout →
**bottom floor: the SGI machine room** (the workstation rendering the world) →
step through the screen into real-time 3D. Phase 1 builds only the top floor and
ONE descent into the world; the intermediate floors come later.

## SCOPE GUARDRAIL — Phase 1 only. Do NOT build yet:

the full maze, the terminal, the rat as an NPC, rooms beyond the beach shop,
secret rooms, the trash folder, the intermediate era floors, or the long
easter-egg list. Those are Phase 2+. If you start adding them, stop and ask.

---

## ADDENDUM (corrections — these SUPERSEDE conflicts above)

1. **FRONT DOOR IS DEAD PLAIN, not SGI chrome.** The storefront's first
   impression is an offensively plain 1995–97 commercial web page: default serif
   (Times), horizontal rules, gray HTML buttons, blue/purple underlined links, a
   real low-fi form (Name / Voice Phone / Favorite Cheese / Delivery Address /
   Continue), "Electronic Pizza Storefront," "Sample Menu," "Best viewed in
   Netscape," a fake webmaster mailto. Barely-designed is the joke. Do NOT open
   with chrome word-art, starfields, or any 3D splash. KEEP the logline tagline,
   the topping-icon nav row, the real `<a>` links from links.ts, and the working
   "text only version" fallback link.
2. **SGI / Silicon Surf chrome is deferred to Phase 2.** The faux-chrome /
   starfield / "see what's possible" aesthetic belongs to a later "machine room"
   floor, not the storefront. In Phase 1 the Calzone Player install still fires
   directly from the storefront.
3. **Keep the fake Calzone Player install as the 3D entrance + lazy-load mask.**
   Optional polish: a ~1-second fake crash dialog ("SCOOBERT.EXE has performed a
   beautiful illegal operation") as a fakeout beat immediately BEFORE the install
   dialog — never as a replacement for it.
4. **Floor-one water must be the DEGRADED version** per the PS1 hard constraints
   — crunchy, affine-wobbly, low-res, fog. The GDScout water is the glossy
   "before"; if floor-one water looks that clean, it's wrong.
5. **The order form is the one loud exception (Luke).** It's the easter-egg
   entrance, so it's an intentionally prominent period "ORDER ONLINE!" callout
   (blinking NEW! badge, big button) on the otherwise dead-plain page. Don't
   flatten it back.
6. **`lukefwalton.com` is a SUBTLE backlink only (Luke).** Footer `rel=me` +
   JSON-LD `sameAs`, never a navigation destination. This is Scoobert's site,
   not Luke's — users shouldn't really find the link via nav.

## WORKING AGREEMENT

- **Long-running build.** Drive through the whole Phase 1 spec; commit and push
  at each step checkpoint rather than stopping for sign-off.
- **PR + review bot.** Open a PR at a checkpoint. A code-review bot runs on every
  commit and edits its single comment in place; treat it as a partner, act on it
  when it's right, ignore it when it isn't.
- **The pizza cursor (`/cursor.cur`) is a keeper.** Global custom cursor. It also
  happens to be period-accurate for the dead-plain era.
- **Self-verify with Playwright** (`npm run shoot`), including the JS-disabled
  storefront, before committing visual checkpoints.

## Starter content (reference)

`src/data/links.ts` destinations (storefront-voice label → points to):

| id | label | points to |
|----|-------|-----------|
| listen | what's hot @ the .pizza? | streaming |
| videos | see the TV spots | music videos |
| catalog | more about our menu | full catalog |
| podcast | community involvement | Love Music More |
| about | the inside scoop | the project / bio |
| beformer | the usual corporate stuff | beformer.co — the band's label (deadpan) |
| contact | submit a comment to the webmaster | contact |

Storefront copy, 1999 register (original — do not use Pizza Hut's words):

> **RAT SPOTTED IN WALL — MANAGEMENT INSISTS HE PAYS RENT**
> Click here for the inside scoop.
> It's one thin crust piled with six unreleased demos, then sealed with another
> thin crust, reverb, choice of toppings, and even more reverb.
> **The Best Songs Under One Roof!™**  Lo-Fi • Hi-Fi • Stuffed Crust
> ©1997 Scoobert Doobert, Inc. / The Santa Cruz-ish Operation

---

## Phase 2 — the Doom/Freedoom shrine (decided, not yet built)

Decision (Luke): copyleft is a non-issue for this site. Happy to make the repo
public/GPL. The only real line is **assets**, not code.

- **Use Freedoom assets, never id's original Doom WADs / sprites / sounds /
  music.** Freedoom content is BSD-licensed; preserve copyright + credit. (Or
  make our own cursed pizza WAD.)
- A browser Doom/WASM port (engine source lineage is GPL — fine) goes behind a
  **hidden, lazy-loaded route** (e.g. `/basement`, `/pizza-hell`, "employee
  only"). It's a portal / shrine / cursed minigame, NOT the site architecture.
  The main site stays custom R3F.
- Hygiene: public repo; add `THIRD_PARTY_NOTICES.md`; credit id Software (engine
  lineage), the port authors (Chocolate Doom / wasm port), and Freedoom
  (content). Keep it isolated — never mix GPL/Doom code into reusable
  Surmado/business code.
- This is a secret room / easter egg, so per the SCOPE GUARDRAIL it is **Phase
  2** — queue it as the first Phase 2 item after Phase 1 ships.

Verdict: ship. Copyleft isn't the blocker; asset theft would be.

## Liminal / level direction (Phase 2 aesthetic — Luke)

Luke likes backrooms / liminal spaces, and **the era ladder IS the "levels."**
Lean into it for Phase 2: each descent floor is an empty, over-lit,
nostalgic-and-slightly-wrong dead-web space you fall through (1994 form → 1996
storefront → 1999 starburst → 2000 tables → SGI machine room), with
backrooms-style connective tissue between rooms. Low-poly + PS1 fog + emptiness
already reads liminal — keep it quiet, too-evenly-lit, a little off. The Doom
shrine is one such room. The architecture already supports it: each level is a
lazy-loaded scene behind the descent, and hotspots + links stay data-driven, so
floors slot in without touching scene code.

## Phase status (agent-maintained — keep this current)

- [x] **1. Project + storefront (fallback layer).** Vite+React+TS scaffold,
      dead-plain storefront, links.ts, text-only page, pizza cursor, 2026
      schema + meta. JS-disabled + crawlable. ✓ verified (Playwright, incl. JS-off)
- [x] **2. Boot + audio shell.** Brief period boot card (JS-only, skippable,
      reduced-motion-aware), degraded-MIDI boot loop, mute toggle in zustand. ✓
- [x] **3. Descent transition.** Aging/CRT pass, SCOOBERT.EXE crash fakeout,
      Calzone Player™ install dialog (98.css), absurd progress bar masking the
      dynamic three.js import, cut to black → fade up in the world. Gated off
      mobile/reduced-motion (those just navigate to /text). ✓
- [x] **4. One 3D room — beach pizza shop.** Ported boids steering + sine-wave
      water, DEGRADED to PS1 (vertex snap, affine floor, ordered dither, fog,
      low-res). Window to the sea, pizza-slice school, FP drag-look + WASD, leva
      panel (?debug). Lazy-loaded chunk — initial bundle stays three-free. ✓
- [x] **5. Boids establishing shot + three hotspots.** Pizza-slice school out
      the window; jukebox→Listen, window→Videos, counter→About via hotspots.ts
      (proximity prompt + E/click → 98.css dialog w/ real anchor). Pause menu
      (Esc) overlays the full links.ts list as real anchors + mute + exit. ✓
      (PositionalAudio jukebox deferred — wiring in, real catalog audio later.)
- [x] **6. Mobile + reduced-motion fallback.** Descent + 3D + boot all gated off
      mobile/reduced-motion; Continue navigates to the flat /text destination
      list. Pause/hotspot dialogs are modal (Controls freezes input). ✓
      (shoot-fallback + the pause-modal assertion in shoot-world.)
- [x] **7. README.** Run/deploy, where links + hotspots live, asset/licensing,
      hosting decision. ✓

**Phase 1 COMPLETE** (2026-06-20). Next: Phase 2 — the liminal era-ladder
"levels" + the Doom/Freedoom shrine + PositionalAudio jukebox.

`legacy/` holds the previous hand-built site (preserved, not part of the build).

---

## POST-PHASE-1 ADDITIONS (Luke, 2026-06-20 — keep current)

- **Press photos.** `public/press/` — `scoobert-og.jpg` (1200² OG/social image,
  googly-eyes shot) + small inline period snapshots on the storefront. Source
  archive (`photos/`, 375 shots) stays OUT of the bundle. Resized via
  `scripts/resize-image.mjs` (Playwright-canvas; no sharp/ffmpeg in the env).
- **Real boot music (replaces the synth).** The boot loop is a degraded 8-bit /
  11 kHz bounce of a real Scoobert track at `public/audio/boot.wav`, built by
  `scripts/make-boot-audio.mjs` (decodes the master in headless Chromium, skips
  intro silence, crossfades the loop seam, 8-bit-crushes it). These are Luke's
  OWN songs (his copyright) — fine to ship degraded.
- **Music = the layer themes (Luke's map).** Each descent layer has a track:
  - **#1 / top (the world + boot loop): "Jolly Roger Bay (64)"** — his own song
    nodding to the N64 underwater level. THIS is the current boot.wav.
  - **down a layer: "Information"** — the next era-ladder floor (Phase 2).
  - **"1101" → the /save-san-diego ARG** (the `/1101` Twine page; the binary
    clue decodes to "save san diego").
  Masters live on `main` root (`05 Information.mp3`, `09 Jolly Roger Bay
  (64).mp3`, `21 1101.mp3`); only the degraded loop for the active layer ships.
- **Audio is LAZY + GATED (no synth fallback).** `src/audio/engine.ts` lazy-loads
  + decodes the track via a throwaway OfflineAudioContext (no gesture needed);
  the music toggle stays DISABLED ("loading…") until decoded; if it never loads,
  there is NO music and the toggle never lights up. There is deliberately no
  synth fallback anymore.
- **Loading screen moved to the level load.** The PIZZA-DOS boot card no longer
  gates the storefront (front door loads instantly). It's now the deliberate
  "loading the world" POST log inside the descent (`<BootLog>`), after the
  Calzone install.
- **`/links` — the link archive.** A prerendered, crawlable directory of ~455
  links parsed from `links.md` (repo root, single source) by
  `src/data/linkArchive.ts` → `src/pages/LinkArchive.tsx`. SEO surface + period
  easter egg; quiet footer entry, not main nav.
- **Email capture.** `api/order.ts` writes opt-ins to Vercel Blob with
  `access:'private'` (+ honeypot + failure logging). Needs a Blob store
  connected to the Vercel project (`BLOB_READ_WRITE_TOKEN`) to persist; absent
  that it no-ops without breaking the UX.
- **Repo hygiene (TODO, post-merge):** `main` root is messy (old hand-built site
  + loose mp3s / photos / `fun/` / icons). PR #4 already moves the old site to
  `legacy/`. The loose source media should nest (e.g. `media/masters/`,
  `media/photos/`) once #4 merges — doing it from this divergent branch risks
  add/add duplicates. `fun/` (half-built JS music apps) is its own later PR.

---

## LONG-RUNNING BUILD — roadmap, principles, loop (Luke, 2026-06-20)

Mode: **long-running**. Drive autonomously, one PR per chunk, use the Surmado
review bot as the feedback loop. Don't stop at every checkpoint for sign-off.

### The review-bot loop (operational)
- The bot runs ~3 min after a push and **edits its single comment in place** — it
  does NOT post a new comment, so **webhooks won't fire for the edit. Don't rely
  on webhooks.** After pushing: do other work (or a background timer — foreground
  `sleep` is blocked here), then **re-fetch the PR comment via the GitHub API**
  (`pull_request_read` get_comments / the issue comment) and act on it.
- Known recurring false positive: the bot flags `/PIZZA.png` as a 404 because its
  diff is truncated; the file IS in `public/` → `dist/`. Ignore it.

### Phase roadmap (build in order; each its own branch + PR)
- **Phase 2 (finishing now):** era floors between storefront and world.
  - ✅ ckpt1 floors system; ✅ ckpt2 descent mechanic + doors + entry rewire.
  - ⬜ ckpt3 **1999 starburst** floor + **SGI machine room** (parody "Silicon
    Slice"/"Pizza Graphics Workstation", starfield, chrome word-art, comet
    pizza-guy; corner CRT showing a mini live render of water+boids; the Calzone
    install RELOCATES here; on complete the camera pushes through the CRT into
    the beach shop). ⬜ ckpt4 **2000 table-layout** floor (two gags only:
    section-gate fork + pizza-box image map). ⬜ ckpt5 README.
- **Phase 3 — THE WORLD GROWS:** rooms system (`src/data/rooms.ts`, `currentRoom`).
  beach shop (=ROOMS[0]) → **rat hallway** (3D-Maze red brick, corridor not maze)
  → **jukebox room** (the music payoff: real catalog via drei `<PositionalAudio>`
  swelling on approach; MTV-M2 "what do you want to hear?" voice). The **rat** =
  one boids agent (seek waypoint ahead / flee when close) that guides, then knocks
  a blank wall panel → the ONE secret: a hidden door to a tiny "classified" room
  (X-Files file-room: rejected demos). **3D doors are the room exits** (same
  metaphor as the floor doors — doors all the way down). The shop's old jukebox
  hotspot becomes a doorway/signpost toward the hallway (ONE music destination).
- **Phase 4 — THE TERMINAL (my pick):** a hidden SGI/X-Files command line
  (machine room and/or a `/` console). Real commands, dead-web flavor. Some
  commands become Phase 5 unease triggers.
- **Phase 5 — DEEPER IN (dread conductor):** a single `unease` 0→1 (`src/data/
  dread.ts`) rising with depth/dwell/triggers, decaying in safe zones, that
  MODULATES existing systems — sub-bass dread bed FIRST (felt not heard), then
  PS1 shader uniforms→worse, fog closes in, camera bob/shake/vignette, the rat
  TURNS (same agent, inverted boids), and ONE set-piece: the machine-room CRT
  renders the player (faked render-to-texture). Modulation, not new systems.
  **TASTE GUARDRAIL (hard):** funny-uncanny not traumatic; surface zones
  (storefront/jukebox) stay safe + goofy; the contrast is the whole effect;
  **NEVER real camera/mic** (the "sees you" beat is faked); restraint is the craft.
- **Post-loop: wire up / borrow from `fun/`** (git submodule — half-built JS music
  apps). Init the submodule first; borrow tastefully.

### Aesthetic principles (apply everywhere)
- **A MEMORY of the 90s/2000s, not the time itself** — hazy, dreamlike, wrong.
- **Imperfection is the ideal. It's backrooms.** Degrade on purpose.
- **Pristine GLBs beside crunched ones** — the contrast is the vibe. PS1 the lot
  (vertex snap, affine, ≤128px NearestFilter, fog).
- **Doors everywhere** are the connective tissue (flat floors + 3D rooms alike).
- **Möbius motif** threaded in to plug Luke's album "Mobius".
- **Open-source/copyleft is welcome** (Luke OK'd GPL/public). Credit in
  `THIRD_PARTY_NOTICES.md`, keep isolated, **never lift proprietary assets**.

### GLB asset troves on `main` (source, optimize before shipping)
`newglb/` (vaporwave-Greek: sofokles vaporwave, underwater broken statue, Hades
head, columns, lyre, kiddie pool, palms, vaporwave mountains, arcade cabinet),
möbius glbs, `legacy/julius_caesar.glb` (the "bust"). Crunch via `gltf-transform`
to PS1 fidelity; only optimized derivatives go in `public/models/`. Bust → beach
shop counter; vaporwave-Greek → the level below the shop (Phase 3+).

### Phase 2 status (2026-06-20)
✅ ckpt1 floors system · ✅ ckpt2 doors + descent mechanic · ✅ ckpt3 1999
starburst + SGI machine room (install relocated here, live CRT render of
water+boids, lazy three) · ✅ ckpt4 2000 table floor (section gate + pizza image
map) · ✅ ckpt5 README → **Phase 2 done.**

### Phase 3 status (2026-06-20) — THE WORLD GROWS (stacked PR on Phase 2)
✅ **ckpt1 rooms system + 3D doors.** `src/data/rooms.ts` is the world graph
(Room + RoomDoor, three-free so the store/HUD can import it; plain dims live in
`src/world/dims.ts`, re-exported by constants.ts to keep three out of the
storefront bundle). The shop is just `ROOMS[0]`; a back-of-shop door leads into
the **rat hallway** (red 3D-Maze brick, dim backrooms light pools, affine floor
swim) and back. Doors = `src/world/Doors.tsx` (proximity prompt + E/click →
`goToRoom` → black-wipe fade → `commitRoom` swaps the room behind the black →
camera re-spawns). `Controls` is room-aware (clamps to the current room, respawns
per door). Per-room fog/bg in `World.tsx` (`RoomEnvironment`). Quiet `.hud-room`
label. Smoke: `npm run shoot:rooms` (shop→hall→shop). ⬜ ckpt2 jukebox room
(PositionalAudio swell) · ⬜ ckpt3 the rat (boids guide) · ⬜ ckpt4 the secret
(rat knocks panel → classified room) · ⬜ ckpt5 mobile + README.

### Mobile / reduced-motion policy (Luke: "don't forget mobile, less features OK")
- The era FLOORS are universal — responsive pages; descend on any device (the
  rot transition is instant under reduced-motion). The descent through web
  history works on a phone.
- The 3D WORLD is the one "less feature" mobile skips: the machine-room CRT live
  render (WebGL) is NOT mounted on mobile/reduced-motion, and Install hands off
  to /text instead of the 3D world. Desktop + motion-OK gets the full world.

### New asset direction (Luke, merged to main — for later levels)
- **Animatronic-horror GLBs** → the LOWER / dread levels (Phase 5: the rat
  turns, the machine sees you). Save for depth; the surface stays goofy.
- **A pool level** (the kiddie-pool GLB) → a room/level idea for Phase 3+.

### TODO — the plain /about page (Luke)
A normal, crawlable page (the thing a search engine sees) at /about that tells
the Scoobert Doobert story PLAINLY; linked as "Our Secret Recipe →". Inform the
copy from lukefwalton.com/music/#scoobert, lukefwalton.com/love-music-more/, and
lovemusicmore.substack.com (research before writing).

### More level GLBs on main (Luke — for the levels below the shop)
- **`couldbewholelevels/`** — full liminal/backrooms/pool environments:
  abandoned_pool, backrooms_vr, dreamcore_liminal_space, liminal_space (+other),
  metro_tunnel, pool_5/6, poolrooms — the "pool level" + backrooms direction for
  Phase 3+. Plus a standalone 3D **door** GLB (perfect for the room exits).
  **NOTE: `max_and_ruby_house.glb` is copyrighted Nickelodeon IP** — flag before
  any public use; the rest are generic liminal aesthetics (fine).

### Doom / Freedoom shrine — copyleft protections (Luke asked)
Still on, as a hidden lazy route (Phase 3+ secret). When built it needs:
- **Freedoom (BSD) assets ONLY** — never id's original Doom WADs / sprites /
  sounds / music. (Or a cursed home-made pizza WAD.)
- Engine/port lineage is **GPL — fine** (Luke OK'd GPL/public for this repo).
- Add **`THIRD_PARTY_NOTICES.md`** crediting id Software (engine lineage), the
  WASM/Chocolate-Doom port authors, and Freedoom (content + copyright).
- Keep it **isolated** behind the lazy route; never mix GPL/Doom code into
  reusable Surmado/business code. Build the protections WITH the shrine.
