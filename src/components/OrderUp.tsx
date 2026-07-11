import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// OrderUp (ORDER UP) — Simon, kitchen-side: the cook calls a growing order, you
// ring it back. Four topping pads each light + sing a note (C E G C′ — a consonant
// arpeggio, no wrong-sounding tone); the order grows by one each round you nail,
// and a single mistake ends the shift. The reward is the melody you echo — the
// site's "exploration's reward is sound" spine, as a memory game.
//
// Original code + art (the grammar of Simon, no assets). Self-contained <canvas>,
// no three.js. Tap a pad / Q-W-A-S / 1-4. Notes ring through the SHARED bell engine
// (audio.playChime) so they're mute-aware + brickwall-limited (WCAG/ear safe) for
// free, the same voice the lyre, pans and shrine furin use. Per-cabinet high score
// (arcadeHighs['order-up']) = the longest order you reached.
// ───────────────────────────────────────────────────────────────────────────

const W = 320;
const H = 180;
const GAME_ID = 'order-up';

// Four pads, a C-major arpeggio over an octave (consonant in any order). Each is a
// topping: a colour, a bright lit colour, and a glyph (a colourblind-friendly
// second cue alongside the hue).
const PADS = [
  { note: 'C', oct: 4, base: '#9a3326', lit: '#ff6a4d', glyph: '●' }, // pepperoni
  { note: 'E', oct: 4, base: '#9a7a1f', lit: '#ffd24a', glyph: '◆' }, // cheese
  { note: 'G', oct: 4, base: '#2f6f33', lit: '#69e06f', glyph: '▲' }, // pepper
  { note: 'C', oct: 5, base: '#3a2f6b', lit: '#9d8cff', glyph: '■' }, // olive
] as const;

// Pad rectangles (a 2×2 grid with a gutter). Index 0 TL, 1 TR, 2 BL, 3 BR.
const GUT = 6;
const PW = (W - GUT * 3) / 2;
const PH = (H - GUT * 3) / 2;
const RECTS = [
  { x: GUT, y: GUT },
  { x: GUT * 2 + PW, y: GUT },
  { x: GUT, y: GUT * 2 + PH },
  { x: GUT * 2 + PW, y: GUT * 2 + PH },
].map((r) => ({ ...r, w: PW, h: PH }));

const padAt = (px: number, py: number): number =>
  RECTS.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);

const randPad = () => Math.floor(Math.random() * PADS.length);

// Show-timing (seconds): lead-in pause, then each step lights ON, then a gap.
const LEAD = 0.45;
const SHOW_ON = 0.4;
const SHOW_OFF = 0.22;
const FLASH = 0.2; // how long a player's press lights its pad

type Phase = 'ready' | 'showing' | 'input' | 'over';

