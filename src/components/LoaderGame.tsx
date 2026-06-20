import { useEffect, useRef, useState } from 'react';

// ───────────────────────────────────────────────────────────────────────────
// LoaderGame — Phase 6. A tiny instant-on minigame that masks a heavy (GLB)
// level load. Period-perfect (the Namco loading-screen-game trick, patent long
// expired) and on-brand: Scoobert runs through the old-web wasteland, jump the
// broken buttons. Endless + reward-free (you never "win" to proceed). A
// Domino's-GRAMMAR pizza tracker (PREP → BAKE → BOX → OUT — original art, never
// their mark) shows the real load progress. When the asset is ready a
// "TAP TO ENTER" prompt appears and STAYS — you choose when to go in; the load
// already finished, so lingering costs nothing.
//
// Props: `ready` flips true when the parent's asset has loaded; `onEnter` is
// called when the player taps in; `label` names what's loading.
// ───────────────────────────────────────────────────────────────────────────

const STAGES = ['PREP', 'BAKE', 'BOX', 'OUT'] as const;

export function LoaderGame({
  ready,
  onEnter,
  label = 'THE POOL',
}: {
  ready: boolean;
  onEnter: () => void;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const [stage, setStage] = useState(0);

  // Pizza-tracker advances on a timer until ready, then snaps to OUT.
  useEffect(() => {
    if (ready) {
      setStage(STAGES.length - 1);
      return;
    }
    const id = window.setInterval(() => setStage((s) => Math.min(STAGES.length - 2, s + 1)), 1400);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const groundY = H - 26;
    let raf = 0;
    let last = performance.now();
    let py = groundY; // player baseline (top of the runner)
    let vy = 0;
    let onGround = true;
    let score = 0;
    let speed = 220; // px/s
    type Ob = { x: number; w: number; h: number };
    let obs: Ob[] = [];
    let spawnT = 0;

    const jump = () => {
      if (onGround) {
        vy = -430;
        onGround = false;
      }
    };
    // expose so the keydown handler (outside) can call it
    (canvas as unknown as { __jump?: () => void }).__jump = jump;

    const reset = () => {
      obs = [];
      score = 0;
      speed = 220;
      py = groundY;
      vy = 0;
      onGround = true;
    };

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // physics
      vy += 1500 * dt;
      py += vy * dt;
      if (py >= groundY) {
        py = groundY;
        vy = 0;
        onGround = true;
      }

      // obstacles
      spawnT -= dt;
      if (spawnT <= 0) {
        obs.push({ x: W + 10, w: 12 + Math.random() * 14, h: 14 + Math.random() * 18 });
        spawnT = 0.9 + Math.random() * 0.8;
      }
      for (const o of obs) o.x -= speed * dt;
      obs = obs.filter((o) => o.x + o.w > -4);
      speed += dt * 6; // creeps faster
      score += dt * 10;

      // collision (runner is ~16px box at x=40)
      const px = 40;
      const pw = 16;
      const ph = 16;
      for (const o of obs) {
        if (px < o.x + o.w && px + pw > o.x && py > groundY - ph - o.h + 6) {
          reset();
          break;
        }
      }

      // ── draw ──
      ctx.fillStyle = '#0b0b12';
      ctx.fillRect(0, 0, W, H);
      // ground line
      ctx.strokeStyle = '#2a2a3a';
      ctx.beginPath();
      ctx.moveTo(0, groundY + 2);
      ctx.lineTo(W, groundY + 2);
      ctx.stroke();
      // runner (a little pizza wedge)
      ctx.fillStyle = '#ffcf4d';
      ctx.fillRect(px, py - ph, pw, ph);
      ctx.fillStyle = '#c7402f';
      ctx.fillRect(px + 3, py - ph + 3, 3, 3);
      ctx.fillRect(px + 9, py - ph + 7, 3, 3);
      // obstacles ("broken web buttons")
      ctx.fillStyle = '#5a6cff';
      for (const o of obs) ctx.fillRect(o.x, groundY - o.h, o.w, o.h);
      // score
      ctx.fillStyle = '#8a8aa0';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(`${Math.floor(score)}`, W - 36, 14);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard: space/up to jump; Enter to go in when ready.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        (canvasRef.current as unknown as { __jump?: () => void })?.__jump?.();
      } else if (e.key === 'Enter' && readyRef.current) {
        onEnter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEnter]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: '#06060b',
        color: '#cfe9ef',
        font: '12px/1.5 "Courier New", monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        textAlign: 'center',
        padding: 16,
      }}
    >
      <div style={{ letterSpacing: 1 }}>
        LOADING {label} · PLEASE WAIT WHILE THE PIZZA REHEATS
      </div>

      {/* Domino's-GRAMMAR tracker (original art, not their mark) */}
      <div style={{ display: 'flex', gap: 6 }}>
        {STAGES.map((s, i) => (
          <span
            key={s}
            style={{
              padding: '3px 8px',
              border: '1px solid #2f6f5a',
              borderRadius: 3,
              background: i <= stage ? '#1f7a5a' : 'transparent',
              color: i <= stage ? '#eafff5' : '#5b7a72',
            }}
          >
            {s}
          </span>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={320}
        height={120}
        onClick={() => (canvasRef.current as unknown as { __jump?: () => void })?.__jump?.()}
        style={{ imageRendering: 'pixelated', border: '1px solid #20303a', cursor: 'pointer', maxWidth: '90vw' }}
      />
      <div style={{ opacity: 0.6 }}>space / tap to jump the broken buttons</div>

      {ready ? (
        <button
          type="button"
          onClick={onEnter}
          style={{
            marginTop: 4,
            padding: '8px 16px',
            font: 'bold 13px "Courier New", monospace',
            color: '#06060b',
            background: '#37e0a0',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            animation: 'sdpReadyPulse 1.1s ease-in-out infinite',
          }}
        >
          READY ▸ TAP TO ENTER
        </button>
      ) : (
        <div style={{ opacity: 0.5, marginTop: 4 }}>reheating…</div>
      )}
      <style>{`@keyframes sdpReadyPulse{0%,100%{opacity:.78}50%{opacity:1}}`}</style>
    </div>
  );
}
