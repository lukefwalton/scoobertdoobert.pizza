import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useModalFocus } from '../lib/useModalFocus';
import '../styles/hud.css';
import { HOTSPOTS } from '../data/hotspots';
import { destById } from '../data/links';
import { lookableById } from '../data/lookables';
import { roomById, ROOM_FADE_MS } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { lyricFor, songsWithLyrics } from '../data/lyrics';
import { useProgressStore } from '../state/progressStore';
import { SPELLS } from '../data/spells';
import { castSpell, castEquippedSpell } from '../lib/spellcast';
import { QUESTS, allQuestsDone, objectiveChipVisible } from '../data/quests';
import { ObjectiveHud } from './ObjectiveHud';
import { WelcomeOverlay } from './WelcomeOverlay';
import { ControlHint } from './ControlHint';
import { FinaleCard } from './FinaleCard';
import { SpellHotbar } from './SpellHotbar';
import { PauseMenu } from './PauseMenu';
import { useToastStore, announce, toastDurationMs } from '../state/toastStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { interactNearby, grabNearby } from '../lib/worldActions';
import { ScoreHud } from './ScoreHud';
import { RaceHud } from './RaceHud';
import { exposeTestGlobal } from '../lib/testHooks';
import { useRhythmStore, type Dir } from '../state/rhythmStore';
import { RhythmGame } from './RhythmGame';
import { ratDialogue } from '../data/dialogue';
import { itemById } from '../data/items';
import { YoutubeFacade } from './YoutubeFacade';
import { ArcadeModal } from './ArcadeModal';
import { SaveSanDiegoLevel } from './SaveSanDiegoLevel';

