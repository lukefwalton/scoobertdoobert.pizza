import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { announce } from '../state/toastStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// GhostKartBattle — おばけグランプリ / GHOST GRAND PRIX. A top-down balloon
// battle (Mario-Kart battle-mode grammar, original art) fought in the Grassrooms'
// white-pillar arena: a Block Fort of white blocks on grass, blue wildflowers
// dotted about. You drive a little PIZZA-DELIVERY kart; a friendly GHOST (おばけ)
// floats the arena and lobs spooky pizzas at you.
//
// THE RULES: each racer carries 3 BALLOONS. Throw a pizza (SPACE) to pop the
// ghost's; dodge its throws to keep yours. Pop all 3 of the ghost's → you WIN.
//
// TASTE GUARDRAIL (hard): a fully SWEET, non-traumatic bout. The ghost is cute
// and cheers either way; LOSING is an anticlimax — it just giggles "boo! rematch?"
// (no game-over screen of doom, same spirit as the dice-monster). WINNING is the
// reward: a sealed luck + the clear is remembered (progressStore.clearGame). No
// strobe, no full-field flash — hit feedback is a brief, small tint (WCAG 2.3.1);
// all audio is mute-aware + voice-capped through the shared engine.
//
// Self-contained <canvas> + 2D context (no three.js), touch-first (on-screen
// drive pad + a throw button), so it loads light and rides the same modal chrome
// the other in-world minigames use (ArcadeModal).
// ───────────────────────────────────────────────────────────────────────────

// Logical canvas size — drawn here, upscaled with pixelated CSS for the crunch.
const W = 320;
const H = 240;
const BALLOONS = 3;
const KART_R = 9; // collision radius for both racers + a thrown pizza's target

type Phase = 'ready' | 'playing' | 'won' | 'lost';
type Vec = { x: number; y: number };
type Proj = { x: number; y: number; vx: number; vy: number; owner: 'you' | 'ghost'; life: number };

// The white arena blocks (a Block Fort): [x, y, w, h] in logical px. Hand-placed
// to leave lanes to weave through. Pure data so the draw + collision share it.
const BLOCKS: [number, number, number, number][] = [
  [70, 60, 26, 26],
  [224, 60, 26, 26],
  [147, 50, 26, 26],
  [70, 154, 26, 26],
  [224, 154, 26, 26],
  [147, 164, 26, 26],
  [120, 108, 26, 26],
  [174, 108, 26, 26],
];

/** A thrown pizza hits a racer when their centres are within `r` (and it isn't the
 *  thrower's own). Pure + exported so the smoke can assert the hit geometry. */
export function projectileHits(
  p: Pick<Proj, 'x' | 'y' | 'owner'>,
  target: Vec,
  r = KART_R,
): boolean {
  return Math.hypot(p.x - target.x, p.y - target.y) <= r;
}

/** Decide the bout from the balloon counts: whoever hits 0 first loses. Pure +
 *  exported (the smoke forces an end state through it). */
export function decideWinner(youBalloons: number, ghostBalloons: number): Phase | null {
  if (ghostBalloons <= 0) return 'won';
  if (youBalloons <= 0) return 'lost';
  return null;
}

// Axis-aligned: is point (px,py) within `pad` of any arena block? (Karts collide;
// the ghost floats THROUGH blocks — it's a ghost — so this only gates the kart.)
function hitsBlock(px: number, py: number, pad: number): boolean {
  for (const [bx, by, bw, bh] of BLOCKS) {
    if (px > bx - pad && px < bx + bw + pad && py > by - pad && py < by + bh + pad) return true;
  }
  return false;
}

