// ───────────────────────────────────────────────────────────────────────────
// "Cultures" — the testable core of the /cultures cabinet (a living-colony drone).
//
// PROVENANCE: ported from the DNA instrument in Luke's own `fun` playground and
// RE-HOMED as this project's own standalone file — scoobertdoobert.pizza never
// imports from or depends on that repo (it may be deleted), same posture as the
// chimes sim and the water/boids technique. Original physics + synthesis, no
// third-party assets. (Renamed "cultures" for the pizza universe: live cultures,
// the way a sourdough starter or cheese is alive.)
//
// A handful of cells — one per chord tone (D F# A B E) — drift on a Perlin flow
// field, drawn together or apart by the musical interval between their notes.
// When two touch they "breed": a child note (from the interval table) blooms.
// Each cell also hums a quiet drone, so the colony is a self-playing pad you
// stir. Pure math only (no DOM / no Web Audio) so it unit-tests and is SSR-safe;
// the CulturesCabinet component owns rendering + the actual voices.
// ───────────────────────────────────────────────────────────────────────────

// ── Perlin noise (compact 2D), vendored. The permutation table is seeded once at
//    module load; this never touches the DOM, so it's safe to import on the server.
const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
(function seedPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (gi: number, x: number, y: number) => {
  const g = GRAD[gi % 8];
  return g[0] * x + g[1] * y;
};
function noise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = PERM[PERM[X] + Y];
  const ab = PERM[PERM[X] + Y + 1];
  const ba = PERM[PERM[X + 1] + Y];
  const bb = PERM[PERM[X + 1] + Y + 1];
  const x1 = grad(aa, xf, yf) * (1 - u) + grad(ba, xf - 1, yf) * u;
  const x2 = grad(ab, xf, yf - 1) * (1 - u) + grad(bb, xf - 1, yf - 1) * u;
  return x1 * (1 - v) + x2 * v;
}

// ── Note / chord data (the D6/9 world: D F# A B E), vendored subset. ──────────
const NOTE_FREQ: Record<string, number> = {
  D: 293.66,
  E: 329.63,
  'F#': 369.99,
  A: 440.0,
  B: 493.88,
};
const VOICED_NOTES = ['D', 'F#', 'A', 'B', 'E'];
const ORDER = ['D', 'E', 'F#', 'A', 'B'];

// Per-cell colour (base-pair inspired) — our own values.
const CELL_COLOR: Record<string, [number, number, number]> = {
  D: [200, 80, 80],
  'F#': [80, 160, 200],
  A: [80, 190, 120],
  B: [200, 170, 60],
  E: [170, 100, 200],
};

// Interval attraction weights: consonant pairs pull together, the tritone repels.
const INTERVAL_WEIGHTS: Record<string, number> = {
  'D-A': 0.7,
  'D-F#': 0.5,
  'E-A': 0.7,
  'D-E': 0.0,
  'A-B': 0.0,
  'F#-B': -0.3,
  'D-B': 0.3,
  'F#-A': 0.4,
  'E-F#': 0.2,
  'E-B': 0.7,
};

// Collision pair → the child note that blooms.
const CHILD_TABLE: Record<string, string> = {
  'D-F#': 'A',
  'D-A': 'F#',
  'D-B': 'E',
  'D-E': 'A',
  'F#-A': 'D',
  'F#-B': 'E',
  'E-F#': 'A',
  'A-B': 'D',
  'E-A': 'B',
  'E-B': 'D',
};

export function noteToFreq(note: string, octave: number): number {
  const base = NOTE_FREQ[note];
  if (!base) return 440;
  return base * Math.pow(2, octave - 4);
}

function pairKey(a: string, b: string): string {
  return ORDER.indexOf(a) <= ORDER.indexOf(b) ? `${a}-${b}` : `${b}-${a}`;
}

export type Cell = {
  index: number;
  x: number; // normalised 0..1
  y: number;
  vx: number;
  vy: number;
  note: string;
  octave: number;
  freq: number; // drone frequency
  radius: number;
  color: [number, number, number];
  wander: number;
};

/** A "breeding" event when two cells touch — a child note blooms at (x, y). */
export type Collision = {
  a: number;
  b: number;
  note: string;
  freq: number;
  x: number;
  y: number;
  pan: number;
  color: [number, number, number];
};

export type CultureParams = {
  speed: number; // wander/flow strength
  drift: number; // how fast headings turn
  attraction: number; // interval pull multiplier
};

const COLLIDE_K = 2.4; // collision fires when centres are within (rA+rB)·K
const COOLDOWN = 0.45; // seconds before the same pair can breed again

export class CulturesSim {
  cells: Cell[] = [];
  params: CultureParams = { speed: 1, drift: 1, attraction: 1 };
  // Pointer attractor — set while a finger/mouse is stirring the colony.
  pointer: { x: number; y: number; active: boolean } = { x: 0.5, y: 0.5, active: false };
  time = 0;
  private cooldowns = new Map<string, number>();
  private silence = 0; // seconds since the last collision (drives the stabiliser)

  constructor() {
    this.build();
  }

