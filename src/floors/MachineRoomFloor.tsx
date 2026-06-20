import { lazy, Suspense } from 'react';
import '../styles/machineroom.css';
import { resolveLinks, TEXT_ONLY_PATH } from '../data/links';
import { useSceneStore } from '../state/sceneStore';
import { useLowPower } from '../lib/lowPower';
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

  const install = () => {
    if (lowPower) {
      window.location.assign(TEXT_ONLY_PATH);
      return;
    }
    audio.unlock();
    requestInstall();
  };

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
          <button className="mr__install" type="button" onClick={install}>
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
    </div>
  );
}
