import { useCallback, useEffect, useRef, useState } from 'react';
import { audio, type SustainedVoice } from '../audio/engine';
import { useCameraGrid, type CamFrame, type CamStatus } from '../lib/useCameraGrid';
import { getCameraChoice, armCamera, declineCamera } from '../lib/cameraConsent';
import { useReducedMotion, useTouchDevice } from '../lib/lowPower';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';
import { announce } from '../state/toastStore';
import { useProgressStore } from '../state/progressStore';
import {
  CAM_W,
  CAM_H,
  CELLS,
  motionField,
  adaptFloor,
  motionStats,
  thresholdFor,
  airDoughVoice,
  DOUGH_SCALE,
  ZONES,
  zoneBounds,
  initZoneStates,
  zoneHits,
} from '../lib/pizzacam';
import '../styles/booth.css';

// ───────────────────────────────────────────────────────────────────────────
// PizzaCamBooth — the whole Pizza Cam™ instrument, used verbatim by BOTH hosts
// (the /booth cabinet page and the in-world ArcadeModal): consent gate →
// camera → two channels. CH 1 "AIR DOUGH" is a continuous pentatonic voice
// (motion centroid → pitch, energy → volume, audio.startVoice under it — the
// theremin's engine played with your arms instead of your feet). CH 2
// "TOPPING DRUMS" is the EyeToy demake: six topping zones, a motion spike in
// one strikes a bell (audio.playChime — mute-aware, brickwall-limited).
//
// The Webcam policy, embodied: the gate's copy is plain; getUserMedia fires
// only from the enable/power buttons (point of use); a fixed ● CAMERA ON chip
// is on screen the whole time the stream lives and IS the kill switch; and
// the screen never shows the raw feed — only the 32×24 Bayer-dithered grid
// (everything the machine sees, which is the honesty made visible). The
// firewall test keeps this file and the dread system strangers forever.
// ───────────────────────────────────────────────────────────────────────────

type Channel = 'dough' | 'drums';

const SCALE = 12; // canvas backing pixels per grid cell (crunchy on purpose)

// 4×4 Bayer matrix for the ordered dither — the same trick as the world's
// PS1_DITHER_GLSL, in integer JS at 768 pixels.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// 4-step palettes per channel (dark → bright) + a hot tint for moving cells.
// Green phosphor for the dough (rhymes with the boot screen), oven amber for
// the drums. Stored as [r,g,b] for the per-cell ImageData write.
const PALETTES: Record<Channel, { steps: number[][]; hot: number[] }> = {
  dough: {
    steps: [
      [2, 8, 3],
      [10, 51, 17],
      [29, 122, 44],
      [84, 255, 122],
    ],
    hot: [214, 255, 224],
  },
  drums: {
    steps: [
      [10, 4, 2],
      [74, 29, 6],
      [163, 85, 19],
      [255, 190, 69],
    ],
    hot: [255, 244, 214],
  },
};

const NOTE_LABELS = DOUGH_SCALE.map((d) => `${d.note}${d.octave}`);

