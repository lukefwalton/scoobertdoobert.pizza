import { useEffect, useRef, useState } from 'react';
import { CulturesSim, type Collision } from '../lib/cultures';
import { useAudioStore } from '../state/audioStore';
import { exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// CulturesCabinet — "Cultures," the fourth arcade cabinet: a living-colony drone
// you stir. Cells (one per chord tone) drift on a Perlin flow field and are
// pulled together or apart by the interval between their notes; when two touch
// they "breed" a child note that blooms over a bed of per-cell drones. Drag the
// glass to herd them together and make the colony sing.
//
// PROVENANCE: the DNA instrument from Luke's own `fun` playground, re-homed as
// our own standalone files (sim → src/lib/cultures.ts, synthesis here) so this
// repo never depends on that one. SYNTHESISED from scratch — drones are sine
// oscillators, children are a short additive voice through a synthetic plate
// reverb — so nothing extra ships. Self-contained, three-free, mute-aware, and
// brickwall-limited + voice-capped so the colony can never spike (WCAG 2.3.1).
// The cell glows + child blooms are soft and localised — no full-field flash.
// ───────────────────────────────────────────────────────────────────────────

const W = 320; // logical canvas size
const H = 340;
const MAX_VOICES = 8;
const DRONE_LEVEL = 0.05; // per-cell drone gain (a quiet bed)

type Child = { x: number; y: number; color: [number, number, number]; life: number };

// The colony's voice: continuous per-cell drones + short additive "child" voices
// on every breeding collision, summed through a synthetic plate reverb, all
// self-limited. One throwaway voice per collision; nodes free themselves on end.
class CultureEngine {
  readonly ctx: AudioContext;
  private readonly master: GainNode; // the mute/sound gate
  private readonly mix: GainNode; // pre-reverb sum (drones + voices)
  private readonly wave: PeriodicWave; // child timbre (fundamental + 2 harmonics)
  private readonly drones: { osc: OscillatorNode; gain: GainNode }[] = [];
  private active = 0;

  constructor() {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    this.master.connect(limiter);
    limiter.connect(ctx.destination);

    // mix → dry + (convolver → wet) → master
    this.mix = ctx.createGain();
    const dry = ctx.createGain();
    dry.gain.value = 0.85;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    const reverb = ctx.createConvolver();
    reverb.buffer = makePlateIR(ctx, 3.2);
    this.mix.connect(dry);
    dry.connect(this.master);
    this.mix.connect(reverb);
    reverb.connect(wet);
    wet.connect(this.master);

    // child voice timbre — sine + a whisper of 2nd/3rd harmonics, as one osc
    const real = new Float32Array([0, 1, 0.15, 0.08]);
    const imag = new Float32Array(real.length);
    this.wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  close(): void {
    void this.ctx.close();
  }

  /** Start one continuous drone per cell (called once the engine exists). */
  setDrones(freqs: number[]): void {
    if (this.drones.length) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = (Math.random() - 0.5) * 8; // gentle chorus
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(DRONE_LEVEL, now + 1.2); // fade the bed in
      osc.connect(gain);
      gain.connect(this.mix);
      osc.start(now);
      this.drones.push({ osc, gain });
    }
  }

  /** A brief swell of a parent cell's drone when it breeds. */
  swell(index: number): void {
    const d = this.drones[index];
    if (!d) return;
    const now = this.ctx.currentTime;
    d.gain.gain.cancelScheduledValues(now);
    d.gain.gain.setValueAtTime(d.gain.gain.value, now);
    d.gain.gain.linearRampToValueAtTime(DRONE_LEVEL * 3, now + 0.04);
    d.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, DRONE_LEVEL), now + 0.6);
  }

  /** A child note blooming on a collision — a short, panned, reverbed voice. */
  collide(freq: number, pan: number): void {
    if (this.active >= MAX_VOICES) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const release = 1.8;

    const vgain = ctx.createGain();
    const peak = 0.34 / Math.sqrt(this.active + 1);
    vgain.gain.setValueAtTime(0.0001, now);
    vgain.gain.linearRampToValueAtTime(peak, now + 0.02); // soft attack
    vgain.gain.exponentialRampToValueAtTime(0.0001, now + release);

    let tail: AudioNode = vgain;
    let panner: StereoPannerNode | undefined;
    if (typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan)) * 0.6;
      vgain.connect(panner);
      tail = panner;
    }
    tail.connect(this.mix);

    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.wave);
    osc.frequency.value = freq;
    osc.connect(vgain);
    osc.start(now);
    osc.stop(now + release + 0.05);
    this.active++;
    osc.onended = () => {
      this.active = Math.max(0, this.active - 1);
      osc.disconnect();
      vgain.disconnect();
      panner?.disconnect();
    };
  }
}

// Synthetic plate-ish impulse response: decaying stereo noise. Gives the colony
// its lush, blooming tail without shipping any audio file.
function makePlateIR(ctx: AudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6);
    }
  }
  return buf;
}

