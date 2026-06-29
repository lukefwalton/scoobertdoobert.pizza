import { describe, it, expect } from 'vitest';
import { THEREMIN, thereminVoiceFor } from './theremin';

describe('thereminVoiceFor', () => {
  it('is silent at and beyond the field edge (gain 0, not playing)', () => {
    expect(thereminVoiceFor(THEREMIN.field)).toMatchObject({ playing: false, gain: 0 });
    expect(thereminVoiceFor(THEREMIN.field + 5)).toMatchObject({ playing: false, gain: 0 });
    // a negative/0 distance is clamped, not NaN
    expect(thereminVoiceFor(-3).gain).toBeGreaterThan(0);
  });

  it('peaks at the device: highest pitch + full gain at distance 0', () => {
    const v = thereminVoiceFor(0);
    expect(v.playing).toBe(true);
    expect(v.freq).toBeCloseTo(THEREMIN.fmax, 0);
    expect(v.gain).toBeCloseTo(THEREMIN.peak, 5);
  });

  it('approaches the floor pitch + silence at the edge', () => {
    const v = thereminVoiceFor(THEREMIN.field - 0.0001);
    expect(v.freq).toBeCloseTo(THEREMIN.fmin, 0);
    expect(v.gain).toBeGreaterThan(0); // still just barely audible right at the edge
    expect(v.gain).toBeLessThan(0.01);
  });

  it('glides monotonically: walking away drops both pitch and volume', () => {
    let prevFreq = Infinity;
    let prevGain = Infinity;
    for (let d = 0; d < THEREMIN.field; d += 0.2) {
      const v = thereminVoiceFor(d);
      expect(v.freq).toBeLessThanOrEqual(prevFreq + 1e-6);
      expect(v.gain).toBeLessThanOrEqual(prevGain + 1e-6);
      prevFreq = v.freq;
      prevGain = v.gain;
    }
  });

  it('keeps the pitch inside the bounded musical window at every distance', () => {
    for (let d = 0; d <= THEREMIN.field; d += 0.1) {
      const { freq } = thereminVoiceFor(d);
      expect(freq).toBeGreaterThanOrEqual(THEREMIN.fmin - 1e-6);
      expect(freq).toBeLessThanOrEqual(THEREMIN.fmax + 1e-6);
    }
  });

  it('honors a custom field/range', () => {
    const opts = { field: 2, fmin: 100, fmax: 200, peak: 0.1 };
    expect(thereminVoiceFor(0, opts).freq).toBeCloseTo(200, 0);
    expect(thereminVoiceFor(2, opts)).toMatchObject({ playing: false, gain: 0 });
  });
});
