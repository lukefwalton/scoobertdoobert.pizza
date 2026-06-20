import { useEffect } from 'react';
import '../styles/hud.css';
import { HOTSPOTS } from '../data/hotspots';
import { DESTINATIONS, destById } from '../data/links';
import { useSceneStore } from '../state/sceneStore';
import { useAudioStore } from '../state/audioStore';
import { audio } from '../audio/engine';

// DOM heads-up display for the world: the proximity prompt, the hotspot dialog
// (98.css, with the real anchor), and the pause menu — the always-reachable
// full links list. E interacts with a nearby hotspot; Esc opens the pause menu
// (or closes an open dialog).
export function WorldHud() {
  const near = useSceneStore((s) => s.nearHotspot);
  const open = useSceneStore((s) => s.openHotspot);
  const paused = useSceneStore((s) => s.paused);
  const closeDialog = useSceneStore((s) => s.closeHotspotDialog);
  const setPaused = useSceneStore((s) => s.setPaused);
  const exitWorld = useSceneStore((s) => s.exitWorld);
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useSceneStore.getState();
      if (e.key === 'Escape') {
        if (st.openHotspot) st.closeHotspotDialog();
        else st.togglePaused();
        return;
      }
      if ((e.key === 'e' || e.key === 'E') && st.nearHotspot && !st.openHotspot && !st.paused) {
        st.openHotspotDialog(st.nearHotspot);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nearHs = near ? HOTSPOTS.find((h) => h.id === near) : undefined;
  const openHs = open ? HOTSPOTS.find((h) => h.id === open) : undefined;
  const openDest = openHs ? destById(openHs.destId) : undefined;

  return (
    <>
      {nearHs && !open && !paused && <div className="hud-prompt">{nearHs.prompt}</div>}

      {openDest && (
        <div className="hud-dialog window" role="dialog" aria-label={openDest.label}>
          <div className="title-bar">
            <div className="title-bar-text">{openDest.label}</div>
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={closeDialog} />
            </div>
          </div>
          <div className="window-body">
            <p>{openDest.blurb}</p>
            <p>
              <a href={openDest.href} target="_blank" rel="noopener noreferrer">
                Open &raquo;
              </a>
            </p>
          </div>
        </div>
      )}

      {paused && (
        <div className="hud-pause" role="dialog" aria-label="Paused">
          <div className="hud-pause__panel window">
            <div className="title-bar">
              <div className="title-bar-text">Paused</div>
            </div>
            <div className="window-body">
              <p className="hud-pause__hint">Every destination, always one keypress away.</p>
              <ul className="hud-pause__list">
                {DESTINATIONS.map((d) => (
                  <li key={d.id}>
                    <a
                      href={d.href}
                      {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {d.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="hud-pause__actions">
                <button
                  onClick={() => {
                    audio.unlock();
                    toggleMute();
                  }}
                >
                  ♪ music: {muted ? 'off' : 'on'}
                </button>
                <button onClick={() => setPaused(false)}>Resume</button>
                <button onClick={() => exitWorld()}>Return to storefront</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
