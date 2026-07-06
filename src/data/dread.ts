// ───────────────────────────────────────────────────────────────────────────
// src/data/dread.ts — the DREAD LAYER, as data (Phase 5, ckpt 1).
//
// The whole emotional arc is tuned HERE. One `unease` value (0..1) rises with
// depth + dwell + triggers and decays in safe zones; everything the dread layer
// touches (audio bed, PS1 shader uniforms, fog, camera, the rat) reads `unease`
// and nothing else. This file is the conductor's score; DreadConductor is the
// conductor; the instruments come online in later checkpoints.
//
// DOSAGE (docs/DESIGN.md "bitterness in a beer"): the baseline lives LOW, decay
// is generous, the SURFACE STAYS SWEET, and ascending always calms it. When in
// doubt, dial it DOWN — it's trivial to add bitterness, ruinous to over-hop.
// ───────────────────────────────────────────────────────────────────────────

export type DreadConfig = {
  /** Resting unease 0..1 for a zone — keyed by floor id (floors.ts) OR room id
   *  (rooms.ts). Surface zones are 0; the deep/cold rooms are the bitter end. */
  baseUnease: Record<string, number>;
  /** Lingering in a tense zone (base > SAFE) nudges unease up, per second. */
  dwellRatePerSec: number;
  /** Dwell ceiling as a fraction of a zone's base: lingering can push unease up
   *  to base + base*dwellFactor, so milder zones stay milder (keeps the
   *  hallway/classified hierarchy instead of everything converging to one band). */
  dwellFactor: number;
  /** How fast unease eases UP to a zone's resting value on entering it. */
  riseRatePerSec: number;
  /** Safe zones pull unease DOWN, per second — must out-pace dwell so a climb
   *  back toward the surface always calms you within a few beats. */
  decayRatePerSec: number;
  /** SPELL RELIEF — casting a light/fire spell briefly pushes back the dark: it
   *  subtracts from the unease target, then bleeds off so the dread creeps back.
   *  reliefMax caps it (the depths stay eerie — relief is partial, never a switch);
   *  reliefDecayPerSec is how fast the warmth fades. */
  reliefMax: number;
  reliefDecayPerSec: number;
  /** One-shot event deltas. Some are declared-dormant until their source ships
   *  (the terminal in Phase 4, the Möbius loop in Phase 6) — see DESIGN. */
  triggers: Record<string, number>;
};

/** Below this, a zone counts as "safe" (decays rather than dwells). */
export const SAFE_UNEASE = 0.06;

