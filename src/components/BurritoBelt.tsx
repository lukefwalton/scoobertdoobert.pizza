import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';

// ───────────────────────────────────────────────────────────────────────────
// BurritoBelt (BURRITO BELT) — the "falling blocks" cabinet: stacks of burrito
// ingredients roll down a belt; slide + rotate them to fill a row all the way
// across and it wraps up and rolls off (a line clear) for points. Stack to the
// top and the belt jams (game over). The grammar of the falling-blocks genre,
// never its assets: own piece set + ingredient colours + name, generic matrix
// rotation (no kick-table branding), own synth audio through the limiter
// (mute-aware, WCAG-safe — no strobe). Self-contained <canvas>, no three.js.
// Arrows / a pad to move + rotate, space / a tap to hard-drop. Per-cabinet high
// score (arcadeHighs['burrito-belt']) = points.
// ───────────────────────────────────────────────────────────────────────────

const COLS = 10;
const ROWS = 18;
const CELL = 10;
const WELL_W = COLS * CELL; // 100
const WELL_H = ROWS * CELL; // 180
const STAGE_W = 320;
const STAGE_H = 180;
const WELL_X = (STAGE_W - WELL_W) / 2; // centred; side panels hold SCORE / NEXT
const GAME_ID = 'burrito-belt';

type Phase = 'ready' | 'playing' | 'over';
type Cell = [number, number]; // [row, col] within the piece's n×n box
type Piece = { n: number; color: string; cells: Cell[] };

