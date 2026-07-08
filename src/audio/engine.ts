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
import { curdleParamsFor, type CurdleParams, type Pressing } from '../lib/curdle';
import { exposeTestGlobal } from '../lib/testHooks';

/**
 * A SUSTAINED, continuously-controllable voice — the handle startVoice() returns.
 * The counterpart to the one-shot playTone/playChime, for an instrument you PLAY
 * OVER TIME (the deep theremin room): drive set(freq, gain) every frame, stop()
 * when you leave.
 */
export type SustainedVoice = {
  /** Glide toward a new pitch (Hz) + gain (0..~0.3), short portamento each call. */
  set(freq: number, gain: number): void;
  /** Fade out and free the voice. Idempotent. */
  stop(): void;
};

// Resting lowpass cutoff — lo-fi but the song still reads through; the descent
// bends it down to 700.
const REST_CUTOFF = 4200;
const TRACK_URL = '/audio/boot.mp3';

// Peak gain of the sub-bass dread bed (added under the mix at max unease). Kept
// low — it's meant to be FELT, a pressure change, not heard as a tone.
const DREAD_BED_MAX = 0.16;

// Crossfade time (seconds) for swapping the single loop voice — boot↔jukebox and
// jukebox↔jukebox. Short: a smooth blend that hides the seam so one song never
// "steps over" another with a hard cut, but not a slow DJ mix.
const XFADE = 0.28;

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
  // A gain on the LOOP path ONLY (source → songGain → lowpass → master), so the
  // "song" (boot loop / jukebox track) can be ducked independently of the
  // instrument one-shots that hit master directly — e.g. faded out in music rooms,
  // where the room's own bells/pads should own the space.
  private songGain?: GainNode;
  private songLevel = 1; // 0..1 current song-duck target (survives graph (re)builds)
  // A SOUND-MAKER is up (an arcade game with its own notes/SFX, a CRT video with its
  // own audio) → duck the song so the user's music doesn't fight it. Composes with
  // the music-room songLevel duck (either reason silences the song).
  private musicSuppressed = false;
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
  // The current loop source's OWN gain (source → sourceGain → songGain → lowpass),
  // so a voice swap can CROSSFADE: the outgoing source fades down on this gain
  // while the incoming source fades up on a fresh one. Distinct from songGain (the
  // shared music-room duck) and master (mute/proximity).
  private sourceGain?: GainNode;
  // Count of ACTUAL loop-source (re)creations. Exposed as __sdpLoopStarts on test
  // entrances so the music smoke can prove the same-URL guard skips a restart (the
  // count holds) while a real swap bumps it. Purely instrumentation.
  private loopStarts = 0;
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

  // ── the curdle insert (the live "how-degraded" — src/lib/curdle.ts is the score) ──
  // Sits on the SONG path only (songGain → [dry ‖ quantize→wet] → curdleGain →
  // lowpass), so the instrument one-shots and the bells stay clean and the output
  // limiter still brickwalls everything. Driven by dread `unease` (bitcrush /
  // dropouts finally consumed) and by the jukebox PRESSINGS (the d20 crits — the
  // cursed pressing warbles as actual audio, the pristine one plays cleaner than
  // the tape should allow). At wet = 0 the dry branch is a unity gain: passthrough.
  private curdleDry?: GainNode;
  private curdleWet?: GainNode;
  private curdleGain?: GainNode; // dropout dips live here (rest 1, always fades back)
  private wowOsc?: OscillatorNode; // tape-wow LFO — rides source.playbackRate (additive)
  private wowGain?: GainNode;
  private flutterOsc?: OscillatorNode;
  private flutterGain?: GainNode;
  private curdleParams: CurdleParams = curdleParamsFor(0, null);
  private curdleAppliedU = -1; // last unease the curdle params were computed at
  // The armed pressing (a d20 crit) + the exact track it belongs to. It only ever
  // APPLIES while that url is the live jukebox voice — arming is synchronous on the
  // roll, the decode is async, so this guard is what makes the race harmless.
  private pressing: { kind: Exclude<Pressing, null>; url: string } | null = null;
  private pressingRateSet = false; // we wrote a non-1 rate (pristine) to the source
  private nextDropoutRoll = 0; // ctx-time gate: at most ~1 dropout roll per second

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
    // The loop's own gain, ahead of the lowpass — lets a music room duck the song
    // without touching the instrument one-shots (they connect straight to master).
    const songGain = ctx.createGain();
    // honor a duck set before the graph existed (a music room OR a live sound-maker)
    songGain.gain.value = this.musicSuppressed ? 0.0001 : this.songLevel;
    // The curdle insert (see the field doc): songGain splits into a unity DRY
    // branch and a quantize-staircase WET branch (a WaveShaper "bitcrush" + its own
    // fixed lowpass so the crushed aliasing reads tape-ish, not harsh), summed into
    // curdleGain (where dropout dips happen), then on to the shared descent lowpass.
    // Intensity is the dry/wet MIX — the curve is never rebuilt — so wet 0 (the
    // sweet surface, most of every session) is exact passthrough.
    const curdleGain = ctx.createGain();
    curdleGain.gain.value = 1;
    curdleGain.connect(lowpass);
    const dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(curdleGain);
    const shaper = ctx.createWaveShaper();
    // A 9-level staircase (~3.2-bit): x → round(x·4)/4 over [-1, 1].
    const staircase = new Float32Array(1025);
    for (let i = 0; i < staircase.length; i++) {
      const x = (i / (staircase.length - 1)) * 2 - 1;
      staircase[i] = Math.round(x * 4) / 4;
    }
    shaper.curve = staircase;
    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = 'lowpass';
    wetFilter.frequency.value = 2000; // fixed — never fights the descent's lowpass
    const wet = ctx.createGain();
    wet.gain.value = 0;
    songGain.connect(dry);
    songGain.connect(shaper);
    shaper.connect(wetFilter);
    wetFilter.connect(wet);
    wet.connect(curdleGain);
    // The tape wow/flutter LFOs: osc → depth gain → (per-source) src.playbackRate.
    // An AudioParam input SUMS with its value/automation, so the descent bend and
    // the wobble compose without either knowing about the other; at depth 0 the
    // LFO adds exactly nothing. Started once, run forever (cheap, like the bed).
    const wowOsc = ctx.createOscillator();
    wowOsc.frequency.value = this.curdleParams.wow.hz;
    const wowGain = ctx.createGain();
    wowGain.gain.value = 0;
    wowOsc.connect(wowGain);
    wowOsc.start();
    const flutterOsc = ctx.createOscillator();
    flutterOsc.frequency.value = this.curdleParams.flutter.hz;
    const flutterGain = ctx.createGain();
    flutterGain.gain.value = 0;
    flutterOsc.connect(flutterGain);
    flutterOsc.start();
    master.connect(limiter);
    limiter.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.limiter = limiter;
    this.lowpass = lowpass;
    this.songGain = songGain;
    this.curdleDry = dry;
    this.curdleWet = wet;
    this.curdleGain = curdleGain;
    this.wowOsc = wowOsc;
    this.wowGain = wowGain;
    this.flutterOsc = flutterOsc;
    this.flutterGain = flutterGain;
    this.applyCurdle(); // honor a pressing/dread level set before the graph existed
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

  /** Swap the loop voice to whichever buffer is current, CROSSFADING from the old
   *  source instead of hard-cutting — so changing the song (cycling the jukebox,
   *  stepping into a song-room, restoring your pick on the way out) is a quick
   *  smooth blend, never an abrupt "one song stepping over another." Each source
   *  carries its own gain: the outgoing one fades down (then stops + frees itself
   *  on `onended`) while the incoming one fades up from silence. */
  private restartLoop(): void {
    const buf = this.currentBuffer();
    if (!this.ctx || !this.lowpass || !buf) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // Retire the current source: ramp its OWN gain to silence, schedule a stop, and
    // free both nodes when it actually ends (so the tail rings out, no click).
    if (this.source && this.sourceGain) {
      const os = this.source;
      const og = this.sourceGain;
      og.gain.cancelScheduledValues(now);
      og.gain.setValueAtTime(Math.max(0.0001, og.gain.value), now);
      og.gain.linearRampToValueAtTime(0.0001, now + XFADE);
      try {
        os.stop(now + XFADE + 0.03);
      } catch {
        /* already stopped */
      }
      os.onended = () => {
        try {
          os.disconnect();
        } catch {
          /* already disconnected */
        }
        og.disconnect();
        // …and unhook the wobble LFOs from the dead source's playbackRate.
        try {
          this.wowGain?.disconnect(os.playbackRate);
          this.flutterGain?.disconnect(os.playbackRate);
        } catch {
          /* never connected (pre-curdle source) or already gone */
        }
      };
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // MP3 decode adds ~100ms of encoder/decoder-delay silence at the head (and a
    // little padding at the tail), which would be an audible GAP on every loop.
    // Loop only the real content — the crossfade-matched region between the
    // silences — and start AT loopStart so the very first pass skips it too.
    const { start, end } = this.loopPoints(buf);
    src.loopStart = start;
    src.loopEnd = end;
    // The incoming half of the crossfade: a fresh per-source gain faded up from
    // silence (also a clean fade-IN for the very first start, when there's no old
    // source to retire).
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, now);
    sg.gain.linearRampToValueAtTime(1, now + XFADE);
    src.connect(sg);
    sg.connect(this.songGain ?? this.lowpass); // per-source gain → song duck → lowpass
    src.start(0, start);
    this.source = src;
    this.sourceGain = sg;
    this.loopStarts++;
    exposeTestGlobal('__sdpLoopStarts', this.loopStarts);
    // A fresh source starts at rate 1 with no LFO riders — re-hook the wobble and
    // (if a pressing is live) its rate so a crossfade swap can't shed the curdle.
    this.wowGain?.connect(src.playbackRate);
    this.flutterGain?.connect(src.playbackRate);
    this.pressingRateSet = false;
    this.applyCurdle();
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
      try {
        this.wowGain?.disconnect(this.source.playbackRate);
        this.flutterGain?.disconnect(this.source.playbackRate);
      } catch {
        /* never connected */
      }
      this.source = undefined;
    }
    if (this.sourceGain) {
      this.sourceGain.disconnect();
      this.sourceGain = undefined;
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
    // Same-URL no-op: this track is ALREADY the loop voice and audibly running, so
    // re-playing it (a song-room whose song == the current track, RoomMusic racing
    // restorePreferred on a door, a double cabinet click) would needlessly restart
    // it from the top — the "song stepping over itself" glitch. Bump the generation
    // anyway so any in-flight select for a *different* url can't swap in behind us
    // (last-intent-wins: the latest ask is "keep playing what's playing").
    if (this.jukeboxActive && this.activeJukeboxUrl === url && this.started && this.source) {
      this.jukeboxGen++;
      return;
    }
    const gen = ++this.jukeboxGen;
    const buf = await this.decodeJukebox(url);
    if (!buf) return; // couldn't load — leave whatever's playing
    if (gen !== this.jukeboxGen) return; // superseded by a newer select OR a leave
    // A pressing belongs to ONE exact track: playing a different one drops it
    // (a cursed roll never haunts the next song you pick).
    if (this.pressing && this.pressing.url !== url) this.pressing = null;
    this.activeBuffer = buf;
    this.activeJukeboxUrl = url;
    this.jukeboxActive = true;
    this.started = true;
    this.restartLoop();
    this.restorePitch(300); // clean rate + full brightness (warble is in the file)
    // restorePitch just ramped the rate to 1 — re-assert the pressing's rate (the
    // pristine correction) now that this url is officially the live voice.
    this.pressingRateSet = false;
    this.applyCurdle();
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
    this.pressing = null; // a pressing is jukebox theatre — it never survives the hand-back
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

  /**
   * Fade the SONG (the loop voice) to `level` (0..1) over `ms` — independent of the
   * instrument one-shots. A MUSIC room (the grove's sound garden, the shrine furin)
   * calls setSongLevel(0) on entry so its own bells/pads own the space, and the
   * world calls setSongLevel(1) everywhere else to bring the song back. Smoothed; a
   * no-op (but state-tracked) until the graph exists. Composes with mute + proximity.
   */
  setSongLevel(level: number, ms = 700): void {
    this.songLevel = Math.max(0, Math.min(1, level));
    exposeTestGlobal('__sdpSongLevel', this.songLevel); // for the music-duck smoke
    this.applySongGain(ms);
  }

  /** Ramp the song voice to its EFFECTIVE level: the music-room duck (songLevel)
   *  unless a sound-maker has suppressed it (then silence). Both reasons compose —
   *  either pulls it down, lifting one restores the other. No-op without the graph. */
  private applySongGain(ms: number): void {
    if (!this.ctx || !this.songGain) return;
    const target = this.musicSuppressed ? 0.0001 : Math.max(0.0001, this.songLevel);
    const now = this.ctx.currentTime;
    const g = this.songGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.linearRampToValueAtTime(target, now + Math.max(0.05, ms / 1000));
  }

  /**
   * Duck the radio (the song voice) while a SOUND-MAKER is active — an arcade game
   * that plays its own notes/SFX (Jazz Snake, the chimes/cultures cabinets), a CRT
   * video with its own audio. The world calls suppressMusic(true) when such an
   * overlay opens and (false) when it closes, so the user's music doesn't fight it.
   * Composes with the music-room duck (setSongLevel); a quick fade — it's a
   * deliberate "step aside," not a swell.
   */
  suppressMusic(on: boolean, ms = 350): void {
    this.musicSuppressed = on;
    exposeTestGlobal('__sdpMusicSuppressed', on); // for the sound-maker duck smoke
    this.applySongGain(ms);
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
   * Open a SUSTAINED, continuously-controllable voice — the counterpart to the
   * one-shot playTone/playChime, for an instrument you PLAY OVER TIME (the deep
   * theremin room). A warm triangle + a sub-octave sine under a gentle vibrato LFO,
   * driven through a gain you ramp with a short glide each frame (portamento), and
   * routed via `master` so the output limiter + global mute apply — mute silences it
   * through master exactly like the loop, so it never needs to special-case it.
   * Build it ONCE (on entering the room) and drive it with set(freq, gain) per
   * frame; stop() fades + frees it (on leaving). Returns null when there's no audio
   * context yet (SSR / pre-gesture) so the caller can re-acquire on a later frame
   * once a gesture builds the ctx — a deep-link into the room can't get stuck silent.
   *
   * NOT a one-shot, so it deliberately skips the worldVoices cap (that bounds many
   * transient ambient hits; this is one long-lived, managed voice). The oscillators
   * idle at near-zero gain when set(_, 0) — cheap, like the dread bed.
   */
  startVoice(): SustainedVoice | null {
    this.ensure();
    if (!this.ctx || !this.master) return null;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(this.master);

    // warm core: a triangle with a sub-octave sine under it for body
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 220;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 110;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    osc.connect(out);
    sub.connect(subGain);
    subGain.connect(out);

    // gentle vibrato on detune (the theremin "waver") — small + slow, so it reads
    // sweet/expressive, never a siren.
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6; // cents of detune
    lfo.connect(lfoGain);
    lfoGain.connect(osc.detune);
    lfoGain.connect(sub.detune);

    osc.start(now);
    sub.start(now);
    lfo.start(now);

    let stopped = false;
    return {
      set: (freq: number, gain: number) => {
        if (stopped || !this.ctx) return;
        const t = this.ctx.currentTime;
        const f = Math.max(60, Math.min(2000, freq)); // safety clamp
        const g = Math.max(0, Math.min(0.3, gain));
        osc.frequency.setTargetAtTime(f, t, 0.05); // portamento glide
        sub.frequency.setTargetAtTime(f / 2, t, 0.05);
        out.gain.setTargetAtTime(Math.max(0.0001, g), t, 0.06);
      },
      stop: () => {
        if (stopped || !this.ctx) return;
        stopped = true;
        const t = this.ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setTargetAtTime(0.0001, t, 0.08); // fade, don't click
        const end = t + 0.4;
        try {
          osc.stop(end);
          sub.stop(end);
          lfo.stop(end);
        } catch {
          /* already stopped */
        }
        osc.onended = () => {
          try {
            osc.disconnect();
            sub.disconnect();
            lfo.disconnect();
            subGain.disconnect();
            lfoGain.disconnect();
            out.disconnect();
          } catch {
            /* already disconnected */
          }
        };
      },
    };
  }

  // Cap concurrent ambient one-shots (playChime/playColony) so a busy room can't
  // stack unbounded voices that muddy the mix or burn CPU on weak devices — the
  // output limiter guards LOUDNESS, this guards voice COUNT. Timer-based release,
  // so it's approximate on purpose (a ceiling, not exact accounting).
  private worldVoices = 0;
  private claimVoice(seconds: number): boolean {
    if (this.worldVoices >= 16) return false; // drop the new voice rather than pile on
    this.worldVoices++;
    window.setTimeout(
      () => {
        this.worldVoices = Math.max(0, this.worldVoices - 1);
      },
      Math.max(150, seconds * 1000),
    );
    return true;
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
  playChime(freq: number, pan = 0, peak = 0.16, decayScale = 1): void {
    if (!this.ctx || !this.master || this.muted) return;
    if (!this.claimVoice(1.6 * decayScale + 0.4)) return; // drop past the voice cap
    strikeBell(this.ctx, this.master, freq, { pan, peak, decayScale });
  }

  /**
   * A soft COLONY voice — the /cultures instrument reused as in-world ambience
   * (the glowing plankton in the poolrooms bloom a note when cells touch). A
   * single additive-pad oscillator (sine + a whisper of 2nd/3rd harmonics) with a
   * gentle attack + long release, panned, through `master` (limiter + mute apply).
   * Quiet by construction; builds + frees its own nodes. No-op pre-gesture / muted.
   */
  playColony(freq: number, pan = 0, peak = 0.08): void {
    if (!this.ctx || !this.master || this.muted) return;
    if (!this.claimVoice(1.7)) return; // drop past the voice cap (release ≈ rel)
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const rel = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, peak), now + 0.08); // soft attack
    g.gain.exponentialRampToValueAtTime(0.0001, now + rel);
    let tail: AudioNode = g;
    let panner: StereoPannerNode | undefined;
    if (typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan)) * 0.6;
      g.connect(panner);
      tail = panner;
    }
    tail.connect(this.master);
    const osc = ctx.createOscillator();
    const real = new Float32Array([0, 1, 0.15, 0.08]);
    osc.setPeriodicWave(ctx.createPeriodicWave(real, new Float32Array(real.length)));
    osc.frequency.value = freq;
    osc.connect(g);
    osc.start(now);
    osc.stop(now + rel + 0.05);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
      panner?.disconnect();
    };
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
    // The curdle rides the same per-frame call: re-map on a real unease change
    // (same 0.01 throttle), and roll the (rare) dropout dice on a ~1s gate.
    if (this.curdleDry && Math.abs(this.dreadLevel - this.curdleAppliedU) >= 0.01) {
      this.applyCurdle();
    }
    this.maybeDropout();
    this.maybeHaptic();
  }

  // ── the curdle (live degradation) ──────────────────────────────────────────

  /** The pressing that should actually SOUND right now: armed by a d20 crit, but
   *  only live while its exact track is the jukebox voice (the roll is sync, the
   *  decode async — this guard is what makes that race harmless). */
  private activePressing(): Pressing {
    return this.pressing && this.jukeboxActive && this.activeJukeboxUrl === this.pressing.url
      ? this.pressing.kind
      : null;
  }

  /** Write the current curdle score (dread unease × pressing) to the insert.
   *  Cheap; throttled by callers. All moves are short ramps — never a hard step
   *  (the WCAG audio rule holds inside the insert too). */
  private applyCurdle(): void {
    this.curdleAppliedU = this.dreadLevel;
    const kind = this.activePressing();
    const p = curdleParamsFor(this.dreadLevel, kind);
    this.curdleParams = p;
    exposeTestGlobal('__sdpCurdle', {
      pressing: kind,
      wet: p.wet,
      dropoutChance: p.dropoutChance,
      rate: p.rate,
    });
    if (!this.ctx || !this.curdleDry || !this.curdleWet) return;
    const now = this.ctx.currentTime;
    this.curdleDry.gain.setTargetAtTime(1 - p.wet, now, 0.15);
    this.curdleWet.gain.setTargetAtTime(p.wet, now, 0.15);
    if (this.wowOsc && this.wowGain) {
      this.wowOsc.frequency.setTargetAtTime(p.wow.hz, now, 0.2);
      this.wowGain.gain.setTargetAtTime(p.wow.depth, now, 0.2);
    }
    if (this.flutterOsc && this.flutterGain) {
      this.flutterOsc.frequency.setTargetAtTime(p.flutter.hz, now, 0.2);
      this.flutterGain.gain.setTargetAtTime(p.flutter.depth, now, 0.2);
    }
    // The pristine rate-correction (the only non-1 rate a pressing carries).
    // Guarded by a flag so the frequent dread-path calls never touch playbackRate
    // — the descent bend owns that param everywhere a pressing can't exist.
    if (this.source) {
      const rate = this.source.playbackRate;
      if (p.rate !== 1 && !this.pressingRateSet) {
        rate.cancelScheduledValues(now);
        rate.setValueAtTime(rate.value, now);
        rate.linearRampToValueAtTime(p.rate, now + 0.3);
        this.pressingRateSet = true;
      } else if (p.rate === 1 && this.pressingRateSet) {
        rate.cancelScheduledValues(now);
        rate.setValueAtTime(rate.value, now);
        rate.linearRampToValueAtTime(1, now + 0.3);
        this.pressingRateSet = false;
      }
    }
  }

  /** Arm (or clear) a jukebox pressing — the d20 crit made audible. `url` is the
   *  catalog track the crit rolled; the pressing only sounds while that url is the
   *  live voice and clears on any track change (see playJukeboxTrack/restoreBoot).
   *  ROOM THEATRE: the jukebox room's unmount also clears it, so a cursed warble
   *  never follows the player out into the world (out there, curdle belongs to
   *  the dread layer alone). */
  setPressing(kind: Pressing, url?: string): void {
    this.pressing = kind && url ? { kind, url } : null;
    this.applyCurdle();
  }

  /** The dropout scheduler: at most one roll per ~0.9–1.5s, only while audible
   *  and only with whatever chance the current score allows (0 everywhere but
   *  deep-dread — a pressing never dropouts; the jukebox stays sweet). */
  private maybeDropout(): void {
    if (!this.ctx || !this.curdleGain || this.muted || !this.started) return;
    const now = this.ctx.currentTime;
    if (now < this.nextDropoutRoll) return;
    this.nextDropoutRoll = now + 0.9 + Math.random() * 0.6;
    if (Math.random() < this.curdleParams.dropoutChance) this.fireDropout();
  }

  /** One dropout: a fast FADE down and a pre-scheduled fade back up — dip and
   *  recovery are committed in the same call, so the return can never be lost to
   *  a dropped frame and never spikes (the WCAG "audio strobe" rule; the output
   *  limiter is downstream regardless). */
  private fireDropout(): void {
    if (!this.ctx || !this.curdleGain) return;
    const g = this.curdleGain.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.setTargetAtTime(0.08, now, 0.04); // the dip — fast but still a fade
    g.setTargetAtTime(1, now + 0.25, 0.35); // the fade-BACK, ~1.5s to full
  }

  /** Force one dropout (smokes assert the dip-and-fade-back shape). */
  forceDropout(): void {
    this.fireDropout();
  }

  /** Live value of the dropout gain (rest 1) — the smoke watches the recovery. */
  get curdleLevel(): number {
    return this.curdleGain?.gain.value ?? 1;
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