export function PizzaCamBooth() {
  const touch = useTouchDevice();
  const reduced = useReducedMotion();
  const [consented, setConsented] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [channel, setChannel] = useState<Channel>('dough');
  const statusRef = useRef<CamStatus>('off');
  const channelRef = useRef<Channel>('dough');
  channelRef.current = channel;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<ImageData | null>(null);
  const voiceRef = useRef<SustainedVoice | null>(null);
  const zoneStates = useRef(initZoneStates());
  const zoneEls = useRef<(HTMLDivElement | null)[]>([]);
  const flashTimers = useRef<number[]>([]);
  const cursorEl = useRef<HTMLDivElement>(null);
  const noteEl = useRef<HTMLSpanElement>(null);
  const hitCount = useRef(0);
  const rewarded = useRef(false);

  // First-ever sound out of the Pizza Cam (either channel) banks a durable
  // secret + a little luck — the same sweet first-discovery beat as the other
  // instruments (Lounge rat / shrine). Ref-guarded so the per-frame path only
  // ever reads the store once; the secret makes it once per SAVE, not per visit.
  const maybeReward = () => {
    if (rewarded.current) return;
    rewarded.current = true;
    const prog = useProgressStore.getState();
    if (prog.secretsFound.includes('pizza-cam-first-play')) return;
    prog.findSecret('pizza-cam-first-play');
    prog.gainLuck(1);
    announce('📹 +1 LUCK — the Pizza Cam likes your moves', 'luck');
  };

  // One shared frame handler for the real camera AND the debug inject hook, so
  // the smoke exercises the exact pipeline a real hand does: draw the dithered
  // grid, then play whichever channel is up.
  const handleFrame = useCallback((f: CamFrame) => {
    drawGrid(canvasRef.current, imageRef, f, channelRef.current);
    const ch = channelRef.current;
    let dough = { playing: false, freq: 0, gain: 0, degree: 0 };
    if (ch === 'dough') {
      voiceRef.current ??= audio.startVoice();
      dough = airDoughVoice(f.stats);
      voiceRef.current?.set(dough.freq, dough.gain);
      if (dough.playing) maybeReward();
      // Pitch cursor + note readout via direct DOM (never a per-frame render).
      if (cursorEl.current) {
        cursorEl.current.style.left = `${(f.stats.cx * 100).toFixed(1)}%`;
        cursorEl.current.style.opacity = dough.playing ? '1' : '0.25';
      }
      if (noteEl.current) noteEl.current.textContent = NOTE_LABELS[dough.degree];
    } else {
      const hits = zoneHits(f.field, f.floor, zoneStates.current, f.nowMs);
      for (const h of hits) {
        audio.playChime(h.zone.freq, h.zone.pan, 0.12 * h.velocity);
        hitCount.current++;
        maybeReward();
        const zi = ZONES.indexOf(h.zone);
        const el = zoneEls.current[zi];
        if (el) {
          el.classList.add('booth-zone--hit');
          window.clearTimeout(flashTimers.current[zi]);
          flashTimers.current[zi] = window.setTimeout(
            () => el.classList.remove('booth-zone--hit'),
            180,
          );
        }
      }
    }
    exposeTestGlobal('__sdpBooth', {
      status: statusRef.current,
      channel: ch,
      energy: +f.stats.energy.toFixed(4),
      cx: +f.stats.cx.toFixed(4),
      active: f.stats.active,
      playing: dough.playing,
      freq: Math.round(dough.freq),
      hits: hitCount.current,
    });
  }, []);

  const { status, start, stop, videoRef } = useCameraGrid(handleFrame);
  statusRef.current = status;

  // The kill switch — both the chip and the booth button land here. The stream
  // dies (tracks truly end), the sustained voice fades, the indicator unmounts.
  const killCamera = useCallback(() => {
    stop();
    voiceRef.current?.stop();
    voiceRef.current = null;
    announce('camera off');
  }, [stop]);

  const powerOn = useCallback(() => {
    audio.unlock(); // the click is the gesture that builds the audio ctx
    start();
  }, [start]);

  const acceptGate = useCallback(() => {
    armCamera();
    setConsented(true);
    setDeclined(false);
    powerOn();
  }, [powerOn]);

  const rejectGate = useCallback(() => {
    declineCamera(); // remembered per visit — the boot line stops re-offering too
    setDeclined(true);
  }, []);

  // Channel switch: the stream persists; the dough voice must not.
  const switchChannel = useCallback((ch: Channel) => {
    setChannel(ch);
    if (ch !== 'dough') {
      voiceRef.current?.stop();
      voiceRef.current = null;
    }
    zoneStates.current = initZoneStates();
  }, []);

  // Debug-only inject hook (?debug): feed a synthetic 32×24 luminance frame
  // through the REAL pipeline (diff → floor → stats → channel → audio → draw),
  // maintaining its own prev/field/floor exactly as useCameraGrid does. This is
  // how the smoke plays the instruments deterministically with no camera at all.
  const inject = useRef({ prev: new Uint8Array(CELLS), field: new Float32Array(CELLS), floor: 0, t: 0 });
  useEffect(() => {
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpBoothInject', (arr: number[]) => {
      const b = inject.current;
      const cur = Uint8Array.from(arr.slice(0, CELLS));
      const mean = motionField(b.prev, cur, b.field);
      b.floor = adaptFloor(b.floor, mean);
      const stats = motionStats(b.field, b.floor);
      b.prev = cur;
      b.t += 100; // deterministic clock: each injected frame is +100ms
      handleFrame({ lum: cur, field: b.field, floor: b.floor, stats, nowMs: b.t });
    });
    // Channel switch for the same no-camera determinism (the CH buttons only
    // render while the stream is live).
    exposeTestGlobal('__sdpBoothChannel', (ch: Channel) => switchChannel(ch));
    return () => {
      exposeTestGlobal('__sdpBoothInject', undefined);
      exposeTestGlobal('__sdpBoothChannel', undefined);
    };
  }, [handleFrame, switchChannel]);

  // Teardown that the hook's own unmount cleanup can't know about: the voice.
  useEffect(
    () => () => {
      voiceRef.current?.stop();
      voiceRef.current = null;
      flashTimers.current.forEach((t) => window.clearTimeout(t));
      exposeTestGlobal('__sdpBooth', undefined);
    },
    [],
  );

  // ── the period gag for handhelds — no webcam UI on touch, per policy ──────
  if (touch) {
    return (
      <div className="booth-screen booth-screen--cold">
        <p className="booth-cold-title">PIZZA CAM™ NOT FOUND</p>
        <p className="booth-cold-sub">
          The Pizza Cam™ ships on a parallel port. Come back on a desktop computer.
        </p>
      </div>
    );
  }

  const gateOpen = !consented && !declined && getCameraChoice() !== 'armed' && status === 'off';

  return (
    <div className={`booth${reduced ? ' booth--reduced' : ''}`}>
      {/* the consent gate — plain words, no dark patterns, camera untouched */}
      {gateOpen && (
        <div className="window booth-gate" role="group" aria-label="Pizza Cam Setup">
          <div className="title-bar">
            <div className="title-bar-text">Pizza Cam™ Setup</div>
          </div>
          <div className="window-body booth-gate__body">
            <p>
              The Pizza Cam™ turns your camera into an instrument — wave your hands to toss dough
              and drum the toppings.
            </p>
            <ul className="booth-gate__terms">
              <li>
                <strong>ENABLES HAND CONTROL</strong> — your motion plays the music.
              </li>
              <li>
                <strong>STAYS ON YOUR DEVICE</strong> — the picture becomes 768 big crunchy pixels,
                read for motion, drawn on this screen, and thrown away.
              </li>
              <li>
                <strong>NEVER SENT TO US</strong> — nothing is recorded, nothing is uploaded. There
                is no server for it to go to.
              </li>
            </ul>
            <p>
              A red <span className="booth-dot">●</span> CAMERA ON light shows the whole time it's
              live. One press turns it off.
            </p>
            <p className="booth-gate__audit">
              Don't take our word for it — the entire camera pipeline is one readable file:{' '}
              <a
                href="https://github.com/lukefwalton/scoobertdoobert.pizza/blob/main/src/lib/pizzacam.ts"
                target="_blank"
                rel="noreferrer"
              >
                src/lib/pizzacam.ts
              </a>
              .
            </p>
            <div className="booth-gate__actions">
              <button onClick={acceptGate}>Enable the Pizza Cam</button>
              <button onClick={rejectGate}>No thanks</button>
            </div>
          </div>
        </div>
      )}

      {declined && status === 'off' && (
        <div className="booth-screen booth-screen--cold">
          <p className="booth-cold-title">NO CAMERA — AND THAT'S FINE</p>
          <p className="booth-cold-sub">
            The band plays on without you. Changed your mind?{' '}
            <button className="booth-link" onClick={() => setDeclined(false)}>
              read the terms again
            </button>
          </p>
        </div>
      )}

      {/* armed (boot screen or a past accept) but off: power stays a deliberate press */}
      {!gateOpen && !declined && status === 'off' && (
        <div className="booth-screen booth-screen--cold">
          <p className="booth-cold-title">PIZZA CAM™ READY</p>
          <p className="booth-cold-sub">camera instrument · stays on your device · never sent to us</p>
          <button className="booth-power" onClick={powerOn}>
            TURN CAMERA ON
          </button>
        </div>
      )}

      {status === 'starting' && (
        <div className="booth-screen booth-screen--cold">
          <p className="booth-cold-sub">Warming up the Pizza Cam™ (your browser is asking you)…</p>
        </div>
      )}

      {status === 'denied' && (
        <div className="booth-screen booth-screen--cold">
          <p className="booth-cold-title">NO CAMERA — AND THAT'S FINE</p>
          <p className="booth-cold-sub">
            Your browser said no. That's the kill switch working. If you change your mind, allow
            the camera in your browser settings and press the button again.
          </p>
          <button className="booth-power" onClick={powerOn}>
            TRY AGAIN
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="booth-screen booth-screen--cold">
          <p className="booth-cold-title">PIZZA CAM™ NOT DETECTED</p>
          <p className="booth-cold-sub">No usable camera on this machine. The band plays on without you.</p>
        </div>
      )}

      {status === 'live' && (
        <>
          {/* the persistent indicator + kill switch — fixed above everything,
              present exactly as long as the stream lives */}
          <button className="booth-chip" onClick={killCamera}>
            <span className="booth-dot booth-dot--blink" aria-hidden="true">
              ●
            </span>{' '}
            CAMERA ON — turn off
          </button>

          <div className="booth-stage">
            <canvas
              ref={canvasRef}
              className="booth-canvas"
              width={CAM_W * SCALE}
              height={CAM_H * SCALE}
              aria-label={
                channel === 'dough'
                  ? 'Air Dough — wave to play; left is low, right is high'
                  : 'Topping Drums — hit a zone to strike it'
              }
            />
            {channel === 'dough' ? (
              <div className="booth-overlay" aria-hidden="true">
                <div ref={cursorEl} className="booth-cursor" />
              </div>
            ) : (
              <div className="booth-overlay booth-overlay--zones" aria-hidden="true">
                {ZONES.map((z, i) => {
                  const b = zoneBounds(z);
                  return (
                    <div
                      key={z.id}
                      ref={(el) => {
                        zoneEls.current[i] = el;
                      }}
                      className="booth-zone"
                      style={{
                        left: `${(b.x0 / CAM_W) * 100}%`,
                        top: `${(b.y0 / CAM_H) * 100}%`,
                        width: `${((b.x1 - b.x0) / CAM_W) * 100}%`,
                        height: `${((b.y1 - b.y0) / CAM_H) * 100}%`,
                      }}
                    >
                      <span className="booth-zone__label">{z.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="booth-controls">
            <div className="booth-channels">
              <button
                className={channel === 'dough' ? 'booth-ch booth-ch--on' : 'booth-ch'}
                aria-pressed={channel === 'dough'}
                onClick={() => switchChannel('dough')}
              >
                CH 1 — AIR DOUGH
              </button>
              <button
                className={channel === 'drums' ? 'booth-ch booth-ch--on' : 'booth-ch'}
                aria-pressed={channel === 'drums'}
                onClick={() => switchChannel('drums')}
              >
                CH 2 — TOPPING DRUMS
              </button>
            </div>
            <p className="booth-readout">
              {channel === 'dough' ? (
                <>
                  toss the dough — left low, right high · <span ref={noteEl}>—</span>
                </>
              ) : (
                <>hit a topping — bottom row low, top row bright</>
              )}
            </p>
            <button className="booth-off" onClick={killCamera}>
              TURN CAMERA OFF
            </button>
          </div>
        </>
      )}

      {/* the one <video> the stream ever touches — never displayed */}
      <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
    </div>
  );
}

/** Draw the dithered grid + hot-cell tint into the booth canvas. Pure-ish
 *  rendering (module fn, refs in): 768 cells, SCALE×SCALE blocks each. */
function drawGrid(
  canvas: HTMLCanvasElement | null,
  imageRef: { current: ImageData | null },
  f: CamFrame,
  channel: Channel,
) {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  const W = CAM_W * SCALE;
  const H = CAM_H * SCALE;
  imageRef.current ??= ctx.createImageData(W, H);
  const img = imageRef.current;
  const data = img.data;
  const { steps, hot } = PALETTES[channel];
  const th = thresholdFor(f.floor);
  for (let cy = 0; cy < CAM_H; cy++) {
    for (let cx = 0; cx < CAM_W; cx++) {
      const i = cy * CAM_W + cx;
      const isHot = f.field[i] > th;
      // Ordered dither: bias the 0..255 luma by the Bayer cell, quantize to 4.
      const bias = (BAYER[cy % 4][cx % 4] - 7.5) * 8;
      const level = Math.max(0, Math.min(3, Math.round((f.lum[i] + bias) / 85)));
      const c = isHot ? hot : steps[level];
      // Fill the SCALE×SCALE block.
      for (let py = 0; py < SCALE; py++) {
        let p = ((cy * SCALE + py) * W + cx * SCALE) * 4;
        for (let px = 0; px < SCALE; px++, p += 4) {
          data[p] = c[0];
          data[p + 1] = c[1];
          data[p + 2] = c[2];
          data[p + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
