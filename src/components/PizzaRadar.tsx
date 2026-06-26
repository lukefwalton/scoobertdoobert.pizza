import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// PizzaRadar (PIZZA RADAR 1996) — the "alien shooter": a green-phosphor radar
// defense in the grammar of the fixed-gun-vs-descending-invaders arcade game.
// Saucers march in formation across the scope, step down + speed up at each edge,
// and you sweep a turret along the bottom firing interceptors. Clear a wave for
// the next (faster) one; let a saucer reach the floor and the slice is lost.
//
// Original code + art (the GRAMMAR of the genre, never its assets) + own synth
// audio through the shared limiter (mute-aware, WCAG-safe — no strobe; the radar
// sweep is a slow soft line). Self-contained <canvas>, no three.js. Arrows / a
// pad / drag to move, space / tap / FIRE to shoot. Per-cabinet high score
// (arcadeHighs['pizza-radar']) = saucers downed.
// ───────────────────────────────────────────────────────────────────────────

const W = 320;
const H = 180;
const GAME_ID = 'pizza-radar';

const COLS = 6;
const ROWS = 3;
const BLIP_W = 18;
const BLIP_H = 11;
const GAP_X = 12;
const GAP_Y = 9;
const GRID_W = COLS * BLIP_W + (COLS - 1) * GAP_X;
const CANNON_Y = H - 12;
const LOSE_Y = CANNON_Y - 10; // a saucer this low = the slice falls
const CANNON_SPEED = 150; // px/sec
const BULLET_SPEED = 240;
const MAX_BULLETS = 3;

type Phase = 'ready' | 'playing' | 'over';
type Blip = { cx: number; cy: number; alive: boolean };

// Lay out a fresh formation near the top, centred horizontally.
function makeWave(): Blip[] {
  const x0 = (W - GRID_W) / 2 + BLIP_W / 2;
  const blips: Blip[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      blips.push({ cx: x0 + c * (BLIP_W + GAP_X), cy: 20 + r * (BLIP_H + GAP_Y), alive: true });
    }
  }
  return blips;
}

// Seconds between formation steps, given how many saucers survive + the wave: it
// speeds up as the formation thins (classic), and each wave starts brisker.
function marchInterval(alive: number, wave: number): number {
  const base = 0.6 - (wave - 1) * 0.07;
  return Math.max(0.08, Math.min(0.6, base) * (0.25 + alive / (COLS * ROWS)));
}

