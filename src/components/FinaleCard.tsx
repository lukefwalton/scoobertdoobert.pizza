import { useState } from 'react';
import { useProgressStore } from '../state/progressStore';
import { shareResult } from '../lib/share';
import { finaleCardSeen, markFinaleCardSeen } from '../lib/finaleCardSeen';

// ───────────────────────────────────────────────────────────────────────────
// FinaleCard — the 100% CAPSTONE, made legible + shareable. The old finale was a
// 2.8s toast + a wanderer group-dance you only ever saw if you happened to be near
// the liminal levels; this is a persistent card that appears the instant the
// durable 'finale' secret banks (reaching 100%), REGARDLESS of which room you're
// in, carrying the one social lever (the share button). Once-ever: a durable flag
// retires it on dismiss (re-share any time from the pause menu). It rides beside
// WelcomeOverlay / ControlHint in WorldHud. Reduced-motion is handled in CSS (no
// entrance animation). Sweet + celebratory — a reward, never dread (taste line).
//
// Deliberately NON-MODAL: role="status" (a polite live region announcing the win),
// NOT role="dialog". It's a celebration you can keep playing behind — the world
// stays interactive — so it must NOT trap focus or claim aria-modal (that contract
// is the pause menu's). Its close/share are ordinary focusable buttons.
// ───────────────────────────────────────────────────────────────────────────

export function FinaleCard() {
  const finale = useProgressStore((s) => s.secretsFound.includes('finale'));
  // Captured once at mount so marking it seen this session doesn't yank the card
  // before a fade; a returning 100%-er who's dismissed it never sees it again.
  const [seen, setSeen] = useState(() => finaleCardSeen());
  if (!finale || seen) return null;

  const dismiss = () => {
    markFinaleCardSeen();
    setSeen(true);
  };

  return (
    <div className="hud-finale" role="status">
      <button className="hud-finale__close" aria-label="dismiss" onClick={dismiss}>
        ×
      </button>
      <p className="hud-finale__badge">★ 100% ★</p>
      <p className="hud-finale__title">You’ve seen it all.</p>
      <p className="hud-finale__sub">
        Every floor, every wrong room, every secret. The rat’s proud of you.
      </p>
      <div className="hud-finale__actions">
        <button
          className="hud-finale__share"
          onClick={() =>
            void shareResult(
              '🍕 I 100%’d scoobertdoobert.pizza — every floor, every wrong room, every secret. Come get haunted:',
            )
          }
        >
          ↗ share it
        </button>
        <button className="hud-finale__ok" onClick={dismiss}>
          nice
        </button>
      </div>
    </div>
  );
}