  private build(): void {
    this.cells = [];
    const notes = VOICED_NOTES;
    const n = notes.length;
    for (let i = 0; i < n; i++) {
      const t = i / Math.max(1, n - 1);
      const strand = i % 2 === 0 ? -1 : 1;
      const phase = t * Math.PI * 2;
      const note = notes[i];
      this.cells.push({
        index: i,
        x: 0.5 + strand * Math.cos(phase) * 0.12,
        y: 0.2 + t * 0.6,
        vx: strand * Math.sin(phase) * 0.005,
        vy: (Math.random() - 0.5) * 0.005,
        note,
        octave: i < 3 ? 4 : 3,
        freq: noteToFreq(note, i < 3 ? 4 : 3),
        radius: 0.02 + Math.random() * 0.006,
        color: CELL_COLOR[note] ?? [200, 200, 200],
        wander: Math.random() * Math.PI * 2,
      });
    }
  }

  /** Advance `dt` seconds and return any breeding collisions this frame. */
  step(dt: number): Collision[] {
    this.time += dt;
    const { speed, drift, attraction } = this.params;
    const cells = this.cells;
    const n = cells.length;

    for (let i = 0; i < n; i++) {
      const c = cells[i];
      // Perlin wander on heading.
      const nv = noise2D(c.x * 3 + this.time * 0.3, c.y * 3 + i * 100);
      c.wander += nv * drift * dt * 4;
      c.vx += Math.cos(c.wander) * speed * 0.08 * dt;
      c.vy += Math.sin(c.wander) * speed * 0.08 * dt;

      // Interval attraction / soft repulsion against the other cells.
      for (let j = i + 1; j < n; j++) {
        const o = cells[j];
        const dx = o.x - c.x;
        const dy = o.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const weight = (INTERVAL_WEIGHTS[pairKey(c.note, o.note)] ?? 0) * attraction;
        if (dist > 0.01) {
          const f = (weight * 0.003) / (dist + 0.1);
          c.vx += (dx / dist) * f * dt;
          c.vy += (dy / dist) * f * dt;
          o.vx -= (dx / dist) * f * dt;
          o.vy -= (dy / dist) * f * dt;
        }
        if (dist < 0.06) {
          const push = (0.06 - dist) * 0.01 * dt * 60;
          c.vx -= (dx / dist) * push;
          c.vy -= (dy / dist) * push;
          o.vx += (dx / dist) * push;
          o.vy += (dy / dist) * push;
        }
      }

      // Pointer attractor — stir the colony toward your finger.
      if (this.pointer.active) {
        const dx = this.pointer.x - c.x;
        const dy = this.pointer.y - c.y;
        c.vx += dx * 0.02 * dt * 60;
        c.vy += dy * 0.02 * dt * 60;
      }

      // Damping + speed clamp (frame-rate independent).
      const damping = Math.pow(0.97, dt * 60);
      c.vx *= damping;
      c.vy *= damping;
      const max = speed * 0.15;
      const sp = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
      if (sp > max) {
        c.vx = (c.vx / sp) * max;
        c.vy = (c.vy / sp) * max;
      }

      // Integrate + soft edge bounce (keep cells on screen).
      c.x += c.vx * dt * 60;
      c.y += c.vy * dt * 60;
      const m = 0.05;
      if (c.x < m) {
        c.vx += (m - c.x) * dt * 30;
        c.x = Math.max(0.01, c.x);
      }
      if (c.x > 1 - m) {
        c.vx -= (c.x - (1 - m)) * dt * 30;
        c.x = Math.min(0.99, c.x);
      }
      if (c.y < m) {
        c.vy += (m - c.y) * dt * 30;
        c.y = Math.max(0.01, c.y);
      }
      if (c.y > 1 - m) {
        c.vy -= (c.y - (1 - m)) * dt * 30;
        c.y = Math.min(0.99, c.y);
      }
    }

    // Collisions → children.
    const out: Collision[] = [];
    for (const [k, t] of this.cooldowns) {
      const nt = t - dt;
      if (nt <= 0) this.cooldowns.delete(k);
      else this.cooldowns.set(k, nt);
    }
    let bred = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = cells[i];
        const b = cells[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const key = pairKey(a.note, b.note);
        if (dist < (a.radius + b.radius) * COLLIDE_K && !this.cooldowns.has(key)) {
          const childNote = CHILD_TABLE[key];
          if (childNote) {
            const octave = Math.round((a.octave + b.octave) / 2);
            const mx = (a.x + b.x) / 2;
            out.push({
              a: i,
              b: j,
              note: childNote,
              freq: noteToFreq(childNote, octave),
              x: mx,
              y: (a.y + b.y) / 2,
              pan: mx * 2 - 1,
              color: a.color,
            });
            this.cooldowns.set(key, COOLDOWN);
            bred = true;
          }
        }
      }
    }

    // Density stabiliser: after a few seconds of silence, gently pull the colony
    // back together so it starts singing again (never a dead screen).
    this.silence = bred ? 0 : this.silence + dt;
    if (this.silence > 3) {
      const bias = Math.min((this.silence - 3) * 0.02, 0.1) * dt * 60;
      for (const c of cells) {
        c.vx += (0.5 - c.x) * bias;
        c.vy += (0.5 - c.y) * bias;
      }
    }

    return out;
  }
}
