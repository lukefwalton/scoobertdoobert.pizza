import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';

// ───────────────────────────────────────────────────────────────────────────
// SliceBreaker — Breakout, pizza-mode. A spatula paddle knocks an olive up into a
// wall of toppings; clear the wall, get a faster one. Original code + art (the
// "grammar" of Breakout, never its assets — no marks). Self-contained <canvas> +
// 2D context, no three.js, so it stays light on a phone. Pointer/drag + arrow
// keys move the paddle; a tap launches. Mute-aware blips (audio.playTone, through
// the limiter — WCAG-safe). Per-cabinet high score (arcadeHighs['slice-breaker']).
// ───────────────────────────────────────────────────────────────────────────

const W = 320;
const H = 180;
const GAME_ID = 'slice-breaker';

const PADDLE_W = 46;
const PADDLE_H = 6;
const PADDLE_Y = H - 14;
const BALL_R = 3;
const ROWS = 5;
const COLS = 9;
const BRICK_W = 30;
const BRICK_H = 9;
const BRICK_TOP = 26;
const BRICK_GAP = 2;
const MARGIN = (W - COLS * (BRICK_W + BRICK_GAP) + BRICK_GAP) / 2;

// Topping rows, top (rare) → bottom (common): pepperoni, pepper, onion, olive, basil.
const ROW_COLORS = ['#c7402f', '#e0843a', '#d8c24a', '#6fae54', '#3f8f6a'];
const ROW_NOTES: [string, number][] = [
  ['C', 6],
  ['A', 5],
  ['G', 5],
  ['E', 5],
  ['C', 5],
];

type Phase = 'ready' | 'playing' | 'over' | 'won';
type Brick = { x: number; y: number; alive: boolean; row: number };

function freshBricks(): Brick[] {
  const out: Brick[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      out.push({
        x: MARGIN + c * (BRICK_W + BRICK_GAP),
        y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
        alive: true,
        row: r,
      });
    }
  }
  return out;
}

