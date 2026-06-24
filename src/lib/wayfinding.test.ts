import { describe, it, expect } from 'vitest';
import { nextHopDoor, arrowDeg } from './wayfinding';

describe('nextHopDoor', () => {
  it('returns null when already in the target room', () => {
    expect(nextHopDoor('poolrooms', 'poolrooms')).toBeNull();
  });

  it('routes one hop directly through the connecting door', () => {
    // shop → hallway is a single door (shop-to-hall).
    const hop = nextHopDoor('shop', 'hallway');
    expect(hop?.id).toBe('shop-to-hall');
    expect(hop?.to).toBe('hallway');
  });

  it('returns the FIRST door of a multi-hop path (shop → jukebox via the hall)', () => {
    const hop = nextHopDoor('shop', 'jukebox');
    expect(hop?.to).toBe('hallway'); // step into the hall first, not teleport
  });

  it('does not route through hidden doors (shrine is behind the hidden torii)', () => {
    // The only way to the shrine is the HIDDEN pool-to-japan torii, so until it's
    // revealed there is no known path — the compass gracefully shows no arrow.
    expect(nextHopDoor('poolrooms', 'shrine')).toBeNull();
  });
});

describe('arrowDeg', () => {
  it('0° when the target is straight ahead of the heading', () => {
    // facing -Z (yaw π); a target further -Z is dead ahead.
    expect(arrowDeg(0, -5, 0, 0, Math.PI)).toBeCloseTo(0, 5);
  });

  it('points behind (±180°) when the target is behind you', () => {
    // facing -Z (yaw π); a target at +Z is behind.
    expect(Math.abs(arrowDeg(0, 5, 0, 0, Math.PI))).toBeCloseTo(180, 5);
  });

  it('a target to screen-right reads as a positive (clockwise) rotation', () => {
    // facing -Z (yaw π); screen-right = cross(forward, up) = +X, so a +X target
    // rotates the arrow +90° (clockwise), matching the live render.
    expect(arrowDeg(5, 0, 0, 0, Math.PI)).toBeCloseTo(90, 5);
  });

  it('a target to screen-left reads as a negative rotation (facing +Z, +X is left)', () => {
    expect(arrowDeg(5, 0, 0, 0, 0)).toBeCloseTo(-90, 5);
  });
});