export function GhostKartBattle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [you, setYou] = useState(BALLOONS);
  const [ghost, setGhost] = useState(BALLOONS);

  // Held controls (keyboard + the on-screen pad both write here).
  const keys = useRef({ up: false, down: false, left: false, right: false, throw: false });

  // The mutable world lives in a ref so the rAF loop reads/writes without a
  // re-render every frame; React state only mirrors the coarse phase + balloons.
  const g = useRef({
    phase: 'ready' as Phase,
    you: { x: 60, y: 200, a: -Math.PI / 2, spd: 0, balloons: BALLOONS, hurt: 0 },
    ghost: {
      x: 260,
      y: 40,
      a: 0,
      spd: 0,
      balloons: BALLOONS,
      hurt: 0,
      throwT: 1.6,
      tx: 260,
      ty: 40,
    },
    proj: [] as Proj[],
    throwCd: 0,
  });

  const start = () => {
    const s = g.current;
    s.you = { x: 60, y: 200, a: -Math.PI / 2, spd: 0, balloons: BALLOONS, hurt: 0 };
    s.ghost = {
      x: 260,
      y: 40,
      a: 0,
      spd: 0,
      balloons: BALLOONS,
      hurt: 0,
      throwT: 1.6,
      tx: 260,
      ty: 40,
    };
    s.proj = [];
    s.throwCd = 0;
    s.phase = 'playing';
    setYou(BALLOONS);
    setGhost(BALLOONS);
    setPhase('playing');
  };

  // Fire your pizza forward (rate-limited). Shared by SPACE + the throw button.
  const tryThrow = () => {
    const s = g.current;
    if (s.phase !== 'playing' || s.throwCd > 0) return;
    s.throwCd = 0.5;
    const sp = 150;
    s.proj.push({
      x: s.you.x + Math.cos(s.you.a) * 12,
      y: s.you.y + Math.sin(s.you.a) * 12,
      vx: Math.cos(s.you.a) * sp,
      vy: Math.sin(s.you.a) * sp,
      owner: 'you',
      life: 1.8,
    });
    audio.playTone(noteToFreq('A', 4), 90, 0.16); // a little "fwip" (mute-aware)
  };

  // Apply a hit to a racer: pop a balloon, brief spin-out + invulnerability, ring
  // a note (pop pitch climbs as balloons fall — exploration's reward is sound).
  const popBalloon = (who: 'you' | 'ghost') => {
    const s = g.current;
    const r = who === 'you' ? s.you : s.ghost;
    if (r.hurt > 0 || r.balloons <= 0) return;
    r.balloons -= 1;
    r.hurt = 1.0; // ~1s of spin-out + i-frames (the brief, gentle hit feedback)
    const note = ['C', 'E', 'G', 'C'][Math.min(3, BALLOONS - r.balloons)];
    audio.playChime(noteToFreq(note, who === 'you' ? 4 : 5), who === 'you' ? -0.3 : 0.3, 0.14);
    if (who === 'you') setYou(r.balloons);
    else setGhost(r.balloons);
    const end = decideWinner(s.you.balloons, s.ghost.balloons);
    if (end) finish(end);
  };

  const rewarded = useRef(false);
  const finish = (end: Phase) => {
    const s = g.current;
    s.phase = end;
    setPhase(end);
    if (end === 'won') {
      // The reward — a sealed bit of luck + the clear remembered (once). Sweet,
      // bilingual toast; an ascending sparkle the music way.
      if (!rewarded.current) {
        rewarded.current = true;
        const p = useProgressStore.getState();
        p.clearGame('ghost-kart');
        p.gainLuck(2);
        announce('🏁 you beat the ghost! ゴーストに勝った！ +2 luck', 'luck');
      }
      ['C', 'E', 'G'].forEach((n, i) =>
        window.setTimeout(() => audio.playChime(noteToFreq(n, 5), 0, 0.16), i * 110),
      );
    } else {
      // Anticlimax (taste guardrail): the ghost just giggles, no doom.
      announce('👻 boo! the ghost got you — rematch? もういっかい？', 'info');
      audio.playTone(noteToFreq('E', 2), 220, 0.18);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    const s = g.current;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (s.phase === 'playing') {
        s.throwCd = Math.max(0, s.throwCd - dt);
        if (keys.current.throw) tryThrow();

        // ── your kart (top-down arcade driving) ──
        const k = s.you;
        const accel = 220;
        const turn = 2.8;
        if (keys.current.up) k.spd += accel * dt;
        if (keys.current.down) k.spd -= accel * dt;
        k.spd *= 1 - 1.8 * dt; // friction
        k.spd = Math.max(-70, Math.min(150, k.spd));
        if (Math.abs(k.spd) > 4) {
          const dir = k.spd > 0 ? 1 : -1;
          if (keys.current.left) k.a -= turn * dt * dir;
          if (keys.current.right) k.a += turn * dt * dir;
        }
        if (k.hurt > 0) {
          k.hurt -= dt;
          k.a += 9 * dt; // a comic spin-out
          k.spd *= 0.9;
        }
        const nx = k.x + Math.cos(k.a) * k.spd * dt;
        const ny = k.y + Math.sin(k.a) * k.spd * dt;
        if (nx > 10 && nx < W - 10 && !hitsBlock(nx, k.y, 10)) k.x = nx;
        else k.spd *= -0.3;
        if (ny > 10 && ny < H - 10 && !hitsBlock(k.x, ny, 10)) k.y = ny;
        else k.spd *= -0.3;

        // ── the ghost (floats through walls; wanders + lobs at you) ──
        const gh = s.ghost;
        if (gh.hurt > 0) gh.hurt -= dt;
        // pick a new drift target now and then, biased to keep its distance
        if (Math.hypot(gh.x - gh.tx, gh.y - gh.ty) < 14 || Math.random() < 0.01) {
          gh.tx = 30 + Math.random() * (W - 60);
          gh.ty = 24 + Math.random() * (H - 80);
        }
        const ga = Math.atan2(gh.ty - gh.y, gh.tx - gh.x);
        const gsp = gh.hurt > 0 ? 30 : 70;
        gh.x += Math.cos(ga) * gsp * dt;
        gh.y += Math.sin(ga) * gsp * dt;
        gh.throwT -= dt;
        if (gh.throwT <= 0 && gh.hurt <= 0) {
          gh.throwT = 1.6 + Math.random() * 1.2;
          const aim = Math.atan2(k.y - gh.y, k.x - gh.x);
          const sp = 120;
          s.proj.push({
            x: gh.x,
            y: gh.y,
            vx: Math.cos(aim) * sp,
            vy: Math.sin(aim) * sp,
            owner: 'ghost',
            life: 2.2,
          });
        }

        // ── projectiles ──
        for (const p of s.proj) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.owner === 'you' && projectileHits(p, gh)) {
            p.life = 0;
            popBalloon('ghost');
          } else if (p.owner === 'ghost' && projectileHits(p, k)) {
            p.life = 0;
            popBalloon('you');
          }
        }
        s.proj = s.proj.filter(
          (p) => p.life > 0 && p.x > -8 && p.x < W + 8 && p.y > -8 && p.y < H + 8,
        );
      }

      // ── draw ──
      ctx.fillStyle = '#5c7f3a'; // grass field
      ctx.fillRect(0, 0, W, H);
      // a few blue wildflowers
      ctx.fillStyle = '#5a6cf0';
      for (let i = 0; i < 22; i++) {
        const fx = (i * 73) % W;
        const fy = (i * 131) % H;
        ctx.fillRect(fx, fy, 2, 2);
      }
      // arena blocks (white office bones)
      for (const [bx, by, bw, bh] of BLOCKS) {
        ctx.fillStyle = '#eef1ec';
        ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = '#cfd4c8';
        ctx.fillRect(bx, by + bh - 3, bw, 3);
      }

      // projectiles
      for (const p of s.proj) {
        ctx.fillStyle = p.owner === 'you' ? '#ffce4d' : '#cdb8ff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      drawKart(ctx, s.you, '#ffce4d', '#c7402f');
      drawGhost(ctx, s.ghost);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smoke hooks (?debug / ?world only): the pure hit/winner helpers + a force-end
  // so shoot:grassrooms can drive a real WIN (and its reward) without the AI.
  useEffect(() => {
    exposeTestGlobal('__sdpKartHits', projectileHits);
    exposeTestGlobal('__sdpKartWinner', decideWinner);
    exposeTestGlobal('__sdpKartForce', (end: 'won' | 'lost') => {
      if (g.current.phase !== 'playing') start();
      finish(end);
    });
    return () => {
      exposeTestGlobal('__sdpKartHits', undefined);
      exposeTestGlobal('__sdpKartWinner', undefined);
      exposeTestGlobal('__sdpKartForce', undefined);
    };
  }, []);

  // Keyboard: arrows / WASD drive, Space throws, Enter (re)starts.
  useEffect(() => {
    const set = (e: KeyboardEvent, down: boolean) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          keys.current.up = down;
          break;
        case 'ArrowDown':
        case 's':
          keys.current.down = down;
          break;
        case 'ArrowLeft':
        case 'a':
          keys.current.left = down;
          break;
        case 'ArrowRight':
        case 'd':
          keys.current.right = down;
          break;
        case ' ':
          keys.current.throw = down;
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && g.current.phase !== 'playing') start();
      set(e, true);
    };
    const onUp = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const hold = (k: keyof typeof keys.current, v: boolean) => () => {
    keys.current[k] = v;
  };

  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>YOU {'🎈'.repeat(you) || '—'}</span>
        <span>👻 {'🎈'.repeat(ghost) || '—'}</span>
      </div>

      <div className="arcade-stage">
        <canvas ref={canvasRef} width={W} height={H} className="arcade-canvas" />

        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">GHOST GRAND PRIX</p>
            <p className="arcade-sub">おばけグランプリ — pop the ghost&rsquo;s balloons</p>
            <p className="arcade-sub">drive: arrows / WASD &middot; throw: space</p>
            <p className="arcade-blink">▸ PRESS ENTER TO START</p>
          </div>
        )}
        {phase === 'won' && (
          <div className="arcade-overlay">
            <p className="arcade-title">YOU WIN! しょうり！</p>
            <p className="arcade-sub">the ghost throws confetti for you</p>
            <p className="arcade-blink">▸ ENTER TO RACE AGAIN</p>
          </div>
        )}
        {phase === 'lost' && (
          <div className="arcade-overlay">
            <p className="arcade-title">BOO! おばけのかち</p>
            <p className="arcade-sub">the ghost giggles — no harm done, rematch?</p>
            <p className="arcade-blink">▸ ENTER TO RACE AGAIN</p>
          </div>
        )}
      </div>

      {/* touch controls: a drive pad (◀▲▼▶) + a throw button. Reuses the shared
          arcade pad styling — keyboard play uses arrows/WASD; these mirror them. */}
      <div className="arcade-pad">
        <button
          type="button"
          className="arcade-padbtn"
          aria-label="turn left"
          onPointerDown={hold('left', true)}
          onPointerUp={hold('left', false)}
          onPointerLeave={hold('left', false)}
        >
          ◀
        </button>
        <button
          type="button"
          className="arcade-padbtn"
          aria-label="accelerate"
          onPointerDown={hold('up', true)}
          onPointerUp={hold('up', false)}
          onPointerLeave={hold('up', false)}
        >
          ▲
        </button>
        <button
          type="button"
          className="arcade-padbtn"
          aria-label="reverse"
          onPointerDown={hold('down', true)}
          onPointerUp={hold('down', false)}
          onPointerLeave={hold('down', false)}
        >
          ▼
        </button>
        <button
          type="button"
          className="arcade-padbtn"
          aria-label="turn right"
          onPointerDown={hold('right', true)}
          onPointerUp={hold('right', false)}
          onPointerLeave={hold('right', false)}
        >
          ▶
        </button>
        <button
          type="button"
          className="arcade-padbtn arcade-padbtn--fire"
          aria-label={phase === 'playing' ? 'throw pizza' : 'start'}
          onPointerDown={(e) => {
            e.preventDefault();
            if (phase === 'playing') tryThrow();
            else start();
          }}
        >
          {phase === 'playing' ? '🍕' : '▶'}
        </button>
      </div>
    </div>
  );
}

