# scoobertdoobert.pizza — DESIGN NOTES (the vision & feel)

The *why* and the *feel*. `CLAUDE.md` is the rules you must not break; `docs/
PHASES.md` is what to build next; this file is what the thing is trying to *be*,
so that every build decision can be checked against it. Re-read alongside the
other two each session.

If a feature doesn't serve one of the pillars below, it probably doesn't belong.

---

## What it actually is (in one breath)

A sweet, goofy late-90s pizza site you fall *through* — for the music — that
quietly remembers you, hides a few shareable secrets, lets you hear, play, and
gamble with sound, and gets a touch *wrong* the deeper you choose to go… with
the light always one short climb back up.

It is a **liminal / backrooms / 90s-nostalgia dive** first. The RPG touches
(items, a little narrative, forward momentum) exist only to give people a reason
to come back and share it. It is NOT a full RPG, NOT a horror game.

---

## The pillars (load-bearing — check every feature against these)

1. **Exploration's reward is sound.** This is the spine. Going deeper and poking
   around is rewarded with music, in three escalating modes of *agency*:
   **hear it → play it → gamble for it.** (See "The music ladder.")
2. **A memory of the 90s/2000s, not the time itself** — hazy, dreamlike, a little
   wrong. Imperfection is the ideal; degrade on purpose. It's backrooms.
3. **Doors everywhere.** Doors are the connective tissue — flat era floors and 3D
   rooms alike. Items, when they exist, unlock *doors*. Going somewhere new is
   always "through a door."
4. **The site remembers you.** Persistence (localStorage, no backend) is the
   retention spine: depth reached, secrets seen, games cleared, dread tasted. A
   returning visitor gets a world that has quietly *changed*. (See "Persistence.")
5. **Funny-uncanny, never traumatic.** The cheerful surface stays cheerful; the
   contrast with the wrong depths is the entire effect. Restraint is the craft.
6. **Knowledge & keys, never stats.** Progression is *discovery*, not numbers.
   No HP/XP/levels, no combat loop, no objective markers, no real HUD, no fail
   state. The thing that pulls you forward is "what's behind that door," not a
   score. (The model: Yume Nikki, Hypnospace Outlaw, Outer Wilds — you "level up"
   by understanding.)

---

## The friction budget — "a fun jaunt, always solvable in a few beats"

It should never be a hard game. A *touch* of friction, always resolvable within
a few beats.

- **A "beat" = one discrete action or observation** (read a sign, try a door,
  follow the rat, turn around). **"Solvable in a few beats" = the clue and its
  payoff live within ~2–3 actions, and the solution is always already in view or
  one room away from the lock.** Never requires notes, a wiki, or leaving the
  site. If a player would ever think "I'm stuck," the budget is broken.
- **Two tiers, kept separate (this separation is the whole trick):**
  - **The main descent (the jaunt):** *zero* hard gates. You can always go
    deeper. If a door wants a key, the key is in the same room or the one before,
    or the rat hands it to you. Friction is "huh, locked → oh, there's the floppy
    on the desk," resolved in seconds. This is ~95% of the experience and it
    flows.
  - **The secrets / ARG tier (the share fuel):** optional, a little chewier — the
    stuff people *post* about (`/1101` → "save san diego", hidden demos). But the
    difficulty is **noticing the hook, not grinding it.** Once spotted it still
    resolves in a few beats, and a secret never blocks the main path or gates a
    track you "need," so getting stuck on one costs nothing.
- **Collectibles are gifts, not trophies.** Finding a demo should feel like the
  place *handing* you something, not paying out for a hard task.

---

## The dread layer = bitterness in a beer (dosage is everything)

Dread is the bittering agent: take it out and the site is cloying syrup; let it
dominate and it's an undrinkable horror game. It's structural, present, and *a
touch* — it's what keeps the sweet from being sickly and keeps you reaching for
the next sip. **It is never the point.**

This is the heart of **Phase 5** (see `docs/PHASES.md`): one `unease` value
(0→1) that *modulates everything already built* — modulation, not addition.

