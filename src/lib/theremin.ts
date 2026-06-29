// ───────────────────────────────────────────────────────────────────────────
// src/lib/theremin.ts — the pure proximity→voice mapping for the deep theremin
// room (src/world/Theremin). A theremin is, uniquely, PLAYED BY PROXIMITY in real
// life — the nearness of your hand to the antenna IS the note — which makes it the
// one instrument that maps cleanly onto first-person movement: your distance to the
// device is the performance. No clicking, no pointer-lock fight; you walk it.
//
// Closer = higher + louder; past the field edge it falls silent. Kept here as a
// pure, unit-tested function so the per-frame component AND the smoke's
// deterministic probe share ONE definition (no drift) and the musical range can't
// regress unseen. Single-distance by design: pitch and volume both ride your
// nearness — a faithful-enough reduction of the two-antenna original onto one
// camera. The gentle constant "waver" is the vibrato LFO in the audio voice, not
// here (this layer is just the target freq + gain).
// ───────────────────────────────────────────────────────────────────────────

export type ThereminOpts = {
  /** Field radius (world units): beyond this the voice is silent. */
  field: number;
  /** Lowest pitch (Hz), reached at the field edge. */
  fmin: number;
  /** Highest pitch (Hz), reached at the device. */
  fmax: number;
  /** Peak gain (0..1), at the device; the output limiter still guards loudness. */
  peak: number;
};

// A warm ~1.6-octave window (A3 → E5): expressive but consonant, and bounded so a
// wandering hand never wanders into a shriek (taste guardrail — the deep instrument
// rooms stay SWEET). Field a touch under the room's half-extent so you arrive at the
// door in silence and walk INTO the sound.
export const THEREMIN: ThereminOpts = { field: 3.8, fmin: 220, fmax: 659, peak: 0.16 };

export type ThereminVoice = { playing: boolean; freq: number; gain: number };

/**
 * Map distance-to-the-device → the theremin's target { freq, gain }.
 * - At/over the field edge: silent (gain 0), holding `fmin` so a re-entry glides UP
 *   from the bottom rather than snapping to a stale pitch.
 * - Inside: a geometric (musically-even) pitch glide from `fmax` at the device down
 *   to `fmin` at the edge, and a linear gain swell from `peak` to 0 (a smooth fade,
 *   never a hard onset — WCAG-friendly + sweet).
 */
export function thereminVoiceFor(dist: number, opts: ThereminOpts = THEREMIN): ThereminVoice {
  const { field, fmin, fmax, peak } = opts;
  const d = Math.max(0, dist);
  if (d >= field) return { playing: false, freq: fmin, gain: 0 };
  const t = d / field; // 0 at the device → 1 at the edge
  const freq = fmin * Math.pow(fmax / fmin, 1 - t); // fmax → fmin, geometric
  const gain = peak * (1 - t); // peak → 0, linear swell
  return { playing: gain > 0.001, freq, gain };
}
