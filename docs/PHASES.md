# scoobertdoobert.pizza — PHASES (roadmap & status)

What's built, what's next, in what order. `CLAUDE.md` holds the rules you can't
break; `docs/DESIGN.md` holds the vision each phase serves; this file holds the
plan and the live status. **Agent-maintained — keep current.** Re-read each
session.

**Cadence (from the working agreement):** long-running build, **one PR per
chunk**, commit/push at each checkpoint, use the review bot as the feedback loop.
Each phase is its own branch + PR. Don't stop at every checkpoint for sign-off
unless the work is genuinely ambiguous.

---

## Status at a glance

| Phase | What | State |
|------|------|-------|
| 1 | Storefront fallback + descent gag + first 3D room | ✅ done |
| 2 | Data-driven era-floor descent + SGI machine room | ✅ done |
| 3 | The world grows — rooms graph, rat, the one secret, jukebox | ✅ done (mobile/README tail open) |
| 4 | The terminal (hidden command line) | ✅ done |
| 5 | The dread conductor (`unease` modulation layer) | ⬜ specced, not built |
| 6+ | World-content backlog + wire up `fun/` | ⬜ backlog |

Cross-cutting: the **persistence spine** (localStorage) underpins retention, the
curdled copy, cleared-games, and dread's max-`unease` memory — land it early.

---

## ✅ Phase 1 — Storefront + descent + first room (COMPLETE, 2026-06-20)
Dead-plain HTML storefront (the fallback layer, JS-off + crawlable), `links.ts` /
`/text` / pizza cursor / 2026 JSON-LD + meta; the boot+audio shell; the descent
(CRT/aging pass, SCOOBERT.EXE crash fakeout, Calzone Player™ install, the world
fade-up); the PS1 beach-shop room (boids + degraded water, FP controls); three
hotspots + the Esc pause menu; mobile/reduced-motion → `/text`. Plus, post-Phase-1:
real degraded boot music, press photos + OG image, the `/links` archive, lazy/
gated audio, opt-in email capture (`api/order.ts` → Vercel Blob).

## ✅ Phase 2 — Era-floor descent + machine room (COMPLETE)
The descent is data-driven (`src/data/floors.ts` + `src/floors/`): storefront →
1999 starburst → 2000 table-layout (section-gate + pizza image-map gags) → the
**SGI machine room** (parody "Pizza Graphics Workstation", starfield, chrome
word-art, a corner **CRT showing a live mini-render** of water+boids). The Calzone
install **relocated here**; on complete the camera pushes through the CRT into the
beach shop. Lazy three.js throughout.

## ✅ Phase 3 — THE WORLD GROWS (COMPLETE; mobile/README tail open)
The world went from one room to a **graph joined by 3D doors** (`src/data/
rooms.ts`, three-free). beach shop (`ROOMS[0]`) ⇄ **rat hallway** (3D-Maze brick)
⇄ **jukebox room**, with the hidden **classified room** the rat knocks open.
- ✅ ckpt1 rooms system + 3D doors (`Doors.tsx`, black-wipe transitions,
  room-aware `Controls`).
- ✅ ckpt2 jukebox room + the music swell (proximity duck via
  `audio.setProximityGain`). **Now shipped on `main`: a real cycling catalog** —
  `public/audio/jukebox/*.wav` (information, 1101, best-day-ever, jolly-roger-bay),
  tape-warbled 8-bit loops rendered from `src/data/jukebox.catalog.json` by
  `scripts/make-jukebox-audio.mjs`; click the jukebox to cycle. (drei
  `<PositionalAudio>` swap can still drop in at `JUKEBOX_POS` later.)
- ✅ ckpt3 the rat (`src/world/Rat.tsx`, one steering agent — leads, then flees).
- ✅ ckpt4 the secret (rat knocks a panel → `revealSecret()` → hidden door → the
  X-Files **classified room** of rejected demos).
- ⬜ **ckpt5 — mobile pass + README** (the open tail of the rooms PR).

---