export function CulturesCabinet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const setMuted = useAudioStore((s) => s.setMuted);

  const [flow, setFlow] = useState(1);
  const [pull, setPull] = useState(1);
  const [started, setStarted] = useState(false);

  const sim = useRef<CulturesSim>(new CulturesSim());
  const engine = useRef<CultureEngine | null>(null);
  const children = useRef<Child[]>([]);
  const collisionCount = useRef(0); // smoke hook: proves the colony breeds notes

  const ensureEngine = (): CultureEngine | null => {
    if (!engine.current) {
      try {
        engine.current = new CultureEngine();
        engine.current.setDrones(sim.current.cells.map((c) => c.freq));
        setStarted(true);
      } catch {
        engine.current = null; // no Web Audio → it still drifts, silently
      }
    }
    engine.current?.resume();
    return engine.current;
  };

  // Map a pointer event to normalised colony space (0..1).
  const toLocal = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const s = sim.current;
      const collisions: Collision[] = s.step(dt);
      const silent = muted || !engine.current;
      for (const col of collisions) {
        if (!silent) {
          engine.current!.collide(col.freq, col.pan);
          engine.current!.swell(col.a);
          engine.current!.swell(col.b);
        }
        children.current.push({ x: col.x, y: col.y, color: col.color, life: 1 });
        collisionCount.current++;
      }
      // age the child blooms
      children.current = children.current.filter((ch) => (ch.life -= dt * 0.8) > 0);

      exposeTestGlobal('__sdpCultures', {
        collisions: collisionCount.current,
        started: !!engine.current,
        muted,
        cells: s.cells.length,
      });

      drawCultures(ctx, s, children.current, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      exposeTestGlobal('__sdpCultures', undefined);
    };
  }, [muted]);

  useEffect(() => {
    sim.current.params.speed = flow;
  }, [flow]);
  useEffect(() => {
    sim.current.params.attraction = pull;
  }, [pull]);

  useEffect(
    () => () => {
      engine.current?.close();
      engine.current = null;
    },
    [],
  );

  return (
    <div className="cultures-screen">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="cultures-canvas"
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          const l = toLocal(e);
          sim.current.pointer = { x: l.x, y: l.y, active: true };
          if (muted) setMuted(false); // stirring to play implies wanting to hear it
          ensureEngine();
        }}
        onPointerMove={(e) => {
          if (!sim.current.pointer.active) return;
          const l = toLocal(e);
          sim.current.pointer.x = l.x;
          sim.current.pointer.y = l.y;
        }}
        onPointerUp={() => {
          sim.current.pointer.active = false;
        }}
        onPointerCancel={() => {
          sim.current.pointer.active = false;
        }}
      />

      <div className="cultures-controls">
        <label className="cultures-ctl">
          <span className="cultures-ctl__label">FLOW</span>
          <input
            type="range"
            min={0.25}
            max={2.2}
            step={0.05}
            value={flow}
            onChange={(e) => setFlow(parseFloat(e.target.value))}
          />
        </label>
        <label className="cultures-ctl">
          <span className="cultures-ctl__label">PULL</span>
          <input
            type="range"
            min={0}
            max={2.5}
            step={0.05}
            value={pull}
            onChange={(e) => setPull(parseFloat(e.target.value))}
          />
        </label>
        <button
          type="button"
          className="cultures-btn"
          aria-pressed={!muted}
          onClick={() => {
            ensureEngine();
            toggleMute();
          }}
        >
          &#9834; {muted ? 'OFF' : 'ON'}
        </button>
      </div>

      <p className="cultures-hint">
        {started
          ? muted
            ? 'sound is off — tap ♪ ON'
            : 'drag to herd the cultures together — they breed notes when they touch'
          : 'drag across the glass to stir the cultures'}
      </p>
    </div>
  );
}

// Streamlined port of the DNA renderer (re-homed): faint rungs between nearby
// cells, each cell a soft glowing body, and a small bloom where a collision bred
// a note. All glows are dim + localised — never a full-field flash (WCAG 2.3.1).
function drawCultures(
  ctx: CanvasRenderingContext2D,
  sim: CulturesSim,
  children: Child[],
  now: number,
) {
  ctx.fillStyle = 'rgba(8, 10, 18, 0.16)'; // motion-trail fade
  ctx.fillRect(0, 0, W, H);

  const cells = sim.cells;

  // rungs between cells that are close (the colony's connective web)
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i];
      const b = cells[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0.42) continue;
      const alpha = Math.max(0.03, 0.16 * (1 - d / 0.42));
      const grad = ctx.createLinearGradient(a.x * W, a.y * H, b.x * W, b.y * H);
      grad.addColorStop(0, `rgba(${a.color[0]}, ${a.color[1]}, ${a.color[2]}, ${alpha})`);
      grad.addColorStop(1, `rgba(${b.color[0]}, ${b.color[1]}, ${b.color[2]}, ${alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x * W, a.y * H);
      ctx.lineTo(b.x * W, b.y * H);
      ctx.stroke();
    }
  }

  // child blooms (fading)
  for (const ch of children) {
    const px = ch.x * W;
    const py = ch.y * H;
    const [r, g, b] = ch.color;
    const rad = 4 + (1 - ch.life) * 16;
    const grad = ctx.createRadialGradient(px, py, 0, px, py, rad);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${ch.life * 0.5})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // cells
  for (const c of cells) {
    const px = c.x * W;
    const py = c.y * H;
    const [r, g, b] = c.color;
    const wobble = 1 + Math.sin(now * 0.003 + c.index * 1.7) * 0.06;
    const rad = c.radius * Math.min(W, H) * wobble;

    const glow = ctx.createRadialGradient(px, py, rad * 0.3, px, py, rad * 3);
    glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.16)`);
    glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, rad * 3, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createRadialGradient(px, py, 0, px, py, rad);
    body.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.7)`);
    body.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.12)`);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}
