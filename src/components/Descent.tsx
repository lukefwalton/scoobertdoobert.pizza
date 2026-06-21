import { useEffect, useRef, useState } from 'react';
import '98.css';
import '../styles/descent.css';
import { audio } from '../audio/engine';
import { useSceneStore } from '../state/sceneStore';
import { TEXT_ONLY_PATH } from '../data/links';
import { BootLog } from './BootLog';

// ───────────────────────────────────────────────────────────────────────────
// The descent — the hero moment. Submitting the (theatrical) order form is what
// "requires the plug-in":
//   aging  -> the storefront desaturates, scanlines + vignette creep in
//   crash  -> a ~1s fake crash fakeout (optional beat, per the addendum)
//   prompt -> the Calzone Player™ VRML plug-in install dialog (98.css)
//   install-> a fake progress bar with absurd steps. THIS is the lazy-load mask:
//             the three.js World chunk actually downloads here.
//   booting-> a deliberate PIZZA-DOS "loading the world" boot log, pitch-bending
//             the loop down. This is the loading screen — it lives HERE, at the
//             level load, NOT on the storefront (the front door loads instantly).
//   reveal -> fade the boot screen out, up inside the world
//
// Gated to desktop + no reduced-motion. On mobile / reduced-motion the form is
// left alone and just navigates to /text (the step-6 fallback).
// ───────────────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'aging' | 'crash' | 'prompt' | 'installing' | 'booting' | 'reveal' | 'error';

const STATUS_LINES = [
  'Reticulating crusts…',
  'Buffering anchovies…',
  'Compiling garlic shaders…',
  'Proofing dough volume…',
  'Downloading the ocean…',
  'Summoning the rat…',
  'Calibrating reverb…',
];

// The "loading the world" POST log — on-theme (oven, flooded basement, the rat).
const WORLD_BOOT_LINES = [
  'PIZZA-DOS 6.2    (C) 1997 Scoobert Doobert, Inc.',
  '',
  'CALZONE PLAYER v1.0b ........ INSTALLED',
  'DECOMPRESSING /dev/oven ..... OK',
  'BAKING GEOMETRY ............. OK',
  'FLOODING BASEMENT ........... OK',
  'SUMMONING THE RAT ........... OK',
  '',
  'ENTERING THE WORLD . . .',
];

const AGE_PHASES: Phase[] = ['aging', 'crash', 'prompt', 'installing', 'error'];

