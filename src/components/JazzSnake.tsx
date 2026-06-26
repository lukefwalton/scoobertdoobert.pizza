import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';

// ───────────────────────────────────────────────────────────────────────────
// JazzSnake — Snake, but every topping you eat plays the next note of a climbing
// pentatonic run, so a good game writes a little melody. Original code + art (the
// grammar of Snake, not its assets). Self-contained <canvas>, no three.js. Arrow
// keys / a dpad / swipe to steer. Mute-aware notes through the limiter (WCAG-safe).
// Per-cabinet high score (arcadeHighs['jazz-snake']) = longest snake.
// ───────────────────────────────────────────────────────────────────────────

const CELL = 10;
const COLS = 32;
const ROWS = 18; // 320×180 grid — matches the arcade stage aspect (no squish)
const W = COLS * CELL; // 320
const H = ROWS * CELL; // 180
const GAME_ID = 'jazz-snake';

// A two-octave C-pentatonic ladder; each bite climbs one rung, then wraps.
const SCALE: [string, number][] = [
  ['C', 4],
  ['D', 4],
  ['E', 4],
  ['G', 4],
  ['A', 4],
  ['C', 5],
  ['D', 5],
  ['E', 5],
  ['G', 5],
  ['A', 5],
  ['C', 6],
];

type Phase = 'ready' | 'playing' | 'over';
type Cell = { x: number; y: number };
const eq = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

function placeFood(snake: Cell[]): Cell {
  let f: Cell;
  do {
    f = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some((s) => eq(s, f)));
  return f;
}

