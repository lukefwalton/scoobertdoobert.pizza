// ───────────────────────────────────────────────────────────────────────────
// Ported flocking steering from brand-web games/src/scripts/boids.ts
// (updateBoids). Single species — "pizza slices". Keeps the simulation logic:
// separation / alignment / cohesion with the y-axis spiral-cohesion that makes
// the school curl into a horizontal cyclone, plus cubic soft-wall repulsion.
// Drops the cross-species narwhal/fish hunting (not needed here). Re-homed as
// this repo's own standalone file — no dependency on the source project.
//
// Framework-agnostic: it mutates flat Boid objects so the R3F component can
// drive it from useFrame.
// ───────────────────────────────────────────────────────────────────────────

export interface BoidParams {
  count: number;
  maxSpeed: number;
  minSpeed: number;
  perceptionRadius: number;
  separationRadius: number;
  alignmentFactor: number;
  cohesionFactor: number;
  separationFactor: number;
  /** Cohesion pull rotates this far around the y-axis -> horizontal swirl. */
  spiralAngle: number;
}

export const PIZZA_PARAMS: BoidParams = {
  count: 26,
  maxSpeed: 2.2,
  minSpeed: 0.8,
  perceptionRadius: 9,
  separationRadius: 3.2,
  alignmentFactor: 0.1,
  cohesionFactor: 0.004,
  separationFactor: 0.22,
  spiralAngle: Math.PI * 0.42,
};

/** Half-extents of the swim volume. */
export interface Bounds {
  x: number;
  y: number;
  z: number;
}

export interface Boid {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export function makeBoids(p: BoidParams, b: Bounds): Boid[] {
  const out: Boid[] = [];
  const speed = (p.minSpeed + p.maxSpeed) / 2;
  for (let i = 0; i < p.count; i++) {
    const dir = Math.random() * Math.PI * 2;
    out.push({
      x: (Math.random() * 2 - 1) * b.x * 0.7,
      y: (Math.random() * 2 - 1) * b.y * 0.6,
      z: (Math.random() * 2 - 1) * b.z * 0.7,
      vx: Math.cos(dir) * speed,
      vy: (Math.random() * 2 - 1) * 0.3,
      vz: Math.sin(dir) * speed,
    });
  }
  return out;
}

const WALL_MARGIN_FRAC = 0.25;
const WALL_PEAK = 0.5;

function wall(pos: number, half: number, margin: number): number {
  if (pos > half - margin) {
    const t = (pos - (half - margin)) / margin;
    return -WALL_PEAK * t * t * t;
  }
  if (pos < -half + margin) {
    const t = (-half + margin - pos) / margin;
    return WALL_PEAK * t * t * t;
  }
  return 0;
}

/** Advance the school one step. `frameScale` normalizes to ~60fps units. */
export function stepBoids(boids: Boid[], p: BoidParams, b: Bounds, frameScale: number): void {
  const percSq = p.perceptionRadius * p.perceptionRadius;
  const sepSq = p.separationRadius * p.separationRadius;
  const margin = Math.min(b.x, b.y, b.z) * WALL_MARGIN_FRAC;

  for (let i = 0; i < boids.length; i++) {
    const boid = boids[i];
    let alX = 0, alY = 0, alZ = 0;
    let coX = 0, coY = 0, coZ = 0;
    let seX = 0, seY = 0, seZ = 0;
    let count = 0;

    for (let j = 0; j < boids.length; j++) {
      if (j === i) continue;
      const o = boids[j];
      const dx = o.x - boid.x;
      const dy = o.y - boid.y;
      const dz = o.z - boid.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 === 0) continue;
      if (d2 < percSq) {
        alX += o.vx; alY += o.vy; alZ += o.vz;
        coX += o.x; coY += o.y; coZ += o.z;
        count++;
      }
      if (d2 < sepSq) {
        const d = Math.sqrt(d2);
        seX -= dx / d; seY -= dy / d; seZ -= dz / d;
      }
    }

    let ax = 0, ay = 0, az = 0;
    if (count > 0) {
      alX /= count; alY /= count; alZ /= count;
      coX /= count; coY /= count; coZ /= count;

      ax += (alX - boid.vx) * p.alignmentFactor;
      ay += (alY - boid.vy) * p.alignmentFactor;
      az += (alZ - boid.vz) * p.alignmentFactor;

      // Spiral grows with school size: bigger clusters curl tighter.
      const swirlT = Math.min(count / 25, 1);
      const eff = p.spiralAngle + (Math.PI / 2 - p.spiralAngle) * swirlT;
      const cs = Math.cos(eff);
      const sn = Math.sin(eff);
      const tX = coX - boid.x;
      const tY = coY - boid.y;
      const tZ = coZ - boid.z;
      ax += (tX * cs - tZ * sn) * p.cohesionFactor;
      ay += tY * p.cohesionFactor;
      az += (tX * sn + tZ * cs) * p.cohesionFactor;

      ax += seX * p.separationFactor;
      ay += seY * p.separationFactor;
      az += seZ * p.separationFactor;
    }

    ax += wall(boid.x, b.x, margin);
    ay += wall(boid.y, b.y, margin);
    az += wall(boid.z, b.z, margin);

    boid.vx += ax * frameScale;
    boid.vy += ay * frameScale;
    boid.vz += az * frameScale;

    const sp = Math.hypot(boid.vx, boid.vy, boid.vz) || 1e-6;
    const clamped = Math.min(Math.max(sp, p.minSpeed), p.maxSpeed);
    const k = clamped / sp;
    boid.vx *= k; boid.vy *= k; boid.vz *= k;

    boid.x += boid.vx * frameScale;
    boid.y += boid.vy * frameScale;
    boid.z += boid.vz * frameScale;

    boid.x = Math.max(-b.x, Math.min(b.x, boid.x));
    boid.y = Math.max(-b.y, Math.min(b.y, boid.y));
    boid.z = Math.max(-b.z, Math.min(b.z, boid.z));
  }
}
