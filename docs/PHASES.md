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
| 5 | The dread conductor (`unease` modulation layer) | ✅ built (steps 1–5 live) |
| 6 | World-content (GLB levels, loader, möbius, dice, shrine→metro→terminus, practice) | ✅ largely shipped |
| — | CI + smoke gate, repo DRY pass | ✅ shipped |
| 7+ | `fun/` instruments → `/chimes` + `/cultures` cabinets + reusable bell engine (shrine furin) | ✅ shipped; small tail |
| 8 | The game layer — LUCK + universal d20 (nat 20 / crit fail 3×), spells, perception, the full arcade | ✅ core shipped |
| — | GifCities pass — own GIF89a encoder + original GIFs, retro floor furniture, mobile "try desktop" gag | ✅ shipped |

Cross-cutting: the **persistence spine** (`progressStore`, localStorage) underpins
retention, the curdled copy, cleared-games, and dread's max-`unease` memory —
✅ landed, read by the terminal + dread + the curdled-copy gate.

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
  `audio.setProximityGain`). **Shipped: a real cycling catalog** — an 18-track
  aquatic set in `public/audio/jukebox/*.mp3` (optimized MP3, **no WAV ships** —
  the repo is WAV-free), tape-warbled low-bitrate loops rendered from
  `src/data/jukebox.catalog.json` by `scripts/make-jukebox-audio.mjs`; click the
  jukebox to cycle, and a user track-switcher (`src/data/music.ts` CUES +
  `musicStore`). (drei `<PositionalAudio>` swap can still drop in at `JUKEBOX_POS`.)
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

## ✅ Phase 5 — THE DREAD LAYER (the `unease` conductor) — BUILT
**The full spec lives in `docs/DESIGN.md` → "The dread layer."** This is a
*modulation* layer: it builds **no new place**, it wires one `unease` value
(0→1) to knobs that already exist. If you're writing a new system, you've left
Phase 5 — stop. Honor **both** guardrails, especially the taste one.

**Live:** the conductor (`DreadConductor` rAF + `dread.ts` score) drives `unease`
from zone base + dwell/decay, records the high-water mark to persistence, and
feeds the audio sub-bass bed (`setDreadLevel`), the PS1/fog visual ramp
(`DreadVisuals`/`DreadVignette`), the rat's inversion (`Rat.tsx`), and the
persistence-gated curdled copy (`selectDeepDiver`). The terminal's forbidden
commands + the Möbius/dice pokes are wired triggers.
- **Deep-room coverage:** `baseUnease` now tunes every deep room (dicepit, mobius,
  liminal, deeppool, metro-tunnel) — the shrine stays a *sweet* relief beat
  (below SAFE, so it decays). Before this the post-ckpt1 rooms read dead-safe.
- **Safety guard:** a brickwall **output limiter** (`DynamicsCompressorNode`,
  master → limiter → destination) sits across ALL audio, so no sum of sources or
  sudden onset can spike the speakers (WCAG 2.3.1 audio rule + ears). Covered by
  `shoot:dread` alongside the dosage curve (sweet surface/shrine, bitter deep).

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

## ✅ Phase 6 — World-content (LARGELY SHIPPED)
These extend THE WORLD GROWS (detailed in `docs/DESIGN.md`); content/systems, not
the dread layer (which modulates each). Most of this is now live behind the
descent, each covered by a `shoot:*` smoke:

- ✅ **Persistence spine** (`src/state/progressStore.ts`, localStorage): depth,
  max-`unease`, secrets, rooms, cleared games → returning visitors get a
  quietly-changed world. The terminal's `status`/`whoami` read it.
- ✅ **GLB levels below the shop** — lazy-loaded PS1-crunched levels: the
  poolrooms → liminal space → the deep **abandoned pool** (`shoot:levels`,
  `shoot:deeppool`), the **backrooms-vr** terminus. Each shipped model has a
  `THIRD_PARTY_NOTICES.md` entry (enforced by `scripts/check-build.mjs`).
