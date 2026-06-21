// ───────────────────────────────────────────────────────────────────────────
// The boot loop. The voice is a deliberately degraded bounce of a Scoobert
// track — "Jolly Roger Bay (64)", the #1 / top-layer theme — pre-crushed to
// 8-bit / 11 kHz mono, then a small MP3 (see scripts/make-boot-audio.mjs) and
// lazy-loaded from /audio/boot.mp3. It loops under the storefront, pitch-bends as the
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

import { mapUnease } from '../data/dread';
import { strikeBell } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';

// Resting lowpass cutoff — lo-fi but the song still reads through; the descent
// bends it down to 700.
const REST_CUTOFF = 4200;
const TRACK_URL = '/audio/boot.mp3';

// Peak gain of the sub-bass dread bed (added under the mix at max unease). Kept
// low — it's meant to be FELT, a pressure change, not heard as a tone.
const DREAD_BED_MAX = 0.16;

class PizzaAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  // Brickwall limiter on the OUTPUT — the safety guard. EVERY source (the music
  // loop, the dread sub-bass bed, the train-pass SFX) sums into `master` and is
  // forced through this before the speakers, so no combination of sources, and no
  // sudden onset, can spike past a safe ceiling. Protects ears + honours the WCAG
  // 2.3.1 audio rule (no loud onset after a dropout).
  private limiter?: DynamicsCompressorNode;
  private lowpass?: BiquadFilterNode;
  private trackBuffer?: AudioBuffer; // the decoded degraded boot loop (Best Day Ever)
  // The jukebox can temporarily take over the single loop voice with a catalog
  // track. When set, it overrides trackBuffer; cleared (restoreBoot) on leaving.
  private activeBuffer?: AudioBuffer;
  private jukeboxActive = false;
  private activeJukeboxUrl?: string; // which catalog url is the loop voice (for tests)
  // Per-URL decode promises (in-flight or resolved), so preloadJukebox and the
  // initial playJukeboxTrack share ONE decode of a track instead of racing two.
  private jukeboxLoads = new Map<string, Promise<AudioBuffer | undefined>>();
  private jukeboxGen = 0; // cancels stale selections: only the latest one wins
  private source?: AudioBufferSourceNode;
  private started = false;
  private unlocked = false;
  private preloadPromise?: Promise<boolean>;
  private readyListeners = new Set<(ready: boolean) => void>();
  // 0..1 spatial duck: the jukebox room drives this by camera distance so the
  // loop (the site's song) swells as you approach the jukebox. 1 everywhere else.
  private proximity = 1;
  muted = false;

  // ── dread bed (Phase 5 ckpt2) ──────────────────────────────────────────────
  // A sub-bass drone whose level tracks `unease` — the felt-not-heard pressure
  // bed. Built lazily once the ctx exists; routed through master so mute kills
  // it. The DreadConductor pushes the level via setDreadLevel each frame.
  private dreadBed?: GainNode;
  private dreadOscs: OscillatorNode[] = [];
  private dreadLevel = 0;
  private dreadApplied = -1; // last level written to the param (throttle)
  private hapticBucket = 0; // last vibration tier fired (so we buzz once per step up)

  /** True once the track is fetched + decoded and the loop can actually play. */
  get ready(): boolean {
    return !!this.trackBuffer;
  }

  /** The output brickwall limiter (built by ensure()). Exposed so the dread smoke
   *  can assert the safety guard is present on the graph; undefined until the
   *  audio context is built on the first gesture. */
  get outputLimiter(): DynamicsCompressorNode | undefined {
    return this.limiter;
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

  /** Fetch + decode a URL to an AudioBuffer via a throwaway OfflineAudioContext
   *  (no playback context, no user gesture). Returns undefined on any failure —
   *  callers degrade to "no audio", they never throw. Shared by the boot loop
   *  preload and the jukebox catalog. */
  private async decodeUrl(url: string): Promise<AudioBuffer | undefined> {
    if (typeof fetch === 'undefined' || typeof window === 'undefined') return undefined;
    const OAC =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!OAC) return undefined;
    try {
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const bytes = await res.arrayBuffer();
      const decoder = new OAC(1, 1, 44100);
      return await decoder.decodeAudioData(bytes);
    } catch {
      return undefined;
    }
  }

  /** Lazy-load + decode the boot loop. Needs no playback context and no user
   *  gesture, so the toggle can light up before any interaction. If this never
   *  yields a buffer, there's no music — there is deliberately no synth
   *  fallback. Idempotent. */
  preload(): Promise<boolean> {
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = (async () => {
      const buf = await this.decodeUrl(TRACK_URL);
      if (!buf) return false; // no music, no fallback
      this.trackBuffer = buf;
      this.emitReady();
      // A gesture may already have unlocked us while we were decoding.
      this.maybeStart();
      return true;
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
    // The output limiter (see field doc). master → limiter → destination, so it
    // sits across EVERYTHING. Hard knee + high ratio + fast attack ≈ a brickwall:
    // peaks above the threshold are clamped, they never reach the speakers hot.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -4; // dB — clamp anything above ~0.63 amplitude
    limiter.knee.value = 0; // hard knee = brickwall, not a soft compressor
    limiter.ratio.value = 20; // ≈ limiting
    limiter.attack.value = 0.003; // catch transients (a train onset) fast
    limiter.release.value = 0.25;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = REST_CUTOFF;
    lowpass.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.limiter = limiter;
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

  /** The buffer the loop voice should play: a jukebox selection when one is
   *  active, otherwise the boot loop. */
  private currentBuffer(): AudioBuffer | undefined {
    return this.activeBuffer ?? this.trackBuffer;
  }

  /** (Re)create the loop source from whichever buffer is current. */
  private restartLoop(): void {
    const buf = this.currentBuffer();
    if (!this.ctx || !this.lowpass || !buf) return;
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
    // MP3 decode adds ~100ms of encoder/decoder-delay silence at the head (and a
    // little padding at the tail), which would be an audible GAP on every loop.
    // Loop only the real content — the crossfade-matched region between the
    // silences — and start AT loopStart so the very first pass skips it too.
    const { start, end } = this.loopPoints(buf);
    src.loopStart = start;
    src.loopEnd = end;
    src.connect(this.lowpass);
    src.start(0, start);
    this.source = src;
  }

  // Real-content loop points for a decoded buffer: trim leading/trailing near-
  // silence (the MP3 codec delay/padding) so the loop is seamless. Computed once
  // per buffer (cached) — the underlying PCM was already crossfaded end↔start, so
  // looping the trimmed [start,end] repeats cleanly.
  private loopPointsCache = new WeakMap<AudioBuffer, { start: number; end: number }>();
  private loopPoints(buf: AudioBuffer): { start: number; end: number } {
    const cached = this.loopPointsCache.get(buf);
    if (cached) return cached;
    const d = buf.getChannelData(0);
    const N = d.length;
    const sr = buf.sampleRate;
    const thr = 0.008;
    let s = 0;
    while (s < N && Math.abs(d[s]) < thr) s++;
    let e = N - 1;
    while (e > s && Math.abs(d[e]) < thr) e--;
    const start = s / sr;
    const end = (e + 1) / sr;
    // Guard against a pathological scan (e.g. a near-silent buffer): fall back to
    // the whole buffer rather than collapse the loop to nothing.
    const pts = end - start > 0.5 ? { start, end } : { start: 0, end: buf.duration };
    this.loopPointsCache.set(buf, pts);
    return pts;
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

  // ── Jukebox: swap the single loop voice to a catalog track ─────────────────
  // The jukebox room plays Scoobert's own songs (degraded) in place of the
  // ambient boot loop and cycles on click. One voice, one swap — the proximity
  // duck + mute keep applying, so the selected track still swells as you cross
  // the room to the cabinet.

  /** Decode a catalog track, deduped per URL: concurrent callers (preload + the
   *  initial select) share one decode/promise. A failed load is evicted so a
   *  later attempt can retry. */
  private decodeJukebox(url: string): Promise<AudioBuffer | undefined> {
    let p = this.jukeboxLoads.get(url);
    if (!p) {
      p = this.decodeUrl(url);
      this.jukeboxLoads.set(url, p);
      void p.then((buf) => {
        if (!buf) this.jukeboxLoads.delete(url);
      });
    }
    return p;
  }

  /** Warm the cache by decoding the given track urls up front (on entering the
   *  jukebox room) so click-to-cycle is instant. Best-effort; a miss just falls
   *  back to decode-on-select. */
  async preloadJukebox(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.decodeJukebox(url)));
  }

  /** Make `url` the active loop voice (the jukebox playing). Decodes (deduped) on
   *  first use, then plays it clean(ish) — the warble/slow-down is baked into the
   *  file, so we lift the descent's pitch-bend back off rather than stack it. The
   *  proximity duck + mute still apply. A generation guard makes rapid cycling
   *  last-click-wins AND makes a leave-before-decode bail (restoreBoot bumps the
   *  generation, so a load still in flight when the room unmounts can't switch the
   *  voice afterward). */
  async playJukeboxTrack(url: string): Promise<void> {
    this.unlock(); // ctx + resume (clicking the cabinet is the gesture)
    if (!this.ctx || !this.lowpass) return;
    const gen = ++this.jukeboxGen;
    const buf = await this.decodeJukebox(url);
    if (!buf) return; // couldn't load — leave whatever's playing
    if (gen !== this.jukeboxGen) return; // superseded by a newer select OR a leave
    this.activeBuffer = buf;
    this.activeJukeboxUrl = url;
    this.jukeboxActive = true;
    this.started = true;
    this.restartLoop();
    this.restorePitch(300); // clean rate + full brightness (warble is in the file)
    this.applyGain(); // honors mute + the current proximity duck
    this.publishJukeboxState();
    this.emitLoopChange();
  }

  /** Leave the jukebox: hand the loop voice back to the ambient boot loop. Always
   *  invalidates any in-flight selection FIRST — even one that hasn't set
   *  `jukeboxActive` yet — so a decode still running when the room unmounts can't
   *  start a jukebox track after the fact. Then, if a track was actually playing,
   *  swap the voice back to the boot loop. */
  restoreBoot(): void {
    this.jukeboxGen++; // cancel any pending select, active or not (the race fix)
    if (!this.jukeboxActive) return;
    this.jukeboxActive = false;
    this.activeJukeboxUrl = undefined;
    this.activeBuffer = undefined; // currentBuffer() → the boot loop
    if (this.started) {
      // If the boot loop hasn't decoded yet (preload still in flight — unlikely
      // this deep in the world, but not guaranteed), restartLoop() would return
      // without a buffer and leave the JUKEBOX source audibly playing. Stop it
      // instead; maybeStart() (fired when preload resolves) brings the boot loop
      // up. Otherwise swap the voice straight back to the boot loop.
      if (this.currentBuffer()) this.restartLoop();
      else this.stopBootLoop();
    }
    this.publishJukeboxState();
    this.emitLoopChange();
  }

  /** Whether a jukebox track is currently the loop voice (exposed for tests). */
  get isJukeboxPlaying(): boolean {
    return this.jukeboxActive;
  }

  /** Mirror the jukebox voice state to a window global for the rooms smoke (it
   *  asserts a leave-before-decode never switches the voice post-unmount). Gated
   *  to the test entrances so it isn't part of the normal global surface. */
  private publishJukeboxState(): void {
    exposeTestGlobal('__sdpJukeboxActive', this.jukeboxActive);
    // The url actually swapped into the loop voice (post-decode), so the smoke
    // can prove a click really changed the engine voice, not just React state.
    exposeTestGlobal('__sdpJukeboxUrl', this.activeJukeboxUrl);
  }

  // ── loop-voice change notification (the music store mirrors this) ───────────
  // The ENGINE is the source of truth for what's actually playing. Anything that
  // changes the loop voice — the pause-menu switcher, the jukebox cabinet, a room
  // reward stinger — calls playJukeboxTrack/restoreBoot, which fire this. The
  // music store subscribes so the HUD "now playing" readout can never drift from
  // reality. Payload is the jukebox url, or null for the boot loop.
  private loopListeners = new Set<(url: string | null) => void>();
  /** Subscribe to loop-voice changes (fires once immediately). Returns unsub. */
  onLoopChange(cb: (url: string | null) => void): () => void {
    this.loopListeners.add(cb);
    cb(this.jukeboxActive ? (this.activeJukeboxUrl ?? null) : null);
    return () => this.loopListeners.delete(cb);
  }
  private emitLoopChange(): void {
    const url = this.jukeboxActive ? (this.activeJukeboxUrl ?? null) : null;
    for (const cb of this.loopListeners) cb(url);
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
    exposeTestGlobal('__sdpProximity', this.proximity);
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

  /**
   * One-shot "train pass" whoosh for the metro tunnel — filtered noise with a
   * Doppler-ish pitch arc (bandpass up→down = approach→recede) and a stereo pan
   * sweep, so the shinkansen reads in the EARS as it crosses you. Routed through
   * `master`, so the global mute kills it and it tracks the music volume; it
   * builds its own throwaway nodes and frees them on end. No-op until the graph
   * exists and a gesture has unlocked us, and when muted — so it never forces
   * audio on; it degrades to silence like everything else here.
   */
  playTrainPass(durationMs = 1700): void {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = durationMs / 1000;

    // white-noise source — the wheel/air rush
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;

    // bandpass rises to the closest approach, then falls — the Doppler arc
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.7;
    bp.frequency.setValueAtTime(260, now);
    bp.frequency.linearRampToValueAtTime(900, now + dur * 0.5);
    bp.frequency.linearRampToValueAtTime(170, now + dur);

    // gain envelope: swell to the pass, then away (felt, not loud — kept modest
    // so it sits UNDER the music + limiter rather than pumping them each lap)
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.42, now + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // stereo pan sweep L→R as the train crosses (guarded — older Safari lacks it)
    let tail: AudioNode = g;
    let panner: StereoPannerNode | undefined;
    if (typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(-0.85, now);
      panner.pan.linearRampToValueAtTime(0.6, now + dur);
      g.connect(panner);
      tail = panner;
    }

    src.connect(bp);
    bp.connect(g);
    tail.connect(this.master);
    src.start(now);
    src.stop(now + dur);
    src.onended = () => {
      src.disconnect();
      bp.disconnect();
      g.disconnect();
      panner?.disconnect();
    };
  }

  /**
   * A short musical tone — the building block for the practice room's pad
   * instrument and its call-and-response sequence game. A triangle osc through a
   * soft attack/decay envelope, routed via `master` so the limiter + global mute
   * apply. No-op until the graph is built + unlocked, and when muted. This is SFX,
   * not "the music": synth here is fine — the no-synth-fallback rule guards Luke's
   * tracks, not UI/instrument tones. Returns its node count for nothing; frees on end.
   */
  playTone(freq: number, durationMs = 360, peak = 0.26): void {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = durationMs / 1000;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), now + 0.012); // soft attack
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  /**
   * Strike a bell into the WORLD mix — the /chimes cabinet's synthesis engine
   * (src/lib/chimes.strikeBell) reused to power in-room effects (the shrine's
   * furin wind-chimes). Routed through `master`, so the output limiter + the
   * global mute apply and it sits under the music; it builds + frees its own
   * voice. No-op until a gesture has built the ctx, and when muted — so, like the
   * other one-shots here, it degrades to silence and never forces audio on.
   * `peak` is kept low by callers: in-world bells are ambient, not foreground.
   */
  playChime(freq: number, pan = 0, peak = 0.16): void {
    if (!this.ctx || !this.master || this.muted) return;
    strikeBell(this.ctx, this.master, freq, { pan, peak });
  }

  /**
   * A hand CLAP — the shrine ritual (二拍手). A short band-passed noise burst with
   * a fast percussive decay, routed through `master` so the limiter + global mute
   * apply; builds + frees its own nodes. No-op pre-gesture / when muted, like the
   * other one-shots, so it never forces audio on.
   */
  playClap(peak = 0.5): void {
    if (!this.ctx || !this.master || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 0.13;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      const t = i / frames;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3); // sharp attack, fast decay
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1700; // the "smack" band of a clap
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = Math.max(0.0001, peak);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(now);
    src.stop(now + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      bp.disconnect();
      g.disconnect();
    };
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

  /** Build the sub-bass dread bed once (needs a live ctx). Missing-fundamental:
   *  partials at ~38/76/114 Hz, so a phone speaker that can't move 38 Hz still
   *  IMPLIES the low pitch from the upper partials — the bed translates to small
   *  speakers instead of being inaudible. Slightly detuned for a beating
   *  "air pressure" shimmer, not a clean tone. Routed through master so mute
   *  kills it. The oscillators run continuously at near-zero gain (cheap). */
  private ensureDread(): void {
    if (this.dreadBed || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const bed = ctx.createGain();
    bed.gain.value = 0.0001;
    bed.connect(this.master);
    const partials: Array<[number, number, number]> = [
      [38, 0.9, 0],
      [76, 0.5, 5],
      [114, 0.28, -6],
    ];
    for (const [freq, amp, detune] of partials) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = amp;
      osc.connect(g);
      g.connect(bed);
      osc.start();
      this.dreadOscs.push(osc);
    }
    this.dreadBed = bed;
  }

  /** Drive the dread bed from `unease` (0..1). Called every frame by the
   *  DreadConductor; cheap + throttled. Mute is handled by master (the bed feeds
   *  it), so this never has to special-case it. Also pulses mobile haptics on
   *  crossing up into a higher dread tier. No-op until a gesture has built the
   *  ctx (i.e. silent on the storefront until you actually descend). */
  setDreadLevel(u: number): void {
    this.dreadLevel = Math.max(0, Math.min(1, u));
    // Pre-gesture (no ctx): no bed AND no haptics — a true no-op until you descend.
    if (!this.ctx || !this.master) return;
    this.ensureDread();
    if (this.dreadBed && Math.abs(this.dreadLevel - this.dreadApplied) >= 0.01) {
      this.dreadApplied = this.dreadLevel;
      const target = Math.max(0.0001, mapUnease(this.dreadLevel).subBassGain * DREAD_BED_MAX);
      const now = this.ctx.currentTime;
      this.dreadBed.gain.cancelScheduledValues(now);
      this.dreadBed.gain.setTargetAtTime(target, now, 0.4);
    }
    this.maybeHaptic();
  }

  /** Mobile haptics on the sharpest dread beats: a short buzz when unease crosses
   *  UP into a higher tier (no-op on desktop — navigator.vibrate is absent —
   *  and while muted). Tiers, not continuous, so it's a punctuation not a rumble. */
  private maybeHaptic(): void {
    const tier =
      this.dreadLevel >= 0.85 ? 3 : this.dreadLevel >= 0.7 ? 2 : this.dreadLevel >= 0.55 ? 1 : 0;
    if (tier > this.hapticBucket && !this.muted && typeof navigator !== 'undefined') {
      navigator.vibrate?.(40 + tier * 25);
    }
    this.hapticBucket = tier;
  }
}

// Constructor is inert, so a module-level singleton is SSR-safe.
export const audio = new PizzaAudio();

// Test hook: expose the singleton so the rooms smoke can drive the audio
// lifecycle directly (the leave-before-decode race is timing-sensitive and hard
// to reproduce through gameplay). Gated to the ?world / ?debug entrances, like
// the other __sdp* globals, so it isn't part of the normal runtime surface.
exposeTestGlobal('__sdpAudio', audio);
