import { useEffect, useRef } from 'react';
import '../styles/ballpit.css';

// The Kids Menu easter egg: a JavaScript ball pit. Click / tap anywhere to
// splash the balls outward; they fall, pile up, and jostle each other like the
// real thing. A back button (and Esc) returns to the 2000 floor. Pure canvas
// 2D + a tiny physics loop — no deps, period-appropriate goofy.

// Classic primary ball-pit colors (red / blue / yellow / green / orange / purple).
const COLORS = ['#e8312a', '#1f63d6', '#f6d000', '#1ea84c', '#ff7a18', '#9b3fc4'];

type Ball = { x: number; y: number; vx: number; vy: number; r: number; ci: number };

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
}

// Pre-render one shaded ball sprite per color (cheap drawImage beats a per-frame
// per-ball radial gradient).
function makeSprite(color: string, size = 96): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  const r = size / 2;
  const g = x.createRadialGradient(r - r * 0.38, r - r * 0.38, r * 0.1, r, r, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.22, color);
  g.addColorStop(1, shade(color, 0.62));
  x.fillStyle = g;
  x.beginPath();
  x.arc(r, r, r - 2, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = 2;
  x.strokeStyle = 'rgba(0,0,0,0.16)';
  x.stroke();
  // a little gloss highlight
  x.fillStyle = 'rgba(255,255,255,0.55)';
  x.beginPath();
  x.ellipse(r - r * 0.34, r - r * 0.4, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  x.fill();
  return c;
}

export function KidsBallPit({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // keep onBack fresh for the Esc handler without re-running the physics effect
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const sprites = COLORS.map((c) => makeSprite(c));

    let W = 0;
    let H = 0;
    const balls: Ball[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Fill the pit — ~2x density. Count scales with area, capped for perf.
    const count = Math.min(190, Math.max(72, Math.round((W * H) / 4500)));
    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 13;
      balls.push({
        x: r + Math.random() * (W - 2 * r),
        // reduced-motion: start them already settled near the bottom (no big drop)
        y: reduce ? H - r - Math.random() * H * 0.45 : Math.random() * H * 0.5,
        vx: (Math.random() * 2 - 1) * 30,
        vy: 0,
        r,
        ci: (Math.random() * COLORS.length) | 0,
      });
    }

    const G = 1500; // gravity px/s²
    const REST = 0.5; // wall bounce
    const FR = 0.992; // light drag

    const splash = (mx: number, my: number) => {
      const R = 150;
      for (const b of balls) {
        const dx = b.x - mx;
        const dy = b.y - my;
        const d = Math.hypot(dx, dy) || 1;
        if (d < R) {
          const f = (1 - d / R) * 1000;
          b.vx += (dx / d) * f;
          b.vy += (dy / d) * f - 240; // a little pop upward
        }
      }
    };

    const step = (dt: number) => {
      for (const b of balls) {
        b.vy += G * dt;
        b.vx *= FR;
        b.vy *= FR;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < b.r) {
          b.x = b.r;
          b.vx = Math.abs(b.vx) * REST;
        } else if (b.x > W - b.r) {
          b.x = W - b.r;
          b.vx = -Math.abs(b.vx) * REST;
        }
        if (b.y > H - b.r) {
          b.y = H - b.r;
          b.vy = -Math.abs(b.vy) * REST;
          if (Math.abs(b.vy) < 28) b.vy = 0;
        } else if (b.y < b.r) {
          b.y = b.r;
          b.vy = Math.abs(b.vy) * REST;
        }
      }
      // pairwise collisions — n is small, so O(n²) is fine
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const rr = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0 && d2 < rr * rr) {
            const d = Math.sqrt(d2);
            const nx = dx / d;
            const ny = dy / d;
            const overlap = (rr - d) / 2;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (vn < 0) {
              const imp = -vn * 0.6;
              a.vx -= nx * imp;
              a.vy -= ny * imp;
              b.vx += nx * imp;
              b.vy += ny * imp;
            }
          }
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const b of balls) ctx.drawImage(sprites[b.ci], b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    };

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      step(dt / 2);
      step(dt / 2); // 2 substeps for steadier stacking
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      splash(e.clientX - rect.left, e.clientY - rect.top);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBackRef.current();
    };
    canvas.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="ballpit" role="dialog" aria-label="Ball pit" aria-modal="true">
      <div className="ballpit__bar">
        <button type="button" className="ballpit__back" onClick={onBack}>
          &larr; back to the menu
        </button>
        <span className="ballpit__title">BALL&nbsp;PIT</span>
        <span className="ballpit__hint">click / tap to splash!</span>
      </div>
      <canvas ref={canvasRef} className="ballpit__canvas" />
    </div>
  );
}
