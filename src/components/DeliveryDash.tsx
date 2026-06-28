import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// DeliveryDash (DELIVERY DASH) — the "cross the traffic" cabinet: hop a pizza
// scooter up across lanes of late-90s traffic to the door at the top, hand off
// the pie, and start again a notch faster. Get clipped by a car → the pizza's on
// the asphalt (game over). The grammar of the cross-the-road genre, never its
// assets: own vehicles + scooter + name, own synth audio through the shared
// limiter (mute-aware, WCAG-safe — no strobe). Self-contained <canvas>, no
// three.js. Arrows / a ◀▲▼▶ pad to hop; per-cabinet high score
// (arcadeHighs['delivery-dash']) = pizzas delivered × 100 + forward hops.
// ───────────────────────────────────────────────────────────────────────────

const W = 320;
const H = 180;
const ROWS = 7; // row 0 = bottom curb (safe), 1..5 = traffic, 6 = the door (goal)
const LANE_H = H / ROWS;
const STEP = 20; // horizontal hop distance
const PLAYER_W = 14;
const CAR_W = 34;
const CAR_H = LANE_H * 0.62;
const GAME_ID = 'delivery-dash';

type Phase = 'ready' | 'playing' | 'over';
type Car = { x: number };
type Lane = { dir: 1 | -1; speed: number; cars: Car[]; color: string };

// Lane center Y for a row (row 0 at the bottom, row 6 at the top).
const rowY = (row: number) => H - LANE_H * (row + 0.5);

const CAR_COLORS = ['#c7402f', '#e2a13b', '#5a6cc4', '#7a9e3a', '#b8348f'];

