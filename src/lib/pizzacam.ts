// ───────────────────────────────────────────────────────────────────────────
// src/lib/pizzacam.ts — the ENTIRE camera pipeline of the Pizza Cam™, in one
// readable file. This is the privacy contract made auditable: the webcam frame
// is downscaled to a 32×24 luminance grid (768 numbers), compared to the
// previous grid for motion, reduced to a handful of control values (energy,
// centroid, per-zone spikes), drawn on the booth's own canvas — and thrown
// away. Nothing here retains a frame beyond the last grid, nothing leaves this
// module as pixels, and there is no networking anywhere in it. (DESIGN.md
// "Webcam policy": consensual, fully local, never transmitted.)
//
// Deliberately EyeToy-grade, zero-dependency computer vision: frame
// differencing with a peak-hold decay and a self-calibrating noise floor. The
// crunchy low-res grid doubles as the on-screen visual, so what the player
// sees IS everything the machine sees.
//
// Pure math only — no DOM, no Web Audio, no stores — so it unit-tests with
// deterministic Uint8Arrays and is SSR-safe to import (the theremin/chimes
// split). Mirroring (selfie-flip) happens upstream at sample time in
// useCameraGrid, so grids arrive already mirrored and `cx` means what the
// player sees: raise your right hand, the cursor goes right.
// ───────────────────────────────────────────────────────────────────────────

import { noteToFreq } from './chimes';

/** The whole resolution the Pizza Cam ever samples. 768 big crunchy pixels. */
export const CAM_W = 32;
export const CAM_H = 24;
export const CELLS = CAM_W * CAM_H;

// ── the seeing ──────────────────────────────────────────────────────────────

/** RGBA → Rec.601 integer luma (0..255), written into `out` (length CELLS). */
export function lumaFrom(rgba: Uint8ClampedArray, out: Uint8Array): void {
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    // 77/150/29 ≈ 0.299/0.587/0.114 in 8-bit fixed point — integer-only on purpose
    // (deterministic across platforms, and period-appropriately cheap).
    out[i] = (77 * rgba[p] + 150 * rgba[p + 1] + 29 * rgba[p + 2]) >> 8;
  }
}

/**
 * Frame-difference `cur` against `prev` into the peak-hold motion field:
 * each cell keeps max(|Δ|, field·decay), so a fast gesture leaves a briefly
 * glowing trail instead of a one-frame blip (nicer to see AND to trigger from).
 * Returns the mean |Δ| of the raw frame — the input to the noise floor.
 */
export function motionField(
  prev: Uint8Array,
  cur: Uint8Array,
  field: Float32Array,
  decay = 0.65,
): number {
  let total = 0;
  for (let i = 0; i < cur.length; i++) {
    const d = Math.abs(cur[i] - prev[i]);
    total += d;
    const held = field[i] * decay;
    field[i] = d > held ? d : held;
  }
  return total / cur.length;
}

/**
 * Slow EMA of the mean frame difference — the sensor's own restlessness. A
 * grainy laptop cam in a dark room hums at some baseline |Δ|; tracking it lets
 * the threshold ride above the noise so an empty room plays silence, not free
 * jazz. Rate is small on purpose: the floor learns the room over ~seconds and
 * a deliberate gesture (brief) barely moves it.
 */
export function adaptFloor(prevFloor: number, meanDiff: number, rate = 0.02): number {
  return prevFloor + (meanDiff - prevFloor) * rate;
}

/** Cells must beat this to count as motion. 2× the noise floor plus a fixed
 *  margin, so both a jittery sensor and a pristine one get a sane threshold. */
export function thresholdFor(floor: number): number {
  return floor * 2 + 6;
}

/** Fewer above-threshold cells than this = not a gesture, just a sparkle. */
export const ACTIVE_MIN_CELLS = 3;

/** Excess motion that counts as "full send" for the 0..1 energy normalization
 *  (device-tuned; the manual checklist owns the feel pass). */
const ENERGY_FULL = CELLS * 12;

export type MotionStats = {
  /** 0..1 — how much of the frame is moving, and how hard. */
  energy: number;
  /** Centroid of above-threshold motion, 0..1 (already selfie-mirrored). */
  cx: number;
  cy: number;
  /** False until enough cells move — the empty-room / dark-room guard. */
  active: boolean;
};

/** Reduce the motion field to {energy, centroid, active}. */
export function motionStats(field: Float32Array, floor: number): MotionStats {
  const th = thresholdFor(floor);
  let excess = 0;
  let sx = 0;
  let sy = 0;
  let hot = 0;
  for (let y = 0, i = 0; y < CAM_H; y++) {
    for (let x = 0; x < CAM_W; x++, i++) {
      const e = field[i] - th;
      if (e <= 0) continue;
      hot++;
      excess += e;
      sx += e * x;
      sy += e * y;
    }
  }
  const active = hot >= ACTIVE_MIN_CELLS;
  if (!active || excess === 0) return { energy: 0, cx: 0.5, cy: 0.5, active: false };
  return {
    energy: Math.min(1, excess / ENERGY_FULL),
    cx: sx / excess / (CAM_W - 1),
    cy: sy / excess / (CAM_H - 1),
    active,
  };
}

// ── CH 1: AIR DOUGH — the continuous voice ─────────────────────────────────

/** Ten degrees of D-major pentatonic, D4→B5 — the same D6/9 "you can't play a
 *  wrong note" voicing as the chimes/practice room. Wave left = low, right = high. */
