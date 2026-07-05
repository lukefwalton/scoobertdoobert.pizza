import { Suspense, lazy, useEffect } from 'react';
import { useMounted } from '../lib/useMounted';
import { useTouchDevice } from '../lib/lowPower';
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

  const debug =
    mounted &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debug');

  // Testing / debug entrance: ?world jumps straight into the first room; ?room=ID
  // drops straight into any room (deterministic smoke entry for deep/hidden rooms
  // like the shrine, which otherwise need the rat's secret to reach). The real
  // entrance is the Calzone Player install gag (step 3). The SPECIFIC param wins:
  // ?room=ID beats a generic ?world, so a smoke can combine them — e.g.
  // ?room=jukebox&world=1 lands in the jukebox AND flips isTestEntrance on (to
  // prove a debug-only action hook stays gated even under a test entrance).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('room')) enter(params.get('room') || undefined);
    else if (params.has('world')) enter();
  }, [enter]);

  if (!mounted) return null;

  return (
    <>
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
            &#9776; menu (Esc)
          </button>
        </Suspense>
      )}
    </>
  );
}