export function DeliveryDash() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const best = useProgressStore((s) => s.arcadeHighs[GAME_ID] ?? 0);
  const recordArcadeHigh = useProgressStore((s) => s.recordArcadeHigh);

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);

  const game = useRef({
    phase: 'ready' as Phase,
    px: W / 2, // player x (pixel center)
    row: 0, // player row (0 bottom → 6 goal)
    topReached: 0, // furthest row this trip (for forward-hop points)
    lanes: [] as Lane[],
    score: 0,
    delivered: 0,
    spawnT: 0,
  });

  // Build the 5 traffic lanes (rows 1..5), alternating direction, faster higher up.
  const buildLanes = (difficulty: number): Lane[] =>
    Array.from({ length: 5 }, (_, i) => {
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const speed = 34 + i * 12 + difficulty * 8;
      const n = 2 + ((i + difficulty) % 2); // 2–3 cars per lane
      const gap = W / n;
      const cars = Array.from({ length: n }, (_, k) => ({ x: k * gap + ((i * 13) % gap) }));
      return { dir, speed, cars, color: CAR_COLORS[i % CAR_COLORS.length] };
    });

  const start = () => {
    const g = game.current;
    g.px = W / 2;
    g.row = 0;
    g.topReached = 0;
    g.lanes = buildLanes(0);
    g.score = 0;
    g.delivered = 0;
    g.phase = 'playing';
    setScore(0);
    setPhase('playing');
  };

  const endGame = () => {
    const g = game.current;
    g.phase = 'over';
    setPhase('over'); // surface the PIZZA DROPPED card (React state, not just the ref)
    recordArcadeHigh(GAME_ID, g.score);
    audio.playTone(noteToFreq('C', 2), 280, 0.18); // a sad low splat
  };

  // A pizza delivered: score, speed up (a fresh, faster lane set), back to the curb.
  const deliver = () => {
    const g = game.current;
    g.delivered += 1;
    g.score += 100;
    g.row = 0;
    g.topReached = 0;
    g.px = W / 2;
    g.lanes = buildLanes(g.delivered);
    setScore(g.score);
    // a little ascending "order up!" arpeggio
    ['C', 'E', 'G'].forEach((nt, i) =>
      window.setTimeout(() => audio.playChime(noteToFreq(nt, 5), 0, 0.13, 0.7), i * 70),
    );
  };

  const hop = (dRow: number, dx: number) => {
    const g = game.current;
    // Idle / game-over: the first hop input (arrow OR the ◀▲▼▶ pad) starts a fresh
    // run, consumed as the start — so the standalone mobile cabinet is fully
    // operable from the controls it advertises, not just a canvas tap.
    if (g.phase !== 'playing') {
      start();
      return;
    }
    if (dx !== 0) {
      g.px = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, g.px + dx));
      audio.playTone(noteToFreq('A', 4), 45, 0.08);
    }
    if (dRow !== 0) {
      const next = Math.max(0, Math.min(ROWS - 1, g.row + dRow));
      if (next !== g.row) {
        g.row = next;
        audio.playTone(noteToFreq(dRow > 0 ? 'E' : 'C', 4), 45, 0.08);
      }
      if (g.row === ROWS - 1) {
        deliver(); // reached the door
        return;
      }
      // forward-progress points: a few points the first time you reach a new row
      if (g.row > g.topReached) {
        g.topReached = g.row;
        g.score += 5;
        setScore(g.score);
      }
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
        // move cars; wrap around the screen
        for (const lane of g.lanes) {
          for (const car of lane.cars) {
            car.x += lane.dir * lane.speed * dt;
            if (car.x > W + CAR_W) car.x = -CAR_W;
            if (car.x < -CAR_W) car.x = W + CAR_W;
          }
        }
        // collision: only in a traffic row (1..5); the lane IS the player's row, so
        // a horizontal (x) overlap with any car in it is a hit.
        if (g.row >= 1 && g.row <= 5) {
          const lane = g.lanes[g.row - 1];
          for (const car of lane.cars) {
            if (g.px + PLAYER_W / 2 > car.x && g.px - PLAYER_W / 2 < car.x + CAR_W) {
              endGame();
              break;
            }
          }
        }
      }

      // ── draw ──
      // grass curb (bottom) + door strip (top)
      ctx.fillStyle = '#2f4a2a';
      ctx.fillRect(0, 0, W, H);
      // asphalt for the traffic band
      ctx.fillStyle = '#23242a';
      ctx.fillRect(0, rowY(5) - LANE_H / 2, W, LANE_H * 5);
      // dashed lane dividers
      ctx.strokeStyle = 'rgba(255,210,140,0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      for (let r = 1; r <= 4; r++) {
        const y = rowY(r) - LANE_H / 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // the door (goal) — a little house with a pizza sign
      ctx.fillStyle = '#caa15a';
      ctx.fillRect(W / 2 - 16, rowY(6) - 9, 32, 18);
      ctx.fillStyle = '#c7402f';
      ctx.fillRect(W / 2 - 6, rowY(6) - 4, 12, 12);

      // cars
      for (let i = 0; i < g.lanes.length; i++) {
        const lane = g.lanes[i];
        const y = rowY(i + 1) - CAR_H / 2;
        for (const car of lane.cars) {
          ctx.fillStyle = lane.color;
          ctx.fillRect(car.x, y, CAR_W, CAR_H);
          // windshield, so they read as cars facing their direction
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          const wx = lane.dir > 0 ? car.x + CAR_W - 9 : car.x + 3;
          ctx.fillRect(wx, y + 2, 6, CAR_H - 4);
        }
      }

      // the scooter pizza-courier (a yellow box + a red slice triangle)
      const py = rowY(g.row);
      ctx.fillStyle = '#ffce4d';
      ctx.fillRect(g.px - PLAYER_W / 2, py - PLAYER_W / 2, PLAYER_W, PLAYER_W);
      ctx.fillStyle = '#c7402f';
      ctx.beginPath();
      ctx.moveTo(g.px, py - 5);
      ctx.lineTo(g.px - 4, py + 3);
      ctx.lineTo(g.px + 4, py + 3);
      ctx.closePath();
      ctx.fill();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard: arrows hop; space/enter (re)starts from a title/over card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = game.current;
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          hop(1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          hop(-1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          hop(0, -STEP);
          break;
        case 'ArrowRight':
          e.preventDefault();
          hop(0, STEP);
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (g.phase !== 'playing') start();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test hook: a DETERMINISTIC loss — seed a non-zero score (forward hops aren't
  // deterministically forceable here) so the over-branch's recordArcadeHigh writes,
  // then drive the REAL game-over path. ACTION hook → stricter ?debug-only gate.
  useEffect(() => {
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpDashForceLose', () => {
      const g = game.current;
      if (g.phase !== 'playing') return;
      g.score = 5;
      setScore(5);
      endGame();
    });
    return () => exposeTestGlobal('__sdpDashForceLose', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test hook: drive the REAL successful-delivery branch (reach the door → +100,
  // reset to the curb, rebuild faster lanes) so the speed-up/reset logic has
  // deterministic coverage, not just manual play. ACTION hook → ?debug-only.
  useEffect(() => {
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpDashDeliver', () => {
      if (game.current.phase === 'playing') deliver();
    });
    return () => exposeTestGlobal('__sdpDashDeliver', undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test hook (READ-ONLY): report the run state so the smoke can assert the
  // delivery branch (score +100, row reset to the curb, lane speed bumped). `speed`
  // is lane 0's current speed (34 + delivered*8 by construction) — a deterministic
  // witness for the speed-up. Read-only → the wider ?world/?debug entrance.
  useEffect(() => {
    exposeTestGlobal('__sdpDashState', () => {
      const g = game.current;
      return {
        phase: g.phase,
        score: g.score,
        row: g.row,
        delivered: g.delivered,
        speed: g.lanes[0]?.speed ?? 0,
      };
    });
    return () => exposeTestGlobal('__sdpDashState', undefined);
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
          width={W}
          height={H}
          className="arcade-canvas"
          onPointerDown={(e) => {
            e.preventDefault();
            if (game.current.phase !== 'playing') start();
          }}
        />
        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">DELIVERY DASH</p>
            <p className="arcade-sub">hop across the traffic &middot; get the pie to the door</p>
            <p className="arcade-blink">▸ TAP TO START</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title">PIZZA DROPPED</p>
            <p className="arcade-sub">
              {score} pts &middot; best {Math.max(best, score)}
            </p>
            <p className="arcade-blink">▸ TAP TO PLAY AGAIN</p>
          </div>
        )}
      </div>
      {/* ◀ ▲ ▼ ▶ — discrete hops (left / forward / back / right), mirror the arrows. */}
      <div className="arcade-pad">
        <button
          type="button"
          className="arcade-padbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            hop(0, -STEP);
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
            hop(1, 0);
          }}
          aria-label="up"
        >
          ▲
        </button>
        <button
          type="button"
          className="arcade-padbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            hop(-1, 0);
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
            hop(0, STEP);
          }}
          aria-label="right"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
