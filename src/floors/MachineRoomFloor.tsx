import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import '../styles/machineroom.css';
import { resolveLinks, TEXT_ONLY_PATH } from '../data/links';
import { useSceneStore } from '../state/sceneStore';
import { useLowPower, isSmallScreen } from '../lib/lowPower';
import { audio } from '../audio/engine';
import { FloorDoor } from './FloorDoor';
import type { Floor } from '../data/floors';

// The CRT's live render is lazy — three.js only loads once you're this deep.
const MiniWorldPreview = lazy(() => import('../world/MiniWorldPreview'));

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

  // The 3D world (and the CRT's live WebGL render) is desktop + motion-OK only.
  // Mobile / reduced-motion can still WALK the machine room — it's a normal page
  // — but the CRT shows a static screen and Install hands off to the flat menu.
  // Reactive: if the viewport crosses the breakpoint or reduced-motion flips
  // after this floor has mounted, the CRT and the install behavior follow suit.
  const lowPower = useLowPower();

  // The cheeky payoff for phones: instead of silently dumping a mobile visitor on
  // the flat /text page (a letdown), the Calzone Player "install" pops a period
  // setup-error — the plug-in needs a desktop, because pocket phones didn't exist
  // in 1996. It still offers a real link onward to /text, so it never dead-ends.
  const [gag, setGag] = useState(false);
  const gagRef = useRef<HTMLDivElement>(null);
  const installRef = useRef<HTMLButtonElement>(null);

  const install = () => {
    if (isSmallScreen()) {
      setGag(true); // mobile → the desktop-invite gag
      return;
    }
    if (lowPower) {
      window.location.assign(TEXT_ONLY_PATH); // reduced-motion on a real desktop → flat handoff
      return;
    }
    audio.unlock();
    requestInstall();
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
            {!worldActive && !lowPower && (
              <Suspense
                fallback={<span className="mr__crt-boot">&#9679; BOOTING /dev/world&hellip;</span>}
              >
                <MiniWorldPreview />
              </Suspense>
            )}
            <span className="mr__crt-scanlines" aria-hidden="true" />
            <span className="mr__crt-label">
              {lowPower ? '● /dev/world (desktop)' : '● LIVE — /dev/world'}
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
                Cannot download the Calzone Player&trade; plug-in.
              </p>
              <p>
                Navigable 3D worlds require a <b>desktop computer</b>. Pocket telephones did not
                exist in 1996. We checked.
              </p>
              <p className="mr__fine">Please revisit on a desktop to step through the screen.</p>
              <div className="mr__gag-actions">
                <a className="mr__gag-go" href={TEXT_ONLY_PATH}>
                  View the text-only version &rarr;
                </a>
                <button className="mr__gag-back" type="button" onClick={() => setGag(false)}>
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
