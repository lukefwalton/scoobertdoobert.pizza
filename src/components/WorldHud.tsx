import { useEffect, useState } from 'react';
import '../styles/hud.css';
import { HOTSPOTS } from '../data/hotspots';
import { MENU_DESTINATIONS, destById } from '../data/links';
import { useSceneStore } from '../state/sceneStore';
import { useAudioStore } from '../state/audioStore';
import { audio } from '../audio/engine';

// The Scoobertverse welcome script. Streamed in char-by-char (terminal style)
// on world entry; the last line glows habanero.
const WELCOME_LINES = [
  'Hello.',
  'You have entered the Scoobertverse.',
  'Be careful as you explore.',
  'These wilds are as spicy and delicious as habanero.',
];
const WELCOME_SPICE = WELCOME_LINES.length - 1;
const WELCOME_FULL = WELCOME_LINES.join('\n');
// Start index of each line within WELCOME_FULL (newlines count as one char).
const WELCOME_OFFSETS = WELCOME_LINES.reduce<number[]>((acc, _, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + WELCOME_LINES[i - 1].length + 1);
  return acc;
}, []);

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
  const audioReady = useAudioStore((s) => s.ready);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  // The Scoobertverse welcome — a quest intro that streams in char-by-char on
  // world entry (WorldHud mounts with the world), holds, then fades. Non-blocking,
  // so you can start exploring while it runs.
  const [welcome, setWelcome] = useState(true);
  const [welcomeLeaving, setWelcomeLeaving] = useState(false);
  const [typed, setTyped] = useState(0);

  // Stream the text in like a terminal.
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setTyped(WELCOME_FULL.length);
      return;
    }
    let i = 0;
    let t = window.setTimeout(function tick() {
      i += 1;
      setTyped(i);
      if (i >= WELCOME_FULL.length) return;
      const prev = WELCOME_FULL[i - 1];
      const delay = prev === '\n' ? 300 : prev === '.' ? 120 : 21;
      t = window.setTimeout(tick, delay);
    }, 380);
    return () => window.clearTimeout(t);
  }, []);

  // Once fully typed, hold a beat, then fade out + unmount.
  useEffect(() => {
    if (typed < WELCOME_FULL.length) return;
    const tLeave = window.setTimeout(() => setWelcomeLeaving(true), 1900);
    const tGone = window.setTimeout(() => setWelcome(false), 3000);
    return () => {
      window.clearTimeout(tLeave);
      window.clearTimeout(tGone);
    };
  }, [typed]);

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
      {welcome && (
        <div
          className={`hud-welcome${welcomeLeaving ? ' hud-welcome--leaving' : ''}`}
          role="status"
        >
          <div className="hud-welcome__card">
            {WELCOME_LINES.map((line, idx) => {
              const start = WELCOME_OFFSETS[idx];
              const rev = Math.max(0, Math.min(line.length, typed - start));
              const frontier =
                typed > start && typed <= start + line.length && typed < WELCOME_FULL.length;
              return (
                <p
                  key={idx}
                  className={`hud-welcome__line${idx === WELCOME_SPICE ? ' hud-welcome__line--spice' : ''}`}
                >
                  <span>{line.slice(0, rev)}</span>
                  {frontier && <span className="hud-welcome__caret" aria-hidden="true" />}
                  <span className="hud-welcome__ghost">{line.slice(rev)}</span>
                </p>
              );
            })}
          </div>
        </div>
      )}

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
                {MENU_DESTINATIONS.map((d) => (
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
                  disabled={!audioReady}
                  onClick={() => {
                    audio.unlock();
                    toggleMute();
                  }}
                >
                  ♪ music: {!audioReady ? 'loading…' : muted ? 'off' : 'on'}
                </button>
                <button onClick={() => setPaused(false)}>Resume</button>
                <button
                  onClick={() => {
                    audio.restorePitch();
                    exitWorld();
                  }}
                >
                  Return to storefront
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