export function Descent() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(STATUS_LINES[0]);
  const enterWorld = useSceneStore((s) => s.enterWorld);
  const descentRequested = useSceneStore((s) => s.descentRequested);
  const clearDescentRequest = useSceneStore((s) => s.clearDescentRequest);
  const installRequested = useSceneStore((s) => s.installRequested);
  const clearInstallRequest = useSceneStore((s) => s.clearInstallRequest);
  const worldReady = useRef(false);

  // OrderForm requests the descent via the store. It owns the mobile /
  // reduced-motion gating and the email capture, so by the time we're asked we
  // just run the sequence.
  useEffect(() => {
    if (descentRequested && phase === 'idle') {
      clearDescentRequest();
      setPhase('aging');
      // unlock() resumes the context and starts the loop itself once the track
      // is decoded + unmuted (no-op if it never loaded — no music, by design).
      audio.unlock();
    }
  }, [descentRequested, phase, clearDescentRequest]);

  // The machine room (bottom floor) fires the install directly — the floor IS
  // the Calzone pitch, so jump straight to the installer (the lazy three.js
  // load) and on through the boot log into the world.
  useEffect(() => {
    if (installRequested && phase === 'idle') {
      clearInstallRequest();
      setPhase('installing');
      audio.unlock();
    }
  }, [installRequested, phase, clearInstallRequest]);

  // Phase timers / the install→world handoff.
  useEffect(() => {
    if (phase === 'aging') {
      const t = window.setTimeout(() => setPhase('crash'), 1300);
      return () => window.clearTimeout(t);
    }
    if (phase === 'crash') {
      const t = window.setTimeout(() => setPhase('prompt'), 1200);
      return () => window.clearTimeout(t);
    }
    if (phase === 'installing') {
      // The actual download behind the gag: warm the three.js World chunk. If it
      // rejects (chunk 404 / offline), bail to an error dialog instead of
      // sitting at 100% forever.
      let failed = false;
      void import('../world/World').then(
        () => {
          worldReady.current = true;
        },
        (err) => {
          failed = true;
          console.error('Calzone Player (World chunk) failed to load:', err);
          setPhase('error');
        },
      );
      let p = 0;
      let li = 0;
      const tick = window.setInterval(() => {
        p = Math.min(100, p + 4 + Math.random() * 9);
        setProgress(p);
        if (Math.random() < 0.4) {
          li = (li + 1) % STATUS_LINES.length;
          setStatus(STATUS_LINES[li]);
        }
        if (p >= 100 && worldReady.current) {
          window.clearInterval(tick);
          setPhase('booting');
        }
      }, 180);
      // Safety: if the chunk never resolves, don't strand the user on the fake
      // installer.
      const bail = window.setTimeout(() => {
        if (!worldReady.current && !failed) setPhase('error');
      }, 15000);
      return () => {
        window.clearInterval(tick);
        window.clearTimeout(bail);
      };
    }
    if (phase === 'booting') {
      // Deliberate, unhurried boot into the level; bend the loop down across it.
      audio.pitchBendDown(2300, 0.4);
      const t = window.setTimeout(() => {
        enterWorld();
        setPhase('reveal');
      }, 2300);
      return () => window.clearTimeout(t);
    }
    if (phase === 'reveal') {
      const t = window.setTimeout(() => {
        setPhase('idle');
        setProgress(0);
      }, 800);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [phase, enterWorld]);

  if (phase === 'idle') return null;

  return (
    <div className="descent">
      {AGE_PHASES.includes(phase) && <div className="descent__age" aria-hidden="true" />}

      {phase === 'crash' && (
        <div className="descent__dialog window" role="alertdialog" aria-label="Error">
          <div className="title-bar">
            <div className="title-bar-text">SCOOBERT.EXE</div>
          </div>
          <div className="window-body">
            <p>SCOOBERT.EXE has performed a beautiful illegal operation and will be remembered.</p>
            <div className="descent__btnrow">
              <button onClick={() => setPhase('prompt')}>OK</button>
            </div>
          </div>
        </div>
      )}

      {phase === 'prompt' && (
        <div className="descent__dialog window" role="dialog" aria-label="Calzone Player Setup">
          <div className="title-bar">
            <div className="title-bar-text">Calzone Player&trade; Setup</div>
          </div>
          <div className="window-body">
            <p>
              This experience requires the <b>Calzone Player&trade;</b> VRML plug-in (v1.0b).
            </p>
            <p className="descent__fine">Navigable 3D worlds, in your browser. Finally.</p>
            <div className="descent__btnrow">
              <button onClick={() => setPhase('installing')}>Install</button>
              <button
                onClick={() => {
                  setPhase('idle');
                  setProgress(0);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'installing' && (
        <div className="descent__dialog window" role="dialog" aria-label="Installing">
          <div className="title-bar">
            <div className="title-bar-text">Installing Calzone Player&trade;</div>
          </div>
          <div className="window-body">
            <p>{status}</p>
            <div className="descent__progress">
              <div className="descent__bar" style={{ width: `${progress}%` }} />
            </div>
            <p className="descent__fine">{Math.floor(progress)}% complete</p>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="descent__dialog window" role="alertdialog" aria-label="Install failed">
          <div className="title-bar">
            <div className="title-bar-text">Calzone Player&trade; Setup</div>
          </div>
          <div className="window-body">
            <p>Calzone Player&trade; could not be installed. The oven may be offline.</p>
            <p className="descent__fine">You can still browse the flat menu.</p>
            <div className="descent__btnrow">
              <button onClick={() => window.location.assign(TEXT_ONLY_PATH)}>View text menu</button>
              <button
                onClick={() => {
                  setPhase('idle');
                  setProgress(0);
                }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {(phase === 'booting' || phase === 'reveal') && (
        <div
          className={`descent__boot${phase === 'reveal' ? ' descent__boot--out' : ''}`}
          role="status"
          aria-label="Loading the world"
        >
          <BootLog lines={WORLD_BOOT_LINES} />
        </div>
      )}
    </div>
  );
}
