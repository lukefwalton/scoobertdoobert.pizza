# fun/ — instruments borrowed FROM here, re-homed (this repo stays standalone)

`fun/` was a placeholder for a **separate project** — Luke's half-built JS music
apps — meant to be borrowed from for the instrument rooms (see "the music ladder
→ play it" in [`../docs/DESIGN.md`](../docs/DESIGN.md)).

**Status: the borrowing has started — and it was done by VENDORING, not linking.**
The chosen instruments were ported and **re-homed as this project's own
standalone files**, exactly like the water/boids technique. This repo does **not**
submodule, import from, or otherwise depend on the `fun` project — so that project
can be deleted with zero effect here. (That was the explicit ask: "I'll probably
delete the fun repo at some point, so don't depend on it.")

## What came over (and where it lives now)

Only the instruments that **synthesise their own sound** — no shipped samples, no
MIDI hardware, no webcam — were taken, so they fit the site's rules and ship as
touch-first arcade cabinets:

| From `fun` | Re-homed as | Route |
|------------|-------------|-------|
| **Chimes** (pendulum-wave bells) | `src/lib/chimes.ts` (sim + `strikeBell` voice) + `src/components/ChimesCabinet.tsx` | `/chimes` |
| **DNA** (cell-collision drone) | `src/lib/cultures.ts` (sim) + `src/components/CulturesCabinet.tsx` | `/cultures` |

Each is a self-contained Web Audio + 2D-canvas cabinet (no AudioWorklet to
bundle, no three.js), mute-aware, brickwall-limited, WCAG-safe, and crawlable
(JS-off renders a real document). They're reached from `/arcade`.

**The synthesis is a reusable engine, not just a cabinet.** `strikeBell()` is
context-agnostic, so the SAME bell voice powers the cabinet AND the 3D world via
`audio.playChime()` — e.g. the **furin wind-chimes** in the Wayside Shrine
(`src/world/ShrineRoom.tsx`). More in-room/"odd thing" uses can hang off the same
hook.

## NOT ported (and why)

- **Tape** needs a user-uploaded audio file — no pure synthesis.
- **Crumbs / Draw** default to a synthesised drone but lean on mic/file input and
  a heavier worklet/UI; left for later if a deep instrument room wants them.
- **MIDI + MediaPipe gesture** were left out; the webcam is its own gated future
  thread (see DESIGN → "Webcam policy"), deliberately not coupled to these.

## What's actually in this folder

Nothing built or shipped — this README is the only file here. The instruments
live under `src/` as listed above; this directory is just the breadcrumb of where
they came from. (The original `fun` project was referenced at commit
`067385f4e0a7ab0709f37bc31cf507b5b904e149`.)