export const DOUGH_SCALE: { note: string; octave: number }[] = [
  { note: 'D', octave: 4 },
  { note: 'E', octave: 4 },
  { note: 'F#', octave: 4 },
  { note: 'A', octave: 4 },
  { note: 'B', octave: 4 },
  { note: 'D', octave: 5 },
  { note: 'E', octave: 5 },
  { note: 'F#', octave: 5 },
  { note: 'A', octave: 5 },
  { note: 'B', octave: 5 },
];

export type DoughVoice = { playing: boolean; freq: number; gain: number; degree: number };

/** Peak gain for the dough voice — the master limiter still guards loudness. */
export const DOUGH_PEAK = 0.18;

/**
 * Map motion stats → the dough voice's target. Centroid X picks a scale degree
 * (snapped — the startVoice portamento turns steps into glides), energy is the
 * volume: stillness is silence, tossing harder is louder. When inactive the
 * last-degree freq doesn't matter (gain 0); we hold the nearest degree so a
 * re-entry glides from somewhere sane rather than snapping.
 */
export function airDoughVoice(stats: MotionStats): DoughVoice {
  const degree = Math.round(stats.cx * (DOUGH_SCALE.length - 1));
  const { note, octave } = DOUGH_SCALE[degree];
  const freq = noteToFreq(note, octave);
  if (!stats.active) return { playing: false, freq, gain: 0, degree };
  const gain = Math.min(DOUGH_PEAK, stats.energy * 0.5);
  return { playing: gain > 0.001, freq, gain, degree };
}

// ── CH 2: TOPPING DRUMS — the percussion grid ──────────────────────────────

export type Zone = {
  id: string;
  /** Topping doodle drawn in the overlay (original doodles, no marks). */
  label: string;
  col: 0 | 1 | 2;
  /** 0 = top row (bright notes), 1 = bottom row (low notes). */
  row: 0 | 1;
  freq: number;
  /** Stereo placement matches where you hit: left column pans left. */
  pan: number;
};

const zone = (
  id: string,
  label: string,
  col: 0 | 1 | 2,
  row: 0 | 1,
  note: string,
  octave: number,
): Zone => ({
  id,
  label,
  col,
  row,
  freq: noteToFreq(note, octave),
  pan: (col - 1) * 0.6,
});

/** 3×2 kit — bottom row low (D4 F#4 A4), top row bright (B4 D5 E5), all inside
 *  the same pentatonic chord, so flailing is still music. */
export const ZONES: Zone[] = [
  zone('pepperoni', 'pepperoni', 0, 1, 'D', 4),
  zone('mushroom', 'mushroom', 1, 1, 'F#', 4),
  zone('olive', 'olive', 2, 1, 'A', 4),
  zone('basil', 'basil', 0, 0, 'B', 4),
  zone('onion', 'onion', 1, 0, 'D', 5),
  zone('anchovy', 'anchovy', 2, 0, 'E', 5),
];

/** Grid-cell bounds of a zone (x0..x1, y0..y1 exclusive) — shared by the hit
 *  detector and the booth's overlay drawing so they can never disagree.
 *  Boundaries are rounded to whole cells (32 isn't divisible by 3, so the
 *  columns tile as 11/10/11 — every cell in exactly one zone). */
export function zoneBounds(z: Zone): { x0: number; x1: number; y0: number; y1: number } {
  const zh = CAM_H / 2;
  return {
    x0: Math.round((z.col * CAM_W) / 3),
    x1: Math.round(((z.col + 1) * CAM_W) / 3),
    y0: z.row * zh,
    y1: (z.row + 1) * zh,
  };
}

export type ZoneState = { armed: boolean; lastHit: number };

export function initZoneStates(): ZoneState[] {
  return ZONES.map(() => ({ armed: true, lastHit: -Infinity }));
}

/** A zone's mean excess-over-threshold must reach this to strike. */
export const ZONE_TH = 14;
/** Same-zone strikes can't come faster than a drummer's hand. */
export const REFRACTORY_MS = 200;

export type ZoneHit = { zone: Zone; velocity: number };

/**
 * Per-zone spike detector with hysteresis + refractory: a zone fires once when
 * its motion crosses ZONE_TH while armed, then must both fall back below half
 * the threshold (hysteresis — a held wave isn't a drum roll) and wait out
 * REFRACTORY_MS before it can fire again. Velocity 1..2 scales the chime peak,
 * so a whack is louder than a graze. Mutates `state` in place (per-frame hot
 * path, mirrors the chimes sim's Pendulum update).
 */
export function zoneHits(
  field: Float32Array,
  floor: number,
  state: ZoneState[],
  nowMs: number,
): ZoneHit[] {
  const th = thresholdFor(floor);
  const hits: ZoneHit[] = [];
  for (let zi = 0; zi < ZONES.length; zi++) {
    const z = ZONES[zi];
    const { x0, x1, y0, y1 } = zoneBounds(z);
    let excess = 0;
    let cells = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const e = field[y * CAM_W + x] - th;
        if (e > 0) excess += e;
        cells++;
      }
    }
    const energy = excess / cells; // mean excess, 0..~249
    const s = state[zi];
    if (!s.armed) {
      if (energy < ZONE_TH * 0.5) s.armed = true;
    } else if (energy >= ZONE_TH && nowMs - s.lastHit >= REFRACTORY_MS) {
      s.armed = false;
      s.lastHit = nowMs;
      hits.push({ zone: z, velocity: Math.min(2, Math.max(1, energy / ZONE_TH)) });
    }
  }
  return hits;
}