export function PizzaRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const best = useProgressStore((s) => s.arcadeHighs[GAME_ID] ?? 0);
  const recordArcadeHigh = useProgressStore((s) => s.recordArcadeHigh);

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);

  const game = useRef({
    phase: 'ready' as Phase,
    cannonX: W / 2,
    moveL: false,
    moveR: false,
    bullets: [] as { x: number; y: number }[],
    cooldown: 0,
    blips: makeWave(),
    dir: 1 as 1 | -1,
    march: 0,
    wave: 1,
    score: 0,
  });

  const start = () => {
    const g = game.current;
    g.phase = 'playing';
    g.cannonX = W / 2;
    g.moveL = g.moveR = false;
    g.bullets = [];
    g.cooldown = 0;
    g.blips = makeWave();
    g.dir = 1;
    g.march = 0;
    g.wave = 1;
    g.score = 0;
    setScore(0);
    setPhase('playing');
  };

  const fire = () => {
    const g = game.current;
    if (g.phase !== 'playing') {
      start();
      return;
    }
    if (g.cooldown > 0 || g.bullets.length >= MAX_BULLETS) return;
    g.bullets.push({ x: g.cannonX, y: CANNON_Y - 6 });
    g.cooldown = 0.28;
    audio.playTone(noteToFreq('A', 5), 90, 0.12); // a short "pew"
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = game.current;
    let raf = 0;
    let last = performance.now();
    let sweep = 0;

    const endGame = () => {
      g.phase = 'over';
      setPhase('over'); // surface the GAME OVER card (React state, not just the ref)
      recordArcadeHigh(GAME_ID, g.score);
      audio.playTone(noteToFreq('C', 2), 280, 0.18);
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      sweep = (sweep + dt * 0.6) % 1;

      if (g.phase === 'playing') {
        // turret
        if (g.moveL) g.cannonX -= CANNON_SPEED * dt;
        if (g.moveR) g.cannonX += CANNON_SPEED * dt;
        g.cannonX = Math.max(10, Math.min(W - 10, g.cannonX));
        if (g.cooldown > 0) g.cooldown -= dt;

        // formation march (stepped, not continuous)
        const aliveArr = g.blips.filter((b) => b.alive);
        g.march += dt;
        if (g.march >= marchInterval(aliveArr.length, g.wave)) {
          g.march = 0;
          const minX = Math.min(...aliveArr.map((b) => b.cx));
          const maxX = Math.max(...aliveArr.map((b) => b.cx));
          const hitEdge =
            (g.dir === 1 && maxX + BLIP_W / 2 >= W - 4) || (g.dir === -1 && minX - BLIP_W / 2 <= 4);
          if (hitEdge) {
            g.dir = (g.dir === 1 ? -1 : 1) as 1 | -1;
            for (const b of g.blips) b.cy += 7; // step DOWN + reverse
          } else {
            for (const b of g.blips) b.cx += g.dir * 8;
          }
          // a soft formation "tok" panned to the block centre
          audio.playChime(noteToFreq('E', 3), ((minX + maxX) / 2 / W) * 2 - 1, 0.05, 0.4);
          // a saucer reached the floor → the slice falls
          if (aliveArr.some((b) => b.cy >= LOSE_Y)) {
            endGame();
            raf = requestAnimationFrame(tick);
            return;
          }
        }

        // bullets
        for (const b of g.bullets) b.y -= BULLET_SPEED * dt;
        for (const b of g.bullets) {
          if (b.y > -4) {
            for (const blip of g.blips) {
              if (
                blip.alive &&
                Math.abs(b.x - blip.cx) <= BLIP_W / 2 &&
                Math.abs(b.y - blip.cy) <= BLIP_H / 2
              ) {
                blip.alive = false;
                b.y = -999; // mark spent
                g.score += 1;
                setScore(g.score);
                audio.playChime(noteToFreq('B', 5), (blip.cx / W) * 2 - 1, 0.14, 0.6);
                break;
              }
            }
          }
        }
        g.bullets = g.bullets.filter((b) => b.y > -4);

        // wave cleared → next, faster, with a small bonus chime
        if (!g.blips.some((b) => b.alive)) {
          g.wave += 1;
          g.blips = makeWave();
          g.dir = 1;
          g.march = 0;
          g.bullets = [];
          audio.playChime(noteToFreq('E', 6), 0, 0.16, 1.2);
        }
      }

      // ── draw: a green phosphor radar scope ──
      ctx.fillStyle = '#04140a';
      ctx.fillRect(0, 0, W, H);
      // faint grid
      ctx.strokeStyle = 'rgba(80,255,140,0.08)';
      ctx.lineWidth = 1;
      for (let x = 20; x < W; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 20; y < H; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      // a slow radar sweep line (soft, no flash — WCAG-safe)
      ctx.strokeStyle = 'rgba(120,255,170,0.10)';
      ctx.beginPath();
      ctx.moveTo(sweep * W, 0);
      ctx.lineTo(sweep * W, H);
      ctx.stroke();
      // the lose line
      ctx.strokeStyle = 'rgba(255,120,90,0.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, LOSE_Y + BLIP_H / 2);
      ctx.lineTo(W, LOSE_Y + BLIP_H / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // saucers (little green chevrons)
      for (const b of g.blips) {
        if (!b.alive) continue;
        ctx.fillStyle = '#76ff9e';
        ctx.beginPath();
        ctx.moveTo(b.cx, b.cy - BLIP_H / 2);
        ctx.lineTo(b.cx + BLIP_W / 2, b.cy + BLIP_H / 2);
        ctx.lineTo(b.cx - BLIP_W / 2, b.cy + BLIP_H / 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#04140a';
        ctx.fillRect(b.cx - 4, b.cy - 1, 8, 3); // a slit, so it reads as a craft
      }
      // bullets
      ctx.fillStyle = '#d6ffe6';
      for (const b of g.bullets) ctx.fillRect(b.x - 1, b.y - 4, 2, 6);
      // turret
      ctx.fillStyle = '#9effb6';
      ctx.fillRect(g.cannonX - 9, CANNON_Y, 18, 7);
      ctx.fillRect(g.cannonX - 2, CANNON_Y - 5, 4, 5);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard: ← → move (held), space/enter fire
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const g = game.current;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        g.moveL = true;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        g.moveR = true;
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        fire();
      }
    };
    const up = (e: KeyboardEvent) => {
      const g = game.current;
      if (e.key === 'ArrowLeft') g.moveL = false;
      if (e.key === 'ArrowRight') g.moveR = false;
    };
    // Losing window focus drops the keyup, so a held key could leave the turret
    // drifting forever — clear held movement on blur.
    const blur = () => {
      game.current.moveL = false;
      game.current.moveR = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test hook: a DETERMINISTIC loss — drop the live formation onto the floor line
  // and force a march, so the loop's OWN floor-breach check fires the real
  // game-over branch (endGame). shoot:games asserts the GAME OVER overlay + the
  // persisted high score off this. It's an ACTION hook (forces a loss), so — like
  // __sdpGoToRoom — it rides the STRICTER ?debug-only gate, NOT the wider
  // ?world/?debug test entrance, so a visitor on a guessable ?world can't call it.
  useEffect(() => {
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpRadarForceLose', () => {
      const g = game.current;
      if (g.phase !== 'playing') return;
      // Down a couple of saucers through the REAL scoring first, so the loss has a
      // non-zero score and the over-branch's recordArcadeHigh actually writes (the
      // smoke asserts that durable write, not just the overlay).
      for (const b of g.blips.filter((x) => x.alive).slice(0, 3)) {
        b.alive = false;
        g.score += 1;
      }
      setScore(g.score);
      for (const b of g.blips) if (b.alive) b.cy = LOSE_Y;
      g.march = 999; // force a march next frame → the floor-breach check ends it
    });
    return () => exposeTestGlobal('__sdpRadarForceLose', undefined);
  }, []);

  // drag the turret along the canvas; a tap (no drag) fires.
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const press = (clientX: number, rectLeft: number, rectW: number) => {
    const g = game.current;
    g.cannonX = Math.max(10, Math.min(W - 10, ((clientX - rectLeft) / rectW) * W));
  };

  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>HITS {String(score).padStart(4, '0')}</span>
        <span>HI {String(Math.max(best, score)).padStart(4, '0')}</span>
      </div>
      <div className="arcade-stage">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="arcade-canvas"
          onPointerDown={(e) => {
            e.preventDefault();
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            drag.current = { x: e.clientX, moved: false };
            if (game.current.phase === 'playing') press(e.clientX, r.left, r.width);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            if (Math.abs(e.clientX - drag.current.x) > 4) drag.current.moved = true;
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            if (game.current.phase === 'playing') press(e.clientX, r.left, r.width);
          }}
          onPointerUp={() => {
            const d = drag.current;
            drag.current = null;
            if (!d || !d.moved) fire(); // a tap fires / starts
          }}
          onPointerCancel={() => (drag.current = null)} // a stolen gesture doesn't strand a drag
        />
        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">PIZZA RADAR 1996</p>
            <p className="arcade-sub">incoming &middot; defend the slice</p>
            <p className="arcade-blink">▸ TAP / SPACE TO START</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title">GAME OVER</p>
            <p className="arcade-sub">
              {score} downed &middot; best {Math.max(best, score)}
            </p>
            <p className="arcade-blink">▸ TAP TO PLAY AGAIN</p>
          </div>
        )}
      </div>
      {/* ◀ FIRE ▶ — a shooter row for thumbs */}
      <div className="arcade-pad">
        <button
          type="button"
          className="arcade-padbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            game.current.moveL = true;
          }}
          onPointerUp={() => (game.current.moveL = false)}
          onPointerLeave={() => (game.current.moveL = false)}
          onPointerCancel={() => (game.current.moveL = false)}
          aria-label="left"
        >
          ◀
        </button>
        <button
          type="button"
          className="arcade-padbtn arcade-padbtn--fire"
          onPointerDown={(e) => {
            e.preventDefault();
            fire();
          }}
          aria-label="fire"
        >
          ◎
        </button>
        <button
          type="button"
          className="arcade-padbtn"
          onPointerDown={(e) => {
            e.preventDefault();
            game.current.moveR = true;
          }}
          onPointerUp={() => (game.current.moveR = false)}
          onPointerLeave={() => (game.current.moveR = false)}
          onPointerCancel={() => (game.current.moveR = false)}
          aria-label="right"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
