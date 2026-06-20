// ───────────────────────────────────────────────────────────────────────────
// A tiny "degraded MIDI" synth. A short square-wave motif is rendered ONCE into
// an AudioBuffer and looped; it's lo-fi by construction (square wave + lowpass
// + amplitude quantization) and trivial to pitch-bend (ramp playbackRate) when
// the descent "ages" the era.
//
// This is a placeholder voice for the boot loop. A real degraded-MIDI bounce of
// a Scoobert track can be dropped in later by swapping buildBuffer() for a
// decodeAudioData() of a file in /public/audio.
//
// SSR-safe: the constructor touches nothing. All Web Audio / window access is
// deferred to ensure()/unlock(), which only run from client effects and user
// gestures.
// ───────────────────────────────────────────────────────────────────────────

type Note = [freqHz: number, beats: number];

// A short, dreamy minor motif (A-minor-ish).
const MOTIF: Note[] = [
  [220.0, 1], [261.63, 1], [329.63, 1], [261.63, 1],
  [196.0, 1], [246.94, 1], [329.63, 2],
  [220.0, 1], [261.63, 1], [392.0, 1], [329.63, 1],
  [293.66, 2], [220.0, 2],
];

const BPM = 96;
const SECONDS_PER_BEAT = 60 / BPM;

function buildBuffer(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const totalBeats = MOTIF.reduce((s, [, b]) => s + b, 0);
  const len = Math.ceil(totalBeats * SECONDS_PER_BEAT * sr);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);

  let cursor = 0; // sample index
  for (const [freq, beats] of MOTIF) {
    const n = Math.floor(beats * SECONDS_PER_BEAT * sr);
    for (let i = 0; i < n; i++) {
      const time = i / sr;
      const phase = (time * freq) % 1;
      let s = phase < 0.5 ? 1 : -1; // square wave
      s *= Math.exp(-3.2 * time) * 0.9 + 0.05; // pluck envelope
      s = Math.round(s * 6) / 6; // amplitude quantization => bit-crushed
      data[cursor + i] = s * 0.18;
    }
    cursor += n;
  }
  return buf;
}

class PizzaAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private lowpass?: BiquadFilterNode;
  private buffer?: AudioBuffer;
  private source?: AudioBufferSourceNode;
  private started = false;
  muted = false;

  /** Create the audio graph + render the loop buffer. Idempotent. */
  ensure(): void {
    if (this.ctx) return;
    const AC =
      typeof window !== 'undefined'
        ? window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AC) return;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0.0001;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2200; // muffled, lo-fi
    lowpass.connect(master);
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.lowpass = lowpass;
    this.buffer = buildBuffer(ctx);
  }

  /** Resume the context. Must be called from a user gesture (autoplay policy). */
  unlock(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  startBootLoop(): void {
    this.ensure();
    if (!this.ctx || !this.buffer || !this.lowpass || this.started) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.loop = true;
    src.connect(this.lowpass);
    src.start();
    this.source = src;
    this.started = true;
    this.applyGain();
  }

  stopBootLoop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
      this.source = undefined;
    }
    this.started = false;
  }

  private applyGain(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0.0001 : 0.5, now, 0.15);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (!m) {
      this.unlock();
      this.startBootLoop();
    }
    this.applyGain();
  }

  /** Pitch-bend the whole loop downward as the era "ages" (the descent). */
  pitchBendDown(durationMs = 2200, target = 0.45): void {
    if (!this.ctx || !this.source) return;
    const now = this.ctx.currentTime;
    const rate = this.source.playbackRate;
    rate.cancelScheduledValues(now);
    rate.setValueAtTime(rate.value, now);
    rate.linearRampToValueAtTime(target, now + durationMs / 1000);
    if (this.lowpass) {
      this.lowpass.frequency.cancelScheduledValues(now);
      this.lowpass.frequency.linearRampToValueAtTime(700, now + durationMs / 1000);
    }
  }

  /**
   * Restore normal pitch + brightness. Called when returning to the storefront
   * so the descent's one-way bend doesn't leave the loop slowed/muffled for the
   * rest of the session (and so a second descent bends from normal again).
   */
  restorePitch(durationMs = 800): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.source) {
      const rate = this.source.playbackRate;
      rate.cancelScheduledValues(now);
      rate.setValueAtTime(rate.value, now);
      rate.linearRampToValueAtTime(1, now + durationMs / 1000);
    }
    if (this.lowpass) {
      this.lowpass.frequency.cancelScheduledValues(now);
      this.lowpass.frequency.linearRampToValueAtTime(2200, now + durationMs / 1000);
    }
  }
}

// Constructor is inert, so a module-level singleton is SSR-safe.
export const audio = new PizzaAudio();
