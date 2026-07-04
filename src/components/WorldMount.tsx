import { Suspense, lazy, useEffect } from 'react';
import { useMounted } from '../lib/useMounted';
import { useSceneStore } from '../state/sceneStore';
import { WorldHud } from './WorldHud';
import { PerceptionWhisper } from './PerceptionWhisper';
import { DreadVignette } from './DreadVignette';
import { LevelLoader } from './LevelLoader';
import '../styles/world.css';

// The 3D world lives behind a dynamic import, so three.js is a separate chunk
// that only downloads when you actually descend (or pass ?world for testing).
// The initial storefront bundle stays three-free.
const World = lazy(() => import('../world/World'));

// leva (the ~2 MB debug tuning GUI) is ALSO lazy — it only ever shows under
// ?debug, so there's no reason for its runtime to sit in the storefront's initial
// bundle. Fetched on demand the moment ?debug mounts it, three-free otherwise.
const Leva = lazy(() => import('leva').then((m) => ({ default: m.Leva })));

export function WorldMount() {
  const mounted = useMounted();
  const active = useSceneStore((s) => s.worldActive);
  const enter = useSceneStore((s) => s.enterWorld);
  const setPaused = useSceneStore((s) => s.setPaused);

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
      {/* leva shader/scene tuning panel — only MOUNTED under ?debug (and lazily,
          so its runtime never lands in the storefront's initial bundle). */}
      {debug && (
        <Suspense fallback={null}>
          <Leva collapsed />
        </Suspense>
      )}
      {active && (
        <Suspense fallback={<div className="world-loading">entering&hellip;</div>}>
          <World />
          <LevelLoader />
          <DreadVignette />
          <WorldHud />
          <PerceptionWhisper />
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