## ✅ Phase 4 — THE TERMINAL (COMPLETE)
A hidden SGI/X-Files command line, summoned by the **backtick (`` ` ``)** key
anywhere (storefront, every floor, the world) — mounted on the storefront shell
(`Terminal.tsx`), so it's a pure post-hydration enhancement that never touches the
crawlable / JS-off page. Commands are data (`src/data/commands.ts`): `help`, a
dead-web `ls`/`cat` fake filesystem, `about`, hidden eggs (`rat`, `1101`,
`mobius`, `pizza`), and **forbidden** ones (`sudo`/`rm`/`unlock`/`kill`) that fire
the `terminal-forbidden-cmd` `unease` bump — the live Phase-4→5 bridge.
- **Persistence link (the "site remembers you", made legible):** `status` and a
  recognising `whoami` read the durable `progressStore` snapshot (depth, rooms,
  secrets, visits) via `CommandCtx.progress`; summoning the terminal records
  `findSecret('terminal')`. Verified by `shoot:terminal` (incl. the JS-off
  crawlable guarantee).

---

## ⬜ Phase 5 — THE DREAD LAYER (the `unease` conductor)
**The full spec lives in `docs/DESIGN.md` → "The dread layer."** This is a
*modulation* layer: it builds **no new place**, it wires one `unease` value
(0→1) to knobs that already exist. If you're writing a new system, you've left
Phase 5 — stop. Honor **both** guardrails, especially the taste one.

Build in this order, checkpoint at each. **Trim point:** steps 1–3 are the
viable spine (audio bed + visual ramp make it visceral). Ship 1–3, then the rat,
then the CRT beat. Don't expand a step to compensate.

1. **The conductor.** `src/data/dread.ts` (`baseUnease` per room, `dwellRate`,
   `decayRate`, `triggers`) + an `unease` value in zustand, driven by depth /
   dwell / triggers, decaying in safe zones. Expose `unease` + its mapped targets
   in `leva` to drive it manually. *Checkpoint: I watch `unease` rise deep / fall
   near the surface, and can force it with a slider.* Live triggers: depth, dwell,
   classified room, machine room. Dormant (declared): terminal commands (Phase 4),
   the Möbius loop.
2. **Audio dread bed (the centerpiece — spend the most time here).** Sub-bass bed
   scaled by `unease` (with **missing-fundamental** harmonics at 2×/3× so phone
   speakers imply the low pitch); wow/flutter + bitcrush curve; *rare* dropouts
   that **fade back, never spike**; one behind-you positional cue; **mobile
   haptics** as the chest-thump on phones. All respect mute. *Checkpoint: at high
   unease I feel it before I see anything; surface zones sound fine.*
3. **Visual ramp.** Wire PS1 shader uniforms (vertex jitter, affine, color depth,
   dither), fog density, camera bob/shake, vignette to `unease`; the rare
   one-frame dim/small/low-contrast peripheral shape. **WCAG 2.3.1** holds
   (≤3 flashes/s, no full-field flash). *Checkpoint: the world destabilizes
   smoothly deep, calm at the surface.*
   - ⚠️ **Pre-req to verify when starting step 3:** confirm the PS1 params in
     `src/world/ps1.ts` are live, per-frame-animatable **uniforms** (not baked
     constants). If baked, lifting them to uniforms is part of this step.
4. **The rat turns.** Drive its boids weights from `unease` (cute/guiding → stops,
   faces you, doesn't flee). Same agent, inverted. *Checkpoint: deep + lingering,
   the rat stops being friendly.*
5. **Hero beat + curdled copy.** The machine-room CRT renders **a faked low-poly
   figure of the player** (render-to-texture, **never a real camera**). One
   curdled line of existing copy, **gated on persistence** (only a returning
   deep-diver sees it): "An employee will call to verify your order. An employee
   is already inside." The single set-piece — don't add more.
6. **README:** how the curve is tuned (`dread.ts`), and the hard rules (surface
   zones never enter dread; no real camera/mic ever).

---

## ⬜ Phase 6+ — World-content backlog (build in any sensible order)
These extend THE WORLD GROWS and are detailed in `docs/DESIGN.md`. They are
*content/systems*, not the dread layer — though the dread conductor modulates
each once it exists.

- **The persistence spine (do this early — others depend on it).** localStorage:
  depth reached, max-`unease`, secrets seen, rooms found, door-games cleared →
  returning visitors get a quietly-changed world. The retention mechanism.
- **GLB levels below the shop.** Crunch `media/models/levels/` + `greek-vaporwave`
  to PS1 fidelity (`gltf-transform`), lazy-load per level, hidden behind the
  descent. **Provenance homework before any ships** (drop NC / unprovenanced /
  Nickelodeon IP). These are the *bitter* deep liminal spaces.
- **Recurrence / the Möbius loop.** Looping rooms (Scooby-Doo gag at low unease →
  oppressive deep); seeded shuffle over hand-authored variants; never a fail-maze.
  Home for the Möbius motif (`media/models/mobius/`).
- **The minigame / loader layer.** Loaders-as-ritual masking GLB loads (tap-to-
  enter; Domino's-grammar tracker skin; ZzFX sound) + door-games that clear into
  localStorage unlocks. One tiny base (vanilla canvas / Kontra / BSD runner),
  never a second engine, never a tax on the real links.
- **The d20.** Dice-music selector (lightweight, sooner) + the dice-monster
  roll-off (lose → it grows → walk around it; a *new NPC/encounter*, so it's
  world-content, not Phase 5).
- **The plain `/about` page.** A normal, crawlable page telling the Scoobert story
  PLAINLY (linked "Our Secret Recipe →"); research from lukefwalton.com/music
  /#scoobert, /love-music-more/, and lovemusicmore.substack.com before writing.
- **The Doom / Freedoom shrine.** Hidden lazy route; Freedoom (BSD) assets only;
  `THIRD_PARTY_NOTICES.md`; isolated. (Full protections in DESIGN.)

## ⬜ Post-loop — wire up `fun/`
`fun/` is a git submodule of half-built JS music apps. Init it first, then borrow
tastefully — this is where the **instrument rooms** ("play it") come from: the
generative-synth toys become discovered exhale-valves deep in the descent
(optionally hand-played via the consensual, fully-local webcam — see DESIGN).

---

## Open hygiene / notes
- **Media reorg (done on `main`, 2026-06-20):** source media now nests under
  `media/` (`media/masters`, `media/music/<year>`, `media/photos`, `media/sfx`,
  and the GLB troves under `media/models/<category>`). Old loose root folders are
  gone. Only degraded/web-sized derivatives under `public/` ship.
- **Review-bot loop:** runs ~3 min after a push and **edits its single comment in
  place** — no webhook fires for the edit, so don't rely on webhooks. After
  pushing, do other work, then re-fetch the PR comment via the GitHub API and act
  on it. Known false positive: it flags `/PIZZA.png` as a 404 (truncated diff);
  the file IS in `public/` → `dist/`. Ignore it.
- **Self-verify with Playwright** before visual checkpoints: `npm run shoot`
  (incl. JS-disabled), `shoot:world`, `shoot:descent`, `shoot:rooms`,
  `shoot:fallback`.