export const DREAD: DreadConfig = {
  baseUnease: {
    // ── era floors (descent) — surface/near-surface, barely a tickle ──
    storefront: 0,
    y1999: 0.04,
    y2000: 0.05, // still a surface era floor — kept below SAFE so it stays sweet
    machine: 0.18,
    // ── 3D rooms (rooms.ts) ──
    shop: 0, // the safe, goofy spawn — stays sweet, always
    kitchen: 0, // the back-of-house off the shop — a sweet SURFACE relief room
    hallway: 0.42, // dim backrooms corridor — the first real tension
    jukebox: 0.05, // the warm payoff shrine — a relief valve, kept safe
    practice: 0.04, // backstage music room — a "play it" relief beat, kept sweet
    classified: 0.8, // the cold X-Files file room — the bitter end
    poolrooms: 0.3, // the level below — over-lit, empty, uncanny (not dark dread)
    // ── the deeper rooms (added after ckpt1 — covered here so the bottom of the
    //    world actually modulates instead of reading dead-safe) ──
    dicepit: 0.4, // dim back-room gamble; losing pokes it (the dice trigger)
    mobius: 0.34, // the loop reads COMIC at first (kept modest); each lap curdles
    //              it via the 'mobius-loop' trigger — the base stays goofy-low
    liminal: 0.5, // bright empty backrooms GLB — uncanny, a notch past the pool
    deeppool: 0.78, // the drained deep end, lights long dead — near the bitter end
    waitingroom: 0.44, // the liminal municipal lobby off the deep end — over-lit,
    //                    empty, uncanny (the endless wait), a notch past the pool
    //                    but well shy of dread: funny-uncanny, the taste line holds
    terminus: 0.82, // the backrooms at the end of the line — the new bitter bottom
    'metro-tunnel': 0.55, // abandoned undersea tunnel — uncanny, but its shitty
    //                       shinkansen + neon are a GOOFY beat, so kept moderate
    //                       (don't let dread smother the gag — dial it down)
    shrine: 0.02, // the OUTDOOR sweet breather — a deliberate relief beat (below
    //              SAFE so it DECAYS): the exhale that makes the tunnel land
    grassrooms: 0.02, // the overgrown-backrooms breather off the liminal — FULLY
    //                   SWEET (below SAFE so it DECAYS): nature reclaimed the
    //                   office, sunlit and calm; the exhale after the liminal
    garden: 0.02, // The Botanical Garden — pure surface sweetness (below SAFE so
    //               it DECAYS): hedges, birdsong, the frog, the slide. Never curdles.
    tubes: 0.02, // the PlayPlace warren the slide drops into — pure nostalgic play
    //              (below SAFE): translucent tubes, portholes, a ball pit. Sweet.
    grotto: 0.04, // the cave behind the garden — a cool hush, still below SAFE
    //               (the dark is cozy, not wrong; the mouth glows with the garden)
    bamboo: 0.02, // the grove past the lion gate — dappled, sweet, decays
    turtle: 0.08, // the dead venue — a haunted-WARM tickle just past SAFE (memory,
    //               not menace: the taste line holds; what you notice there is sweet)
    mainstreet: 0.12, // the empty small-town street at night — the biggest surface
    //                   tickle, but still WARM-uncanny (an empty hometown, not a
    //                   threat); the diner's glow is the exhale at the end of it
    mainstreetday: 0.1, // the SAME street flipped to an overexposed empty noon — the
    //                     daylight makes the emptiness worse, but it's still warm
    //                     (a touch below the night version; you can see your way out)
    diner: 0.07, // the all-night diner — cozy-wrong, back down near the turtle's
    //              warmth (the animal heads watch, but it's funny-uncanny, not grim)
    bar: 0.06, // Doobert's — the warm dive at the far end of the street; a relief
    //            beat (right at SAFE): someone's still open, the neon's still on

    theremin: 0.02, // The Aerial — the deep theremin instrument room off the liminal:
    //                 a SWEET relief beat (below SAFE so it DECAYS), a cosmic exhale
    //                 you play with your body, not a dread room (taste guardrail)
    void: 0.03, // The Void — the cosmic screensaver off the theremin: pure wonder
    //             (below SAFE so it DECAYS), drifting planets over a rippling void;
    //             hypnotic and sweet, never a scare (the taste line holds)
  },
  dwellRatePerSec: 0.018, // slow: lingering deep slowly worsens
  dwellFactor: 0.6, // lingering tops out at base + base*0.6 (milder zones stay milder)
  riseRatePerSec: 0.32, // entering a tense room ramps to its base in ~1–2s
  decayRatePerSec: 0.16, // safe zones calm faster than dwell raises
  reliefMax: 0.45, // a cast can ease at most ~half the dark — the depths stay eerie
  reliefDecayPerSec: 0.07, // the warmth fades over ~5–6s, then the dread creeps back
  triggers: {
    'enter-classified': 0.12, // a jolt on first slipping into the file room
    // dormant until their source exists (declared so they light up for free):
    'terminal-forbidden-cmd': 0.2, // Phase 4
    'mobius-loop': 0.15, // Phase 6 recurrence
  },
};

/** Resting unease for a zone id (floor or room). Unknown → 0 (safe). */
export function baseUneaseFor(zoneId: string): number {
  return DREAD.baseUnease[zoneId] ?? 0;
}

// ── unease → instrument targets ──────────────────────────────────────────────
// The mapping every later checkpoint reads. Curves are intentionally back-loaded
// so most of the descent feels fine and the wrongness only blooms past the
// midpoint. Nothing consumes these yet in ckpt1 (the debug panel displays them);
// the audio bed (ckpt2) and visual ramp (ckpt3) wire them to real uniforms.

export type DreadTargets = {
  subBassGain: number; // 0..1 — the felt-not-heard bed
  dropoutChance: number; // 0..~0.03 — rare total audio dropouts (fade, never spike)
  bitcrush: number; // 0..1 — degradation of the music/ambient
  fogDensityMul: number; // 1..~2.4 — multiplies fog "closeness" (draw distance shrinks)
  vertexJitter: number; // 0..1 — extra vertex-snap coarseness
  affineStrength: number; // 0..1 — extra affine texture swim
  cameraShake: number; // 0..1 — micro-shake / lurch
  vignette: number; // 0..1 — edges tighten
  ratMenace: number; // 0..1 — drives the rat's inverted boids (ckpt4)
};

/** Linear ramp of `u` across [start, end], clamped to 0..1. */
function ramp(u: number, start: number, end: number): number {
  if (end <= start) return u >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (u - start) / (end - start)));
}

export function mapUnease(u: number): DreadTargets {
  return {
    // The bed comes in FIRST and lowest — felt before anything is seen.
    subBassGain: ramp(u, 0.1, 0.85),
    // Dropouts only at the high end, and rare even then.
    dropoutChance: ramp(u, 0.7, 1) * 0.03,
    bitcrush: ramp(u, 0.35, 1),
    // Fog closes from 1× (no change) toward ~2.4× as draw distance shrinks.
    fogDensityMul: 1 + ramp(u, 0.25, 1) * 1.4,
    vertexJitter: ramp(u, 0.4, 1),
    affineStrength: ramp(u, 0.45, 1),
    // Visual motion held back hard (comfort + WCAG): only past 0.55, capped.
    cameraShake: ramp(u, 0.55, 1) * 0.8,
    vignette: ramp(u, 0.3, 1),
    ratMenace: ramp(u, 0.5, 1),
  };
}