**Dosage rules (tune `dread.ts` to these):**
- **The baseline lives low.** Most dwell time sits near the bottom of the curve.
  Sweet is the default; bitter is seasoning you go *looking for* by descending
  and lingering. It never ambushes a casual visitor.
- **Generous decay, brief peaks.** Bitter is an aftertaste, not the whole sip.
- **The surface is always the palate.** Storefront and jukebox stay sweet, full
  stop — that's what the bitter contrasts against.
- **Ascending always calms it.** The only "solution" to high `unease` is to head
  back up, where it decays — and going up always works, within a few beats. You
  are never trapped; you can always self-soothe by climbing. The dread is a dial
  *you* turn by choosing how deep to go.
- **When in doubt, dial it down.** Trivial to add bitterness later; an
  over-hopped batch is ruined. The test: *does the goofy still feel goofy right
  after?* If the surface ever stops feeling safe, we overshot.

**Hard safety lines (these can actually injure someone — non-negotiable):**
- **WCAG 2.3.1:** nothing flashes more than three times per second, and no
  full-field high-luminance flash. The peripheral "wrongness" shape is fine
  *because* it's dim, small, and low-contrast — never a bright full-screen flash
  or strobe.
- **The audio injury vector is the *return*, not the silence:** a sudden loud
  onset after a dropout is an audio strobe. Dropouts always **fade back in,
  never spike.**
- **`prefers-reduced-motion` gates the whole 3D world (and thus all dread) off.**
  Camera shake amplitude is capped; the breathing bob is subtle.
- **NEVER real camera/mic for dread.** The "machine sees you" beat is *faked* —
  a stylized low-poly figure rendered to texture, never a real feed. (See
  "Webcam policy" for the one narrow, consensual exception, which is firewalled
  from dread entirely.)

---

## The descent's rhythm (tension → exhale → tension)

The descent must **never darken monotonically** — that's the horror-game failure
mode. It breathes: descend (bitter creeps in) → stumble into a bright goofy beat
(exhale, palate resets) → descend again. The beer-drinking rhythm, made
*spatial*.

- **Relief beats** are placed *between* tension beats so the next bit of bitter
  lands fresh: the instrument rooms, the recurrence gag at low unease, the
  dice-monster, the loading minigames.
- **Relief is also tolerance management** — it resets the palate so you can keep
  drinking (= keep exploring, = come back).
- The deepest scare (the machine sees you) is the peak: brief, then you climb
  back to sweet.

---

## The systems

Each system below names its **register rules** and **where it lives** (phase).
The unifying trick: most of these are *one mechanic that reads sweet near the
surface and wrong in the depths*, driven by the same `unease` conductor — the
rat, the music, recurrence, even the loaders all flip the same way.

### The music ladder — hear → play → gamble (the reward spine)
- **Hear it.** Each descent layer has a track (Luke's map: "Jolly Roger Bay (64)"
  on top / current boot loop, "Information" a layer down, "1101" → the
  `/save-san-diego` ARG). The **"fucked up" version is the same track *curdling*
  with depth** (wow/flutter, bitcrush, detune) — the dread layer applied to the
  layer themes, not a separate asset. Going deep = hearing the catalog, then
  hearing it haunted.
- **Play it.** Instrument rooms (borrowed/adapted from the `fun/` submodule's
  generative-synth toys) where *you* make the sound. They're discovered
  **exhale-valves found by going deep**, not surface toys — bright goofy rooms
  that double as dread relief. Seed *one* light "you can make sound here" touch
  near the surface so the idea's planted early; the real instrument rooms pay off
  deep. (Optionally hand-played via the webcam — see policy.)
- **Gamble for it.** A **d20** (DnD luck/chaos, on-brand goblin-mode) as a
  chaotic music selector — roll picks *which* demo or *how* degraded the variant
  is. Chaos = replayability = share fuel ("I rolled a 1 and got the cursed one").
  Dice are juicy *sound* too (clatter, tumble).

