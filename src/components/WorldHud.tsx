import { useEffect, useState } from 'react';
import '../styles/hud.css';
import { HOTSPOTS } from '../data/hotspots';
import { MENU_DESTINATIONS, destById } from '../data/links';
import { roomById, ROOM_FADE_MS } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useAudioStore } from '../state/audioStore';
import { useMusicStore } from '../state/musicStore';
import { useProgressStore } from '../state/progressStore';
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
  const nearDoor = useSceneStore((s) => s.nearDoor);
  const pendingRoom = useSceneStore((s) => s.pendingRoom);
  const transitioning = useSceneStore((s) => s.transitioning);
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const commitRoom = useSceneStore((s) => s.commitRoom);
  const endTransition = useSceneStore((s) => s.endTransition);
  const queuedRoom = useSceneStore((s) => s.queuedRoom);
  const goToRoom = useSceneStore((s) => s.goToRoom);
  const closeDialog = useSceneStore((s) => s.closeHotspotDialog);
  const setPaused = useSceneStore((s) => s.setPaused);
  const exitWorld = useSceneStore((s) => s.exitWorld);
  const muted = useAudioStore((s) => s.muted);
  const audioReady = useAudioStore((s) => s.ready);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const nowPlaying = useMusicStore((s) => s.title);
  const shiftSong = useMusicStore((s) => s.shift);
  // The flip-through radio is an UPGRADE: locked until you roll the jukebox d20.
  const radioUnlocked = useProgressStore((s) => s.radioUnlocked);

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

  // A door was activated: the screen is fading to black — commit the room swap at
  // the midpoint (behind the black) so the geometry change is never seen, then
  // the overlay fades back up on the new room.
  // The door wipe runs in two halves: fade-out → commit (swap behind the black)
  // → fade-in. Input stays frozen (transitioning) for BOTH halves, not just
  // until the commit, so you can't walk/look/pause during the reveal.
  useEffect(() => {
    if (!transitioning) return;
    // Reduced-motion gets no black pause (the CSS fade is disabled for them).
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fade = reduced ? 0 : ROOM_FADE_MS;
    const tCommit = window.setTimeout(() => commitRoom(), fade);
    const tEnd = window.setTimeout(() => endTransition(), fade * 2 + 20);
    return () => {
      window.clearTimeout(tCommit);
      window.clearTimeout(tEnd);
    };
  }, [transitioning, commitRoom, endTransition]);

  // Flush a navigation that arrived mid-wipe (queued by goToRoom, not dropped):
  // once this wipe has fully lifted, start the deferred one. This is what makes a
  // fast re-entry — bouncing out of a failed level then heading straight back
  // down — actually land instead of silently vanishing into the transition.
  useEffect(() => {
    if (queuedRoom && !transitioning) goToRoom(queuedRoom.to, queuedRoom.spawn);
  }, [queuedRoom, transitioning, goToRoom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore auto-repeat from a held key: one press = one action. Without this
      // a held E re-fires after the fade clears and can bounce you straight back
      // through the door you just used.
      if (e.repeat) return;
      const st = useSceneStore.getState();
      // No input during the door wipe (E or Esc) — modal for the full fade.
      if (st.transitioning) return;
      if (e.key === 'Escape') {
        if (st.openHotspot) st.closeHotspotDialog();
        else st.togglePaused();
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        if (st.paused || st.openHotspot) return;
        // A door takes priority over a hotspot if you're somehow near both.
        if (st.nearDoor) {
          audio.unlock();
          st.goToRoom(st.nearDoor.to, st.nearDoor.spawn);
        } else if (st.nearHotspot) {
          st.openHotspotDialog(st.nearHotspot);
        }
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
            <button
              type="button"
              className="hud-welcome__close"
              aria-label="dismiss intro"
              onClick={() => {
                setWelcomeLeaving(true);
                window.setTimeout(() => setWelcome(false), 600);
              }}
            >
              ×
            </button>
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

      {!pendingRoom && (
        <div className="hud-room" aria-hidden="true">
          {roomById(currentRoom).title}
        </div>
      )}

      {nearDoor && !open && !paused && !pendingRoom && (
        <div className="hud-prompt hud-prompt--door">Press E to {nearDoor.label}</div>
      )}

      {nearHs && !nearDoor && !open && !paused && !pendingRoom && (
        <div className="hud-prompt">{nearHs.prompt}</div>
      )}

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
              {/* The radio. Locked until you roll the jukebox d20 (the upgrade):
                  before, it's a read-out of whatever the room is playing; after,
                  the ◀/▶ flip the catalog and your pick follows you everywhere. */}
              {radioUnlocked ? (
                <div className="hud-pause__nowplaying">
                  <button
                    className="hud-pause__songbtn"
                    aria-label="previous song"
                    disabled={!audioReady}
                    onClick={() => shiftSong(-1)}
                  >
                    ◀
                  </button>
                  <span className="hud-pause__songtitle" title="Now playing">
                    ♪ {!audioReady ? 'loading…' : nowPlaying}
                  </span>
                  <button
                    className="hud-pause__songbtn"
                    aria-label="next song"
                    disabled={!audioReady}
                    onClick={() => shiftSong(1)}
                  >
                    ▶
                  </button>
                </div>
              ) : (
                <div className="hud-pause__nowplaying hud-pause__nowplaying--locked">
                  <span className="hud-pause__songtitle" title="Now playing">
                    ♪ {!audioReady ? 'loading…' : nowPlaying}
                  </span>
                  <span className="hud-pause__radiohint">
                    roll the bone at the jukebox to tune the radio
                  </span>
                </div>
              )}
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

      {/* room-to-room transition: black wipe that hides the geometry swap. The
          fade duration is single-sourced from ROOM_FADE_MS (also the commit
          timer above) via a CSS custom property. */}
      <div
        className={`hud-fade${pendingRoom ? ' hud-fade--cover' : ''}`}
        aria-hidden="true"
        style={{ ['--room-fade-ms' as string]: `${ROOM_FADE_MS}ms` }}
      />

      {/* The watery descent: stepping through the door on the pool's water drops
          you down a WATERFALL into the liminal level — rushing water over the
          black wipe. DESTINATION-keyed (pendingRoom.to), so it only plays on the
          way DOWN (the fade-out): the post-commit fade-in into liminal is hidden
          by the loader overlay anyway, and keying on currentRoom would wrongly
          fire the waterfall while LEAVING liminal too (currentRoom stays
          'liminal' through that fade-out). */}
      <div
        className={`hud-waterfall${pendingRoom?.to === 'liminal' ? ' hud-waterfall--on' : ''}`}
        aria-hidden="true"
      />
    </>
  );
}