export function OrderUp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const best = useProgressStore((s) => s.arcadeHighs[GAME_ID] ?? 0);
  const recordArcadeHigh = useProgressStore((s) => s.recordArcadeHigh);

  const [phase, setPhase] = useState<Phase>('ready');
  const [len, setLen] = useState(0);

  const game = useRef({
    seq: [] as number[],
    showPos: 0,
    showOn: false,
    t: 0,
    inputPos: 0,
    lit: -1,
    flash: 0,
    phase: 'ready' as Phase,
  });

  const setP = (p: Phase) => {
    game.current.phase = p;
    setPhase(p);
  };

  const ring = (pad: number) => {
    const p = PADS[pad];
    // pan L→R across the 2×2 so a run reads stereo; the shared bell voice.
    audio.playChime(noteToFreq(p.note, p.oct), pad % 2 === 0 ? -0.5 : 0.5, 0.18, 0.6);
  };

  const beginShow = () => {
    const g = game.current;
    g.showPos = 0;
    g.showOn = false;
    g.t = 0;
    g.lit = -1;
    setP('showing');
  };

  const start = () => {
    const g = game.current;
    g.seq = [randPad()];
    g.inputPos = 0;
    setLen(1);
    beginShow();
  };

  const lose = () => {
    const g = game.current;
    if (g.phase === 'ready' || g.phase === 'over') return;
    recordArcadeHigh(GAME_ID, Math.max(1, g.seq.length)); // longest order reached (≥1)
    audio.playTone(noteToFreq('C', 2), 260, 0.18); // a low "order's burnt" buzz
    g.lit = -1;
    setP('over');
  };

  // A player's pad press during their turn (tap / key).
  const press = (pad: number) => {
    const g = game.current;
    if (g.phase === 'ready' || g.phase === 'over') {
      start();
      return;
    }
    if (g.phase !== 'input' || pad < 0) return;
    g.lit = pad;
    g.flash = FLASH;
    ring(pad);
    if (pad === g.seq[g.inputPos]) {
      g.inputPos += 1;
      if (g.inputPos >= g.seq.length) {
        // order rung back in full → extend it and replay the longer order.
        g.seq.push(randPad());
        setLen(g.seq.length);
        g.inputPos = 0;
        window.setTimeout(beginShow, 380); // a beat to breathe before the next order
      }
    } else {
      lose();
    }
  };

  // The draw + show-sequence loop (RAF), like the other cabinets.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = game.current;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (g.phase === 'showing') {
        g.t += dt;
        if (g.showOn) {
          if (g.t >= SHOW_ON) {
            g.lit = -1;
            g.showOn = false;
            g.t = 0;
            g.showPos += 1;
            if (g.showPos >= g.seq.length) {
              g.inputPos = 0;
              setP('input');
            }
          }
        } else {
          const gap = g.showPos === 0 ? LEAD : SHOW_OFF;
          if (g.t >= gap) {
            g.lit = g.seq[g.showPos];
            ring(g.lit);
            g.showOn = true;
            g.t = 0;
          }
        }
      } else if (g.phase === 'input' && g.flash > 0) {
        g.flash -= dt;
        if (g.flash <= 0) g.lit = -1;
      }

      // ── draw ──
      ctx.fillStyle = '#0b0d18';
      ctx.fillRect(0, 0, W, H);
      RECTS.forEach((r, i) => {
        const on = g.lit === i;
        ctx.fillStyle = on ? PADS[i].lit : PADS[i].base;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        if (on) {
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 2;
          ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
        }
        ctx.fillStyle = on ? 'rgba(20,16,10,0.85)' : 'rgba(255,255,255,0.22)';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(PADS[i].glyph, r.x + r.w / 2, r.y + r.h / 2);
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard: Q-W / A-S maps to the 2×2 grid; 1-4 too. Enter/Space (re)starts.
  useEffect(() => {
    const KEYMAP: Record<string, number> = {
      q: 0,
      w: 1,
      a: 2,
      s: 3,
      '1': 0,
      '2': 1,
      '3': 2,
      '4': 3,
    };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in KEYMAP) {
        e.preventDefault();
        press(KEYMAP[k]);
      } else if (k === 'enter' || k === ' ') {
        e.preventDefault();
        if (game.current.phase === 'ready' || game.current.phase === 'over') start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ?debug-only ACTION hook: a wrong topping isn't deterministically forceable (the
  // order is random), so drive the REAL lose() branch so shoot:games can exercise the
  // game-over path + the high-score write. Stricter ?debug gate (like the others).
  useEffect(() => {
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpOrderUpForceLose', () => lose());
    return () => exposeTestGlobal('__sdpOrderUpForceLose', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hit = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const g = game.current;
    if (g.phase === 'ready' || g.phase === 'over') {
      start();
      return;
    }
    if (g.phase !== 'input') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    press(padAt(px, py));
  };

  const hint = phase === 'showing' ? 'WATCH' : phase === 'input' ? 'YOUR TURN' : '';

  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>ORDER {String(len).padStart(2, '0')}</span>
        {hint && <span>{hint}</span>}
        <span>HI {String(Math.max(best, len)).padStart(2, '0')}</span>
      </div>
      <div className="arcade-stage">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="arcade-canvas"
          onPointerDown={hit}
        />
        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">ORDER UP</p>
            <p className="arcade-sub">watch the order &middot; ring it back</p>
            <p className="arcade-blink">▸ TAP TO START</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title">ORDER&apos;S UP!</p>
            <p className="arcade-sub">
              {len} deep &middot; best {Math.max(best, len)}
            </p>
            <p className="arcade-blink">▸ TAP TO PLAY AGAIN</p>
          </div>
        )}
      </div>
    </div>
  );
}
