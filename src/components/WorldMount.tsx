import { Suspense, lazy, useEffect, useState } from 'react';
import { useMounted } from '../lib/useMounted';
import { useTouchDevice, prefersReducedMotion } from '../lib/lowPower';
import { hasMotionConsent, grantMotionConsent } from '../lib/motionConsent';
import { MotionConsent } from './MotionConsent';
import { useSaveSanDiegoWin } from '../lib/useSaveSanDiegoWin';
import { useSceneStore } from '../state/sceneStore';
import { WorldHud } from './WorldHud';
import { TouchControls } from './TouchControls';
import { PerceptionWhisper } from './PerceptionWhisper';
import { DreadVignette } from './DreadVignette';
import { LevelLoader } from './LevelLoader';
import '../styles/world.css';

// The 3D world lives behind a dynamic import, so three.js is a separate chunk
// that only downloads when you actually descend (or pass ?world for testing).
// The initial storefront bundle stays three-free.
const World = lazy(() => import('../world/World'));

// leva (the ~2 MB debug tuning GUI) is lazy — its runtime never sits in the
// storefront's initial bundle; it rides the world chunk (Water.tsx's useControls
// already pulls leva in there). We render it whenever the world is up but keep it
// HIDDEN unless ?debug: `useControls` auto-mounts a default leva panel if no
// <Leva> exists, which would otherwise float over the world for every visitor —
// harmless off-screen on desktop, but it covered the ☰ menu button on phones once
// the world went cross-platform. `hidden` suppresses that stray panel.
const Leva = lazy(() => import('leva').then((m) => ({ default: m.Leva })));

export function WorldMount() {
  const mounted = useMounted();
  const active = useSceneStore((s) => s.worldActive);
  const enter = useSceneStore((s) => s.enterWorld);
  const setPaused = useSceneStore((s) => s.setPaused);
  // Touch controls mount on a touch device (coarse primary pointer), any
  // orientation; a mouse-driven desktop keeps its keyboard/mouse world untouched.
  const touch = useTouchDevice();
  // Bank the 1101 ARG win (posted from its same-origin iframe) — covers the
  // immersive level + the in-world arcade cabinet, both mounted under here.
  useSaveSanDiegoWin();

  const debug =
    mounted &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debug');

  // The public deep-link entrances (ADDENDUM #8 — promoted from test-only):
  // ?world jumps straight into the first room; ?room=ID drops straight into any
  // room (also the deterministic smoke entry for deep/hidden rooms like the
  // shrine). The ceremonial entrance is still the Calzone Player install gag.
  // The SPECIFIC param wins: ?room=ID beats a generic ?world, so a smoke can
  // combine them — e.g. ?room=jukebox&world=1 lands in the jukebox AND flips
  // isTestEntrance on (to prove a debug-only action hook stays gated even under
  // a test entrance).
  //
  // Now that these are shareable public links (the maze pages point here), a
  // reduced-motion visitor gets the same MotionConsent gate as the order form /
  // machine room — never auto-dropped into a motion-heavy world from a URL.
  const [gate, setGate] = useState<{ room?: string } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const target = params.has('room')
      ? { room: params.get('room') || undefined }
      : params.has('world')
        ? {}
        : null;
    if (!target) return;
    if (prefersReducedMotion() && !hasMotionConsent()) {
      setGate(target);
      return;
    }
    enter(target.room);
  }, [enter]);

  if (!mounted) return null;

  return (
    <>
      {/* Reduced-motion consent for the public deep links (closing it stays on
          the storefront — the flat /text list is offered inside the modal). */}
      <MotionConsent
        open={gate !== null}
        onClose={() => setGate(null)}
        onEnter={() => {
          grantMotionConsent();
          enter(gate?.room);
          setGate(null);
        }}
      />
      {/* leva shader/scene tuning panel — mounted with the world (so its default
          auto-panel is suppressed), VISIBLE only under ?debug. */}
      {active && (
        <Suspense fallback={null}>
          <Leva hidden={!debug} collapsed />
        </Suspense>
      )}
      {active && (
        <Suspense fallback={<div className="world-loading">entering&hellip;</div>}>
          <World />
          <LevelLoader />
          <DreadVignette />
          <WorldHud />
          <PerceptionWhisper />
          {touch && <TouchControls />}
          <button
            type="button"
            className="hud-menu-btn"
            onClick={() => setPaused(true)}
            aria-label="Open menu"
          >
            &#9776;<span className="hud-menu-btn__label"> menu (Esc)</span>
          </button>
        </Suspense>
      )}
    </>
  );
}
