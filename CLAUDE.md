# scoobertdoobert.pizza — CLAUDE.md (the rules · durable agent context)

This file is the **constitution**: the rules and operating agreement you must not
break. Re-read it every session — **and read its two companion docs:**

- **`docs/PHASES.md`** — the roadmap & live status. *What to build next.*
- **`docs/DESIGN.md`** — the vision, the systems, the feel, the assets. *Why, and
  how it should feel.*

**Source of truth (where to UPDATE a thing):** rules/guardrails → here;
phase status as you ship → `docs/PHASES.md`; a design/system decision →
`docs/DESIGN.md`. Don't duplicate a detail across docs — link to its owner.

The ADDENDUM, WORKING AGREEMENT, and the companion docs supersede anything they
contradict above them.

---

## What this is

A fake late-90s SGI-flavored "electronic storefront" for a pizza shop that comes
alive, falls backward through web eras, and drops you into a low-poly PS1/N64
world: a pizza shop off the coast of San Diego that is secretly the archive of
**Scoobert Doobert**, a philosopher's solo music project.

**Thesis (the spine — lean on it):** Silicon Graphics built the Nintendo 64's
graphics chip and, on its "Silicon Surf" site, advertised navigable 3D worlds in
the browser via VRML in 1996. That promise never arrived. This site ships it ~30
years late, as a haunted pizza CD-ROM. The boot tagline:

> A pizza shop off the coast of San Diego.
> (It is actually a solo music project by a philosopher.)

This is **scoobertdoobert.pizza**, the goblin-mode music site. It is NOT
lukefwalton.com (the credible entity hub). Different repo, different rules. Here,
weird is the point. **The experience it's reaching for is in `docs/DESIGN.md`** —
a liminal/backrooms/90s dive whose reward is sound; read it.

## Non-negotiables — architecture

- **The plain HTML storefront IS the fallback layer.** It must fully work with
  JavaScript disabled: real `<a href>` links to real destinations, crawlable,
  semantic. With JavaScript disabled the user gets exactly this page — no descent,
  no 3D. (With JS on, mobile now gets the full descent + touch-driven 3D world;
  `prefers-reduced-motion` gets an explicit opt-in to it — see the Mobile policy
  below.) Everything else is progressive enhancement on top.
- **Every primary destination is a real anchor in the DOM, always** — even when
  it is also a 3D object. A link that exists only as geometry is invisible to
  crawlers and screen readers and does not count. **Loaders/minigames never gate
  a real destination** (see DESIGN); navigation stays instant and crawlable.
- **Lazy-load all WebGL behind the fake plugin-install gag.** The storefront
  loads instantly with zero three.js in the initial bundle.
