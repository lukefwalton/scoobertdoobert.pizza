// ───────────────────────────────────────────────────────────────────────────
// The boot loop. The voice is a deliberately degraded bounce of a Scoobert
// track — "Jolly Roger Bay (64)", the #1 / top-layer theme — pre-crushed to
// 8-bit / 11 kHz mono (see scripts/make-boot-audio.mjs) and lazy-loaded from
// /audio/boot.wav. It loops under the storefront and pitch-bends downward as the
// descent "ages" the era into the world.
//
// LAZY + GATED (per Luke): the track is fetched and decoded in the background
// (no user gesture needed — we decode with a throwaway OfflineAudioContext), and
// the music control stays DISABLED until it's ready. There is NO synth fallback:
// if the file never loads, there is simply no music, and the toggle never lights
// up. Subscribe to readiness with onReady().
//
// SSR-safe: the constructor touches nothing. All Web Audio / window access is
// deferred to preload()/ensure()/unlock(), which only run from client effects
// and user gestures.
// ───────────────────────────────────────────────────────────────────────────

// Resting lowpass cutoff — lo-fi but the song still reads through; the descent
// bends it down to 700.
const REST_CUTOFF = 4200;
const TRACK_URL = '/audio/boot.wav';

class PizzaAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private lowpass?: BiquadFilterNode;
  private trackBuffer?: AudioBuffer; // the decoded degraded track (the only voice)
  private source?: AudioBufferSourceNode;
  private started = false;
  private unlocked = false;
  private preloadPromise?: Promise<boolean>;
  private readyListeners = new Set<(ready: boolean) => void>();
  // 0..1 spatial duck: the jukebox room drives this by camera distance so the
  // loop (the site's song) swells as you approach the jukebox. 1 everywhere else.
  private proximity = 1;
  muted = false;

  /** True once the track is fetched + decoded and the loop can actually play. */
  get ready(): boolean {
    return !!this.trackBuffer;
  }

  /** Subscribe to readiness (fires immediately with the current value). Returns
   *  an unsubscribe fn. The music toggle uses this to enable itself. */
  onReady(cb: (ready: boolean) => void): () => void {
    this.readyListeners.add(cb);
    cb(this.ready);
    return () => {
      this.readyListeners.delete(cb);
    };
  }
  private emitReady(): void {
    for (const cb of this.readyListeners) cb(this.ready);
  }

  /** Lazy-load + decode the track. Needs no playback context and no user gesture
   *  (decoded via a throwaway OfflineAudioContext), so the toggle can light up
   *  before any interaction. If this never yields a buffer, there's no music —
   *  there is deliberately no synth fallback. Idempotent. */
  preload(): Promise<boolean> {
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = (async () => {
      if (typeof fetch === 'undefined' || typeof window === 'undefined') return false;
      const OAC =
        window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;
      if (!OAC) return false;
      try {
        const res = await fetch(TRACK_URL);
        if (!res.ok) return false;
        const bytes = await res.arrayBuffer();
        const decoder = new OAC(1, 1, 44100);
        this.trackBuffer = await decoder.decodeAudioData(bytes);
        this.emitReady();
        // A gesture may already have unlocked us while we were decoding.
        this.maybeStart();
        return true;
      } catch {
        return false; // no music, no fallback
      }
    })();
    return this.preloadPromise;
  }

  /** Build the playback graph. Called on the first gesture (autoplay policy). */
  ensure(): void {
    if (this.ctx) return;
    const AC =
      typeof window !== 'undefined'
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
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
  }

  /** Resume the context. Must be called from a user gesture. Also remembers that
   *  we're unlocked so a later preload-complete can start the loop. */
  unlock(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    this.unlocked = true;
    this.maybeStart();
  }

  /** Start the loop iff everything lines up: unlocked, decoded, unmuted, idle. */
  private maybeStart(): void {
    if (this.unlocked && this.ready && !this.muted && !this.started) this.startBootLoop();
  }

  startBootLoop(): void {
    this.ensure();
    if (!this.ctx || !this.lowpass || this.started || !this.trackBuffer) return;
    this.started = true;
    this.applyGain();
    this.restartLoop();
  }

  /** (Re)create the loop source from the decoded track. */
  private restartLoop(): void {
    if (!this.ctx || !this.lowpass || !this.trackBuffer) return;
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
      this.source.disconnect();
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.trackBuffer;
    src.loop = true;
    src.connect(this.lowpass);
    src.start();
    this.source = src;
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

  /** Master target = base 0.5, ducked by spatial proximity, killed by mute. */
  private targetGain(): number {
    return this.muted ? 0.0001 : Math.max(0.0001, 0.5 * this.proximity);
  }

  private applyGain(): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.targetGain(), now, 0.15);
  }

  /**
   * Spatial duck (0..1). The jukebox room drives this from camera distance each
   * frame so the loop — the site's own song — swells as you approach the jukebox
   * and fades as you walk off. 1 restores full volume (every other room).
   * Smoothed; respects mute; no-op until the graph + a gesture exist.
   */
  setProximityGain(g: number): void {
    this.proximity = Math.max(0, Math.min(1, g));
    // Expose for the rooms smoke (asserts the duck restores to 1 after leaving
    // the jukebox). Gated to the ?world / ?debug test entrances so it isn't part
    // of the normal runtime global surface.
    if (typeof window !== 'undefined' && /[?&](world|debug)(=|&|$)/.test(window.location.search)) {
      (window as Window & { __sdpProximity?: number }).__sdpProximity = this.proximity;
    }
    if (!this.ctx || !this.master || this.muted) return;
    // Called every frame by the jukebox room — cancel pending automation first
    // (like applyGain) so setTargetAtTime events don't stack up on the param.
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.targetGain(), now, 0.1);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (!m) this.unlock(); // unlock() → maybeStart() starts it if ready
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

  /**
   * Progressive era decay across the descent floors. depth 0 = the storefront
   * (normal); depth === maxDepth ≈ the machine room (slowed + nearly pure
   * degraded-MIDI murk). Ramps both ways, so ascending un-rots it.
   */
  bendToDepth(depth: number, maxDepth: number, durationMs = 650): void {
    if (!this.ctx) return;
    const f = maxDepth > 0 ? Math.max(0, Math.min(1, depth / maxDepth)) : 0;
    const rate = 1 - 0.5 * f; // 1 → 0.5
    const cutoff = REST_CUTOFF - (REST_CUTOFF - 700) * f; // REST_CUTOFF → 700
    const now = this.ctx.currentTime;
    if (this.source) {
      const r = this.source.playbackRate;
      r.cancelScheduledValues(now);
      r.setValueAtTime(r.value, now);
      r.linearRampToValueAtTime(rate, now + durationMs / 1000);
    }
    if (this.lowpass) {
      this.lowpass.frequency.cancelScheduledValues(now);
      this.lowpass.frequency.setValueAtTime(this.lowpass.frequency.value, now);
      this.lowpass.frequency.linearRampToValueAtTime(cutoff, now + durationMs / 1000);
    }
  }
}

// Constructor is inert, so a module-level singleton is SSR-safe.
export const audio = new PizzaAudio();
