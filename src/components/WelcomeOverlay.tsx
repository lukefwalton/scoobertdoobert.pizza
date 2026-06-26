import { useEffect, useState } from 'react';

// ───────────────────────────────────────────────────────────────────────────
// WelcomeOverlay — the Scoobertverse intro that streams in char-by-char
// (terminal style) on world entry, holds a beat, then fades out + unmounts.
// Self-contained: it owns its own typing state + timers and reads no stores, so
// it lifts cleanly out of WorldHud (which just mounts it once with the world).
// Non-blocking — you can start exploring while it types. prefers-reduced-motion
// shows the full text instantly (no typing animation).
// ───────────────────────────────────────────────────────────────────────────

const WELCOME_LINES = [
  'Hello.',
  'You have entered the Scoobertverse.',
  'Be careful as you explore.',
  'These wilds are as spicy and delicious as habanero.',
];
const WELCOME_SPICE = WELCOME_LINES.length - 1; // the last line glows habanero
const WELCOME_FULL = WELCOME_LINES.join('\n');
// Start index of each line within WELCOME_FULL (newlines count as one char).
const WELCOME_OFFSETS = WELCOME_LINES.reduce<number[]>((acc, _, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + WELCOME_LINES[i - 1].length + 1);
  return acc;
}, []);

export function WelcomeOverlay() {
  const [welcome, setWelcome] = useState(true);
  const [welcomeLeaving, setWelcomeLeaving] = useState(false);
  const [typed, setTyped] = useState(0);

  // Stream the text in like a terminal.
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setTyped(WELCOME_FULL.length);
      return;
    }
    let i = 0;
    let t = window.setTimeout(function tick() {
      i += 1;
      setTyped(i);
      if (i >= WELCOME_FULL.length) return;
      const prev = WELCOME_FULL[i - 1];
      const delay = prev === '\n' ? 300 : prev === '.' ? 120 : 21;
      t = window.setTimeout(tick, delay);
    }, 380);
    return () => window.clearTimeout(t);
  }, []);

  // Once fully typed, hold a beat, then fade out + unmount.
  useEffect(() => {
    if (typed < WELCOME_FULL.length) return;
    const tLeave = window.setTimeout(() => setWelcomeLeaving(true), 1900);
    const tGone = window.setTimeout(() => setWelcome(false), 3000);
    return () => {
      window.clearTimeout(tLeave);
      window.clearTimeout(tGone);
    };
  }, [typed]);

  if (!welcome) return null;

  return (
    <div className={`hud-welcome${welcomeLeaving ? ' hud-welcome--leaving' : ''}`} role="status">
      <div className="hud-welcome__card">
        <button
          type="button"
          className="hud-welcome__close"
          aria-label="dismiss intro"
          onClick={() => {
            setWelcomeLeaving(true);
            window.setTimeout(() => setWelcome(false), 600);
          }}
        >
          ×
        </button>
        {WELCOME_LINES.map((line, idx) => {
          const start = WELCOME_OFFSETS[idx];
          const rev = Math.max(0, Math.min(line.length, typed - start));
          const frontier =
            typed > start && typed <= start + line.length && typed < WELCOME_FULL.length;
          return (
            <p
              key={idx}
              className={`hud-welcome__line${idx === WELCOME_SPICE ? ' hud-welcome__line--spice' : ''}`}
            >
              <span>{line.slice(0, rev)}</span>
              {frontier && <span className="hud-welcome__caret" aria-hidden="true" />}
              <span className="hud-welcome__ghost">{line.slice(rev)}</span>
            </p>
          );
        })}
      </div>
    </div>
  );
}
