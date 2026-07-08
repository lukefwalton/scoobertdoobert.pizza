// ───────────────────────────────────────────────────────────────────────────
// src/lib/curdle.ts — the pure unease/pressing → curdle-parameter mapping.
//
// "The 'fucked up' version is the same track *curdling* with depth" (DESIGN's
// music ladder): the engine carries a real-time curdle insert on the SONG path
// (a dry/wet bitcrush branch, wow/flutter LFOs riding playbackRate, and rare
// dropout dips that always fade back). This file is the score for that insert —
// pure and unit-tested, like theremin.ts / luck-core.ts, so the engine and the
// smokes share ONE definition and the dosage can't regress unseen.
//
// Two drivers, component-wise MAX (pristine overrides everything):
//  - DREAD: mapUnease(u) — its long-dormant `bitcrush` + `dropoutChance`
//    outputs finally have their consumer. Zero below u≈0.35 (bit-exact
//    passthrough at the surface — the taste guardrail's sweet zones).
//  - The JUKEBOX PRESSINGS (the d20 crits, "the cursed pressing" as actual
//    audio): `cursed` is a strong goofy tape-warble with NO dropouts (dropouts
//    are dread vocabulary; the jukebox room stays sweet), `pristine` locks the
//    curdle OFF and rate-corrects the baked 0.965 tape slow-down — the one
//    record in the shop that plays "cleaner than possible."
// ───────────────────────────────────────────────────────────────────────────
import { mapUnease } from '../data/dread';

export type Pressing = 'cursed' | 'pristine' | null;

export type CurdleParams = {
  /** 0..~0.55 — dry/wet into the quantize branch. 0 = bit-exact passthrough. */
  wet: number;
  /** Slow pitch drift (tape wow) riding playbackRate — depth in absolute rate units (±). */
  wow: { hz: number; depth: number };
  /** Fast shimmer (tape flutter) — same units. */
  flutter: { hz: number; depth: number };
  /** Chance per scheduler roll (~1/s) of a dropout dip. DREAD ONLY, never a pressing. */
  dropoutChance: number;
  /** Base playbackRate correction (1 normally; 1/0.965 for pristine). */
  rate: number;
};

/** The baked tape pass slows every jukebox master to 0.965× — pristine undoes it. */
export const PRISTINE_RATE = 1 / 0.965;

/** Wet is capped so the song stays recognizable: curdling, never noise. */
export const WET_CAP = 0.55;

const CURSED: Omit<CurdleParams, 'dropoutChance' | 'rate'> = {
  wet: WET_CAP,
  wow: { hz: 0.55, depth: 0.035 }, // ±3.5% — a seasick warble, goofy not scary
  flutter: { hz: 6.5, depth: 0.006 },
};

/** Linear ramp of `u` across [start, end], clamped to 0..1 (mirrors dread.ts). */
function ramp(u: number, start: number, end: number): number {
  if (end <= start) return u >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (u - start) / (end - start)));
}

export function curdleParamsFor(
  unease: number,
  pressing: Pressing = null,
  opts: {
    /** The live voice is a RESTORED hi-fi file (no baked 0.965 slow-down), so a
     *  pristine pressing has nothing to rate-correct — it plays at 1. Dread's
     *  curdle and the cursed pressing apply to hi-fi UNCHANGED: the depths
     *  curdle even restored masters, and a nat 1 curses the clean pressing too. */
    hifi?: boolean;
  } = {},
): CurdleParams {
  // Pristine overrides: the nat-20 record plays CLEAN no matter how deep the
  // conductor sits (it's the reward — luck beats dread for one pressing).
  if (pressing === 'pristine') {
    return {
      wet: 0,
      wow: { hz: 0.55, depth: 0 },
      flutter: { hz: 6.5, depth: 0 },
      dropoutChance: 0,
      rate: opts.hifi ? 1 : PRISTINE_RATE,
    };
  }

  const u = Math.min(1, Math.max(0, unease));
  const dread = mapUnease(u);
  // Dread's curdle: wet from the (back-loaded) bitcrush curve, wobble later still.
  const dreadWet = dread.bitcrush * 0.5;
  const dreadWow = ramp(u, 0.45, 1) * 0.014; // ±1.4% at full unease
  const dreadFlutter = ramp(u, 0.55, 1) * 0.004;

  if (pressing === 'cursed') {
    return {
      wet: Math.min(WET_CAP, Math.max(CURSED.wet, dreadWet)),
      wow: {
        hz: CURSED.wow.hz,
        depth: Math.max(CURSED.wow.depth, dreadWow),
      },
      flutter: {
        hz: CURSED.flutter.hz,
        depth: Math.max(CURSED.flutter.depth, dreadFlutter),
      },
      // NO dropouts for a pressing — the cursed record warbles, it never cuts
      // out (dropouts are the deep world's vocabulary; the jukebox stays sweet).
      dropoutChance: 0,
      rate: 1,
    };
  }

  return {
    wet: Math.min(WET_CAP, dreadWet),
    wow: { hz: 0.9, depth: dreadWow },
    flutter: { hz: 6.5, depth: dreadFlutter },
    dropoutChance: dread.dropoutChance,
    rate: 1,
  };
}