// The seven shapes (genre grammar), as burrito-ingredient colours. Spawn cells in
// an n×n box; rotation is a generic 90° matrix turn, so no per-piece kick tables.
const PIECES: Piece[] = [
  {
    n: 4,
    color: '#e8c98a',
    cells: [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  }, // I — tortilla strip
  {
    n: 2,
    color: '#f2d06b',
    cells: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  }, // O — cheese
  {
    n: 3,
    color: '#c7402f',
    cells: [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  }, // T — salsa
  {
    n: 3,
    color: '#7a9e3a',
    cells: [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ],
  }, // S — guac
  {
    n: 3,
    color: '#9b5b2a',
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  }, // Z — carnitas
  {
    n: 3,
    color: '#5a6cc4',
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  }, // J — black beans
  {
    n: 3,
    color: '#d98a3a',
    cells: [
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  }, // L — rice/orange
];

const rotateCW = (cells: Cell[], n: number): Cell[] =>
  cells.map(([r, c]) => [c, n - 1 - r] as Cell);

type Active = { piece: number; cells: Cell[]; row: number; col: number };

export function BurritoBelt() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const best = useProgressStore((s) => s.arcadeHighs[GAME_ID] ?? 0);
  const recordArcadeHigh = useProgressStore((s) => s.recordArcadeHigh);

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);

  const game = useRef({
    phase: 'ready' as Phase,
    board: [] as (string | null)[][],
    active: null as Active | null,
    next: 0,
    fall: 0,
    interval: 0.6,
    lines: 0,
    score: 0,
    softDrop: false,
  });

  const emptyBoard = () =>
    Array.from({ length: ROWS }, () => Array<string | null>(COLS).fill(null));
  const randPiece = () => Math.floor(Math.random() * PIECES.length);

  // Does `cells` (a piece) fit at board (row,col)? Off-top (row<0) is allowed.
  const fits = (cells: Cell[], row: number, col: number): boolean => {
    const b = game.current.board;
    for (const [r, c] of cells) {
      const br = row + r;
      const bc = col + c;
      if (bc < 0 || bc >= COLS || br >= ROWS) return false;
      if (br >= 0 && b[br][bc]) return false;
    }
    return true;
  };

  const spawn = (): boolean => {
    const g = game.current;
    const idx = g.next;
    g.next = randPiece();
    const piece = PIECES[idx];
    const col = Math.floor((COLS - piece.n) / 2);
    const cells = piece.cells.map(([r, c]) => [r, c] as Cell);
    if (!fits(cells, -1, col)) return false; // can't even place → belt jammed
    g.active = { piece: idx, cells, row: -1, col };
    return true;
  };

  const start = () => {
    const g = game.current;
    g.board = emptyBoard();
    g.next = randPiece();
    g.fall = 0;
    g.interval = 0.6;
    g.lines = 0;
    g.score = 0;
    g.softDrop = false;
    g.phase = 'playing';
    spawn();
    setScore(0);
    setPhase('playing');
  };

  // Lock the active piece, clear any full rows, then spawn the next (or end).
  const lockAndNext = () => {
    const g = game.current;
    const a = g.active;
    if (!a) return;
    const color = PIECES[a.piece].color;
    for (const [r, c] of a.cells) {
      const br = a.row + r;
      if (br >= 0) g.board[br][a.col + c] = color;
    }
    // clear full rows (roll them off the belt)
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g.board[r].every((cell) => cell)) {
        g.board.splice(r, 1);
        g.board.unshift(Array<string | null>(COLS).fill(null));
        cleared++;
        r++; // re-check the same index (rows shifted down)
      }
    }
    if (cleared > 0) {
      g.lines += cleared;
      g.score += [0, 10, 25, 45, 70][cleared]; // more for multi-row wraps
      g.interval = Math.max(0.12, 0.6 - g.lines * 0.012); // speed up with lines
      setScore(g.score);
      // a little ascending chime per row wrapped
      for (let i = 0; i < cleared; i++)
        audio.playChime(
          noteToFreq(['C', 'E', 'G', 'C'][i] ?? 'C', 5 + (i > 2 ? 1 : 0)),
          0,
          0.14,
          0.7,
        );
    } else {
      audio.playTone(noteToFreq('A', 3), 70, 0.08); // a soft thunk on lock
    }
    g.active = null;
    if (!spawn()) {
      g.phase = 'over';
      setPhase('over'); // surface the GAME OVER card (React state, not just the ref)
      recordArcadeHigh(GAME_ID, g.score);
      audio.playTone(noteToFreq('C', 2), 280, 0.18);
    }
  };

  const move = (dCol: number) => {
    const g = game.current;
    const a = g.active;
    if (g.phase !== 'playing' || !a) return;
    if (fits(a.cells, a.row, a.col + dCol)) a.col += dCol;
  };
  const rotate = () => {
    const g = game.current;
    const a = g.active;
    if (g.phase !== 'playing' || !a) return;
    const n = PIECES[a.piece].n;
    const turned = rotateCW(a.cells, n);
    // try in place, then nudge off a wall (a tiny kick), then give up
    for (const k of [0, -1, 1, -2, 2]) {
      if (fits(turned, a.row, a.col + k)) {
        a.cells = turned;
        a.col += k;
        audio.playChime(noteToFreq('D', 5), 0, 0.06, 0.4);
        return;
      }
    }
  };
  const hardDrop = () => {
    const g = game.current;
    const a = g.active;
    if (g.phase !== 'playing') {
      start();
      return;
    }
    if (!a) return;
    while (fits(a.cells, a.row + 1, a.col)) a.row += 1;
    lockAndNext();
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

      if (g.phase === 'playing' && g.active) {
        g.fall += dt;
        const interval = g.softDrop ? Math.min(g.interval, 0.05) : g.interval;
        while (g.fall >= interval) {
          g.fall -= interval;
          const a = g.active;
          if (!a) break;
          if (fits(a.cells, a.row + 1, a.col)) a.row += 1;
          else {
            lockAndNext();
            break;
          }
        }
      }

      // ── draw ──
      ctx.fillStyle = '#15100a';
      ctx.fillRect(0, 0, STAGE_W, STAGE_H);
      // the belt well
      ctx.fillStyle = '#0c0905';
      ctx.fillRect(WELL_X, 0, WELL_W, WELL_H);
      ctx.strokeStyle = 'rgba(255,210,140,0.10)';
      ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(WELL_X + c * CELL, 0);
        ctx.lineTo(WELL_X + c * CELL, WELL_H);
        ctx.stroke();
      }
      const drawCell = (r: number, c: number, color: string) => {
        const x = WELL_X + c * CELL;
        const y = r * CELL;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      };
      // settled stack
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) {
          const cell = g.board[r]?.[c];
          if (cell) drawCell(r, c, cell);
        }
      // active piece
      if (g.active) {
        const color = PIECES[g.active.piece].color;
        for (const [r, c] of g.active.cells) {
          const br = g.active.row + r;
          if (br >= 0) drawCell(br, g.active.col + c, color);
        }
      }
      // NEXT preview (right panel)
      ctx.fillStyle = '#caa15a';
      ctx.font = '8px "Courier New", monospace';
      ctx.fillText('NEXT', WELL_X + WELL_W + 8, 14);
      if (g.phase === 'playing') {
        const np = PIECES[g.next];
        for (const [r, c] of np.cells) {
          ctx.fillStyle = np.color;
          ctx.fillRect(WELL_X + WELL_W + 10 + c * 8, 20 + r * 8, 7, 7);
        }
      }
      // LINES (left panel)
      ctx.fillStyle = '#caa15a';
      ctx.fillText('LINES', 8, 14);
      ctx.fillStyle = '#ffe3b0';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(String(g.lines).padStart(3, '0'), 8, 30);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard: ← → move, ↑ rotate, ↓ soft-drop (held), space hard-drop
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          move(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          move(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotate();
          break;
        case 'ArrowDown':
          e.preventDefault();
          game.current.softDrop = true;
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          hardDrop();
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') game.current.softDrop = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>SCORE {String(score).padStart(5, '0')}</span>
        <span>HI {String(Math.max(best, score)).padStart(5, '0')}</span>
      </div>
      <div className="arcade-stage">
        <canvas
          ref={canvasRef}
          width={STAGE_W}
          height={STAGE_H}
          className="arcade-canvas"
          onPointerDown={(e) => {
            e.preventDefault();
            if (game.current.phase !== 'playing') start();
          }}
        />
        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">BURRITO BELT</p>
            <p className="arcade-sub">stack the fillings &middot; wrap a full row</p>
            <p className="arcade-blink">▸ TAP TO START</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title">BELT JAMMED</p>
            <p className="arcade-sub">
              {score} pts &middot; best {Math.max(best, score)}
            </p>
            <p className="arcade-blink">▸ TAP TO PLAY AGAIN</p>
          </div>
        )}
      </div>
      {/* ◀ ↻ ▼ ▶ — move / rotate / soft-drop for thumbs (space = hard drop) */}
      <div className="arcade-pad">
        <button
          type="button"
          className="arcade-padbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            move(-1);
          }}
          aria-label="left"
        >
          ◀
        </button>
        <button
          type="button"
          className="arcade-padbtn arcade-padbtn--fire"
          onPointerDown={(e) => {
            e.preventDefault();
            rotate();
          }}
          aria-label="rotate"
        >
          ↻
        </button>
        <button
          type="button"
          className="arcade-padbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            hardDrop();
          }}
          aria-label="drop"
        >
          ▼
        </button>
        <button
          type="button"
          className="arcade-padbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            move(1);
          }}
          aria-label="right"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
