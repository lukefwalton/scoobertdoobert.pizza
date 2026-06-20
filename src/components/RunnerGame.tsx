import { useEffect, useRef, useState } from 'react';
import { useProgressStore } from '../state/progressStore';

// ───────────────────────────────────────────────────────────────────────────
// RunnerGame — Phase 6. The standalone, touch-first version of the loader
// runner (src/components/LoaderGame.tsx), promoted to a real playable. On
// desktop the reward is the descent into the 3D world; on mobile the world is
// gated off (see CLAUDE.md mobile policy), so the MINIGAMES are the whole
// reward beyond the dead-plain site. This is that reward: Scoobert's Pizza Run.
//
// Same grammar as the loader (a pizza wedge runs the dead-web wasteland, jump
// the broken buttons) but with the parts a real game needs and the loader
// deliberately omits: a GAME OVER on collision (the loader silently resets so
// it can mask a load forever), a persisted HIGH SCORE (the progress spine's
// monotonic `arcadeHigh`), and a restart. Endless + speed-creep otherwise.
//
// Self-contained: a single <canvas> + 2D context, no three.js, so it loads on
// the lightest phone and never pulls WebGL into the bundle. Input is jump-only
// (tap / space / ArrowUp), so the whole screen is the button on touch.
// ───────────────────────────────────────────────────────────────────────────

// Logical canvas size — drawn at this resolution, then upscaled with pixelated
// CSS for the crunchy low-res look. Wide enough to read as an arcade screen.
const W = 320;
const H = 180;

type Phase = 'ready' | 'playing' | 'over';

export function RunnerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arcadeHigh = useProgressStore((s) => s.arcadeHigh);
  const recordArcadeScore = useProgressStore((s) => s.recordArcadeScore);

  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);

  // The mutable game world lives in a ref so the rAF loop reads/writes it
  // without re-rendering every frame; React state is only the coarse phase +
  // the score readout. `phase` is mirrored into the ref so the loop branches
  // on it without being torn down and recreated on every transition.
  const game = useRef({
    py: 0,
    vy: 0,
    onGround: true,
    score: 0,
    speed: 200,
    spawnT: 0,
    obs: [] as { x: number; w: number; h: number }[],
    phase: 'ready' as Phase,
  });

  const start = () => {
    const g = game.current;
    g.obs = [];
    g.score = 0;
    g.speed = 200;
    g.spawnT = 0.6;
    g.vy = 0;
    g.onGround = true;
    g.phase = 'playing';
    setScore(0);
    setPhase('playing');
  };

  const jump = () => {
    const g = game.current;
    if (g.phase === 'playing') {
      if (g.onGround) {
        g.vy = -430;
        g.onGround = false;
      }
    } else {
      // From the title or the game-over card, a tap drops you straight into a
      // fresh run — no menu friction, the arcade-cabinet feel.
      start();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const groundY = H - 30;
    const g = game.current;
    g.py = groundY;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (g.phase === 'playing') {
        // physics
        g.vy += 1500 * dt;
        g.py += g.vy * dt;
        if (g.py >= groundY) {
          g.py = groundY;
          g.vy = 0;
          g.onGround = true;
        }

        // obstacles
        g.spawnT -= dt;
        if (g.spawnT <= 0) {
          g.obs.push({ x: W + 10, w: 12 + Math.random() * 16, h: 16 + Math.random() * 22 });
          g.spawnT = 0.85 + Math.random() * 0.8;
        }
        for (const o of g.obs) o.x -= g.speed * dt;
        g.obs = g.obs.filter((o) => o.x + o.w > -4);
        g.speed += dt * 7; // creeps faster the longer you last
        g.score += dt * 10;

        // collision (runner is a ~18px box at x=44)
        const px = 44;
        const pw = 18;
        const ph = 18;
        for (const o of g.obs) {
          if (px < o.x + o.w && px + pw > o.x && g.py > groundY - ph - o.h + 6) {
            const final = Math.floor(g.score);
            g.phase = 'over';
            setLastScore(final);
            setScore(final);
            recordArcadeScore(final);
            break;
          }
        }
      }

      // ── draw ──
      ctx.fillStyle = '#0b0b12';
      ctx.fillRect(0, 0, W, H);
      // faint scanline-ish horizon band
      ctx.fillStyle = '#11111c';
      ctx.fillRect(0, groundY + 3, W, H - groundY);
      // ground line
      ctx.strokeStyle = '#2a2a3a';
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.lineTo(W, groundY + 2);
      ctx.stroke();

      // obstacles ("broken web buttons")
      ctx.fillStyle = '#5a6cff';
      for (const o of g.obs) {
        ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
        // a broken-bevel highlight so they read as dead 3D web buttons
        ctx.fillStyle = '#8a98ff';
        ctx.fillRect(o.x, groundY - o.h, o.w, 2);
        ctx.fillStyle = '#5a6cff';
      }

      // runner (a little pizza wedge)
      const px = 44;
      const ph = 18;
      ctx.fillStyle = '#ffcf4d';
      ctx.fillRect(px, g.py - ph, 18, ph);
      ctx.fillStyle = '#c7402f';
      ctx.fillRect(px + 4, g.py - ph + 4, 3, 3);
      ctx.fillRect(px + 11, g.py - ph + 9, 3, 3);
      // crust edge
      ctx.fillStyle = '#e0a83a';
      ctx.fillRect(px, g.py - 3, 18, 3);

      // live score (in-canvas, mono)
      ctx.fillStyle = '#8a8aa0';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(`${Math.floor(g.score)}`, W - 40, 16);

      // mirror the live score to React a few times a second (cheap) for the
      // chrome readout — flooring keeps it from thrashing every frame.
      if (g.phase === 'playing') {
        const s = Math.floor(g.score);
        setScore((prev) => (prev === s ? prev : s));
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard for desktop play-testing; the canvas/button cover touch.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const best = Math.max(arcadeHigh, lastScore);

  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>SCORE {String(score).padStart(5, '0')}</span>
        <span>HI {String(best).padStart(5, '0')}</span>
      </div>

      <div className="arcade-stage">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="arcade-canvas"
          onPointerDown={(e) => {
            e.preventDefault();
            jump();
          }}
        />

        {phase === 'ready' && (
          <div className="arcade-overlay">
            <p className="arcade-title">SCOOBERT&rsquo;S PIZZA RUN</p>
            <p className="arcade-sub">jump the broken web buttons</p>
            <p className="arcade-blink">▸ TAP TO START</p>
          </div>
        )}

        {phase === 'over' && (
          <div className="arcade-overlay">
            <p className="arcade-title">GAME OVER</p>
            <p className="arcade-sub">
              you ran {lastScore} &middot; best {best}
              {lastScore > 0 && lastScore >= best && lastScore === arcadeHigh ? ' ★ NEW' : ''}
            </p>
            <p className="arcade-blink">▸ TAP TO RUN AGAIN</p>
          </div>
        )}
      </div>

      <button type="button" className="arcade-jump" onPointerDown={(e) => { e.preventDefault(); jump(); }}>
        {phase === 'playing' ? 'JUMP' : 'START'}
      </button>
    </div>
  );
}
