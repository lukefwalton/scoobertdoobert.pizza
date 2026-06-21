import { describe, it, expect } from 'vitest';
import { makeBoids, stepBoids, PIZZA_PARAMS, type Bounds } from './sim';

const BOUNDS: Bounds = { x: 10, y: 4, z: 10 };

describe('boids sim', () => {
  it('makeBoids spawns exactly `count` boids inside the bounds with finite velocity', () => {
    const boids = makeBoids(PIZZA_PARAMS, BOUNDS);
    expect(boids).toHaveLength(PIZZA_PARAMS.count);
    for (const b of boids) {
      expect(Math.abs(b.x)).toBeLessThanOrEqual(BOUNDS.x);
      expect(Math.abs(b.y)).toBeLessThanOrEqual(BOUNDS.y);
      expect(Math.abs(b.z)).toBeLessThanOrEqual(BOUNDS.z);
      expect(Number.isFinite(b.vx + b.vy + b.vz)).toBe(true);
    }
  });

  it('stepBoids keeps every boid inside the bounds and within the speed clamp', () => {
    const boids = makeBoids(PIZZA_PARAMS, BOUNDS);
    // Many steps so a runaway integration would escape the box or the speed band.
    for (let i = 0; i < 120; i++) stepBoids(boids, PIZZA_PARAMS, BOUNDS, 1);
    for (const b of boids) {
      expect(Math.abs(b.x)).toBeLessThanOrEqual(BOUNDS.x + 1e-6);
      expect(Math.abs(b.y)).toBeLessThanOrEqual(BOUNDS.y + 1e-6);
      expect(Math.abs(b.z)).toBeLessThanOrEqual(BOUNDS.z + 1e-6);
      const speed = Math.hypot(b.vx, b.vy, b.vz);
      expect(speed).toBeGreaterThanOrEqual(PIZZA_PARAMS.minSpeed - 1e-6);
      expect(speed).toBeLessThanOrEqual(PIZZA_PARAMS.maxSpeed + 1e-6);
    }
  });

  it('stepBoids actually advances the school (not a no-op)', () => {
    const boids = makeBoids(PIZZA_PARAMS, BOUNDS);
    const before = boids.map((b) => ({ ...b }));
    stepBoids(boids, PIZZA_PARAMS, BOUNDS, 1);
    const moved = boids.some((b, i) => b.x !== before[i].x || b.z !== before[i].z);
    expect(moved).toBe(true);
  });
});
