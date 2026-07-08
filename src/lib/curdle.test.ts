import { describe, it, expect } from 'vitest';
import { curdleParamsFor, PRISTINE_RATE, WET_CAP } from './curdle';

describe('curdleParamsFor — the dread driver', () => {
  it('is bit-exact passthrough at the surface (wet 0, no wobble, no dropouts, rate 1)', () => {
    for (const u of [0, 0.1, 0.2, 0.35]) {
      const p = curdleParamsFor(u, null);
      expect(p.wet, `wet at u=${u}`).toBe(0);
      expect(p.wow.depth).toBe(0);
      expect(p.flutter.depth).toBe(0);
      expect(p.dropoutChance).toBe(0);
      expect(p.rate).toBe(1);
    }
  });

  it('wet rises monotonically with unease and never exceeds the cap', () => {
    let prev = -1;
    for (let u = 0; u <= 1.001; u += 0.05) {
      const { wet } = curdleParamsFor(u, null);
      expect(wet).toBeGreaterThanOrEqual(prev);
      expect(wet).toBeLessThanOrEqual(WET_CAP);
      prev = wet;
    }
    expect(curdleParamsFor(1, null).wet).toBeCloseTo(0.5);
  });

  it('dropouts stay dread-only, rare, and gone below u=0.7', () => {
    expect(curdleParamsFor(0.69, null).dropoutChance).toBe(0);
    expect(curdleParamsFor(1, null).dropoutChance).toBeCloseTo(0.03);
    for (let u = 0; u <= 1.001; u += 0.05) {
      expect(curdleParamsFor(u, null).dropoutChance).toBeLessThanOrEqual(0.03);
    }
  });

  it('clamps out-of-range unease', () => {
    expect(curdleParamsFor(-2, null)).toEqual(curdleParamsFor(0, null));
    expect(curdleParamsFor(7, null)).toEqual(curdleParamsFor(1, null));
  });
});

describe('curdleParamsFor — the pressings', () => {
  it('cursed is a strong goofy warble with NO dropouts (the jukebox stays sweet)', () => {
    const p = curdleParamsFor(0, 'cursed');
    expect(p.wet).toBeGreaterThanOrEqual(0.5);
    expect(p.wet).toBeLessThanOrEqual(WET_CAP);
    expect(p.wow.depth).toBeCloseTo(0.035);
    expect(p.dropoutChance).toBe(0);
    expect(p.rate).toBe(1);
  });

  it('cursed keeps zero dropouts even at max unease (dropouts are dread vocabulary)', () => {
    expect(curdleParamsFor(1, 'cursed').dropoutChance).toBe(0);
  });

  it('pristine locks the curdle off and rate-corrects the baked tape slow-down', () => {
    const p = curdleParamsFor(0, 'pristine');
    expect(p.wet).toBe(0);
    expect(p.wow.depth).toBe(0);
    expect(p.flutter.depth).toBe(0);
    expect(p.dropoutChance).toBe(0);
    expect(p.rate).toBeCloseTo(PRISTINE_RATE);
    expect(p.rate).toBeGreaterThan(1); // it plays a touch FASTER — "cleaner than possible"
  });

  it('pristine beats concurrent high unease (luck beats dread for one pressing)', () => {
    const p = curdleParamsFor(1, 'pristine');
    expect(p.wet).toBe(0);
    expect(p.wow.depth).toBe(0);
    expect(p.dropoutChance).toBe(0);
  });

  it('cursed at high unease takes the stronger wobble of the two', () => {
    const deep = curdleParamsFor(1, 'cursed');
    expect(deep.wow.depth).toBeGreaterThanOrEqual(0.035);
    expect(deep.wet).toBe(WET_CAP);
  });
});

// The RESTORED hi-fi files have no baked 0.965 tape slow-down, so pristine has
// nothing to rate-correct — everything else about the score is variant-blind
// (the depths curdle even restored masters; a nat 1 curses the clean pressing).
describe('curdleParamsFor — the hi-fi (restored) flag', () => {
  it('pristine on a hi-fi voice plays at rate 1 (still fully clean)', () => {
    const p = curdleParamsFor(1, 'pristine', { hifi: true });
    expect(p.rate).toBe(1);
    expect(p.wet).toBe(0);
    expect(p.wow.depth).toBe(0);
    expect(p.dropoutChance).toBe(0);
  });

  it('pristine on the lo-fi voice keeps the rate correction', () => {
    expect(curdleParamsFor(0, 'pristine').rate).toBe(PRISTINE_RATE);
    expect(curdleParamsFor(0, 'pristine', { hifi: false }).rate).toBe(PRISTINE_RATE);
  });

  it('dread and the cursed pressing are hi-fi-blind', () => {
    for (const u of [0, 0.5, 1]) {
      expect(curdleParamsFor(u, null, { hifi: true })).toEqual(curdleParamsFor(u, null));
      expect(curdleParamsFor(u, 'cursed', { hifi: true })).toEqual(curdleParamsFor(u, 'cursed'));
    }
  });
});