### The `unease` dread conductor (Phase 5 — see PHASES.md for the build order)
- **One value (0→1) in zustand, data-driven via `src/data/dread.ts`** (per-room
  `baseUnease`, `dwellRatePerSec`, `decayRatePerSec`, `triggers`). It maps to
  **target** curves (smoothed, never jumpy) for, at minimum: `subBassGain`,
  `dropoutChance`, `bitcrush`, `fogDensity`, `vertexJitter`, `affineStrength`,
  `cameraShake`, `vignette`, `ratMenace`. Tuning the whole emotional arc lives in
  this one file.
- **Audio is the centerpiece — spend the most time here.** A sub-bass dread bed
  (felt, not heard) scaled by `unease`; tape wow/flutter + rising bitcrush;
  *rare* total dropouts (fade back, never spike); an occasional behind-you
  positional cue (nothing's there); mobile haptics on the sharpest beats.
  Everything respects the global mute.
  - **Translate the bed for real hardware:** put harmonic content at 2×/3× above
    the sub so a phone speaker that can't move 50 Hz still *implies* it (missing
    fundamental — the brain reconstructs the low pitch). Don't mix it only on
    good monitors and ship something inaudible. On mobile, **haptics are the
    actual chest-thump**, not a garnish — design step 2 for translation from the
    start.
- **Triggers — live now:** depth (per-room `baseUnease`), dwell, entering the
  classified room, the machine room. **Dormant (declared, light up later):**
  certain terminal commands (Phase 4), the Möbius loop.
- **Modulation, not addition.** Phase 5 builds no new place. If you're writing a
  new system, stop — you've left Phase 5.

### The rat (exists — Phase 3)
One steering agent (`src/world/Rat.tsx`). Low `unease`: cute, guiding, flees when
crowded. High `unease`: stops, faces you, holds too still, doesn't flee, or is
gone when you look back. Same agent, inverted boids weights driven by `unease`.
The friendliest thing in the world becoming the wrongest is the payoff.

### Recurrence / the Möbius loop (world-content, Phase 3+)
- Looping rooms — the **Scooby-Doo hallway gag** (run in one door, out another,
  the same corridor scrolling by). This is the home for the **Möbius motif**
  (Luke's album "Mobius"): walk forward, end up where you started, slightly
  changed.
- **One mechanic, dual register, driven by `unease`:** low unease → comic
  (exits obvious, breaks on its own, you laugh); high unease → the same loop
  *tightens* (exits subtler, repetition turns oppressive — earned backrooms
  dread). Same geometry, opposite feeling.
- **Never a fail-maze.** There's always an obvious-enough way out (or it breaks
  on its own), and climbing back up always works. *The Exit 8*, but lighter and
  goofier — the loop is the bit, not a trap.
