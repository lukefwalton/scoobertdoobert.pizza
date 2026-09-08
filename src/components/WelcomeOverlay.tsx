import { useEffect, useRef, useState } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { welcomeSeen, markWelcomeSeen } from '../lib/welcomeSeen';

// ───────────────────────────────────────────────────────────────────────────
// WelcomeOverlay — the Scoobertverse intro that streams in char-by-char
// (terminal style) on world entry, holds a beat, then fades out + unmounts.
// Self-contained: it owns its own typing state + timers; the one store touch is
// the entry cadence (sceneStore.introStage) — this card OWNS the 'welcome' beat,
// so nothing from the game layer (chip / score / toasts) shows until it's gone.
// Non-blocking — you can start exploring while it types. prefers-reduced-motion
// shows the full text instantly (no typing animation).
//
// ONCE PER VISIT (Luke, 2026-09: "slow our roll"): a sessionStorage flag
// (welcomeSeen) means a bounce out to the storefront and back in doesn't replay
// the greeting — it just hands the cadence straight to the next beat.
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
  const advanceIntro = useSceneStore((s) => s.advanceIntro);
  // Captured at mount (like ControlHint's seenAtMount) so marking it seen for this
  // visit doesn't flip the render gate under the card while it's still typing.
  const skip = useRef(welcomeSeen());
  const [welcome, setWelcome] = useState(!skip.current);
  const [welcomeLeaving, setWelcomeLeaving] = useState(false);
  const [typed, setTyped] = useState(0);

  // The cadence handoff: the moment the card is gone (auto-fade, the ×, or it was
  // never due this visit) the 'welcome' beat is over. advanceIntro only steps
  // forward FROM 'welcome', so a repeat call can't double-step. (Leaving the world
  // mid-card needs no cleanup: enterWorld resets the stage on the next entry.)
  useEffect(() => {
    if (!welcome) advanceIntro('welcome');
  }, [welcome, advanceIntro]);

  // Stream the text in like a terminal.
  useEffect(() => {
    if (skip.current) return; // already greeted this visit — nothing to type
    markWelcomeSeen();
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
