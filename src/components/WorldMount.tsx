import { Suspense, lazy, useEffect } from 'react';
import { Leva } from 'leva';
import { useMounted } from '../lib/useMounted';
import { useSceneStore } from '../state/sceneStore';
import { WorldHud } from './WorldHud';
import { DreadVignette } from './DreadVignette';
import '../styles/world.css';

// The 3D world lives behind a dynamic import, so three.js is a separate chunk
// that only downloads when you actually descend (or pass ?world for testing).
// The initial storefront bundle stays three-free.
const World = lazy(() => import('../world/World'));

export function WorldMount() {
  const mounted = useMounted();
  const active = useSceneStore((s) => s.worldActive);
  const enter = useSceneStore((s) => s.enterWorld);
  const setPaused = useSceneStore((s) => s.setPaused);

  const debug =
    mounted &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debug');

  // Testing / debug entrance: ?world jumps straight into the room. The real
  // entrance is the Calzone Player install gag (step 3).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).has('world')) enter();
  }, [enter]);

  if (!mounted) return null;

  return (
    <>
      {/* leva shader/scene tuning panel — hidden unless ?debug is present */}
      <Leva hidden={!debug} collapsed />
      {active && (
        <Suspense fallback={<div className="world-loading">entering&hellip;</div>}>
          <World />
          <DreadVignette />
          <WorldHud />
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
