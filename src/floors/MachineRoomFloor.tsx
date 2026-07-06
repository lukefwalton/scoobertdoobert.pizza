import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import '../styles/machineroom.css';
import { resolveLinks, TEXT_ONLY_PATH } from '../data/links';
import { useSceneStore } from '../state/sceneStore';
import { useReducedMotion, useTouchDevice } from '../lib/lowPower';
import { hasMotionConsent, grantMotionConsent } from '../lib/motionConsent';
import { MotionConsent } from '../components/MotionConsent';
import { audio } from '../audio/engine';
import { FloorDoor } from './FloorDoor';
import type { Floor } from '../data/floors';

// The CRT's live render is lazy — three.js only loads once you're this deep.
const MiniWorldPreview = lazy(() => import('../world/MiniWorldPreview'));
// The CRT preview renders Water.tsx, whose `useControls('water')` auto-mounts a
// DEFAULT (visible) leva panel when no <Leva> exists — which leaked the water
// tuning GUI over production here (the full world hides it via WorldMount's
// <Leva hidden>, but this preview path had none). Mount a hidden one so the stray
// panel never shows. Lazy, so leva stays out of the initial bundle.
const Leva = lazy(() => import('leva').then((m) => ({ default: m.Leva })));

// ───────────────────────────────────────────────────────────────────────────
// The bottom floor — the `machineRoom` template (the SGI thesis made literal).
// Deferred from Phase 1, the faux-chrome / starfield / "see what's possible"
// aesthetic finally lands HERE: the workstation that's been promising navigable
// 3D since 1996. Parody only — "Silicon Slice", "Pizza Graphics Workstation";
// never the real marks. The Calzone Player install fires from here (it's the
// terminus prompt); on complete the camera pushes through the CRT into the
// beach shop. The corner CRT shows a mini live render of the world (added next).
// ───────────────────────────────────────────────────────────────────────────
export function MachineRoomFloor({ floor }: { floor: Floor }) {
  const ascend = useSceneStore((s) => s.ascend);
  const requestInstall = useSceneStore((s) => s.requestInstall);
  // Don't render the mini-preview once the full world is up — it sits hidden
  // behind it and we don't want two live WebGL contexts.
  const worldActive = useSceneStore((s) => s.worldActive);
  const dests = resolveLinks(floor.links);

  // The 3D world now runs on phones (touch controls), so the ONLY hard gate left
  // is reduced motion — and even that is an opt-in, not a redirect. The CRT's
  // LIVE render stays desktop-motion-OK, though: a tiny second WebGL context on a
  // phone before you even enter is not worth it, and reduced-motion should stay
  // still. Reactive: crossing the breakpoint or toggling reduced-motion updates
  // the CRT and the install path live.
  const reduced = useReducedMotion();
  const touch = useTouchDevice();
  const crtLive = !worldActive && !reduced && !touch;

  // The cheeky phone payoff: the Calzone Player "install" still pops a period
  // setup notice — the plug-in was built for a desktop, because pocket phones
  // didn't exist in 1996 — but it now WAVES YOU THROUGH (the world runs on a
  // phone after all), and still offers the /text link as an alternative.
  const [gag, setGag] = useState(false);
  const gagRef = useRef<HTMLDivElement>(null);
  const installRef = useRef<HTMLButtonElement>(null);
  // Reduced-motion opt-in (once per visit), shared with the storefront order form.
  const [motionGate, setMotionGate] = useState(false);

  const enterWorld = () => {
    audio.unlock();
    requestInstall();
  };

  const install = () => {
    if (reduced && !hasMotionConsent()) {
      setMotionGate(true); // reduced-motion → ask first (opt-in), /text is the safe out
      return;
    }
    if (touch) {
      setGag(true); // handheld → the "pocket computer" pre-roll, which then enters
      return;
    }
    enterWorld();
  };

  // Modal hygiene for the gag: focus the first control on open, trap Tab within the
  // dialog, close on Escape, and restore focus to the Install button on close.
  useEffect(() => {
    if (!gag) return;
    const root = gagRef.current;
    const installBtn = installRef.current; // stable node — capture for the cleanup
    const focusable = root ? Array.from(root.querySelectorAll<HTMLElement>('a[href],button')) : [];
    focusable[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGag(false);
        return;
      }
      if (e.key === 'Tab' && focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      installBtn?.focus();
    };
  }, [gag]);

  return (
    <div className="mr" data-floor={floor.id}>
      <div className="mr__stars" aria-hidden="true" />
      <div className="mr__comet" aria-hidden="true">
        <span className="mr__comet-guy">&#127829;</span>
      </div>

      <header className="mr__head">
        <p className="mr__brand">PIZZA GRAPHICS WORKSTATION</p>
        <h1 className="mr__wordart" data-text="SILICON SLICE&trade;">
          SILICON&nbsp;SLICE&trade;
        </h1>
        <p className="mr__tag">see what&rsquo;s possible</p>
      </header>

      <div className="mr__body">
        <section className="mr__pitch" aria-label="Install">
          <p>
            This experience requires the <b>Calzone Player&trade;</b> VRML plug-in (v1.0b).
          </p>
          <p className="mr__fine">Navigable 3D worlds, in your browser. Finally.</p>
          <button className="mr__install" type="button" onClick={install} ref={installRef}>
            {floor.descendLabel}
          </button>
        </section>

        <aside className="mr__crt" aria-label="Live render preview">
          <div className="mr__crt-screen">
            {crtLive && (
              <Suspense
                fallback={<span className="mr__crt-boot">&#9679; BOOTING /dev/world&hellip;</span>}
              >
                <MiniWorldPreview />
                {/* Suppress leva's auto-mounted default panel (see note by the
                    import). Hidden always here — this is a preview, not a debug
                    session; the real ?debug panel lives on the full world. */}
                <Leva hidden collapsed />
              </Suspense>
            )}
            <span className="mr__crt-scanlines" aria-hidden="true" />
            <span className="mr__crt-label">
              {crtLive ? '● LIVE — /dev/world' : '● /dev/world (desktop)'}
            </span>
          </div>
          <p className="mr__crt-cap">Pizza Graphics Workstation, rendering the dream.</p>
        </aside>
      </div>

      <nav className="mr__links" aria-label="Links">
        {dests.map((d) => (
          <a
            key={d.id}
            href={d.href}
            {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {d.label}
          </a>
        ))}
      </nav>

      <div className="mr__doors">
        <FloorDoor direction="up" label="Back upstairs" onActivate={ascend} />
      </div>

      {gag && (
        <div className="mr__gag-backdrop" onClick={() => setGag(false)}>
          <div
            className="mr__gag"
            ref={gagRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mr-gag-title"
            aria-describedby="mr-gag-body"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mr__gag-bar">
              <span id="mr-gag-title">Calzone Player&trade; Setup</span>
              <button
                className="mr__gag-x"
                type="button"
                aria-label="Close"
                onClick={() => setGag(false)}
              >
                &times;
              </button>
            </div>
            <div className="mr__gag-body" id="mr-gag-body">
              <p className="mr__gag-head">
                <span className="mr__gag-icon" aria-hidden="true">
                  &#9888;
                </span>
                Calzone Player&trade; was built for a <b>desktop computer</b>.
              </p>
              <p>
                Pocket telephones did not exist in 1996 &mdash; the plug-in never expected to run in
                your hand. We checked. It should work anyway.
              </p>
              <p className="mr__fine">Step through the screen, or take the text-only version.</p>
              <div className="mr__gag-actions">
                <button
                  className="mr__gag-go"
                  type="button"
                  onClick={() => {
                    setGag(false);
                    enterWorld();
                  }}
                >
                  Enter the world &#9654;
                </button>
                <a className="mr__gag-back" href={TEXT_ONLY_PATH}>
                  Text-only version &rarr;
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <MotionConsent
        open={motionGate}
        onClose={() => setMotionGate(false)}
        onEnter={() => {
          grantMotionConsent();
          setMotionGate(false);
          enterWorld();
        }}
      />
    </div>
  );
}