- ✅ **The loader layer** — `LevelLoader` covers each GLB load with a calm panel
  and AUTO-ENTERS the instant it resolves (the old tap-to-enter tracker minigame
  was removed — loads are fast enough that it broke the flow), with a graceful
  TURN BACK on load failure. The shared smoke flow lives in `scripts/lib/smoke.mjs`.
- ✅ **Recurrence / the Möbius loop** (`MobiusRoom`, `shoot:mobius`): one corridor,
  comic at low unease → oppressive deep; breaks open after N laps. Not a fail-maze.
- ✅ **Wayside shrine → undersea metro → "End of the Line"** — the shrine (sweet
  relief beat) follows the tracks into the **metro tunnel** (Seikan/青函 neon,
  shitty-shinkansen pass; `shoot:metro`) out into the backrooms **terminus**
  (`shoot:terminus`).
- ✅ **The d20 + dice monster** (`DicePitRoom`/`DiceMonster`, `shoot:dice`/
  `shoot:monster`): roll-off; lose → it grows → walk around it.
- ✅ **The practice room** (`PracticeRoom`, `shoot:practice`): a door-game +
  instrument room — the first "play it" rung; clearing it promotes a demo to your
  preferred jukebox track. (Also the junction down to the **Basement Sessions**
  studio wing — Phase 8.)
- ✅ **Poke Scoobert** (`FaceStretch`, `/poke`): the face-stretch instrument —
  pull-and-hold warps his own sample live (touch-first).

**Remaining tail (small):**
- ✅/⬜ **`fun/` instruments — borrowed by VENDORING (the repo stays standalone).**
  Rather than submodule `fun/`, the two pure-synthesis instruments were ported and
  **re-homed as our own files** (so `fun/` can be deleted — Luke's ask). Shipped as
  touch-first arcade cabinets: **`/chimes`** (Pendulum Chimes — `src/lib/chimes.ts`
  + `ChimesCabinet`) and **`/cultures`** (the DNA cell-drone — `src/lib/cultures.ts`
  + `CulturesCabinet`), both synthesised, mute-aware, brickwall-limited, crawlable,
  covered by `shoot:chimes` / `shoot:cultures`. **The bell synth is a reusable
  engine** (`strikeBell` → `audio.playChime`): it also rings the **furin** in the
  Wayside Shrine — the first "use the ENGINE for in-room effects" (Luke). ⬜ More
  in-room/"odd-thing" uses + a possible deep instrument ROOM (vs. surface cabinet)
  remain; the webcam stays its own gated thread (DESIGN → Webcam policy).
- ⬜/❓ **The Doom / Freedoom shrine — likely DROPPED.** The point of it (a hidden,
  lazy, dread-tinged liminal level) is effectively already delivered by our OWN
  GLB levels (deep pool / liminal / backrooms) — without taking on Freedoom's
  copyleft + provenance burden. Only revisit if we specifically want the *Doom
  grammar*; otherwise leave it unbuilt. (`/about` is intentionally NOT on the
  roadmap — out of scope, per Luke.)

---

## ✅ Phase 8 — THE GAME LAYER (core shipped, 2026-06-21)
The "let's make a damn game" pivot (Luke). Full spec in `docs/DESIGN.md` → "The
game layer." DESIGN pillar #6's "no stats / no HUD" was lifted (`CLAUDE.md`
ADDENDUM 7); the taste/WCAG/crawlable lines are untouched.
- ✅ **Universal d20** (`src/lib/luck.ts`, unit-tested): luck-biased rolls, **nat
  20 / crit fail as a 3× swing across the board.** Luck buys advantage; the system
  spends it (never the player).
- ✅ **LUCK stat** (`progressStore`, durable): earned at the **shrine clap** (二拍手),
  **shown in the pause menu**, **announced on gain** (`toastStore` + `WorldHud`).