export function SliceBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const best = useProgressStore((s) => s.arcadeHighs[GAME_ID] ?? 0);
  const recordArcadeHigh = useProgressStore((s) => s.recordArcadeHigh);

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  const game = useRef({
    px: W / 2, // paddle centre x
    bx: W / 2,
    by: PADDLE_Y - BALL_R - 1,
    vx: 0,
    vy: 0,
    speed: 150,
    stuck: true, // ball rides the paddle until launch
    bricks: freshBricks(),
    score: 0,
    lives: 3,
    wave: 1,
    phase: 'ready' as Phase,
    keyLeft: false,
    keyRight: false,
  });

  const launch = () => {
    const g = game.current;
    if (g.phase === 'ready' || g.phase === 'over' || g.phase === 'won') {
      // fresh run / next wave / restart
      if (g.phase === 'over' || g.phase === 'ready') {
        g.bricks = freshBricks();
        g.score = 0;
        g.lives = 3;
        g.wave = 1;
        g.speed = 150;
        setScore(0);
        setLives(3);
      }
      g.px = W / 2;
      g.bx = W / 2;
      g.by = PADDLE_Y - BALL_R - 1;
      g.stuck = true;
      g.phase = 'playing';
      setPhase('playing');
      return;
    }
    if (g.phase === 'playing' && g.stuck) {
      g.stuck = false;
      g.vx = (Math.random() * 2 - 1) * 90;
      g.vy = -g.speed;
    }
  };

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

      if (g.phase === 'playing') {
        // paddle: keys nudge it; pointer sets it directly (handled on move).
        if (g.keyLeft) g.px -= 240 * dt;
        if (g.keyRight) g.px += 240 * dt;
        g.px = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, g.px));

        if (g.stuck) {
          g.bx = g.px;
          g.by = PADDLE_Y - BALL_R - 1;
        } else {
          g.bx += g.vx * dt;
          g.by += g.vy * dt;
          // walls
          if (g.bx < BALL_R) {
            g.bx = BALL_R;
            g.vx = Math.abs(g.vx);
          } else if (g.bx > W - BALL_R) {
            g.bx = W - BALL_R;
            g.vx = -Math.abs(g.vx);
          }
          if (g.by < BALL_R) {
            g.by = BALL_R;
            g.vy = Math.abs(g.vy);
          }
          // paddle
          if (
            g.vy > 0 &&
            g.by + BALL_R >= PADDLE_Y &&
            g.by + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
            g.bx >= g.px - PADDLE_W / 2 &&
            g.bx <= g.px + PADDLE_W / 2
          ) {
            const hit = (g.bx - g.px) / (PADDLE_W / 2); // -1..1
            const sp = g.speed;
            g.vx = hit * sp * 0.85;
            g.vy = -Math.sqrt(Math.max(sp * sp - g.vx * g.vx, sp * sp * 0.25));
            g.by = PADDLE_Y - BALL_R - 1;
            audio.playTone(noteToFreq('C', 4), 70, 0.14);
          }
          // bricks
          for (const b of g.bricks) {
            if (!b.alive) continue;
            if (
              g.bx + BALL_R > b.x &&
              g.bx - BALL_R < b.x + BRICK_W &&
              g.by + BALL_R > b.y &&
              g.by - BALL_R < b.y + BRICK_H
            ) {
              b.alive = false;
              g.score += (ROWS - b.row) * 10;
              // bounce: pick the axis by smaller penetration
              const overlapX = Math.min(g.bx + BALL_R - b.x, b.x + BRICK_W - (g.bx - BALL_R));
              const overlapY = Math.min(g.by + BALL_R - b.y, b.y + BRICK_H - (g.by - BALL_R));
              if (overlapX < overlapY) g.vx = -g.vx;
              else g.vy = -g.vy;
              const [n, o] = ROW_NOTES[b.row];
              audio.playChime(noteToFreq(n, o), (g.bx / W) * 2 - 1, 0.12, 0.5);
              break;
            }
          }
          // dropped below
          if (g.by > H + BALL_R) {
            g.lives -= 1;
            setLives(g.lives);
            if (g.lives <= 0) {
              g.phase = 'over';
              const final = Math.floor(g.score);
              setScore(final);
              recordArcadeHigh(GAME_ID, final);
            } else {
              g.stuck = true;
              audio.playTone(noteToFreq('E', 3), 180, 0.16);
            }
          }
          // wave cleared
          if (g.bricks.every((b) => !b.alive)) {
            g.wave += 1;
            g.score += 50;
            g.bricks = freshBricks();
            g.speed = Math.min(g.speed + 22, 260);
            g.stuck = true;
            g.bx = g.px;
            audio.playChime(noteToFreq('C', 6), 0, 0.16, 0.8);
          }
          setScore((p) => (p === Math.floor(g.score) ? p : Math.floor(g.score)));
        }
      }

      // ── draw ──
      ctx.fillStyle = '#0b0b12';
      ctx.fillRect(0, 0, W, H);
      // bricks
      for (const b of g.bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = ROW_COLORS[b.row];
        ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(b.x, b.y, BRICK_W, 2);
      }
      // paddle (a spatula slice)
      ctx.fillStyle = '#ffcf4d';
      ctx.fillRect(g.px - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H);
      ctx.fillStyle = '#e0a83a';
      ctx.fillRect(g.px - PADDLE_W / 2, PADDLE_Y + PADDLE_H - 2, PADDLE_W, 2);
      // ball (an olive)
      ctx.fillStyle = '#2a2a1f';
      ctx.beginPath();
      ctx.arc(g.bx, g.by, BALL_R + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6fae54';
      ctx.beginPath();
      ctx.arc(g.bx, g.by, BALL_R, 0, Math.PI * 2);
      ctx.fill();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pointer: set the paddle to the pointer's logical x; a tap also launches.
  const onPointer = (clientX: number, rect: DOMRect) => {
    const g = game.current;
    const x = ((clientX - rect.left) / rect.width) * W;
    g.px = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const g = game.current;
      if (e.key === 'ArrowLeft') g.keyLeft = down;
      else if (e.key === 'ArrowRight') g.keyRight = down;
      else if (down && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter')) {
        e.preventDefault();
        launch();
      }
    };
    const dn = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>SCORE {String(score).padStart(5, '0')}</span>
        <span>♦{lives}</span>
        <span>HI {String(Math.max(best, score)).padStart(5, '0')}</span>
      </div>
      <div className="arcade-stage">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="arcade-canvas"
          onPointerDown={(e) => {
            e.preventDefault();
            onPointer(e.clientX, e.currentTarget.getBoundingClientRect());
            launch();
          }}
          onPointerMove={(e) => {
            if (e.buttons || e.pointerType === 'touch')
              onPointer(e.clientX, e.currentTarget.getBoundingClientRect());
          }}
        />
        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">SLICE BREAKER</p>
            <p className="arcade-sub">slide the spatula &middot; clear the toppings</p>
            <p className="arcade-blink">▸ TAP TO LAUNCH</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title">GAME OVER</p>
            <p className="arcade-sub">
              {score} pts &middot; best {Math.max(best, score)}
            </p>
            <p className="arcade-blink">▸ TAP TO PLAY AGAIN</p>
          </div>
        )}
      </div>
      <button
        type="button"
        className="arcade-jump"
        onPointerDown={(e) => {
          e.preventDefault();
          launch();
        }}
      >
        LAUNCH
      </button>
    </div>
  );
}