// DOM heads-up display for the world: the proximity prompt, the hotspot dialog
// (98.css, with the real anchor), and the pause menu — the always-reachable
// full links list. E interacts with a nearby hotspot; Esc opens the pause menu
// (or closes an open dialog).
export function WorldHud() {
  const near = useSceneStore((s) => s.nearHotspot);
  const open = useSceneStore((s) => s.openHotspot);
  const paused = useSceneStore((s) => s.paused);
  const objectiveHudOn = useSceneStore((s) => s.objectiveHudOn);
  const nearDoor = useSceneStore((s) => s.nearDoor);
  const nearPickup = useSceneStore((s) => s.nearPickup);
  const nearTv = useSceneStore((s) => s.nearTv);
  const nearEntity = useSceneStore((s) => s.nearEntity);
  const nearInteractable = useSceneStore((s) => s.nearInteractable);
  const rhythmActive = useRhythmStore((s) => s.active);
  const nearNpc = useSceneStore((s) => s.nearNpc);
  const openNpc = useSceneStore((s) => s.openNpc);
  const closeNpc = useSceneStore((s) => s.closeNpcDialog);
  const pendingRoom = useSceneStore((s) => s.pendingRoom);
  const transitioning = useSceneStore((s) => s.transitioning);
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const commitRoom = useSceneStore((s) => s.commitRoom);
  const endTransition = useSceneStore((s) => s.endTransition);
  const queuedRoom = useSceneStore((s) => s.queuedRoom);
  const goToRoom = useSceneStore((s) => s.goToRoom);
  const closeDialog = useSceneStore((s) => s.closeHotspotDialog);
  const tvVideo = useSceneStore((s) => s.tvVideo);
  const closeTv = useSceneStore((s) => s.closeTv);
  const nearArcade = useSceneStore((s) => s.nearArcade);
  const nearBooth = useSceneStore((s) => s.nearBooth);
  const arcadeGame = useSceneStore((s) => s.arcadeGame);
  const closeArcade = useSceneStore((s) => s.closeArcade);
  // A full-screen LEVEL overlay a door opened into (the 1101 text adventure), or
  // null. Same modal grammar as arcadeGame — Esc / the back button drops it.
  const levelOverlay = useSceneStore((s) => s.levelOverlay);
  const closeLevel = useSceneStore((s) => s.closeLevel);
  // Which song's lyrics the reader panel is showing (null = closed). In the store
  // (like tvVideo) so Esc closes it before the pause menu.
  const lyricsSong = useSceneStore((s) => s.lyricsSong);
  const nearLookable = useSceneStore((s) => s.nearLookable);
  const openLookable = useSceneStore((s) => s.openLookable);
  const closeLookable = useSceneStore((s) => s.closeLookableDialog);

  // Modal a11y for the in-world dialogs: focus-trap while open + restore on close.
  // Escape is handled by the global key handler below (priority-ordered), so no
  // onEscape here — the hook only owns focus. One ref/hook per dialog.
  const hotspotRef = useRef<HTMLDivElement>(null);
  const npcRef = useRef<HTMLDivElement>(null);
  const tvRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const lookableRef = useRef<HTMLDivElement>(null);
  useModalFocus(hotspotRef, !!open);
  useModalFocus(npcRef, openNpc === 'rat');
  useModalFocus(tvRef, !!tvVideo);
  useModalFocus(lyricsRef, !!lyricsSong);
  useModalFocus(lookableRef, !!openLookable);
  // One shallow-compared snapshot of the durable progress drives the whole
  // pause-menu game layer (luck, Pockets, Progress readout, To-Do, the locked-
  // door prompt). useShallow so re-rendering only happens when a field actually
  // changes — and never the getSnapshot-not-cached loop a fresh-object selector
  // would cause. Quest predicates take a whole Progress, which this is.
  const progress = useProgressStore(
    useShallow((s) => ({
      visits: s.visits,
      everEnteredWorld: s.everEnteredWorld,
      visitedRooms: s.visitedRooms,
      secretsFound: s.secretsFound,
      maxFloor: s.maxFloor,
      maxUnease: s.maxUnease,
      clearedGames: s.clearedGames,
      arcadeHigh: s.arcadeHigh,
      arcadeHighs: s.arcadeHighs,
      pizzaPointsBest: s.pizzaPointsBest,
      radioUnlocked: s.radioUnlocked,
      luckEarned: s.luckEarned,
      luckSpent: s.luckSpent,
      itemsHeld: s.itemsHeld,
      discoveredSongs: s.discoveredSongs,
      knownSpells: s.knownSpells,
      spellSlotsGained: s.spellSlotsGained,
      spellSlotsSpent: s.spellSlotsSpent,
      bestFortune: s.bestFortune,
      lootTotals: s.lootTotals,
    })),
  );
  // The one durable field WorldHud itself still needs (the locked-door prompt);
  // every other readout moved into PauseMenu / SpellHotbar with its JSX.
  const itemsHeld = progress.itemsHeld;
  // Transient announce toast (luck earned, a crit landed). Auto-dismissed below.
  const toast = useToastStore((s) => s.toast);
  const clearToast = useToastStore((s) => s.clear);

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
      // The dance rhythm minigame owns input while it's up: arrow keys feed the
      // copy (not movement, which is frozen), Esc steps away. Handled first so it
      // can't fall through to door/pause logic.
      const rhythm = useRhythmStore.getState();
      if (rhythm.active) {
        if (e.key === 'Escape') {
          rhythm.close();
          return;
        }
        const dir: Dir | null =
          e.key === 'ArrowUp'
            ? 'up'
            : e.key === 'ArrowDown'
              ? 'down'
              : e.key === 'ArrowLeft'
                ? 'left'
                : e.key === 'ArrowRight'
                  ? 'right'
                  : null;
        if (dir) {
          e.preventDefault();
          rhythm.press(dir);
        }
        return;
      }
      // No input during the door wipe OR a painting dive (E or Esc) — both are modal
      // transitions. Blocking Esc on divingTo too is what keeps pause from opening
      // mid-dive and stranding you in the old room after the album already started.
      if (st.transitioning || st.divingTo) return;
      if (e.key === 'Escape') {
        if (st.levelOverlay) st.closeLevel();
        else if (st.arcadeGame) st.closeArcade();
        else if (st.tvVideo) st.closeTv();
        else if (st.lyricsSong) st.closeLyrics();
        else if (st.openNpc) st.closeNpcDialog();
        else if (st.openHotspot) st.closeHotspotDialog();
        else if (st.openLookable) st.closeLookableDialog();
        else st.togglePaused();
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        // The context verb (door / TV / cabinet / hotspot / NPC / dance), shared
        // with the on-screen touch button so the two never drift.
        interactNearby();
      }
      // P grabs the nearest collectible (the keyboard path; walking onto it also
      // auto-grabs, and clicking still works). Shared with the touch grab button.
      if (e.key === 'p' || e.key === 'P') {
        grabNearby();
        return;
      }
      // A spell hotkey (f = fireball, l = light) casts that spell. Blocked in any
      // modal/pause; castSpell no-ops when the spell isn't learned, so an unbound
      // key is harmless. Same path as clicking the hotbar slot (keyboard parity).
      const spellForKey = SPELLS.find((sp) => sp.key === e.key.toLowerCase());
      if (spellForKey) {
        if (
          st.paused ||
          st.openHotspot ||
          st.tvVideo ||
          st.arcadeGame ||
          st.openNpc ||
          st.lyricsSong
        )
          return;
        castSpell(spellForKey.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Test hook (?world / ?debug): cast deterministically from a smoke. Optional id
  // casts a specific spell (the smoke tests the Light cantrip); bare = first known.
  useEffect(() => {
    exposeTestGlobal('__sdpCast', (id?: string) => (id ? castSpell(id) : castEquippedSpell()));
    return () => exposeTestGlobal('__sdpCast', undefined);
  }, []);

  // Test hook (?world / ?debug): open the lyrics reader on a known track so a smoke
  // can STACK it over the pause menu (the one real modal-stack in the app) and assert
  // the focus-trap discipline — that only the top dialog owns Tab. Benign (just opens
  // a read-only reader), so it rides ?world like __sdpCast. First track with words.
  useEffect(() => {
    exposeTestGlobal('__sdpOpenLyrics', () => {
      const slug = songsWithLyrics()[0];
      if (slug) useSceneStore.getState().openLyrics(slug);
    });
    return () => exposeTestGlobal('__sdpOpenLyrics', undefined);
  }, []);

  // Auto-dismiss the announce toast after a READING-TIME-aware beat: long messages
  // (the spell-learn line, the finale) linger so they can actually be read, while a
  // short "NAT 20!" keeps the snappy ~2.8s. ~55ms/char over a base, floored so short
  // ones don't regress and capped so nothing hangs. (Gentle fade via CSS; WCAG-safe,
  // no strobe — and longer-on-screen is strictly friendlier for slow readers.)
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => clearToast(), toastDurationMs(toast.msg));
    return () => window.clearTimeout(t);
  }, [toast, clearToast]);

  // Duck the RADIO (the user's music) while a SOUND-MAKER overlay is up — an arcade
  // game with its own notes/SFX (Jazz Snake, the chimes/cultures cabinets), a CRT
  // music video, or the call-and-response rhythm game — so their audio doesn't fight
  // the music. Restores the moment it closes; composes with music-room ducking.
  const soundMakerActive = !!arcadeGame || !!tvVideo || rhythmActive || !!levelOverlay;
  useEffect(() => {
    audio.suppressMusic(soundMakerActive);
  }, [soundMakerActive]);
  // Belt-and-suspenders: if the HUD unmounts (leaving the world) mid-sound-maker,
  // lift the duck so the storefront/loop isn't left silenced.
  useEffect(() => () => audio.suppressMusic(false), []);

  // Announce an objective the moment it ticks done (the Feedback pillar). Seed the
  // "already done" set on first run so re-entering the world doesn't replay old
  // completions, and fire on a short delay so the action's own toast (e.g. the
  // pickup/luck one that COMPLETED the quest) shows first, then the ✓ confirmation.
  const prevDone = useRef<Set<string> | null>(null);
  useEffect(() => {
    const doneNow = new Set(QUESTS.filter((q) => q.done(progress)).map((q) => q.id));
    if (prevDone.current === null) {
      prevDone.current = doneNow;
      return;
    }
    const fresh = [...doneNow].filter((id) => !prevDone.current!.has(id));
    prevDone.current = doneNow;
    if (!fresh.length) return;
    const label = QUESTS.find((q) => q.id === fresh[0])?.label ?? 'an objective';
    const t = window.setTimeout(() => announce(`✓ ${label}`, 'luck'), 1500);
    return () => window.clearTimeout(t);
  }, [progress]);

  // THE FINALE (the win arc): the moment EVERY objective is done, fire it once —
  // a fanfare + a sweet toast, a luck bonus, and every wanderer in the room breaks
  // into a group dance (triggerFinale). Durable 'finale' secret gates it to once
  // ever; prevWasComplete seeds on mount so re-entering already-complete is silent.
  const prevComplete = useRef<boolean | null>(null);
  const firedFinale = useRef(false);
  useEffect(() => {
    const complete = allQuestsDone(progress);
    if (prevComplete.current === null) {
      // Seed on mount: re-entering already-finished never re-fires.
      prevComplete.current = complete;
      firedFinale.current = complete && progress.secretsFound.includes('finale');
      return;
    }
    const justNow = complete && !prevComplete.current;
    prevComplete.current = complete;
    if (!justNow || firedFinale.current || progress.secretsFound.includes('finale')) return;
    // firedFinale + the durable secret guard against the re-run our OWN gainLuck(5)
    // triggers; the announce is fire-and-forget (no cleanup) so that re-run can't
    // cancel it. Delayed past the per-objective ✓ toast so the ★ lands last.
    firedFinale.current = true;
    useProgressStore.getState().findSecret('finale');
    useProgressStore.getState().gainLuck(5);
    useSceneStore.getState().triggerFinale();
    audio.unlock();
    audio.playChime(noteToFreq('C', 5), -0.2, 0.14, 1.6);
    audio.playChime(noteToFreq('E', 5), 0, 0.14, 1.6);
    audio.playChime(noteToFreq('G', 5), 0.1, 0.14, 1.8);
    audio.playChime(noteToFreq('C', 6), 0.2, 0.12, 2);
    window.setTimeout(
      () => announce('★ You’ve seen it all — for now. The rat’s proud. · +5 luck', 'crit-good'),
      1800,
    );
  }, [progress]);

  const nearHs = near ? HOTSPOTS.find((h) => h.id === near) : undefined;
  const openHs = open ? HOTSPOTS.find((h) => h.id === open) : undefined;
  const openDest = openHs ? destById(openHs.destId) : undefined;

  // The objective chip and the announce toast both live top-centre; when the chip
  // is actually on screen it can stand two rows tall, so drop the toast below it
  // (a modifier class) instead of letting them overlap. Mirror ObjectiveHud's own
  // visibility test so the toast only moves when the chip is really there.
  const objectiveHidden =
    paused || !!pendingRoom || !!open || !!tvVideo || !!arcadeGame || !!levelOverlay;
  const objectiveShowing = objectiveChipVisible(progress, {
    on: objectiveHudOn,
    hidden: objectiveHidden,
  });

  return (
    <>
      <ObjectiveHud progress={progress} currentRoom={currentRoom} hidden={objectiveHidden} />
      <ScoreHud hidden={objectiveHidden} />
      <RaceHud hidden={objectiveHidden} />
      <RhythmGame />
      {toast && (
        <div
          className={`hud-toast hud-toast--${toast.kind}${objectiveShowing ? ' hud-toast--below-objective' : ''}`}
          role="status"
          key={toast.id}
        >
          {toast.msg}
        </div>
      )}

      <WelcomeOverlay />
      <ControlHint />
      <FinaleCard />

      {!pendingRoom && (
        <div className="hud-room" aria-hidden="true">
          {roomById(currentRoom).title}
        </div>
      )}

      <SpellHotbar />

      {nearDoor &&
        !open &&
        !paused &&
        !pendingRoom &&
        (nearDoor.requiresKey && !itemsHeld.includes(nearDoor.requiresKey) ? (
          <div className="hud-prompt hud-prompt--door hud-prompt--locked">
            🔒 Locked — need the {itemById(nearDoor.requiresKey)?.label ?? 'right key'}
          </div>
        ) : (
          <div className="hud-prompt hud-prompt--door">Press E to {nearDoor.label}</div>
        ))}

      {/* The escape-room bell/switch prompt — ranks just under a door (matches
          worldActions.interactNearby), so ringing it answers the same Press E. */}
      {nearInteractable && !nearDoor && !open && !paused && !pendingRoom && (
        <div className="hud-prompt hud-prompt--interact">Press E to {nearInteractable.label}</div>
      )}

      {nearTv && !nearDoor && !nearInteractable && !open && !paused && !pendingRoom && (
        <div className="hud-prompt hud-prompt--tv">Press E to switch on the TV</div>
      )}

      {nearArcade &&
        !nearDoor &&
        !nearInteractable &&
        !nearTv &&
        !open &&
        !paused &&
        !pendingRoom && <div className="hud-prompt hud-prompt--arcade">Press E to play</div>}

      {nearBooth &&
        !nearDoor &&
        !nearInteractable &&
        !nearTv &&
        !nearArcade &&
        !open &&
        !paused &&
        !pendingRoom && (
          <div className="hud-prompt hud-prompt--arcade">Press E to try the Pizza Cam™</div>
        )}

      {nearHs &&
        !nearDoor &&
        !nearInteractable &&
        !nearTv &&
        !nearArcade &&
        !nearBooth &&
        !open &&
        !paused &&
        !pendingRoom && <div className="hud-prompt">{nearHs.prompt}</div>}

      {nearNpc &&
        !nearDoor &&
        !nearInteractable &&
        !nearTv &&
        !nearBooth &&
        !nearHs &&
        !open &&
        !openNpc &&
        !paused &&
        !pendingRoom && (
          <div className="hud-prompt hud-prompt--npc">Press E to talk to {nearNpc.label}</div>
        )}

      {nearEntity &&
        !nearDoor &&
        !nearInteractable &&
        !nearTv &&
        !nearBooth &&
        !nearHs &&
        !nearNpc &&
        !open &&
        !paused &&
        !pendingRoom &&
        !rhythmActive && (
          <div className="hud-prompt hud-prompt--dance">
            Press E to dance along with {nearEntity.label}
          </div>
        )}

      {/* Pickups are ambient + everywhere, so the grab prompt is the LOWEST priority:
          a fixed fixture (door / TV / cabinet / hotspot / NPC / dance) always shows
          its own prompt first. Grabbing still works regardless — P reads nearPickup
          directly and walk-over auto-grabs — so a suppressed prompt never blocks a
          pickup. */}
      {nearPickup &&
        !nearDoor &&
        !nearInteractable &&
        !nearTv &&
        !nearArcade &&
        !nearBooth &&
        !nearHs &&
        !nearNpc &&
        !nearEntity &&
        !open &&
        !paused &&
        !pendingRoom && (
          <div className="hud-prompt hud-prompt--pickup">
            Press P to grab {nearPickup.glyph} {nearPickup.label}
          </div>
        )}

      {/* Flavor curios are the LOWEST-priority prompt: only when nothing else
          (door / TV / cabinet / hotspot / NPC / dance / pickup) is in reach. */}
      {nearLookable &&
        !nearDoor &&
        !nearInteractable &&
        !nearTv &&
        !nearArcade &&
        !nearBooth &&
        !nearHs &&
        !nearNpc &&
        !nearEntity &&
        !nearPickup &&
        !open &&
        !openLookable &&
        !paused &&
        !pendingRoom &&
        (() => {
          const L = lookableById(nearLookable);
          return (
            <div className="hud-prompt hud-prompt--look">{L?.prompt ?? 'Press E to look'}</div>
          );
        })()}

      {openDest && (
        <div
          className={`hud-dialog window${openDest.id === 'videos' ? ' hud-dialog--tv' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={openDest.label}
          ref={hotspotRef}
        >
          <div className="title-bar">
            <div className="title-bar-text">{openDest.label}</div>
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={closeDialog} />
            </div>
          </div>
          <div className="window-body">
            {openDest.id === 'videos' ? (
              <YoutubeFacade />
            ) : (
              <>
                <p>{openDest.blurb}</p>
                <p>
                  <a href={openDest.href} target="_blank" rel="noopener noreferrer">
                    Open &raquo;
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* A lookable's short story — a plain 98.css window, no link, just flavor. */}
      {openLookable &&
        (() => {
          const L = lookableById(openLookable);
          if (!L) return null;
          return (
            <div
              className="hud-dialog window"
              role="dialog"
              aria-modal="true"
              aria-label={L.label}
              ref={lookableRef}
            >
              <div className="title-bar">
                <div className="title-bar-text">
                  {L.glyph} {L.label}
                </div>
                <div className="title-bar-controls">
                  <button aria-label="Close" onClick={closeLookable} />
                </div>
              </div>
              <div className="window-body">
                <p>{L.story}</p>
                <p>
                  <button onClick={closeLookable}>…huh</button>
                </p>
              </div>
            </div>
          );
        })()}

      {openNpc === 'rat' &&
        (() => {
          const lines = ratDialogue(progress);
          return (
            <div
              className="hud-dialog window"
              role="dialog"
              aria-modal="true"
              aria-label="the rat"
              ref={npcRef}
            >
              <div className="title-bar">
                <div className="title-bar-text">🐀 the rat</div>
                <div className="title-bar-controls">
                  <button aria-label="Close" onClick={closeNpc} />
                </div>
              </div>
              <div className="window-body">
                <p>{lines.greeting}</p>
                <p className="hud-dialog__nudge">{lines.nudge}</p>
                <p className="hud-dialog__tidbit">
                  <span aria-hidden="true">🐀</span> <i>{lines.tidbit}</i>
                </p>
                <p>
                  <button onClick={closeNpc}>…thanks, rat</button>
                </p>
              </div>
            </div>
          );
        })()}

      {tvVideo && (
        <div
          className="hud-dialog window hud-dialog--tv"
          role="dialog"
          aria-modal="true"
          aria-label={tvVideo.title}
          ref={tvRef}
        >
          <div className="title-bar">
            <div className="title-bar-text">{tvVideo.title}</div>
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={closeTv} />
            </div>
          </div>
          <div className="window-body">
            <YoutubeFacade video={tvVideo} />
          </div>
        </div>
      )}

      {arcadeGame && <ArcadeModal id={arcadeGame} onClose={closeArcade} />}

      {/* A door opened a full-screen LEVEL — the 1101 text adventure. */}
      {levelOverlay === 'save-san-diego' && <SaveSanDiegoLevel onClose={closeLevel} />}

      {/* The lyric reader — opened from the pause menu's "read the words". A plain
          98.css window over the menu; the words scroll. (Luke's copyright, shown
          with a quiet credit.) */}
      {lyricsSong &&
        (() => {
          const L = lyricFor(lyricsSong);
          if (!L) return null;
          return (
            <div
              className="hud-dialog hud-dialog--lyrics window"
              role="dialog"
              aria-modal="true"
              aria-label={L.title}
              ref={lyricsRef}
            >
              <div className="title-bar">
                <div className="title-bar-text">♪ {L.title}</div>
                <div className="title-bar-controls">
                  <button
                    aria-label="Close"
                    onClick={() => useSceneStore.getState().closeLyrics()}
                  />
                </div>
              </div>
              <div className="window-body">
                {L.meaning && <p className="hud-lyrics__meaning">{L.meaning}</p>}
                <pre className="hud-lyrics__words">{L.lyrics}</pre>
                <p className="hud-lyrics__credit">
                  © Luke F. Walton dba Scoobert Doobert. All rights reserved.
                </p>
              </div>
            </div>
          );
        })()}

      <PauseMenu />

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