- ✅ **First dice-combat:** the goblin bout (`D20`/`DicePitRoom`/`monsterStore`) is
  crit-aware — nat 20 auto-wins + +3 luck, crit fail bloats it 3×. `shoot:luck`.
- ✅ **Inventory + keys (engagement pass):** durable `itemsHeld` (`progressStore`),
  a pause-menu **"Pockets"** list, `ItemPickup` collectibles (`Room.pickups`), and
  **locked doors** (`RoomDoor.requiresKey`) via the shared lock-aware `enterDoor`
  (`src/lib/doorTravel.ts`). First loop: the rusted key on the poolrooms deck opens
  a **Staff Locker Room** (a safe side nook, +2 luck on first entry). Keys may only
  gate **side/secret** doors — a dev guard + `MAIN_DESCENT` set reject any
  `requiresKey` on the descent (friction budget). `shoot:keys`, `doorTravel.test`.
- ✅ **Dancing entities (engagement pass):** `Wanderer` roams the GLB liminal
  levels (liminal / deeppool / metro-tunnel / terminus, `Room.entities`) and
  **dances** when you get close — never attacks (taste/WCAG: gentle, capped under
  reduced-motion, GLB-only). `shoot:entities`.
- ✅ **Arrival-spawn contract guard:** fixed grove/frutiger spawning ON their exit
  prompt; `spawnFacingInward` + a dev guard + `rooms.test` assert every spawn lands
  clear of, and facing away from, its doors (the "wrong side of the map" fix).
- ✅ **The Boardwalk wing (world-content):** a sweet SoCal **surface** branch off
  the shop (a +X screen door, NOT the descent) — **The Boardwalk** (golden-hour
  pier over the crunchy sea), **Moonlight Beach** (a moonlit sit-and-watch
  breather), and a **Park Path** (the Balboa fountain). Introduces **`Room.song`**:
  a room owns the loop voice while you're in it (a `jukebox.catalog` slug) and
  hands it back on exit (`musicStore.restorePreferred`) — "exploration's reward is
  sound," no new collectible. Reuses the shipped `Water` (now tint/placement-
  configurable), `palm-tree`/`arcade-cabinet` props. `shoot:boardwalk`,
  `music.test` Room.song guard. Surface stays sweet (taste guardrail).
- ✅ **The Sunken Gallery wing (world-content):** a submerged vaporwave-classical
  hall off the poolrooms — **The Sunken Gallery** (a colonnade of **crunched greek
  GLBs** from the trove: doric + ionic columns, a centre sculpture, a broken
  statue, amphorae; knee-deep flood, dim teal, funny-uncanny) opening onto
  **Daydream** (a pastel watercolor-sky breather — the taste-guardrail contrast).
  Both song-rooms (`underwater` / `watercolor-sky`). Crunched via the documented
  `gltf-transform optimize … --texture-size 256` pipeline; `THIRD_PARTY_NOTICES.md`
  rows added; IP-flagged trove models still excluded. `shoot:gallery`.
- ✅ **The greek lyre — a "play it" instrument in the Sunken Gallery (2026-06-25):**
  a procedural, pluckable 7-string lyre (`GreekLyre.tsx`) set among the statuary
  (it mirrors the broken statue across the nave). Each string is a pentatonic note
  played through the shared bell engine (mute-aware + limited); original parody
  geometry, no sourced model. Advances the music ladder's "play it" rung in a deep
  room. `shoot:gallery` now plucks a string.
- ✅ **The pizza pan chimes — a "play it" instrument in the park (2026-06-27):** the
  SURFACE, sweet counterpart to the gallery lyre — a busker rack of tuned PIZZA PANS
  (`PizzaPanChimes.tsx`) in the Park Path (`balboa`), the site's pizza→music thesis
  made playable. Six pans, a C-pentatonic ladder (naturals → no wrong notes), each
  struck (click or the `__sdpStrikePan` hook) rings a bell-pluck through the shared
  engine (mute-aware + limited) and swings/glows the pan. Self-lit emissive so the
  metal reads against the behind-it sun; original parody geometry. `shoot:boardwalk`
  now strikes a pan (asserts the E4 note via `__sdpPans`).
