// ───────────────────────────────────────────────────────────────────────────
// Pendulum-wave chime sim — the testable core of the /chimes cabinet.
//
// PROVENANCE: the technique is ported from Luke's own half-built JS instrument
// playground (the `fun` project) and RE-HOMED here as this project's own
// standalone file — scoobertdoobert.pizza never imports from, submodules, or
// otherwise depends on that repo (it may be deleted), exactly like the water /
// boids technique. Original synthesis + sim, no third-party assets.
//
// The physics: N pendulums hang from a shared pivot, each a simple harmonic
// oscillator θ(t) = swingAmp · cos(ω·t). Pendulum i completes (baseCycles + i)
// swings in `tMax` seconds, so they drift in and out of phase — the mesmerising
// "pendulum wave." Every time a pendulum's angle crosses zero it strikes a bell.
//
// Pure math only: NO DOM and NO Web Audio here, so it unit-tests cleanly and is
// SSR-safe to import. The ChimesCabinet component owns rendering + the actual
// bell voices; this just says *when* and *what* to strike.
// ───────────────────────────────────────────────────────────────────────────

const TWO_PI = Math.PI * 2;

// Note → frequency at octave 4 (a D6/9 voicing: D E F# A B), equal-tempered from
// there. Any noodle over these tones lands inside the chord, so it always sounds
// nice — the same "you can't play a wrong note" trick as the practice room.
const NOTE_FREQ: Record<string, number> = {
  D: 293.66,
  E: 329.63,
  'F#': 369.99,
  A: 440.0,
  B: 493.88,
};

// Pendulum i takes note seq[i % len], climbing an octave each time the sequence
// wraps — low, long pendulums on the left, bright high ones on the right.
const VOICED_SEQUENCE = ['D', 'F#', 'A', 'B', 'E'];
const OPEN_SEQUENCE = ['D', 'A', 'B', 'E'];

export const MIN_COUNT = 4;
export const MAX_COUNT = 16;

/** Convert a chord-tone name + octave to a frequency in Hz. */
export function noteToFreq(note: string, octave: number): number {
  const base = NOTE_FREQ[note];
  if (!base) return 440;
  return base * Math.pow(2, octave - 4); // NOTE_FREQ is defined at octave 4
}

/** A bell strike emitted by the sim on a zero-crossing. `pan` is -1..1 (the
 *  pendulum's left→right position), so the chimes spread across the stereo field. */
export type Strike = { index: number; freq: number; pan: number };

export type Pendulum = {
  index: number;
  omega: number; // angular frequency (rad/s)
  theta: number; // current angle from vertical (rad)
  thetaPrev: number; // previous frame's angle (for zero-crossing detection)
  freq: number; // the bell note this pendulum strikes
  flash: number; // 0..1 strike glow, decays each frame (visual only)
};

function clampCount(n: number): number {
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, Math.round(n)));
}

export type BellVoiceOpts = {
  pan?: number; // -1..1 stereo placement
  peak?: number; // peak gain (the cabinet ducks this as voices stack)
  decayScale?: number; // multiply the natural ring length
  onEnded?: () => void; // fired when the voice frees itself (for voice-counting)
};

/**
 * Strike one bell into an arbitrary Web Audio destination — THE reusable engine.
 *
 * It's deliberately context-agnostic (takes the `ctx` and an output node), so the
 * exact same voice powers BOTH the /chimes cabinet (its own AudioContext) and any
 * in-world effect routed through the shared world engine's master→limiter (e.g.
 * `audio.playChime`, the shrine's furin). A bell = three sine partials —
 * fundamental + octave + ~2.76× inharmonic — through an exponential decay (lower
 * notes ring longer), optionally panned. One throwaway voice; it frees its own
 * nodes on end. SSR-safe: nothing runs until you call it with a live context.
 */
