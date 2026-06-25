import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';

// ───────────────────────────────────────────────────────────────────────────
// Crusteroids — Asteroids, pizza-mode. Pilot a pizza-slice ship through a drift of
// floating crusts; shoot one and it splits into smaller crusts. Original code +
// art (the grammar of Asteroids, not its assets). Self-contained <canvas>, no
// three.js. Keyboard (arrows + space) on desktop; an on-screen ◀ ▶ THRUST FIRE pad
// for touch. Mute-aware blips through the limiter (WCAG-safe). Per-cabinet high
// score (arcadeHighs['crusteroids']). Screen-wrap, 3 lives, escalating waves.
// ───────────────────────────────────────────────────────────────────────────

const W = 320;
const H = 180; // matches the arcade stage aspect (320/180) so nothing squishes
const GAME_ID = 'crusteroids';
const SHIP_R = 7;
const TURN = 3.4; // rad/s
const THRUST = 150; // px/s^2
const FRICTION = 0.6; // velocity damping per second
const BULLET_SPEED = 240;
const BULLET_LIFE = 0.9;
const FIRE_COOLDOWN = 0.22;

type Phase = 'ready' | 'playing' | 'over';
type Vec = { x: number; y: number };
type Roid = Vec & {
  vx: number;
  vy: number;
  r: number;
  size: 1 | 2 | 3;
  spin: number;
  rot: number;
  dead?: boolean;
};
type Bullet = Vec & { vx: number; vy: number; life: number };

const wrap = (v: number, max: number) => (v < 0 ? v + max : v >= max ? v - max : v);

function spawnWave(n: number): Roid[] {
  const out: Roid[] = [];
  for (let i = 0; i < n; i++) {
    // around the edges, away from the centre ship
    const edge = Math.floor(Math.random() * 4);
    const x = edge === 1 ? W - 4 : edge === 3 ? 4 : Math.random() * W;
    const y = edge === 0 ? 4 : edge === 2 ? H - 4 : Math.random() * H;
    const a = Math.random() * Math.PI * 2;
    const sp = 22 + Math.random() * 26;
    out.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      r: 18,
      size: 3,
      spin: (Math.random() * 2 - 1) * 1.5,
      rot: 0,
    });
  }
  return out;
}

