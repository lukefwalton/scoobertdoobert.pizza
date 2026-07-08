import { describe, it, expect } from 'vitest';
import {
  CAM_W,
  CAM_H,
  CELLS,
  lumaFrom,
  motionField,
  adaptFloor,
  thresholdFor,
  motionStats,
  DOUGH_SCALE,
  DOUGH_PEAK,
  airDoughVoice,
  ZONES,
  zoneBounds,
  initZoneStates,
  zoneHits,
  ZONE_TH,
  REFRACTORY_MS,
} from './pizzacam';
import { noteToFreq } from './chimes';

// Deterministic pixel fixtures — the whole point of the pure split is that the
// camera pipeline tests with plain arrays, no camera anywhere near it.

const grid = (fill = 0) => new Uint8Array(CELLS).fill(fill);
const field = () => new Float32Array(CELLS);

/** Paint a w×h block of luminance into a grid at (x, y). */
function blob(g: Uint8Array, x: number, y: number, w: number, h: number, v: number) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy * CAM_W + xx] = v;
}

describe('lumaFrom — Rec.601 integer luma', () => {
  it('converts pure R/G/B/white to the classic weights', () => {
    const rgba = new Uint8ClampedArray(4 * 4);
    const px = [
      [255, 0, 0, 255], // red
      [0, 255, 0, 255], // green
      [0, 0, 255, 255], // blue
      [255, 255, 255, 255], // white
    ];
    px.forEach((p, i) => rgba.set(p, i * 4));
    const out = new Uint8Array(4);
    lumaFrom(rgba, out);
    expect(Array.from(out)).toEqual([76, 149, 28, 255]);
  });
});

describe('motionField — peak-hold frame differencing', () => {
  it('records |Δ| per cell and returns the raw mean', () => {
    const prev = grid(10);
    const cur = grid(10);
    cur[5] = 110; // one cell jumps by 100
    const f = field();
    const mean = motionField(prev, cur, f);
    expect(f[5]).toBe(100);
    expect(f[0]).toBe(0);
    expect(mean).toBeCloseTo(100 / CELLS);
  });

  it('holds the peak with decay instead of dropping to zero', () => {
    const a = grid(0);
    const b = grid(0);
    b[0] = 100;
    const f = field();
    motionField(a, b, f); // spike: field 100
    motionField(b, b, f); // still frame: decays, not clears
    expect(f[0]).toBeCloseTo(65);
    motionField(b, b, f);
    expect(f[0]).toBeCloseTo(42.25);
  });
});

describe('adaptFloor + motionStats — the empty room plays nothing', () => {
  it('a constantly grainy sensor self-calibrates to silence', () => {
    // Every frame the whole sensor jitters by 4 — worst-case cheap webcam grain.
    const a = grid(0);
    const b = grid(4);
    const f = field();
    let floor = 0;
    // Let the EMA learn the room.
    for (let i = 0; i < 400; i++) {
      const mean = motionField(i % 2 ? b : a, i % 2 ? a : b, f);
      floor = adaptFloor(floor, mean);
    }
    expect(floor).toBeGreaterThan(3.5); // learned ≈ 4
    // Threshold now rides above the grain: nothing is "motion."
    const stats = motionStats(f, floor);
    expect(stats.active).toBe(false);
    expect(stats.energy).toBe(0);
  });

  it('a moving blob is active with the centroid on the blob', () => {
    const f = field();
    // Hot 2×2 blob centered at x∈{8,9}, y∈{12,13} on a calm floor.
    const g = grid(0);
    blob(g, 8, 12, 2, 2, 200);
    motionField(grid(0), g, f);
    const stats = motionStats(f, 0);
    expect(stats.active).toBe(true);
    expect(stats.energy).toBeGreaterThan(0);
    expect(stats.cx).toBeCloseTo(8.5 / (CAM_W - 1), 5);
    expect(stats.cy).toBeCloseTo(12.5 / (CAM_H - 1), 5);
  });

  it('fewer than ACTIVE_MIN_CELLS hot cells is a sparkle, not a gesture', () => {
    const f = field();
    const g = grid(0);
    g[0] = 255;
    g[100] = 255; // two lonely hot cells
    motionField(grid(0), g, f);
    expect(motionStats(f, 0).active).toBe(false);
  });

  it('thresholdFor scales with the floor', () => {
    expect(thresholdFor(0)).toBe(6);
    expect(thresholdFor(10)).toBe(26);
  });
});