- **No copyrighted assets, copy, logos, or marks.** Not Nintendo, SGI, Pizza
  Hut, Domino's, Microsoft, Doom, Cosmo Player. Original parody only. Steal the
  *grammar* of these references, never the artifacts. (The VRML plugin is
  "Calzone Player™," not "Cosmo Player"; a pizza-tracker loader parodies the
  *stages*, never Domino's mark.)
- **Scoobert's creative content is © Luke F. Walton dba Scoobert Doobert, ALL
  RIGHTS RESERVED** (music, lyrics, words/copy, biography, likeness, photos,
  artwork — everything under `media/`, `public/audio/`, `public/press/`,
  `public/brand/`, and the site's prose). It is only *licensed to* this repo; its
  copyright is never altered by being here. See `LICENSE`. **Any open-source
  license ever applied to this repo covers the SOURCE CODE ONLY — never the
  content.** Never add a repo-wide OSS `LICENSE` that could be read as covering
  the music/words. This is a hard line.
- **Keep this repo standalone — no dependency on any Surmado/corp repo.** WebGL
  technique ported from `brand-web` (water, boids) is copied in as this project's
  own standalone files, re-homed and self-contained. Don't import from,
  submodule, or symlink the corp repo. Borrowed OSS technique (PS1 shaders, tiny
  minigames) likewise lives here as our own isolated files — never a second
  engine for the main site.

## 2026 backend under the 1996 skin

The site LOOKS like 1996; underneath it's a 2026 site, and that contrast is the
joke:

- **Structured data:** a clean, valid JSON-LD `@graph` (WebSite + MusicGroup +
  Person). Semantically rich, mostly invisible, never bloated. Extend per
  era/page; don't pad.
- **Great meta:** canonical, description, robots, full Open Graph + Twitter card,
  theme-color, favicon. Keep accurate as content grows.
- **Semantic HTML + a11y:** real landmarks, heading order, alt text, focus
  management. The retro look never costs crawlability or accessibility.

## Always-reachable links (the pause menu)

Inside the 3D world the hotspots are not the only way out. A game-style **pause
menu** (Esc / on-screen button) always offers **"Return to storefront"** plus the
mute toggle — one keypress back to the dead-plain storefront, which carries the
full `links.ts` destination list as real anchors (with `/text` behind it). Those
crawlable pages are the accessibility surface. (Luke, 2026-07: the pause menu no
longer duplicates the whole `links.ts` menu inline — back-to-home is enough; don't
re-add the inline destination list.)

## Stack

- Vite + React + TypeScript; static prerender via `vite-react-ssg`.
- three.js + @react-three/fiber + @react-three/drei.
- 98.css for windowed dialog chrome.
- zustand for the small amount of scene/game state.
- Deploy: Vercel (static).

## The PS1/N64 look = HARD constraints

Without these the scene reads as a clean modern render, which is wrong. All
required (PS1 *everything*, including bought GLBs):

- Render to a low-res target (~320×240 / 426×240), upscale with
  `image-rendering: pixelated`.
- **Vertex snapping:** round clip-space xy to a coarse grid in the vertex shader.
- **Affine texture mapping:** multiply UVs by `position.w` so perspective
  correction drops out — the texture wobble.
- Textures ≤128px, `THREE.NearestFilter`, no mipmaps.
- Distance fog with a near far-plane to fake draw distance.
- Limited color depth via an ordered-dither post pass.
- Flat/vertex lighting or baked vertex colors. No PBR, no soft shadows.
- Reference (technique only, no assets): the Codrops "PS1 jitter shader with
  react-three-fiber" tutorial and Roman Liutikov's "PS1 graphics in three.js".

## Audio is first-class (this is a musician's site, not a portfolio)

- **Exploration's reward is sound** — the spine (see DESIGN's "music ladder").
- Audio is **lazy + gated, no synth fallback** (`src/audio/engine.ts`): tracks
  decode via a throwaway OfflineAudioContext; the music toggle stays disabled
  until decoded; if it never loads, there's no music and the toggle never lights.
- The boot loop and the jukebox catalog are **degraded bounces of Scoobert's own
  tracks** (Luke's copyright — fine to ship). The jukebox cycles a real catalog
  (`public/audio/jukebox/*.wav` from `src/data/jukebox.catalog.json`).
- The descent pitch-bends/ages the audio with depth; the dread layer (Phase 5)
  curdles it further. Everything respects the global mute.

## Content model — data-driven (single sources of truth)

Adding a link, floor, room, or song must never require editing scene code:

- `src/data/links.ts` — every destination (storefront menu, `/text`, pause menu,
  hotspots). Every `href` real, never `#`.
- `src/data/hotspots.ts` — in-world interaction points (→ a `links.ts` id).
- `src/data/floors.ts` — the era-floor descent (+ templates in `src/floors/`).
- `src/data/rooms.ts` — the 3D world graph (three-free; + geometry in `src/world/`).
- `src/data/jukebox.catalog.json` — the jukebox catalog (slug + title + master).
- (Phase 5) `src/data/dread.ts` — the `unease` curve.

## GUARDRAILS

**SCOPE GUARDRAIL — build the current phase only.** Don't smuggle in later-phase
systems (see `docs/PHASES.md` for what's in-scope now). If you start adding a new
place/NPC/system that belongs to a later phase, **stop and ask.** Phase 5
especially is *modulation, not addition* — no new rooms/NPCs/commands, no
fail/death state, no chase, no horror "level."

**TASTE GUARDRAIL (hard) — funny-uncanny, never traumatic.** Environmental dread
(sound, instability, being-watched), never jump-scare spam or gore. The surface
zones (storefront / jukebox) stay safe and goofy — the contrast with the wrong
depths is the whole effect; if everything is oppressive, none of it lands.
Restraint is the craft. Safety lines: **WCAG 2.3.1** (≤3 flashes/sec, no
full-field luminance flash; audio dropouts fade back, never spike).
**The "machine sees you" beat is always FAKED — never real camera/mic for
dread.** (The one camera exception is a consensual, fully-local, never-transmitted
*instrument* opt-in, firewalled from dread — see DESIGN's "Webcam policy.")

---

## ADDENDUM (corrections — these SUPERSEDE conflicts above)

1. **FRONT DOOR IS DEAD PLAIN, not SGI chrome.** The storefront's first
   impression is an offensively plain 1995–97 commercial web page: default serif
   (Times), horizontal rules, gray HTML buttons, blue/purple underlined links, a
   real low-fi form (Name / Voice Phone / Favorite Cheese / Delivery Address /
   Continue), "Electronic Pizza Storefront," "Sample Menu," "Best viewed in
   Netscape," a fake webmaster mailto. Barely-designed is the joke. Do NOT open
   with chrome word-art, starfields, or a 3D splash. KEEP the logline tagline,
   the topping-icon nav row, the real `<a>` links, and the "text only version"
   fallback link.
2. **SGI / Silicon Surf chrome belongs to the machine-room floor, not the
   storefront.** (Built in Phase 2.) The Calzone Player install fires from the
   machine room (the bottom floor).
3. **Keep the fake Calzone Player install as the 3D entrance + lazy-load mask.**
   The ~1-second SCOOBERT.EXE "beautiful illegal operation" crash fakeout fires
   immediately BEFORE the install dialog — never as a replacement for it.
4. **Floor-one water must be the DEGRADED version** per the PS1 constraints —
   crunchy, affine-wobbly, low-res, fog. If it looks clean, it's wrong.
5. **The order form is the one loud exception (Luke).** It's the easter-egg
   entrance: an intentionally prominent period "ORDER ONLINE!" callout (blinking
   NEW! badge, big button) on the otherwise dead-plain page. Don't flatten it.
6. **`lukefwalton.com` is a SUBTLE backlink only (Luke).** Footer `rel=me` +
   JSON-LD `sameAs`, never a navigation destination. This is Scoobert's site,
   not Luke's.
7. **IT'S A GAME NOW — DESIGN pillar #6's "no stats / no HUD" is LIFTED (Luke,
   2026-06-21): "let's make a damn game here."** The site embraces a real,
   visible RPG layer — on-screen stats, meters, progression, rewards are now
   in-bounds (this SUPERSEDES "Knowledge & keys, never stats / no real HUD").
   - **LUCK is the first system.** Earned by small, easy rituals (the shrine
     clap — 二拍手); **shown in the pause menu and announced on gain**; and **spent
     by the SYSTEM automatically, never by a manual choice** (Luke: "the system
     spends it") to tip the site's randomness your way — the d20s, drops, which
     demo/variant you get. "Be lucky," with no fiddly spend menu.
   - **STILL HARD-HELD (game-ness changes nothing here):** the TASTE guardrail
     (funny-uncanny, never traumatic; the surface stays sweet) and EVERY safety /
     access line — **WCAG 2.3.1**, **no real camera/mic for dread**, the crawlable
     **JS-off fallback**, semantic a11y. A HUD is fine now; a seizure or a dead
     screen-reader page is not.
   - **Combat is NOT required (Luke: "maybe not combat").** Favor luck / chance /
     exploration over fights; any future fight stays optional + non-traumatic, and
     "lose" never means a hard game-over (cf. the dice-monster: losing unblocks you).

## WORKING AGREEMENT

- **Long-running build.** Drive autonomously; one PR per chunk; commit and push
  at each checkpoint rather than stopping for sign-off (unless genuinely
  ambiguous). The phase order + cadence live in `docs/PHASES.md`.
- **PR + review bot.** A code-review bot **edits its single comment in place** (no
  webhook fires for the edit) ~3 min after a push — re-fetch it via the GitHub
  API and act on it; treat it as a partner. (Details + known false positives in
  PHASES.)
- **The pizza cursor (`/cursor.cur`) is a keeper.** Global custom cursor;
  period-accurate for the dead-plain era.
- **Self-verify with Playwright** (`npm run shoot*`), including the JS-disabled
  storefront, before committing visual checkpoints.

## Mobile / reduced-motion policy (Luke: "don't forget mobile" → 2026-07: "make the whole thing work on mobile")

The old policy ("the 3D world is the one feature mobile skips → /text") is
**LIFTED**. The world runs on phones now; the only hard gate left is reduced
motion, and even that is an opt-in.

- The era FLOORS are universal — responsive; the descent through web history
  works on a phone (the rot transition is instant under reduced-motion).
- **The 3D WORLD now runs on phones**, with on-screen touch controls
  (`src/components/TouchControls.tsx`: a virtual stick + a context/jump/spell
  cluster; drag-to-look already worked under touch). Input bridges through
  `src/world/touchInput.ts` into the same `Controls` `useFrame` the keyboard
  drives; the verbs go through the shared `src/lib/worldActions.ts`. The gate now
  lives split in `src/lib/lowPower.ts`: `isTouchDevice()` (`pointer: coarse` —
  orientation-independent, so a landscape phone keeps its controls) only decides
  whether the touch HUD mounts — it no longer skips the world. The machine-room
  CRT **live** render stays desktop-only (a second WebGL context on a phone isn't
  worth it), and the "pocket computer" install gag is now a wave-through pre-roll,
  never a dead end.
- **`prefers-reduced-motion` is the one hard gate — as an OPT-IN, not a redirect.**
  The world is motion-heavy, so a reduced-motion user is never auto-dropped in: an
  entry point (order form / machine-room install) raises the `MotionConsent` gate
  ("this has motion — enter anyway?") with the flat `/text` list as the safe
  default (remembered per visit via `src/lib/motionConsent.ts`). Motion stays
  softened INSIDE the world (the existing REDUCED caps). The hidden trap door
  stays hidden under reduced-motion (a surprise drop IS motion). So dread rides
  the world everywhere it runs; declining the opt-in (→ `/text`) is how a
  reduced-motion user gets none of it.

## Starter content (reference)

`src/data/links.ts` destinations (storefront-voice label → points to). Labels
are **cheeky-but-clear**: you always know where a link goes. Every destination is
**Scoobert Doobert work only** — never Luke F. Walton or other-project (FEiN, etc.)
links. `lukefwalton.com` stays a subtle identity backlink only (ADDENDUM #6), never
a menu/archive destination.

| id | label | points to |
|----|-------|-----------|
| listen | Listen on Spotify | streaming |
| videos | Watch on YouTube | music videos |
| catalog | Full catalog on Bandcamp | full catalog |
| podcast | The Love Music More podcast | Love Music More |
| beformer | Beformer Records (the label) | beformer.co — the label (deadpan) |
| contact | Email the webmaster | contact mailto |

**No duplicate destinations** — a given place is linked one way, not repeated
across a second joke. The `/about` "Secret Recipe" page is the one narrative
retelling of the same links.

Storefront copy, 1999 register (original — never Pizza Hut's words). The RAT gag
stays but is **terse and links downstairs into the building (the descent → the 3D
world), NEVER to the blog/podcast or to Luke**:

> **★ RAT SPOTTED IN WALL ★**  Follow him downstairs »
> Six unreleased demos under one roof.  Lo-Fi • Hi-Fi • Stuffed Crust.
> ©1997 Scoobert Doobert, Inc. / The San Diego-ish Operation

---

The previous hand-built site was removed from the working tree — it's preserved
in git history if ever needed. Source media lives under `media/`; only degraded/
web-sized derivatives in `public/` ship. See `README.md` for run/deploy + where
things live.