- ✅ **The Basement Sessions wing — a 4-room recording studio (2026-06-27):** the
  biggest album-themed wing yet, down off the **practice room** ("backstage, where
  the records get MADE"). A hub **Live Room** (warm tracking room) branches to the
  **Control Room** (slanted mixing desk + reel-to-reel decks + a window onto the live
  room) → the **Tape Vault** (a hushed archive of shelved reels), and a sweet
  **Lounge** breather (couch, bobbing lava lamp, the rat asleep in the good armchair,
  a CRT playing "Finding SD"). The play-it ladder's biggest beat: the Live Room mounts
  a **playable 3-piece band** — a 6-piece **DrumKit** (rhythm), a 4-string
  **StudioBass** (a low C-arpeggio bottom end), and an 8-key C-pentatonic
  **StudioKeys** (melody), all locked to one C tonality (no wrong notes) and rung
  through the shared bell engine (mute-aware + limited), original parody geometry,
  deterministic strike hooks. **Song
  design (a real studio breathes):** the two "playing" rooms sing (`Room.song`: live =
  `mystery-machine`, lounge = `jolly-roger-bay`); the two "working" rooms stay hushed
  so `information` + `1101` stay jukebox SEEDS — and their **master tapes** are
  collectible in the vault (3 `trinket` items + `Room.pickups`, each plays its track on
  pickup + feeds the lost-cassettes quest). Lore-true: he tracked a whole LP alone (the
  bathrobe slung on the mic stand) and Finding SD was written/recorded/mixed/mastered
  in a single day (the framed gold record = every fader his own hand). The wing's
  **"discover" rung:** tuck the blanket over the sleeping rat for a sweet one-time
  secret (`lounge-rat` + luck) — the storefront's "RAT SPOTTED IN WALL" tease finally
  paid off (taste: you never wake it). 4 mined whispers, pause-menu minimap coords,
  `shoot:studio` (tours all 4 rooms, plays all three instruments, collects a master
  tape, tucks in the rat, asserts the working rooms stay hushed, walks every door both
  ways, proves the pocketed station carries back to the storefront); `rooms.test` /
  `music.test` / `jukebox.test` guards.
- ✅ **D&D mechanics — the trap-door luck-d20 (2026-06-26):** the chute is a real
  luck-biased d20 (`rollD20(true)` + `trapDropForRoll`): the face ordinally picks
  WHERE you drop (unluckiest → luckiest room), a nat 20 drops you somewhere sweet
  and a nat 1 somewhere wrong, each with a crit flourish. `shoot:trapdoor`.
- ✅ **Spells — earn one, cast it (2026-06-26):** you can now learn a spell from a
  found scroll and cast it. **Fireball** (a WCAG-safe AoE that lights the room) and
  **Light** (a cantrip glow) live in `src/data/spells.ts`; casting spends a slot
  (two monotonic counters in `progressStore`), **rest restores slots** (shrine clap
  / breather rooms), and a cast feeds the dread-**relief** pool — a sanctioned way
  to push the unease back. Multi-spell hotbar in the HUD. `shoot:spell`.
- ✅ **Perception whispers (2026-06-26):** each room entry rolls a **plain d20
  perception check** (DC 12; luck stays reserved for the stakes rolls, so a
  high-frequency check never drains it); on a hit you catch a room-specific whisper
  (lore mined from lukefwalton.com, so the repo stays standalone). `shoot:whisper`.
- ✅ **The jukebox dice crits — the "gamble for it" payoff (2026-06-26):** the music
  ladder's top rung lands its crits. The cabinet d20 (`rollD20(false)`) already
  jumped the dial to the rolled track; now a **nat 20 = "the pristine pressing"**
  (sparkle) and a **nat 1 = "the cursed pressing"** (a detuned womp + `crit-bad`
  toast) — DESIGN's share-fuel beat, goofy-sweet (taste). `shoot:dice` forces both.
- ✅ **The grass encounter (in DESIGN, now shipped):** a **rare Pokémon-style
  grass-level encounter** vs the wild goblin — the field mounts, the encounter fades
  to a battle room, and winning the d20 roll-off opens the grove + records the
  unlock. `shoot:grass`.
- ✅ **The Grassrooms (草の間) + the 3D ghost race (2026-06-28, from Luke's
  r/LiminalSpace inspiration):** a **fully sweet liminal breather** off the
  `liminal` GLB level — the backrooms after nature wins (white office bones gone to
  grass + indoor trees + blue wildflowers, the low ceiling broken open to an
  impossibly blue sky), **sized as a 48×48 racecourse**. A `musicRoom` with its own
  wind + furin ambient; `baseUnease` below SAFE. Hosts **ゴーストレース / RACE THE
  GHOST** — a real in-world, first-person **lap race** against a floating ghost
  character (checkpoint gates, 3·2·1·GO countdown, hold SHIFT to sprint, first to 2
  laps; `raceStore` + `world/GhostRace` + `components/RaceHud`). Losing is an
  anticlimax + auto-rematch; winning gives +3 luck + the clear. Words stay EN + JP.
  `shoot:grassrooms` drives the countdown→racing→won state machine (+ the room
  graph/map/dread/whisper wiring; full unit suite green).
- ⬜ **Tail / backlog (in DESIGN):** further album-themed wings (the **Basement
  Sessions** studio wing is the first big one — shipped above). (Trap-door d20,
  spells, perception whispers, the grass encounter, storefront reactivity, the greek
  lyre, and the full arcade are all shipped.)
- ✅ **The arcade grew — three reskinned cabinets (2026-06-25):** **Crusteroids**
  (Asteroids), **Slice Breaker** (Breakout), **Jazz Snake** (Snake, every bite
  plays the next note of a climbing scale). Original code + procedural art + own
  audio, classic mechanics only (no marks; provenance in `THIRD_PARTY_NOTICES.md`).
  Each is a self-contained `<canvas>` (no three.js), touch-first (an on-screen pad
  for the games that need one), with a **per-cabinet high score** (`arcadeHighs`
  map in `progressStore`, monotonic per id). They join the in-world cabinet's
  random roll (`arcadeGames.ts` + `ArcadeModal`) AND get standalone mobile routes
  (`/crusteroids`, `/slice-breaker`, `/jazz-snake`) through a shared, DRY
  `ArcadeCabinetPage` shell. Covered by `shoot:games` (JS-off crawlable + JS
  mounts/starts/persists) + `arcadeGames.test`.
- ✅ **…and completed — five cabinets (2026-06-26):** added **Pizza Radar 1996**
  (Space Invaders, green-phosphor) and **Burrito Belt** (a falling-blocks stacker
  with an on-screen held soft-drop for touch), filling out the shelf via the same
  plumbing — standalone routes (`/pizza-radar`, `/burrito-belt`) + the in-world roll.
  Their two RAF lose-rules were lifted into pure, unit-tested predicates
  (`arcadeRules.ts`) and their REAL game-over paths are exercised by `?debug`-only
  force-lose hooks in `shoot:games`. The cross-link shelf is now DERIVED from the
  registry and a route-parity test (`routes.test.ts`) guards `routes.tsx`, so the
  cabinet set can't drift across its parallel lists.
- ✅ **…and a sixth — Delivery Dash (2026-06-28):** a cross-the-traffic pizza-courier
  cabinet (Frogger grammar, original code/art/audio): hop the scooter up through five
  lanes of traffic to the door, deliver, and start again a notch faster; a clip ends
  the run. Same plumbing as the others — registry + `ArcadeModal` + the in-world roll
  + a standalone `/delivery-dash` route through `ArcadeCabinetPage`, a per-cabinet
  high score (`arcadeHighs['delivery-dash']`), and a `?debug`-only `__sdpDashForceLose`
  hook driving the real game-over branch in `shoot:games`.
- ✅ **Lyrics + the terminal's brain (2026-06-25):** verbatim **lyrics** for the
  catalog (`src/data/lyrics.*`) read along in the pause menu + the `lyrics`
  terminal command; **Love Music More** (`lmm`) and **lore** (`lore`) + a
  `discography` listing in the terminal — all mined + grep-verified from
  lukefwalton.com so the repo stays standalone.
- ✅ **The terminal surfaces the game layer (2026-06-26):** three new commands make
  the RPG layer legible + playable from the command line — `luck` (your banked luck +
  how the system spends it for D&D advantage; "be lucky"), `spells` (your spellbook +
  the key that casts each + your slot count), and `roll` (roll the universal d20 right
  there — your luck nudges it via advantage, a free peek that never spends). All PURE
  reads of the progress snapshot (commands.ts stays store-free); the pure d20 math was
  split into `src/lib/luck-core.ts` so a store-free command can roll, with `luck.ts`
  re-exporting it (every existing importer unchanged). `commands.test.ts` + `shoot:terminal`.
- ✅ **Real in-world VIDEO (`src/data/videos.ts`, 2026-06-25):** the CRTs now play
  the *right* clip, not one generic playlist. Each song/album carries a **verified**
  YouTube id (mined from `lukefwalton.com`, grep-checked — no hallucinated ids); a
  CRT resolves its clip through one chain — the song's OWN music video → its record's
  video → the general TV-spots channel — so a room declares only what it has
  (`tv.songSlug` / `tv.albumSlug`). Playlist-vs-video embeds are auto-detected
  (`ytEmbed`). **Memory Lane** (one live set in the corridor of dead web → the real
  MEMORY LAN MV) and **the server void** (the "all my friends" video) got CRTs;
  `albums.json` got `video` ids for 8 records. Covered by `videos.test.ts` (well-formed
  ids + the resolution chain + a room-CRT guard) and `shoot:tv`. "The reward for
  finding a song-room is its picture, too."

## ✅ GifCities pass — our own GIFs + retro furniture + the mobile gag (2026-06-26, PRs #76–#77)
The surface floors got the gaudy late-90s/GeoCities energy they were missing — all
ORIGINAL, no fetched artifacts (the agent proxy blocks archive.org / gifcities.org
anyway), which makes the joke land harder: a 2026 site that PRINTS its own 1999 GIFs.
- ✅ **A hand-rolled GIF89a encoder, zero deps (`scripts/lib/gif89a.mjs`):** indexed
  palette, animation frames w/ per-frame delay, NETSCAPE2.0 looping, and correct
  variable-width LZW (the Weiner/omggif code-width timing — an off-by-one here
  desyncs a real decoder at the first width bump, which a self-consistent test would
  miss). `make-gifs.mjs` generates the assets; `gif89a.test.mjs` round-trips every
  frame; **`shoot:gifs` decodes each GIF in real Chromium** (the spec oracle that
  caught that width-bump bug) and rewraps every later frame's verbatim bytes to
  validate them too. Fail-fast palette-index validation; spec-correct LSD color bits.
- ✅ **Four original GIFs (`public/gifs/`):** a bopping **dancing-pizza** (the site's
  "dancing baby"), a scrolling **construction** caution-bar, a shimmering **rainbow
  `<hr>`**, and a tiled **starfield wallpaper** — each animated GIF paired with a
  1-frame `*-static.gif` served under `prefers-reduced-motion` via `<picture>` (a
  GIF can't be paused in CSS, so the still IS the WCAG 2.3.1 accommodation).
- ✅ **Retro floor furniture (1999/2000, original CSS in the GifCities grammar):** a
  twinkling sparkle divider, an animated under-construction barber-pole, a green-LCD
  hit counter, "BEST VIEWED IN…" badges, a Pizza Webring (real prev/hub/next
  anchors), a spinning @-mail. The 1999 floor wears the starfield wallpaper (dark →
  the floor's light text gains contrast). Verified no horizontal overflow at 390px.
- ✅ **Mobile "try desktop" gag (`MachineRoomFloor`, PR #77):** on a real handheld
  (`isSmallScreen()` = `≤768px` + `pointer: coarse`), the Calzone Player install pops
  a period "Setup" error — the plug-in needs a desktop, *pocket phones didn't exist
  in 1996* — instead of silently dumping to `/text`. It still links onward to `/text`
  (a real `<a>`, never a dead end — the constitution's rule holds). Accessible modal:
  focus trap, Escape, backdrop dismiss, focus restore; a resized desktop window (fine
  pointer) skips it. `shoot:descent` covers both sides of the boundary + every
  dismissal path.
- ✅ **"Sign My Guestbook!" — a real anchor, not décor (follow-up PR):** the 1999
  marquee has teased "★ SIGN OUR GUESTBOOK ★" since launch with nowhere to go; the
  starburst floor now carries a real **`<a>` → the `contact` destination** (the
  webmaster who "reads every comment" = the guestbook contract), so the promise is
  finally crawlable, never a `#`. Beside it, a **"NEW!" blinky** printed by our own
  encoder — `new-badge.gif` from `make-gifs.mjs` (a 5px hand-set font, the encoder's
  one non-font-free exception), 2 frames at ~1.1 Hz with a <0.1 luminance swing and a
  `*-static` twin under reduced motion (triply WCAG 2.3.1-safe). `shoot:gifs` decodes
  both new frames in real Chromium; navy-on-gold button ≈ 10:1 contrast; no 390px
  overflow.
- ✅ **The 2000-floor @-mail is now a printed GIF (follow-up PR):** the CSS-spun "@"
  is replaced by `atmail.gif` from our own encoder — a little envelope that bobs with
  a pulsing red "1" badge (you've got mail), still wrapping the real `mailto` anchor.
  WCAG 2.3.1: a 1–2px bob + 1px badge pulse (no flash/blink), `*-static` twin under
  reduced motion. `shoot:gifs` validates all 6 frames in Chromium; no 390px overflow.

## ✅ Arcade gameplay pass — interactive music, walk-over pickups, PIZZA POINTS + a leaderboard (2026-06-28)
The "make it a fun game you come back to" pass (Luke). Four chunks, each its own
commit + smoke:
- ✅ **Music never steps on itself** (`audio/engine.ts`): every loop-voice swap now
  CROSSFADES (per-source gains; the outgoing source fades + frees itself, the
  incoming fades up) instead of hard-cutting, and `playJukeboxTrack` short-circuits
  when the requested url is already the live voice (no restart-from-top when a
  song-room's song == your pick, or RoomMusic races `restorePreferred`). `shoot:music`
  asserts the same-URL guard via a `__sdpLoopStarts` counter.
- ✅ **Walk-up + press-P pickups** (`world/PickupController.tsx`, `lib/pickups.ts`):
  one per-frame scan (like Doors) publishes the nearest collectible to
  `sceneStore.nearPickup` → a "Press P to grab …" prompt, and auto-grabs on
  walk-over once you've stepped off the spawn. Clicking still works; KEYS are
  excluded from auto-grab (intentional/puzzle items). The collect effect is shared
  (`collectInventoryItem`) so click / walk / P / the smoke hook can't double-collect.
- ✅ **PIZZA POINTS — the collectathon** (`data/loot.ts`, `state/scoreStore.ts`,
  `lib/loot.ts`, `world/LootPickup.tsx`): goofy loot (🍕🌯🍣🛹🏄) scattered
  DETERMINISTICALLY across every procedural room (seeded, inside the clamp, off
  spawns/doors; GLB levels skipped), respawning each descent. Grabbing one scores
  points × a combo (grabs inside a 2.5s window multiply, capped ×9), grows your eye
  height (`Controls` adds capped `tallness` — "lol taller"), and rings the next note
  of a climbing pentatonic scale (interactive music — collecting IS a melody). A
  top-right `ScoreHud` (points · live combo · % tall) + the per-grab toast; the
  durable best is `progressStore.pizzaPointsBest` (monotonic). `shoot:score` +
  `loot.test`/`scoreStore.test`.
- ✅ **The arcade leaderboard** (`api/score.ts`, `lib/leaderboard.ts`,
  `LeaderboardPanel`, `/leaderboard`): sign your best with three letters, no login,
  backed by **Vercel Blob** (one route, GET board + POST submit; honeypot +
  validation + a profanity blocklist; mirrors `api/order.ts`). Fully graceful — no
  serverless runtime in local preview just reads as "offline," never an error; your
  best is always kept locally. In the pause menu + a crawlable `/leaderboard` route
  (JS-off shell, postbuild-guarded). Dressed in **CRAZY original gifs** (a gleaming
  trophy, licking flames, raining coins — new in `make-gifs.mjs`/`shoot:gifs`, each
  with a reduced-motion `*-static` twin) over a starfield hall-of-fame.
  `shoot:leaderboard`.

## Open hygiene / notes
- **CI + smoke gate (shipped):** `.github/workflows/ci.yml` runs typecheck +
  build + `npm run shoot:all` (auto-discovers every `shoot:*`, one preview, retry-
  once). A `shoot`/`shoot:*` script == a CI-gating smoke; non-gating helpers must
  avoid that prefix. Shared smoke flows live in `scripts/lib/smoke.mjs`. See
  `README.md` → Self-verification.
- **Repo DRY (shipped):** the PS1 `flatMat` material helper is one export in
  `src/world/ps1.ts` (was copy-pasted into 13 rooms); the `?world`/`?debug` smoke
  globals all route through `src/lib/testHooks.ts` (`isTestEntrance` /
  `exposeTestGlobal`); the arcade cabinet set is one registry (`arcadeGames.ts`)
  the shelf derives from + a route-parity test guards (no parallel lists drift).
- **Component decomposition (shipped):** the 825-line `WorldHud` was split into
  self-sufficient children — `WelcomeOverlay`, `SpellHotbar`, `PauseMenu` — each
  reading its own store slices, so the HUD is no longer a monolith.
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
  `shoot:fallback`, `shoot:gifs`.

## What's next (planned, as of 2026-06-26)
Candidate next chunks — no fixed order, pick by appetite (and re-check the SCOPE
guardrail before anything that adds a place/NPC/system):
- **Mobile polish sweep.** The era floors are universal, so phones are a first-class
  surface. Audit every mobile view (storefront, 1999/2000 floors, machine room,
  `/text`, jukebox, the standalone arcade routes) for other letdowns like the
  install one — overflow, contrast, tap-target size, the descent flow — and fix
  them. Screenshot-driven; pairs naturally with a `shoot:*` mobile pass.
- **More GeoCities fun.** ✅ The **"Sign My Guestbook"** anchor (→ `contact`), the
  **"NEW!" blinky**, and the printed **@-mail envelope** GIF all shipped (above).
  Still open: more **blinkies** on other surfaces, a spinning-globe / flame divider —
  extend the retro furniture while adding real nav anchors, not just decoration.
  Reuses the GIF89a encoder (`make-gifs.mjs`) already in the repo.
- **3D world delight.** ✅ First beat shipped — the **pizza pan chimes** "play it"
  instrument in the park (above). More to feed the "exploration's reward is sound"
  spine on desktop — another easter-egg, a room touch, or an NPC beat. The biggest
  open backlog (Phase 8 tail) is **further album-themed wings.**
- **Close the small tails.** The Phase 3 mobile/README note and the Phase 7
  instruments tail are the loose ends still flagged in the table above.