export function JazzSnake() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const best = useProgressStore((s) => s.arcadeHighs[GAME_ID] ?? 0);
  const recordArcadeHigh = useProgressStore((s) => s.recordArcadeHigh);

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);

  const game = useRef({
    snake: [{ x: 8, y: 10 }] as Cell[],
    dir: { x: 1, y: 0 },
    queued: [] as Cell[], // queued direction changes (so two fast turns don't reverse)
    food: { x: 16, y: 10 } as Cell,
    acc: 0,
    step: 0.16,
    score: 0,
    eaten: 0,
    phase: 'ready' as Phase,
  });

  const start = () => {
    const g = game.current;
    g.snake = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ];
    g.dir = { x: 1, y: 0 };
    g.queued = [];
    g.food = placeFood(g.snake);
    g.acc = 0;
    g.step = 0.16;
    g.score = 0;
    g.eaten = 0;
    g.phase = 'playing';
    setScore(0);
    setPhase('playing');
  };

  // Queue a turn; ignore a 180° reversal against the last committed/queued dir.
  const turn = (x: number, y: number) => {
    const g = game.current;
    if (g.phase !== 'playing') {
      start();
      return;
    }
    const prev = g.queued.length ? g.queued[g.queued.length - 1] : g.dir;
    if (prev.x === -x && prev.y === -y) return; // no reversing onto yourself
    if (prev.x === x && prev.y === y) return; // no-op
    if (g.queued.length < 2) g.queued.push({ x, y });
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
        g.acc += dt;
        while (g.acc >= g.step) {
          g.acc -= g.step;
          if (g.queued.length) g.dir = g.queued.shift()!;
          const head = g.snake[0];
          const nx = head.x + g.dir.x;
          const ny = head.y + g.dir.y;
          // walls
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) {
            g.phase = 'over';
            setPhase('over'); // surface the GAME OVER card (React state, not just the ref)
            // High score is the snake LENGTH (= eaten + the 3 starting segments), to
            // match the LEN readout — not the raw food-eaten count.
            recordArcadeHigh(GAME_ID, g.snake.length);
            audio.playTone(noteToFreq('C', 2), 240, 0.18);
            break;
          }
          const next = { x: nx, y: ny };
          // self (allow stepping onto the current tail cell, which will move)
          const willEat = eq(next, g.food);
          const body = willEat ? g.snake : g.snake.slice(0, -1);
          if (body.some((s) => eq(s, next))) {
            g.phase = 'over';
            setPhase('over'); // surface the GAME OVER card (React state, not just the ref)
            // High score is the snake LENGTH (= eaten + the 3 starting segments), to
            // match the LEN readout — not the raw food-eaten count.
            recordArcadeHigh(GAME_ID, g.snake.length);
            audio.playTone(noteToFreq('C', 2), 240, 0.18);
            break;
          }
          g.snake.unshift(next);
          if (willEat) {
            g.score += 1;
            const [n, o] = SCALE[g.eaten % SCALE.length];
            g.eaten += 1;
            audio.playChime(noteToFreq(n, o), (next.x / COLS) * 2 - 1, 0.16, 0.7);
            g.food = placeFood(g.snake);
            g.step = Math.max(0.07, 0.16 - g.snake.length * 0.0025); // speed up as you grow
            setScore(g.score);
          } else {
            g.snake.pop();
          }
        }
      }

      // ── draw ──
      ctx.fillStyle = '#0b0f0b';
      ctx.fillRect(0, 0, W, H);
      // subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = CELL; x < W; x += CELL) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = CELL; y < H; y += CELL) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      // food (a pepperoni)
      ctx.fillStyle = '#c7402f';
      ctx.beginPath();
      ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      // snake (warm gradient head → tail)
      g.snake.forEach((s, i) => {
        const t = i / Math.max(1, g.snake.length - 1);
        ctx.fillStyle = i === 0 ? '#ffe08a' : `rgb(${230 - t * 90},${175 - t * 70},${74})`;
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          turn(-1, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          turn(1, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          turn(0, -1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          turn(0, 1);
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (game.current.phase !== 'playing') start();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe-to-steer on the canvas (touch-first): the dominant axis of the drag.
  const swipe = useRef<{ x: number; y: number } | null>(null);

  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>LEN {String(score + 3).padStart(3, '0')}</span>
        {/* HI is the best LENGTH (best is stored as snake length), so it reads on
            the same scale as LEN — not the raw eaten count. */}
        <span>HI {String(Math.max(best, score + 3)).padStart(3, '0')}</span>
      </div>
      <div className="arcade-stage">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="arcade-canvas"
          onPointerDown={(e) => {
            e.preventDefault();
            swipe.current = { x: e.clientX, y: e.clientY };
            if (game.current.phase !== 'playing') start();
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (!s) return;
            const dx = e.clientX - s.x;
            const dy = e.clientY - s.y;
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // a tap, not a swipe
            if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
            else turn(0, dy > 0 ? 1 : -1);
          }}
        />
        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">JAZZ SNAKE</p>
            <p className="arcade-sub">eat toppings &middot; play the scale</p>
            <p className="arcade-blink">▸ TAP / SWIPE TO START</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title">GAME OVER</p>
            <p className="arcade-sub">
              {score + 3} long &middot; best {Math.max(best, score + 3)}
            </p>
            <p className="arcade-blink">▸ TAP TO PLAY AGAIN</p>
          </div>
        )}
      </div>
      {/* dpad — for thumbs that don't want to swipe */}
      <div className="arcade-pad arcade-pad--dpad">
        <button
          type="button"
          className="arcade-padbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            turn(0, -1);
          }}
          aria-label="up"
        >
          ▲
        </button>
        <div className="arcade-pad__row">
          <button
            type="button"
            className="arcade-padbtn"
            onPointerDown={(e) => {
              e.preventDefault();
              turn(-1, 0);
            }}
            aria-label="left"
          >
            ◀
          </button>
          <button
            type="button"
            className="arcade-padbtn"
            onPointerDown={(e) => {
              e.preventDefault();
              turn(0, 1);
            }}
            aria-label="down"
          >
            ▼
          </button>
          <button
            type="button"
            className="arcade-padbtn"
            onPointerDown={(e) => {
              e.preventDefault();
              turn(1, 0);
            }}
            aria-label="right"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