describe('airDoughVoice — CH 1', () => {
  const stats = (cx: number, energy = 0.3, active = true) => ({ cx, cy: 0.5, energy, active });

  it('stillness is silence', () => {
    const v = airDoughVoice({ energy: 0, cx: 0.5, cy: 0.5, active: false });
    expect(v.playing).toBe(false);
    expect(v.gain).toBe(0);
  });

  it('freq is always a scale degree (never between notes)', () => {
    const allowed = new Set(DOUGH_SCALE.map((d) => noteToFreq(d.note, d.octave)));
    for (let cx = 0; cx <= 1.0001; cx += 0.03) {
      expect(allowed.has(airDoughVoice(stats(Math.min(cx, 1))).freq)).toBe(true);
    }
  });

  it('sweeping cx left→right climbs the scale monotonically D4→B5', () => {
    let last = 0;
    for (let cx = 0; cx <= 1.0001; cx += 0.05) {
      const v = airDoughVoice(stats(Math.min(cx, 1)));
      expect(v.freq).toBeGreaterThanOrEqual(last);
      last = v.freq;
    }
    expect(airDoughVoice(stats(0)).freq).toBeCloseTo(noteToFreq('D', 4));
    expect(airDoughVoice(stats(1)).freq).toBeCloseTo(noteToFreq('B', 5));
  });

  it('gain rides energy and never exceeds the peak', () => {
    expect(airDoughVoice(stats(0.5, 0.1)).gain).toBeCloseTo(0.05);
    expect(airDoughVoice(stats(0.5, 1)).gain).toBe(DOUGH_PEAK);
  });
});

describe('zoneHits — CH 2', () => {
  /** A field with one zone's cells all at `energy` above threshold (floor 0). */
  function fieldWithZone(zi: number, meanExcess: number): Float32Array {
    const f = field();
    const { x0, x1, y0, y1 } = zoneBounds(ZONES[zi]);
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) f[y * CAM_W + x] = thresholdFor(0) + meanExcess;
    return f;
  }

  it('one spike → one hit with the zone freq and column pan', () => {
    const st = initZoneStates();
    const hits = zoneHits(fieldWithZone(0, ZONE_TH * 1.5), 0, st, 1000);
    expect(hits).toHaveLength(1);
    expect(hits[0].zone.id).toBe('pepperoni');
    expect(hits[0].zone.freq).toBeCloseTo(noteToFreq('D', 4));
    expect(hits[0].zone.pan).toBe(-0.6);
  });

  it('a sustained wave does not machine-gun (hysteresis)', () => {
    const st = initZoneStates();
    const hot = fieldWithZone(1, ZONE_TH * 1.5);
    expect(zoneHits(hot, 0, st, 0)).toHaveLength(1);
    // Motion stays high for many frames — no re-fire until it releases.
    for (let t = 33; t < 2000; t += 33) expect(zoneHits(hot, 0, st, t)).toHaveLength(0);
  });

  it('release + refractory → the zone re-arms and hits again', () => {
    const st = initZoneStates();
    const hot = fieldWithZone(2, ZONE_TH * 1.5);
    const calm = field();
    expect(zoneHits(hot, 0, st, 0)).toHaveLength(1);
    // Spike again too soon (after release): refractory still blocks it.
    zoneHits(calm, 0, st, 100); // released → re-armed
    expect(zoneHits(hot, 0, st, 150)).toHaveLength(0);
    // After the refractory window: fires.
    zoneHits(calm, 0, st, REFRACTORY_MS);
    expect(zoneHits(hot, 0, st, REFRACTORY_MS + 50)).toHaveLength(1);
  });

  it('velocity scales with zone energy, clamped to 1..2', () => {
    const graze = zoneHits(fieldWithZone(3, ZONE_TH), 0, initZoneStates(), 0)[0];
    expect(graze.velocity).toBeCloseTo(1);
    const whack = zoneHits(fieldWithZone(3, ZONE_TH * 10), 0, initZoneStates(), 0)[0];
    expect(whack.velocity).toBe(2);
  });

  it('the six zones tile the grid exactly once', () => {
    const covered = new Uint8Array(CELLS);
    for (const z of ZONES) {
      const { x0, x1, y0, y1 } = zoneBounds(z);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) covered[y * CAM_W + x]++;
    }
    expect(Array.from(covered).every((c) => c === 1)).toBe(true);
  });
});