export function strikeBell(
  ctx: AudioContext,
  out: AudioNode,
  freq: number,
  opts: BellVoiceOpts = {},
): void {
  const { pan = 0, peak = 0.5, decayScale = 1, onEnded } = opts;
  const now = ctx.currentTime;
  const dur = (1.5 + 1.5 * Math.max(0, 1 - freq / 600)) * decayScale;

  const vgain = ctx.createGain();
  vgain.gain.setValueAtTime(0.0001, now);
  vgain.gain.linearRampToValueAtTime(Math.max(0.0001, peak), now + 0.004); // fast bell attack
  vgain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  let tail: AudioNode = vgain;
  let panner: StereoPannerNode | undefined;
  if (typeof ctx.createStereoPanner === 'function') {
    panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan)) * 0.7;
    vgain.connect(panner);
    tail = panner;
  }
  tail.connect(out);

  const partials: [number, number][] = [
    [freq, 1],
    [freq * 2, 0.5],
    [freq * 2.76, 0.25], // the inharmonic partial that makes it a bell, not an organ
  ];
  const oscs: OscillatorNode[] = [];
  for (const [f, amp] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.detune.value = Math.random() * 6 - 3; // ±3 cents of life
    const pg = ctx.createGain();
    pg.gain.value = amp;
    osc.connect(pg);
    pg.connect(vgain);
    osc.start(now);
    osc.stop(now + dur + 0.05);
    oscs.push(osc);
  }
  oscs[0].onended = () => {
    for (const o of oscs) o.disconnect();
    vgain.disconnect();
    panner?.disconnect();
    onEnded?.();
  };
}

export class ChimesSim {
  count: number;
  voiced: boolean;
  tempo = 1; // gravity / speed multiplier
  swingAmp = 0.6; // arc amplitude (rad)
  frozen = false;
  time = 0;
  pendulums: Pendulum[] = [];

  private readonly tMax = 60; // seconds for the full convergence cycle
  private readonly baseCycles = 12; // swings the slowest pendulum makes in tMax

  constructor(count = 12, voiced = true) {
    this.count = clampCount(count);
    this.voiced = voiced;
    this.build();
  }

  private build(): void {
    const seq = this.voiced ? VOICED_SEQUENCE : OPEN_SEQUENCE;
    this.pendulums = [];
    for (let i = 0; i < this.count; i++) {
      const cycles = this.baseCycles + i;
      const omega = (TWO_PI * cycles) / this.tMax;
      const note = seq[i % seq.length];
      const octave = 2 + Math.floor(i / seq.length);
      this.pendulums.push({
        index: i,
        omega,
        theta: this.swingAmp,
        thetaPrev: this.swingAmp,
        freq: noteToFreq(note, octave),
        flash: 0,
      });
    }
  }

  /** Change the pendulum count (clamped) and rebuild from a fresh launch. */
  setCount(n: number): void {
    const c = clampCount(n);
    if (c === this.count) return;
    this.count = c;
    this.build();
    this.time = 0;
  }

  /** Re-launch every pendulum in phase from the maximum-swing position — the
   *  "tap to swing" gesture that restarts the cascade. */
  reset(): void {
    this.time = 0;
    for (const p of this.pendulums) {
      p.theta = this.swingAmp;
      p.thetaPrev = this.swingAmp;
      p.flash = 0;
    }
  }

  // (synthesis lives in strikeBell below — see that for the bell voice itself)

  /** Advance `dt` seconds (scaled by tempo) and return this frame's strikes. */
  step(dt: number): Strike[] {
    if (this.frozen) {
      for (const p of this.pendulums) p.flash *= 0.9;
      return [];
    }
    this.time += dt * this.tempo;
    const n = this.count;
    const strikes: Strike[] = [];
    for (const p of this.pendulums) {
      p.thetaPrev = p.theta;
      p.theta = this.swingAmp * Math.cos(p.omega * this.time);
      // Zero-crossing → strike (sign flip, ignoring an exact-zero previous frame).
      if (Math.sign(p.thetaPrev) !== Math.sign(p.theta) && Math.sign(p.thetaPrev) !== 0) {
        const pan = n > 1 ? (p.index / (n - 1)) * 2 - 1 : 0;
        strikes.push({ index: p.index, freq: p.freq, pan });
        p.flash = 1;
      }
      p.flash *= 0.92;
    }
    return strikes;
  }
}
