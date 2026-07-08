import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAM_W,
  CAM_H,
  CELLS,
  lumaFrom,
  motionField,
  adaptFloor,
  motionStats,
  type MotionStats,
} from './pizzacam';

// The impure half of the Pizza Cam™: owns the ONE place in the whole codebase
// a MediaStream ever lives. getUserMedia fires only from start() — a click in
// the booth, never on mount, never anywhere else — and stop() truly ends every
// track (the OS camera light goes dark). The frame loop downscales into a
// 32×24 offscreen canvas, MIRRORED at drawImage (selfie-flip: grids arrive
// already mirrored so pizzacam's cx means what the player sees), reads the
// 768 pixels once, runs the pure pipeline, and hands the caller control
// values. No frame is retained beyond `prev`; nothing here networks.
//
// The stream also dies with the tab's visibility — the camera never runs in a
// background tab — and with unmount. DOM-only (no R3F, no stores) so both the
// /booth page and the in-world modal drive it identically.

export type CamStatus = 'off' | 'starting' | 'live' | 'denied' | 'error';

export type CamFrame = {
  /** Current 32×24 luminance grid (reused buffer — copy if you keep it). */
  lum: Uint8Array;
  /** Peak-hold motion field (same layout, reused buffer). */
  field: Float32Array;
  /** The adaptive noise floor the stats were computed against. */
  floor: number;
  stats: MotionStats;
  nowMs: number;
};

/** ~30 Hz is plenty for gesture music and halves the rAF work. */
const FRAME_MS = 33;

export function useCameraGrid(onFrame: (f: CamFrame) => void): {
  status: CamStatus;
  start: () => void;
  stop: () => void;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
} {
  const [status, setStatus] = useState<CamStatus>('off');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  // All per-frame state lives in refs — the loop must never re-render React.
  const bufs = useRef({
    canvas: null as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    prev: new Uint8Array(CELLS),
    cur: new Uint8Array(CELLS),
    field: new Float32Array(CELLS),
    floor: 0,
    lastTick: 0,
    warmup: 0,
  });

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('off');
  }, []);

  const start = useCallback(() => {
    if (streamRef.current) return; // already live/starting — one stream, ever
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      return;
    }
    setStatus('starting');
    navigator.mediaDevices
      // Low-res request on purpose (we only keep 32×24) — and NEVER audio.
      .getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      })
      .then((stream) => {
        const video = videoRef.current;
        if (!video) {
          // Unmounted while the permission prompt was up — end it immediately.
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        void video.play().catch(() => {
          /* autoplay of a muted local stream can't realistically fail; loop guards readyState anyway */
        });

        const b = bufs.current;
        if (!b.canvas) {
          b.canvas = document.createElement('canvas');
          b.canvas.width = CAM_W;
          b.canvas.height = CAM_H;
          // willReadFrequently keeps getImageData on the CPU path.
          b.ctx = b.canvas.getContext('2d', { willReadFrequently: true });
        }
        b.prev.fill(0);
        b.field.fill(0);
        b.floor = 0;
        b.lastTick = 0;
        b.warmup = 0;
        setStatus('live');

        const tick = (now: number) => {
          rafRef.current = requestAnimationFrame(tick);
          if (now - b.lastTick < FRAME_MS) return;
          b.lastTick = now;
          const v = videoRef.current;
          const ctx = b.ctx;
          if (!v || !ctx || v.readyState < 2) return;
          // The mirror: draw flipped so the grid is already selfie-oriented.
          ctx.save();
          ctx.translate(CAM_W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(v, 0, 0, CAM_W, CAM_H);
          ctx.restore();
          lumaFrom(ctx.getImageData(0, 0, CAM_W, CAM_H).data, b.cur);
          // First frames diff against a black buffer — skip them so the booth
          // doesn't open with a phantom full-screen "hit".
          if (b.warmup < 2) {
            b.warmup++;
            [b.prev, b.cur] = [b.cur, b.prev];
            return;
          }
          const mean = motionField(b.prev, b.cur, b.field);
          b.floor = adaptFloor(b.floor, mean);
          const stats = motionStats(b.field, b.floor);
          [b.prev, b.cur] = [b.cur, b.prev];
          onFrameRef.current({ lum: b.prev, field: b.field, floor: b.floor, stats, nowMs: now });
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch((err: unknown) => {
        setStatus(
          err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'SecurityError')
            ? 'denied'
            : 'error',
        );
      });
  }, []);

  // The camera dies with the tab's visibility and with the component.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [stop]);

  return { status, start, stop, videoRef };
}
