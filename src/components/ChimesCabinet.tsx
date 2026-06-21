import { useEffect, useRef, useState } from 'react';
import { ChimesSim, strikeBell, type Strike, MIN_COUNT, MAX_COUNT } from '../lib/chimes';
import { useAudioStore } from '../state/audioStore';
import { exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// ChimesCabinet — "Pendulum Chimes," the third arcade cabinet and the "play it"
// rung of the music ladder made into a toy you tap (see docs/DESIGN → the music
// ladder). A row of pendulums swings at harmonic ratios; each zero-crossing
// strikes a tuned bell. They drift in and out of phase, so the cascade is never
// quite the same twice — exploration's reward is sound.
//
// PROVENANCE: the instrument is ported from Luke's own `fun` playground and
// re-homed as our own standalone files (sim → src/lib/chimes.ts, synthesis here)
// so this repo never depends on that one. The sound is SYNTHESISED from scratch —
// no external sample — which both honours the no-shipped-samples posture and
// makes it a pure, self-contained cabinet like Pizza Run and Poke Scoobert.
//
// Self-contained + three-free: a single <canvas> + a tiny Web Audio graph, no
// AudioWorklet (so nothing to bundle/serve) and no three.js, so it loads on the
// lightest phone. Touch-first. Respects the global mute, and the whole thing is
// brickwall-limited + voice-capped so no pile-up of bells can ever spike.
// ───────────────────────────────────────────────────────────────────────────

const W = 320; // logical canvas size (portrait — the pendulums hang)
const H = 360;
const MAX_VOICES = 24; // polyphony cap (bounds CPU + keeps the mix from piling up)

// A small original palette (warm + cool), our own — NOT the source repo's table.
// Struck pendulums cycle through these so the wave shimmers as it plays.
const PALETTE: [number, number, number][] = [
  [255, 138, 92], // coral
  [255, 205, 77], // amber
  [126, 217, 122], // sage
  [96, 214, 224], // aqua
  [124, 150, 255], // periwinkle
  [214, 134, 224], // orchid
  [255, 99, 146], // rose
  [120, 230, 180], // mint
];

// ── the bell synth: 3 sine partials (fundamental + octave + inharmonic) through
//    an exponential decay, panned, summed into a self-limited master. One
//    throwaway voice per strike; nodes free themselves on end. ─────────────────
class BellEngine {
  readonly ctx: AudioContext;
  private readonly master: GainNode;
  private active = 0;

  constructor() {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    // Brickwall limiter across everything — the cabinet stays self-safe no matter
    // how many bells converge at once (WCAG 2.3.1 / ears), mirroring the engine.
    const limiter = this.ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    this.master.connect(limiter);
    limiter.connect(this.ctx.destination);
  }

  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  close(): void {
    void this.ctx.close();
  }

  strike(freq: number, pan: number): void {
    if (this.active >= MAX_VOICES) return; // drop a strike rather than overload
    // The voice itself is the shared, reusable engine (src/lib/chimes.strikeBell);
    // the cabinet only owns the polyphony cap + ducking as voices stack.
    this.active++;
    strikeBell(this.ctx, this.master, freq, {
      pan,
      peak: 0.5 / Math.sqrt(this.active),
      onEnded: () => {
        this.active = Math.max(0, this.active - 1);
      },
    });
  }
}

export function ChimesCabinet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const setMuted = useAudioStore((s) => s.setMuted);

  const [count, setCount] = useState(12);
  const [tempo, setTempo] = useState(1);
  const [started, setStarted] = useState(false);

  const sim = useRef<ChimesSim>(new ChimesSim(12, true));
  const engine = useRef<BellEngine | null>(null);
  const colors = useRef<[number, number, number][]>([]);
  const strikeCount = useRef(0); // smoke hook: proves bells actually fire

  if (colors.current.length === 0) {
    colors.current = Array.from({ length: MAX_COUNT }, (_, i) => PALETTE[i % PALETTE.length]);
  }

  // Lazily build the audio engine on the first gesture (autoplay policy). Returns
  // it so the same gesture that creates it can also resume + strike.
  const ensureEngine = (): BellEngine | null => {
    if (!engine.current) {
      try {
        engine.current = new BellEngine();
        setStarted(true);
      } catch {
        engine.current = null; // no Web Audio → the toy still swings, silently
      }
    }
    engine.current?.resume();
    return engine.current;
  };

  // Tap the screen → re-launch the whole wave in phase (the satisfying cascade)
  // and make sure sound is on. A gesture, so it's allowed to start audio.
  const reswing = () => {
    sim.current.reset();
    if (muted) setMuted(false); // tapping to play implies you want to hear it
    ensureEngine();
  };

  // ── the render + sim loop (owns the refs; doesn't re-render per frame) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05); // clamp tab-unfocus jumps
      last = now;

      const s = sim.current;
      const strikes: Strike[] = s.step(dt);
      const silent = muted || !engine.current;
      for (const strike of strikes) {
        if (!silent) engine.current!.strike(strike.freq, strike.pan);
        colors.current[strike.index] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        strikeCount.current++;
      }
      exposeTestGlobal('__sdpChimes', {
        strikes: strikeCount.current,
        started: !!engine.current,
        muted,
      });

      drawChimes(ctx, s, colors.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      exposeTestGlobal('__sdpChimes', undefined);
    };
    // `muted` is read fresh each frame via the closure; re-subscribe when it flips
    // so the gate is exact. The sim/engine/colors live in refs across re-runs.
  }, [muted]);

  // Keep the sim in sync with the React-controlled count/tempo.
  useEffect(() => {
    sim.current.setCount(count);
  }, [count]);
  useEffect(() => {
    sim.current.tempo = tempo;
  }, [tempo]);

  // Tear the audio down on unmount so leaving the cabinet leaves no context open.
  useEffect(
    () => () => {
      engine.current?.close();
      engine.current = null;
    },
    [],
  );

  const nudge = (d: number) => setCount((c) => Math.max(MIN_COUNT, Math.min(MAX_COUNT, c + d)));

  return (
    <div className="chimes-screen">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="chimes-canvas"
        onPointerDown={(e) => {
          e.preventDefault();
          reswing();
        }}
      />

      <div className="chimes-controls">
        <div className="chimes-ctl">
          <span className="chimes-ctl__label">BELLS</span>
          <button type="button" className="chimes-btn" aria-label="fewer bells" onClick={() => nudge(-1)}>
            &minus;
          </button>
          <span className="chimes-ctl__val">{count}</span>
          <button type="button" className="chimes-btn" aria-label="more bells" onClick={() => nudge(1)}>
            +
          </button>
        </div>

        <label className="chimes-ctl chimes-ctl--slider">
          <span className="chimes-ctl__label">SPEED</span>
          <input
            type="range"
            min={0.25}
            max={2.5}
            step={0.05}
            value={tempo}
            onChange={(e) => setTempo(parseFloat(e.target.value))}
          />
        </label>

        <div className="chimes-ctl chimes-ctl--actions">
          <button type="button" className="chimes-btn chimes-btn--wide" onClick={reswing}>
            &#8635; SWING
          </button>
          <button
            type="button"
            className="chimes-btn chimes-btn--wide"
            aria-pressed={!muted}
            onClick={() => {
              ensureEngine(); // a gesture — allowed to start audio
              toggleMute();
            }}
          >
            &#9834; {muted ? 'OFF' : 'ON'}
          </button>
        </div>
      </div>

      <p className="chimes-hint">
        {started
          ? muted
            ? 'sound is off — tap ♪ ON'
            : 'tap the glass to re-swing · drag SPEED, add BELLS'
          : 'tap the glass to start the chimes'}
      </p>
    </div>
  );
}