- **"Random engine" = a seeded shuffle over hand-authored variants** (same shell;
  randomized dressing / which door's the way out / which demo plays), NOT heavy
  procgen. Keeps it data-driven and dodges the "debugging procedural mesh
  generation" trap. Fresh on repeat visits (retention).

### GLB levels — bought environments, crunched (world-content, Phase 3+)
- The deeper levels can be whole pre-made environment GLBs (the troves below) —
  cheap **scale and variety** someone else modeled.
- **They must be PS1-crunched to match**, or they read as a different website:
  `gltf-transform` to crunch geometry, textures ≤128px `NearestFilter`, then run
  through the same vertex-snap / affine / fog / dither treatment as everything
  else. (Bonus: a *too-clean* GLB dropped in the fog can itself read uncanny —
  the crunch is both a fidelity fix and a mood tool. "Pristine beside crunched is
  the vibe.")
- **Lazy-load per level**, hidden behind the descent. The big liminal levels
  (pool, backrooms, metro) are the *bitter* end — they sit deep, broken up by
  the goofy relief beats.
- **The HEAVIEST levels go behind the loader minigame — that's the load it earns
  its keep on (Luke).** A 500 KB GLB pops in; a 5 MB one (the abandoned pool, the
  bottom of the water descent, reached GLB→GLB from the liminal) is where "PLEASE
  WAIT WHILE THE PIZZA REHEATS" + the runner actually *masks* a wait. Crunch
  hard, but let the depth carry weight — a heavy deep level is a feature, not a
  budget problem, because the minigame turns the load into ceremony.
- **Provenance is the real homework (we're going public):** verify each GLB's
  actual license — CC-BY needs attribution, **CC-BY-NC can't ship on a public
  site at all**, unprovenanced rips get dropped. Keep `THIRD_PARTY_NOTICES.md`
  current. **`max_and_ruby_house.glb` is copyrighted Nickelodeon IP — drop it.**

### The d20 dice-monster (world-content, NOT Phase 5)
A fake "battle": a dice roll-off vs a monster, **no damage**. Lose and the
monster just gets *bigger* — until it's too big to move and you walk around it.
**The penalty is the solution** (losing literally unblocks you); no game-over, no
chase, solvable in a few beats. It's a **new NPC + encounter system**, so it's
world-content — explicitly *not* the Phase 5 dread layer (which forbids new
NPCs/battles/fail states). The lightweight **dice-music selector** above can ship
sooner; the monster is a later content piece.

### Minigames — two opposite shapes (world-content / infra, Phase 3+)
A tiny easter-egg + loader layer. NOT a "game area" — keep it tiny; don't reach
for Phaser. These are 2D canvas overlays (on the load screen / behind doors),
which sit fine over the 3D world.

- **Loaders are a recurring RITUAL, not a one-off.** A loading moment becomes a
  tiny Scoobert game — "LOADING THE DISCOGRAPHY · PLEASE WAIT WHILE THE PIZZA
  REHEATS" → 15-sec microgame instead of a spinner. Make *descending into a heavy
  level feel like a little ceremony.* (This is the strong version of the idea —
  loaders as a site mechanic, not "one minigame hidden somewhere.")
- **The "tap to enter" mechanic (key design unlock):** the loader does **not**
  auto-yank you when the asset's ready. The load runs in the background; when it's
  ready a **"READY → tap / click to enter"** affordance appears *and stays.* You
  choose when to enter, and may keep playing as long as you like. This decouples
  load-completion from game-end and resolves the old reward tension cleanly:
  - Entering is always one tap away the instant it's ready, so the loader **never
    adds friction** and never forces a "win to proceed."
  - Because the asset is **already loaded** while you linger, rewarding continued
    play does **not** incentivize a *slow* load — so a deep loader **may** wink at
    the Ridge Racer homage (clear it after READY for a buried bonus). One egg, not
    a system; most loaders just let you tap in.
  - Best shapes: reskinned **T-Rex runner** (BSD), **snake**, **breakout**,
    flappy-like, or a tiny "shoot the banner ads / old Pizza Hut JPEGs / streaming
    algorithm" Galaxian-homage. Theme each to what's loading; give it
    **ZzFX/jsfxr sound**. The dread conductor can curdle the loader at depth.
- **The Domino's-tracker grammar (the calm loader skin).** Steal the *grammar* of
  the pizza-order tracker — `PREP → BAKE → BOXING → OUT FOR DELIVERY` as the
  progress display — for shorter loads or as the frame wrapping a microgame. On a
  pizza site, the loader is literally a pizza being made. **Parody the grammar,
  never the mark:** original art, never Domino's logo/name/colors (no-copyrighted-
  marks rule).
- **Complement with predictive prefetch** so the asset's often ready before you
  finish descending — the loader is the cherry, not the crutch.
- **HARD LINE — loaders never tax the real links.** The ritual decorates going
  *deeper into the world* (heavy 3D/GLB level loads) and opt-in easter-egg doors.
  It must **never** gate a real destination: the Sample-Menu links and `/text`
  stay instant, direct, crawlable, one-keypress-away (a non-negotiable). "Hit 5
  slices to unlock the catalog" is fine only if the catalog is *also* always a
  real `<a href>` you can reach without playing — the game gates a *bonus*, never
  the only path. Navigation stays frictionless; the friction budget applies.
  - History (period-perfect *and* legally clear): loading minigames were chilled
    ~17 years by Namco's patent (**US 5,718,632** — "Recording medium, method of
    loading games program code…", the Ridge Racer / Galaxian thing), which the
    EFF noted expired in **2015** ("Expired - Lifetime"). Use them freely now.
- **Door-games (easter eggs):** *want* a completion — clearing one is the point.
  Best shape: the MIT **HTML5 platformer** as one tiny level ("The Pizza
  Basement": collect 3 slices, dodge cursed ads, reach a door). On clear:
  `localStorage.setItem("scoobert:<game>:cleared","true")` + dispatch an event →
  the world grows a new door / changes the rat's dialogue. Feeds the
  **secrets/retention tier**.
- **Don't import seven engines.** Pick *one* tiny base (vanilla canvas, optionally
  the MIT **Kontra** micro-helper, or the BSD runner) and build 1–2 games in it —
  one cursed CD-ROM, one feel. Matches the repo's "copy technique in as our own
  files" rule.
- **Licensing:** the candidate repos are BSD-3 / MIT (credit in
  `THIRD_PARTY_NOTICES.md`). The **T-Rex code is BSD but the dino sprite is
  Google's — full art replacement is mandatory.** Game assets are your own or
  **CC0** (safest for hard remixing); OpenGameArt licenses vary per-asset, check
  each.

### A mobile "level" — a cheeky game, not the cold shoulder (Luke, backlog)
We gate the *3D world* off mobile/reduced-motion (the WebGL descent → `/text`),
and that's the right call for the heavy stuff. But "blocked" shouldn't mean
"boring." Mobile should still get **one small, cheeky, fun thing** of its own —
a phone-shaped Scoobert microgame (2D canvas, touch-first, the same loader-game
engine we already have), so a mobile visitor gets a wink and a reason to share,
not a dead end. Think the loader runner promoted to a tiny standalone "mobile
level" (tap-to-jump the broken web buttons, dodge cursed ads, a high score to
screenshot) — same no-copyrighted-marks / CC0-or-own-assets rules, same friction
budget. It rides the minigame infra above; the only new work is a touch control
scheme + a mobile entry point that replaces the "this needs a desktop" wall with
a playable goof. Surface zone = stays safe + silly (no dread on the phone game).

**Stronger version (Luke): the minigames ARE the mobile experience.** Not one
token game — mobile's whole "beyond the normal site" layer is the minigame
arcade. The 3D world stays desktop-only, but the loader-runner family (the
broken-web-button runner, a Snake, a breakout) becomes a small touch-first arcade
you reach from the storefront on a phone — the mobile reward *is* the games,
where desktop's reward is the descent. Same engine, same no-marks/CC0 rules; the
loaders we already build for desktop double as the mobile catalogue.

### Webcam policy (the one narrow exception to "no real camera")
The old bolded rule "**NEVER real camera/mic**" is **amended**, not dropped. It
now means: never for the dread beat, never transmitted, never without explicit
opt-in. A real camera is allowed **only** as a consensual, fully-local *surface*
instrument:
- **Fully optional and explicitly told.** It enables manipulating instruments
  with your hands. The opt-in lives on the **green load screen**, up front.
- **Fully local. The webcam data never leaves the device / is never sent to
  Scoobert Doobert.** Consent copy is plain: *enables hand control · stays on
  your device · never sent to us.*
- **Visibly true:** a persistent "camera on" indicator + an always-available kill
  switch whenever it's active.
- **Firewalled from dread.** The "machine sees you" beat stays a **stylized
  low-poly figure, never the actual video feed** — the two never visually merge,
  so no one thinks the scare is using their real camera.
- **Why it's safe *and* good:** honoring "never sent, fully local" honestly is
  exactly what *earns* the faked sees-you beat — because we've been genuinely
  trustworthy with the real sensor, the machine-room scare reads as *theater*,
  not violation. The honesty makes the joke land. (Lower-risk alternative if ever
  in doubt: mic / device-tilt / gesture-control get most of the "you play the
  site" delight with less surveillance charge.)

### Persistence / retention (cross-cutting spine — localStorage, no backend)
The mechanism that turns "spooky, cool, closed the tab" into "come back." The
reference is BrowserQuest's `localStorage` trick (continuous save, zero backend).
Persist: depth reached, **max `unease` reached**, secrets seen, rooms found,
door-games cleared. Returning visitors get an acknowledged, slightly-changed
world (a door ajar, the rat remembering you, new content). The **curdled
storefront copy is gated on this**: a cold first-timer always gets the safe goofy
storefront; the curdled line ("An employee will call to verify your order. An
employee is already inside.") only surfaces for someone who has actually been
deep. The crack is a reward you *earn* — which is why dread and retention are the
same system.

---

## Engine decision (settled — see the research)

**Stay on three.js + @react-three/fiber.** The site is already a working
first-person low-poly PS1 world; no surveyed engine beats it for this use case.
- **Don't adopt** BrowserQuest, Kaetram, RPGJS, melonJS, Phaser (as the base),
  Voxelize, Biomes, Freeciv-web, or PlayCanvas. Most are 2D (a genre pivot),
  server-centric, overkill, or redundant beside R3F.
- **Mine BrowserQuest & Kaetram for design *grammar* only** — the `localStorage`
  persistence trick, a discovery/achievements log, the chunking concept for
  streaming rooms. Their structure maps 1:1 onto systems we already have.
- **License posture (Luke):** copyleft / public / GPL all fine. The only
  not-just-copyleft snags found were **Kaetram's OPL** (field-of-use restrictions
  — mandatory credit link, no-AI/crypto/NFT/courses; don't lift its code/assets
  casually) and **Freeciv-web's AGPL** (moot once we publish source, but wrong
  genre regardless). **Asset originality, not license, is the real line.**
- **Tiny minigames are the exception** — vanilla canvas / Kontra / the BSD
  runner, as their own isolated files, never a second engine for the main site.

---

## Asset direction & troves (source in `media/`; optimize before shipping)

The repo now nests source media under `media/` (organized 2026-06-20). Crunch
everything to PS1 fidelity via `gltf-transform`; **only optimized derivatives go
in `public/models/`.** Source GLBs/masters/photos stay out of the bundle.

- **`media/models/greek-vaporwave/`** — vaporwave-Greek (sofokles, underwater
  broken statue, Hades head, Doric/Ionic columns, lyre, jar, mountains) → the
  level below the shop.
- **`media/models/mobius/`** — Möbius GLBs → the recurrence/loop motif.
- **`media/models/props/`** — arcade cabinet, palm tree, fried-chicken bucket.
  (The Julius Caesar "bust" → beach-shop counter is still `legacy/
  julius_caesar.glb`.)
- **`media/models/levels/`** — full liminal/backrooms/pool environments
  (abandoned pool, backrooms, dreamcore, liminal space, metro tunnel, poolrooms)
  → the deeper GLB levels. **Confirm provenance per file; drop any Nickelodeon IP
  (`max_and_ruby_house`) and anything CC-BY-NC / unprovenanced before shipping.**
- **`media/models/doors/`** — a standalone 3D **door** GLB → room/level exits.
- **`media/models/animatronics/`** → the LOWER / dread levels (the rat turns, the
  machine sees you). Save for depth; the surface stays goofy.
- **`media/models/crt-tvs/`** → the machine-room CRT (the "sees you" set-piece).
- **`media/models/water/`** → the floor-one water.
- Plus: the kiddie-pool GLB → a pool-level idea.

**Music masters** live in `media/masters/` + `media/music/<year>/`; the jukebox's
shipped degraded loops are rendered to `public/audio/jukebox/<slug>.wav` from
`src/data/jukebox.catalog.json` by `scripts/make-jukebox-audio.mjs`. (See PHASES:
the "hear it" rung is partly built — the jukebox already cycles four real,
tape-warbled, 8-bit tracks.)

## The Doom / Freedoom shrine (decided, hidden lazy route — Phase 3+ secret)
Copyleft isn't the blocker; asset theft would be.
- **Freedoom (BSD) assets ONLY** — never id's original Doom WADs / sprites /
  sounds / music. (Or a cursed home-made pizza WAD.) Engine/port lineage is
  **GPL — fine.**
- Add **`THIRD_PARTY_NOTICES.md`** crediting id Software (engine lineage), the
  WASM / Chocolate-Doom port authors, and Freedoom (content + copyright).
- Keep it **isolated** behind the lazy route; never mix GPL/Doom code into
  reusable Surmado/business code. Build the protections *with* the shrine.
