import { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '../state/audioStore';
import { cueUrl } from '../data/music';
import { isTestEntrance, exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// FaceStretch — "Poke Scoobert." The Mario-64-face-stretch toy, but it's Luke's
// face and it's an INSTRUMENT. Grab the photo and pull: a soft grid of control
// points follows your finger and springs back like jelly (a 2D triangle-mesh
// warp, no WebGL — stays light on a phone, fits the arcade's three-free ethos).
//
// "Exploration's reward is sound" (the pillar) → this is the "play it" rung made
// literal: stretching modulates Scoobert's OWN sample live — pull up/down bends
// the pitch (playbackRate), pull sideways closes a lowpass — so poking his face
// plays the site. No synth (honors the audio rules); it's his real track, warped.
// Touch-first, so it's another mobile arcade cabinet. Respects the global mute.
// ───────────────────────────────────────────────────────────────────────────

const W = 270; // logical canvas size (portrait, to frame a face)
const H = 320;
const N = 9; // control points per axis (N-1 cells)
const FACE_SRC = '/press/scoobert-poke.jpg';
const SAMPLE_SRC = cueUrl('pokeSample'); // which Scoobert track the face warps — see data/music CUES

type Node = { x: number; y: number; vx: number; vy: number; rx: number; ry: number; grab: number };

// Gated (?debug / ?world) test hook: the current average face displacement, so
// shoot:poke can assert the pull actually HOLDS while pressed and springs back on
// release (the "tap just giggles, won't pull and stay" regression).
const EXPOSE_STRETCH = isTestEntrance();

// Affine matrix mapping source triangle s→ dest triangle d (3 correspondences).
function affineFromTri(
  s0: number[],
  s1: number[],
  s2: number[],
  d0: number[],
  d1: number[],
  d2: number[],
): [number, number, number, number, number, number] | null {
  const x0 = s0[0],
    y0 = s0[1],
    x1 = s1[0],
    y1 = s1[1],
    x2 = s2[0],
    y2 = s2[1];
  const det = x0 * (y1 - y2) - x1 * (y0 - y2) + x2 * (y0 - y1);
  if (Math.abs(det) < 1e-6) return null;
  const u0 = d0[0],
    v0 = d0[1],
    u1 = d1[0],
    v1 = d1[1],
    u2 = d2[0],
    v2 = d2[1];
  const a = (u0 * (y1 - y2) - u1 * (y0 - y2) + u2 * (y0 - y1)) / det;
  const c = (x0 * (u1 - u2) - x1 * (u0 - u2) + x2 * (u0 - u1)) / det;
  const e = (x0 * (y1 * u2 - y2 * u1) - x1 * (y0 * u2 - y2 * u0) + x2 * (y0 * u1 - y1 * u0)) / det;
  const b = (v0 * (y1 - y2) - v1 * (y0 - y2) + v2 * (y0 - y1)) / det;
  const d = (x0 * (v1 - v2) - x1 * (v0 - v2) + x2 * (v0 - v1)) / det;
  const f = (x0 * (y1 * v2 - y2 * v1) - x1 * (y0 * v2 - y2 * v0) + x2 * (y0 * v1 - y1 * v0)) / det;
  return [a, b, c, d, e, f];
}

export function FaceStretch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grabbed, setGrabbed] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  // ── the warp grid + pointer, in refs (the rAF loop owns them) ──
  const grid = useRef<Node[]>([]);
  const pointer = useRef<{ x: number; y: number; down: boolean; lx: number; ly: number }>({
    x: 0,
    y: 0,
    down: false,
    lx: 0,
    ly: 0,
  });

  // ── audio: a small self-contained, mute-aware instrument graph ──
  const audioRef = useRef<{
    ctx: AudioContext;
    src: AudioBufferSourceNode;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null>(null);

  // seed the rest grid once
  if (grid.current.length === 0) {
    const g: Node[] = [];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * W;
        const y = (j / (N - 1)) * H;
        g.push({ x, y, vx: 0, vy: 0, rx: x, ry: y, grab: 0 });
      }
    }
    grid.current = g;
  }

  // Lazily start the instrument on the first grab (autoplay needs the gesture).
  const startAudio = () => {
    if (audioRef.current) return;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 8000;
      const src = ctx.createBufferSource();
      src.loop = true;
      src.connect(filter).connect(gain).connect(ctx.destination);
      audioRef.current = { ctx, src, filter, gain };
      // decode Scoobert's own track (no synth — we warp his real sound)
      fetch(SAMPLE_SRC)
        .then((r) => r.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          src.buffer = decoded;
          src.start();
          setSoundOn(true);
        })
        .catch(() => {
          /* asset missing / decode failed — the toy stays silent, visual still works */
        });
    } catch {
      /* no WebAudio — silent toy */
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pre-render the face to an offscreen at canvas resolution ("cover" fit), so
    // the warp's source coords are 1:1 with canvas space.
    const off = document.createElement('canvas');
    off.width = W;
    off.height = H;
    const octx = off.getContext('2d')!;
    let imgReady = false;
    const img = new Image();
    img.onload = () => {
      const s = Math.max(W / img.width, H / img.height);
      const dw = img.width * s;
      const dh = img.height * s;
      octx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      imgReady = true;
    };
    img.src = FACE_SRC;

    let raf = 0;
    const K = 0.22; // spring stiffness
    const DAMP = 0.78; // velocity damping
    const SIGMA = 56; // grab radius (px)

    const tick = () => {
      const nodes = grid.current;
      const p = pointer.current;

      // grab: pull nearby nodes by the pointer delta (gaussian falloff) AND mark
      // how strongly each is held, so held nodes resist the spring and STAY where
      // you drag them (the Mario-64 pull-and-hold) instead of snapping straight
      // back — the snap-back was the "tap and it just giggles" feel on touch,
      // where you can't keep a mouse moving to outrun the spring.
      if (p.down) {
        const dx = p.x - p.lx;
        const dy = p.y - p.ly;
        for (const n of nodes) {
          const ddx = n.x - p.x;
          const ddy = n.y - p.y;
          const w = Math.exp(-(ddx * ddx + ddy * ddy) / (2 * SIGMA * SIGMA));
          n.x += dx * w;
          n.y += dy * w;
          n.grab = w; // 1 right under the finger → ~0 far away
        }
        p.lx = p.x;
        p.ly = p.y;
      } else {
        for (const n of nodes) n.grab = 0; // released → everything springs home
      }

      // spring every node back toward rest (jelly), but a held node's restoring
      // force is scaled down by its grab weight, so the part under your finger
      // holds its stretch while you press and only lets go on release.
      let adx = 0;
      let ady = 0;
      let maxDisp = 0; // most-stretched node — the visible "is it pulled" signal
      for (const n of nodes) {
        const hold = 1 - n.grab;
        n.vx = (n.vx + (n.rx - n.x) * K * hold) * DAMP;
        n.vy = (n.vy + (n.ry - n.y) * K * hold) * DAMP;
        n.x += n.vx;
        n.y += n.vy;
        adx += n.x - n.rx;
        ady += n.y - n.ry;
        const d = Math.hypot(n.x - n.rx, n.y - n.ry);
        if (d > maxDisp) maxDisp = d;
      }
      adx /= nodes.length; // average displacement → drives the audio
      ady /= nodes.length;
      if (EXPOSE_STRETCH) {
        (window as Window & { __sdpPokeStretch?: number }).__sdpPokeStretch = maxDisp;
      }

      // ── audio params from the average stretch (mute-aware, smoothed) ──
      const a = audioRef.current;
      if (a) {
        const muted = useAudioStore.getState().muted;
        const energy = Math.min(1, Math.hypot(adx, ady) / 60);
        const now = a.ctx.currentTime;
        const rate = Math.max(0.5, Math.min(2, 1 - (ady / H) * 1.6)); // pull up → higher
        const cutoff = Math.max(500, 8000 - (Math.abs(adx) / (W / 2)) * 7200); // sideways → darker
        const target = muted ? 0.0001 : Math.max(0.0001, 0.06 + energy * 0.3);
        a.src.playbackRate.setTargetAtTime(rate, now, 0.05);
        a.filter.frequency.setTargetAtTime(cutoff, now, 0.05);
        a.gain.gain.setTargetAtTime(target, now, 0.08);
      }

      // ── render the warped face ──
      ctx.fillStyle = '#0b0b12';
      ctx.fillRect(0, 0, W, H);
      if (imgReady) {
        const at = (i: number, j: number) => nodes[j * N + i];
        for (let j = 0; j < N - 1; j++) {
          for (let i = 0; i < N - 1; i++) {
            const a00 = at(i, j),
              a10 = at(i + 1, j),
              a01 = at(i, j + 1),
              a11 = at(i + 1, j + 1);
            drawTri(ctx, off, a00, a10, a11);
            drawTri(ctx, off, a00, a11, a01);
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Clear the test global on unmount so a stale stretch doesn't survive after
      // leaving /poke (the per-frame write stays a raw assign for hot-loop speed;
      // the one-shot clear goes through the helper, which deletes it).
      exposeTestGlobal('__sdpPokeStretch', undefined);
    };
  }, []);

  // clean up audio on unmount
  useEffect(
    () => () => {
      const a = audioRef.current;
      if (a) {
        try {
          a.src.stop();
        } catch {
          /* already stopped */
        }
        void a.ctx.close();
        audioRef.current = null;
      }
    },
    [],
  );

  // map a pointer event to logical canvas coords
  const toLocal = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  return (
    <div className="poke-screen">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="poke-canvas"
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          const l = toLocal(e);
          pointer.current = { x: l.x, y: l.y, down: true, lx: l.x, ly: l.y };
          setGrabbed(true);
          startAudio();
        }}
        onPointerMove={(e) => {
          if (!pointer.current.down) return;
          const l = toLocal(e);
          pointer.current.x = l.x;
          pointer.current.y = l.y;
        }}
        onPointerUp={() => {
          pointer.current.down = false;
          setGrabbed(false);
        }}
        onPointerCancel={() => {
          // Touch can interrupt a drag (call, gesture) — end it cleanly so the
          // face springs home rather than freezing mid-stretch. (We deliberately
          // do NOT end the drag on pointerleave: a finger briefly grazing the
          // canvas edge mid-pull shouldn't drop the grab.)
          pointer.current.down = false;
          setGrabbed(false);
        }}
      />
      <p className="poke-hint">
        {grabbed
          ? 'mmmfffhgh—'
          : soundOn
            ? 'pull up/down to bend the pitch · sideways to muffle'
            : 'grab his face and pull'}
      </p>
    </div>
  );
}

// Draw image triangle (source = node rest positions, dest = current positions),
// slightly expanded around the centroid to hide hairline seams.
function drawTri(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  n0: Node,
  n1: Node,
  n2: Node,
) {
  const s0 = [n0.rx, n0.ry],
    s1 = [n1.rx, n1.ry],
    s2 = [n2.rx, n2.ry];
  // expand dest verts ~0.6px outward
  const cx = (n0.x + n1.x + n2.x) / 3;
  const cy = (n0.y + n1.y + n2.y) / 3;
  const ex = (x: number, y: number): number[] => {
    const dx = x - cx,
      dy = y - cy;
    const l = Math.hypot(dx, dy) || 1;
    return [x + (dx / l) * 0.6, y + (dy / l) * 0.6];
  };
  const d0 = ex(n0.x, n0.y),
    d1 = ex(n1.x, n1.y),
    d2 = ex(n2.x, n2.y);
  const m = affineFromTri(s0, s1, s2, d0, d1, d2);
  if (!m) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0[0], d0[1]);
  ctx.lineTo(d1[0], d1[1]);
  ctx.lineTo(d2[0], d2[1]);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.drawImage(img, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.restore();
}