// Port of the source instrument's renderer (re-homed): a trail-fading field with
// pendulum arms from a top pivot, each ball glowing on its strike. The "flash" is
// a small, dim, per-ball radial glow — never a full-field flash — so it stays
// well inside WCAG 2.3.1 (≤3 flashes/sec, no high-luminance full-screen flash).
function drawChimes(
  ctx: CanvasRenderingContext2D,
  sim: ChimesSim,
  colors: [number, number, number][],
) {
  // Fade the previous frame for a gentle motion trail.
  ctx.fillStyle = 'rgba(10, 10, 18, 0.22)';
  ctx.fillRect(0, 0, W, H);

  const pendulums = sim.pendulums;
  if (pendulums.length === 0) return;

  const pivotX = W / 2;
  const pivotY = H * 0.08;
  const maxArm = H * 0.78;
  const minArm = H * 0.3;
  const armStep = (maxArm - minArm) / Math.max(1, pendulums.length - 1);

  // A faint vertical guide down the pivot.
  ctx.fillStyle = 'rgba(120, 200, 255, 0.05)';
  ctx.fillRect(pivotX - 1, pivotY, 2, maxArm);

  for (let i = 0; i < pendulums.length; i++) {
    const p = pendulums[i];
    const arm = maxArm - i * armStep;
    const bx = pivotX + Math.sin(p.theta) * arm;
    const by = pivotY + Math.cos(p.theta) * arm;
    const [r, g, b] = colors[i] ?? [200, 200, 220];
    const radius = 5 + (1 - i / pendulums.length) * 6; // lower notes = bigger balls

    // arm
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = `rgba(200, 200, 220, ${0.07 + p.flash * 0.13})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // strike glow (dim, localised — the WCAG-safe "flash")
    if (p.flash > 0.05) {
      const gr = radius + p.flash * 16;
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, gr);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.flash * 0.45})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, gr, 0, Math.PI * 2);
      ctx.fill();
    }

    // ball
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.62 + p.flash * 0.38})`;
    ctx.fill();

    // a little specular highlight
    ctx.beginPath();
    ctx.arc(bx - radius * 0.25, by - radius * 0.25, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.14 + p.flash * 0.18})`;
    ctx.fill();
  }
}
