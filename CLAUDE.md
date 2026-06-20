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
| surmado | the usual corporate stuff | Surmado (deadpan) |
| contact | submit a comment to the webmaster | contact |

Storefront copy, 1999 register (original — do not use Pizza Hut's words):

> **RAT SPOTTED IN WALL — MANAGEMENT INSISTS HE PAYS RENT**
> Click here for the inside scoop.
> It's one thin crust piled with six unreleased demos, then sealed with another
> thin crust, reverb, choice of toppings, and even more reverb.
> **The Best Songs Under One Roof!™**  Lo-Fi • Hi-Fi • Stuffed Crust
> ©1997 Scoobert Doobert, Inc. / The Santa Cruz-ish Operation

---

## Phase status (agent-maintained — keep this current)

- [x] **1. Project + storefront (fallback layer).** Vite+React+TS scaffold,
      dead-plain storefront, links.ts, text-only page, pizza cursor, 2026
      schema + meta. JS-disabled + crawlable. ✓ verified (Playwright, incl. JS-off)
- [ ] **2. Boot + audio shell.** Brief period boot card (JS-only, skippable,
      reduced-motion-aware), degraded-MIDI boot loop, mute toggle in zustand.
- [ ] **3. Descent transition.** Aging/CRT pass, Calzone Player™ install dialog
      (98.css), absurd progress bar masking the dynamic three.js import, optional
      crash fakeout, cut into the world.
- [ ] **4. One 3D room — beach pizza shop.** Port + DEGRADE water-shader.ts and
      boids.ts to PS1 constraints. leva debug panel for shader uniforms.
- [ ] **5. Boids establishing shot + three hotspots.** Reskinned boids out the
      window; jukebox→Listen, window→Videos, counter→About via hotspots.ts.
      Pause menu (Esc) overlays the full links.ts list as real anchors.
- [ ] **6. Mobile + reduced-motion fallback.** Skip descent/3D; storefront +
      destination card list.
- [ ] **7. README.** Run/deploy, where links + hotspots live, asset/licensing.

`legacy/` holds the previous hand-built site (preserved, not part of the build).