export function Crusteroids() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const best = useProgressStore((s) => s.arcadeHighs[GAME_ID] ?? 0);
  const recordArcadeHigh = useProgressStore((s) => s.recordArcadeHigh);

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);

  const game = useRef({
    sx: W / 2,
    sy: H / 2,
    sa: -Math.PI / 2, // facing up
    svx: 0,
    svy: 0,
    roids: [] as Roid[],
    bullets: [] as Bullet[],
    score: 0,
    lives: 3,
    wave: 1,
    cool: 0,
    invuln: 0, // brief safety after a respawn
    phase: 'ready' as Phase,
    left: false,
    right: false,
    thrust: false,
    fire: false,
  });

  const start = () => {
    const g = game.current;
    g.sx = W / 2;
    g.sy = H / 2;
    g.sa = -Math.PI / 2;
    g.svx = 0;
    g.svy = 0;
    g.roids = spawnWave(4);
    g.bullets = [];
    g.score = 0;
    g.lives = 3;
    g.wave = 1;
    g.cool = 0;
    g.invuln = 1.2;
    g.phase = 'playing';
    setScore(0);
    setLives(3);
    setPhase('playing');
  };

  const fireNow = () => {
    const g = game.current;
    if (g.cool > 0) return;
    g.cool = FIRE_COOLDOWN;
    g.bullets.push({
      x: g.sx + Math.cos(g.sa) * SHIP_R,
      y: g.sy + Math.sin(g.sa) * SHIP_R,
      vx: Math.cos(g.sa) * BULLET_SPEED + g.svx,
      vy: Math.sin(g.sa) * BULLET_SPEED + g.svy,
      life: BULLET_LIFE,
    });
    audio.playTone(noteToFreq('G', 5), 50, 0.1);
  };

  const tap = () => {
    if (game.current.phase !== 'playing') start();
    else fireNow();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const g = game.current;
    let raf = 0;
    let last = performance.now();

    // Score + spawn two smaller crusts from a hit roid (reads its CURRENT size).
    const splitRoid = (r: Roid) => {
      g.score += r.size === 3 ? 20 : r.size === 2 ? 50 : 100;
      audio.playTone(noteToFreq(r.size === 3 ? 'C' : r.size === 2 ? 'E' : 'A', 3), 90, 0.16);
      if (r.size > 1) {
        const childSize = (r.size - 1) as 1 | 2;
        for (let k = 0; k < 2; k++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 30 + Math.random() * 30;
          g.roids.push({
            x: r.x,
            y: r.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            r: r.size === 3 ? 11 : 6,
            size: childSize,
            spin: (Math.random() * 2 - 1) * 2,
            rot: 0,
          });
        }
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (g.phase === 'playing') {
        if (g.left) g.sa -= TURN * dt;
        if (g.right) g.sa += TURN * dt;
        if (g.thrust) {
          g.svx += Math.cos(g.sa) * THRUST * dt;
          g.svy += Math.sin(g.sa) * THRUST * dt;
        }
        const damp = Math.max(0, 1 - FRICTION * dt);
        g.svx *= damp;
        g.svy *= damp;
        g.sx = wrap(g.sx + g.svx * dt, W);
        g.sy = wrap(g.sy + g.svy * dt, H);
        g.cool = Math.max(0, g.cool - dt);
        g.invuln = Math.max(0, g.invuln - dt);
        if (g.fire) fireNow();

        for (const b of g.bullets) {
          b.x = wrap(b.x + b.vx * dt, W);
          b.y = wrap(b.y + b.vy * dt, H);
          b.life -= dt;
        }
        g.bullets = g.bullets.filter((b) => b.life > 0);

        for (const r of g.roids) {
          r.x = wrap(r.x + r.vx * dt, W);
          r.y = wrap(r.y + r.vy * dt, H);
          r.rot += r.spin * dt;
        }

        // bullet → roid: split the one that's hit (reads its real size first),
        // then mark it dead and sweep. break before the just-spawned children so
        // the same bullet can't chain through them.
        for (const b of g.bullets) {
          for (const r of g.roids) {
            if (r.dead) continue;
            if ((b.x - r.x) ** 2 + (b.y - r.y) ** 2 < r.r * r.r) {
              b.life = 0;
              splitRoid(r);
              r.dead = true;
              break;
            }
          }
        }
        g.roids = g.roids.filter((r) => !r.dead);

        // ship → roid
        if (g.invuln <= 0) {
          for (const r of g.roids) {
            if ((g.sx - r.x) ** 2 + (g.sy - r.y) ** 2 < (r.r + SHIP_R) ** 2) {
              g.lives -= 1;
              setLives(g.lives);
              audio.playTone(noteToFreq('C', 2), 260, 0.18);
              if (g.lives <= 0) {
                g.phase = 'over';
                const final = Math.floor(g.score);
                setScore(final);
                recordArcadeHigh(GAME_ID, final);
              } else {
                g.sx = W / 2;
                g.sy = H / 2;
                g.svx = 0;
                g.svy = 0;
                g.invuln = 1.4;
              }
              break;
            }
          }
        }

        if (g.roids.length === 0) {
          g.wave += 1;
          g.score += 40;
          g.roids = spawnWave(3 + g.wave);
          g.invuln = 1;
        }
        setScore((p) => (p === Math.floor(g.score) ? p : Math.floor(g.score)));
      }

      // ── draw ──
      ctx.fillStyle = '#070710';
      ctx.fillRect(0, 0, W, H);
      // roids (lumpy crust circles)
      ctx.strokeStyle = '#caa46a';
      ctx.lineWidth = 1.5;
      for (const r of g.roids) {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.beginPath();
        const pts = 9;
        for (let i = 0; i <= pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const rr = r.r * (0.82 + 0.18 * Math.sin(i * 2.3));
          const x = Math.cos(a) * rr;
          const y = Math.sin(a) * rr;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      // bullets
      ctx.fillStyle = '#ffe08a';
      for (const b of g.bullets) ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
      // ship (a pizza-slice triangle); blink while invulnerable
      if (g.phase !== 'over' && (g.invuln <= 0 || Math.floor(performance.now() / 100) % 2 === 0)) {
        ctx.save();
        ctx.translate(g.sx, g.sy);
        ctx.rotate(g.sa);
        ctx.fillStyle = '#ffcf4d';
        ctx.beginPath();
        ctx.moveTo(SHIP_R + 2, 0);
        ctx.lineTo(-SHIP_R, -SHIP_R * 0.7);
        ctx.lineTo(-SHIP_R * 0.5, 0);
        ctx.lineTo(-SHIP_R, SHIP_R * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#c7402f';
        ctx.fillRect(-2, -2, 2, 2);
        if (g.thrust) {
          ctx.fillStyle = '#ff7a3a';
          ctx.beginPath();
          ctx.moveTo(-SHIP_R, 0);
          ctx.lineTo(-SHIP_R - 5, -2);
          ctx.lineTo(-SHIP_R - 5, 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const set = (e: KeyboardEvent, down: boolean) => {
      const g = game.current;
      switch (e.key) {
        case 'ArrowLeft':
          g.left = down;
          break;
        case 'ArrowRight':
          g.right = down;
          break;
        case 'ArrowUp':
          g.thrust = down;
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (down) tap();
          break;
        default:
          return;
      }
    };
    const dn = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', dn);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A held touch control: sets a game flag true while pressed.
  const hold = (key: 'left' | 'right' | 'thrust') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      if (game.current.phase !== 'playing') start();
      game.current[key] = true;
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      game.current[key] = false;
    },
    onPointerLeave: () => {
      game.current[key] = false;
    },
  });

  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>SCORE {String(score).padStart(5, '0')}</span>
        <span>▲{lives}</span>
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
            tap();
          }}
        />
        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">CRUSTEROIDS</p>
            <p className="arcade-sub">turn &middot; thrust &middot; blast the crusts</p>
            <p className="arcade-blink">▸ TAP TO START</p>
          </div>
        )}
        {phase === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title">GAME OVER</p>
            <p className="arcade-sub">
              {score} pts &middot; best {Math.max(best, score)}
            </p>
            <p className="arcade-blink">▸ TAP TO FLY AGAIN</p>
          </div>
        )}
      </div>
      {/* touch pad — rotate / thrust / fire (the screen tap also fires) */}
      <div className="arcade-pad">
        <button type="button" className="arcade-padbtn" {...hold('left')} aria-label="turn left">
          ◀
        </button>
        <button type="button" className="arcade-padbtn" {...hold('right')} aria-label="turn right">
          ▶
        </button>
        <button type="button" className="arcade-padbtn" {...hold('thrust')} aria-label="thrust">
          ▲
        </button>
        <button
          type="button"
          className="arcade-padbtn arcade-padbtn--fire"
          onPointerDown={(e) => {
            e.preventDefault();
            tap();
          }}
          aria-label="fire"
        >
          ◉
        </button>
      </div>
    </div>
  );
}