// A little pizza-delivery kart: a body wedge pointing along `a`, plus its balloons.
function drawKart(
  ctx: CanvasRenderingContext2D,
  k: { x: number; y: number; a: number; balloons: number; hurt: number },
  body: string,
  trim: string,
) {
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.a);
  // i-frame blink (gentle: a slight fade, never a hard strobe)
  ctx.globalAlpha = k.hurt > 0 && Math.floor(k.hurt * 10) % 2 === 0 ? 0.5 : 1;
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-7, -6);
  ctx.lineTo(-7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = trim;
  ctx.fillRect(-7, -6, 3, 12); // back bumper
  ctx.restore();
  drawBalloons(ctx, k.x, k.y, k.balloons, '#ff5a8a');
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  gh: { x: number; y: number; balloons: number; hurt: number },
) {
  ctx.save();
  ctx.globalAlpha = gh.hurt > 0 && Math.floor(gh.hurt * 10) % 2 === 0 ? 0.45 : 0.85;
  ctx.fillStyle = '#f4f0ff';
  ctx.beginPath();
  ctx.arc(gh.x, gh.y, 8, Math.PI, 0); // domed head
  ctx.lineTo(gh.x + 8, gh.y + 7);
  ctx.lineTo(gh.x + 4, gh.y + 4);
  ctx.lineTo(gh.x, gh.y + 7);
  ctx.lineTo(gh.x - 4, gh.y + 4);
  ctx.lineTo(gh.x - 8, gh.y + 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2f55';
  ctx.fillRect(gh.x - 4, gh.y - 2, 2, 3);
  ctx.fillRect(gh.x + 2, gh.y - 2, 2, 3);
  ctx.restore();
  drawBalloons(ctx, gh.x, gh.y, gh.balloons, '#9ad0ff');
}

function drawBalloons(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  n: number,
  color: string,
) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(x - 6 + i * 6, y - 16, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
