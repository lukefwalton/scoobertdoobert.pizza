// ───────────────────────────────────────────────────────────────────────────
// The boot loop. The real voice is a deliberately degraded bounce of a Scoobert
// track ("Best Day Ever"), pre-crushed to 8-bit / 11 kHz mono (see
// scripts/make-boot-audio.mjs) and loaded from /audio/boot.wav. It loops under
// the storefront and pitch-bends downward as the descent "ages" the era.
//
// A tiny square-wave synth (buildBuffer) stays as a graceful fallback: if the
// track 404s or fails to decode, the loop still plays something lo-fi rather
// than going silent. The track decodes async and hot-swaps in when ready.
//
// SSR-safe: the constructor touches nothing. All Web Audio / window access is
// deferred to ensure()/unlock(), which only run from client effects and user
// gestures.
// ───────────────────────────────────────────────────────────────────────────

// Resting lowpass cutoff. Higher than the synth-only era (2200) so the real
// song reads through as lo-fi rather than mud; the descent still bends it to 700.
const REST_CUTOFF = 4200;
const TRACK_URL = '/audio/boot.wav';

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
  private buffer?: AudioBuffer; // synth fallback
  private trackBytes?: ArrayBuffer; // fetched WAV bytes (pre-decode)
  private trackBuffer?: AudioBuffer; // the real degraded track, once decoded
  private source?: AudioBufferSourceNode;
  private started = false;
  private usingTrack = false;
  private bytesLoad?: Promise<void>;
  private trackLoad?: Promise<void>;
  muted = false;

  /** Warm the network early: fetch the track bytes. Needs no AudioContext and no
   *  user gesture, so it's safe to call on mount — by the time the first gesture
   *  unlocks audio, only the (fast) decode remains and the loop starts on the
   *  real song instead of blipping a synth note first. */
  prefetchTrack(): void {
    if (this.bytesLoad || this.trackBytes || typeof fetch === 'undefined') return;
    this.bytesLoad = fetch(TRACK_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : undefined))
      .then((b) => {
        if (b) this.trackBytes = b;
      })
      .catch(() => {
        /* leave the synth fallback in place */
      });
  }

  /** Create the audio graph + render the fallback buffer, kick off the track
   *  fetch. Idempotent. */
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
    lowpass.frequency.value = REST_CUTOFF;
    lowpass.connect(master);
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.lowpass = lowpass;
    this.buffer = buildBuffer(ctx);
    void this.loadTrack();
  }

  /** Decode the (prefetched) track bytes, then hot-swap it in if the fallback is
   *  already looping. Best-effort: any failure just leaves the synth playing. */
  private loadTrack(): Promise<void> {
    if (this.trackLoad) return this.trackLoad;
    this.trackLoad = (async () => {
      if (!this.ctx) return;
      this.prefetchTrack();
      try {
        await this.bytesLoad;
      } catch {
        /* fall through to the synth fallback */
      }
      if (!this.trackBytes) return;
      try {
        // decodeAudioData detaches its input, so decode a copy and keep the raw
        // bytes for a possible retry.
        this.trackBuffer = await this.ctx.decodeAudioData(this.trackBytes.slice(0));
        // If we're already looping the fallback, swap to the real track.
        if (this.started && !this.usingTrack) this.restartLoop();
      } catch {
        /* keep the synth fallback */
      }
    })();
    return this.trackLoad;
  }

  /** (Re)start the loop source from the best buffer available. */
  private restartLoop(): void {
    if (!this.ctx || !this.lowpass) return;
    const buf = this.trackBuffer ?? this.buffer;
    if (!buf) return;
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.lowpass);
    src.start();
    this.source = src;
    this.usingTrack = !!this.trackBuffer;
  }

  /** Resume the context. Must be called from a user gesture (autoplay policy). */
  unlock(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  startBootLoop(): void {
    this.ensure();
    if (!this.ctx || !this.lowpass || this.started) return;
    if (!this.trackBuffer && !this.buffer) return;
    this.started = true;
    this.applyGain();
    // If the real track is already decoded, start it — no synth ever plays.
    if (this.trackBuffer) {
      this.restartLoop();
      return;
    }
    // Otherwise wait briefly for the track so we don't blip a synth note before
    // the song. If it's slow/unavailable, start the synth (loadTrack's own
    // hot-swap takes over if the track arrives later).
    let settled = false;
    const go = () => {
      if (settled) return;
      settled = true;
      if (this.started) this.restartLoop();
    };
    void this.loadTrack().then(go);
    window.setTimeout(go, 1500);
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
      this.lowpass.frequency.linearRampToValueAtTime(REST_CUTOFF, now + durationMs / 1000);
    }
  }
}

// Constructor is inert, so a module-level singleton is SSR-safe.
export const audio = new PizzaAudio();
