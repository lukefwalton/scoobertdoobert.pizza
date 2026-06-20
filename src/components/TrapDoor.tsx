import { useEffect, useRef, useState } from 'react';
import '../styles/trapdoor.css';
import { useMounted } from '../lib/useMounted';
import { useLowPower } from '../lib/lowPower';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { trapDropForRoll, type TrapDrop } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// TrapDoor — the storefront's secret shortcut into the deep (design: docs/
// DESIGN.md "Trap doors"). The dead-plain page has a soft spot in the floor; if
// you find it and click, the floor gives way. An interstitial d20 ROLL decides
// where — it drops you, at random, into the BOTTOM of the back rooms, skipping
// the whole descent.
//
//   discoverability = a VISIBLE-BUT-WRONG element: a hairline seam at the foot
//     of the page that looks like a 1px rendering glitch but takes the pizza
//     cursor's pointer (wrong — seams aren't buttons). Clicking it is the fall.
//   destination = an interstitial d20 random-drop: the die tumbles, lands on a
//     face, the face picks a deep room (trapDropForRoll), you drop in. The roll
//     doubles as the lazy-load mask for the three.js World chunk (same trick as
//     the Calzone installer), so the ceremony IS the loading screen.
//
// HARD constraints honored: pure progressive enhancement — useMounted-gated so
// it's NEVER in the prerendered / JS-off HTML, and desktop + motion-OK only
// (useLowPower covers mobile + reduced-motion), because it drops you into the
// 3D world, which is gated off those by construction. It never touches a real
// link or the crawlable front door; it's an additive, hidden affordance.
// ───────────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'rolling' | 'dropping' | 'error';

const ROLL_MS = 1500; // the tumble; long enough to mask the chunk load, short enough not to bore

export function TrapDoor() {
  const mounted = useMounted();
  const low = useLowPower();

  const enterWorld = useSceneStore((s) => s.enterWorld);
  const findSecret = useProgressStore((s) => s.findSecret);

  const [phase, setPhase] = useState<Phase>('idle');
  const [face, setFace] = useState(20); // the number on the die's face (flickers, then settles)
  const [dest, setDest] = useState<TrapDrop | null>(null);

  const worldReady = useRef(false);
  const settled = useRef(false);

  // Drop only once BOTH the die has settled AND the World chunk has loaded —
  // mirrors the descent installer's "100% AND chunk ready" handoff so we never
  // drop into a room whose engine isn't downloaded yet.
  const tryDrop = (d: TrapDrop) => {
    if (!settled.current || !worldReady.current) return;
    setPhase('dropping');
    findSecret('trapdoor'); // the site remembers you took the floor (rat wink fodder)
    audio.unlock();
    // A short "the floor gives way" beat under the black, then hand off to the
    // world at the rolled room. The overlay stays up (over the canvas) until the
    // world has mounted, then unmounts itself back to idle.
    window.setTimeout(() => {
      enterWorld(d.room, d.spawn);
      window.setTimeout(() => setPhase('idle'), 400);
    }, 650);
  };

  const fall = () => {
    if (phase !== 'idle') return;
    // Decide the landing up front (the die will reveal it), then roll.
    const rolled = 1 + Math.floor(Math.random() * 20);
    const d = trapDropForRoll(rolled);
    setDest(d);
    setFace(rolled);
    settled.current = false;
    worldReady.current = false;
    setPhase('rolling');
    audio.unlock();

    // Warm the three.js World chunk behind the roll (the lazy-load mask). If it
    // rejects (offline / 404), the floor "holds" — bail to a graceful dialog
    // instead of stranding the player on a spinning die.
    void import('../world/World').then(
      () => {
        worldReady.current = true;
        tryDrop(d);
      },
      (err) => {
        console.error('TrapDoor: World chunk failed to load:', err);
        setPhase('error');
      },
    );
  };

  // The tumble: flicker the face fast, then settle on the rolled number and,
  // a beat later, mark the die settled (which may trigger the drop if the chunk
  // is already warm).
  useEffect(() => {
    if (phase !== 'rolling') return;
    const rolled = face;
    const flicker = window.setInterval(() => setFace(1 + Math.floor(Math.random() * 20)), 70);
    const stop = window.setTimeout(() => {
      window.clearInterval(flicker);
      setFace(rolled); // land on the real result
      settled.current = true;
      if (dest) tryDrop(dest);
    }, ROLL_MS);
    return () => {
      window.clearInterval(flicker);
      window.clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Gate LAST so the hooks above always run in the same order. Pure progressive
  // enhancement: nothing here exists in the prerendered HTML, and the whole
  // affordance is absent on mobile / reduced-motion.
  if (!mounted || low) return null;

  return (
    <>
      {/* The visible-but-wrong element: a hairline seam in the "floor" at the
          very bottom of the page. Looks like a render glitch; takes a pointer
          cursor it shouldn't. A real button (with a quiet label) so it isn't an
          a11y black hole — but you have to notice it. */}
      <button
        type="button"
        className="trapdoor-seam"
        aria-label="There is a draft coming from a seam in the floor."
        title=""
        onClick={fall}
      >
        <span className="trapdoor-seam__notch" aria-hidden="true">
          &#9661;
        </span>
      </button>

      {phase !== 'idle' && (
        <div className="trapdoor-fall" role="status" aria-label="The floor gives way">
          {phase === 'error' ? (
            <div className="trapdoor-card">
              <p className="trapdoor-card__head">THE FLOOR HOLDS</p>
              <p className="trapdoor-card__sub">…for now. (The oven may be offline.)</p>
              <button type="button" className="trapdoor-card__btn" onClick={() => setPhase('idle')}>
                step back
              </button>
            </div>
          ) : (
            <div className="trapdoor-roll">
              <p className="trapdoor-roll__head">
                {phase === 'dropping' ? 'DOWN YOU GO' : 'THE FLOOR ROLLS FOR YOU'}
              </p>
              <div className={`trapdoor-d20${phase === 'rolling' ? ' is-rolling' : ''}`} aria-hidden="true">
                <span className="trapdoor-d20__face">{face}</span>
              </div>
              <p className="trapdoor-roll__sub">
                {phase === 'dropping' && dest ? `d20 → ${face} · ${dest.title}` : `d20 · rolling…`}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
