import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useModalFocus } from '../lib/useModalFocus';
import { useSceneStore } from '../state/sceneStore';
import { useAudioStore } from '../state/audioStore';
import { useMusicStore } from '../state/musicStore';
import { useProgressStore, selectLuck, selectSpellSlots } from '../state/progressStore';
import { useScoreStore } from '../state/scoreStore';
import { LOOP_OPTIONS } from '../data/music';
import { ROOMS } from '../data/rooms';
import { itemById, CASSETTE_IDS } from '../data/items';
import { LOOT } from '../data/loot';
import { fortuneByRank } from '../data/omikuji';
import { SPELLS, SPELL_SLOTS_MAX, isCantrip } from '../data/spells';
import { songMeaning } from '../data/songMeta';
import { hasLyrics } from '../data/lyrics';
import { questStatus, completionPct, allQuestsDone } from '../data/quests';
import { dancedCount } from '../lib/danceAlong';
import { shareResult } from '../lib/share';
import { audio } from '../audio/engine';
import { WorldMap } from './WorldMap';
import { LeaderboardPanel } from './LeaderboardPanel';

// ───────────────────────────────────────────────────────────────────────────
// PauseMenu — the game-style pause overlay (Esc): the RPG-layer readout — luck,
// the spell grimoire, Pockets, the Progress tallies, the To-Do quest list, the
// world map, the leaderboard, the radio — plus the mute / objective / exit
// actions. The way out is "Return to storefront" (back to the dead-plain menu +
// /text, which stay the full crawlable destination list); the pause menu no
// longer duplicates the whole links.ts menu inline (Luke, 2026-07).
//
// Self-sufficient: it subscribes to its own progress + scene + audio + music
// slices and renders only while paused, so it lifts out of WorldHud cleanly. The
// one shallow progress snapshot drives every derived stat (and the quest
// predicates, which take a whole Progress — which this is).
// ───────────────────────────────────────────────────────────────────────────

export function PauseMenu() {
  const paused = useSceneStore((s) => s.paused);
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const setPaused = useSceneStore((s) => s.setPaused);
  const exitWorld = useSceneStore((s) => s.exitWorld);
  const objectiveHudOn = useSceneStore((s) => s.objectiveHudOn);
  const toggleObjectiveHud = useSceneStore((s) => s.toggleObjectiveHud);
  const openLyrics = useSceneStore((s) => s.openLyrics);

  // Modal a11y: this is the "accessibility guarantee" per CLAUDE.md, so it must
  // trap focus while open + restore it on close (Escape is handled by WorldHud's
  // global key handler, so no onEscape here). Called before the early return so
  // the hook order is stable; `paused` is the open flag.
  const panelRef = useRef<HTMLDivElement>(null);
  useModalFocus(panelRef, paused);

  const muted = useAudioStore((s) => s.muted);
  const audioReady = useAudioStore((s) => s.ready);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  // The arcade run score (ephemeral) + this-session combo, alongside the durable best.
  const runScore = useScoreStore((s) => s.score);
  const bestCombo = useScoreStore((s) => s.bestCombo);
  const nowPlaying = useMusicStore((s) => s.title);
  const musicIndex = useMusicStore((s) => s.index);
  const shiftSong = useMusicStore((s) => s.shift);
  const playingSlug = LOOP_OPTIONS[musicIndex]?.slug ?? null;

  // One shallow snapshot of the durable progress drives the whole readout (and the
  // quest predicates, which take a whole Progress — which this is).
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
      restoredSongs: s.restoredSongs,
      knownSpells: s.knownSpells,
      spellSlotsGained: s.spellSlotsGained,
      spellSlotsSpent: s.spellSlotsSpent,
      bestFortune: s.bestFortune,
      lootTotals: s.lootTotals,
    })),
  );

  if (!paused) return null;

  const luck = selectLuck(progress);
  const learnedSpells = SPELLS.filter((sp) => progress.knownSpells.includes(sp.id));
  const spellSlots = selectSpellSlots(progress);
  const itemsHeld = progress.itemsHeld;
  const visitedRooms = progress.visitedRooms;
  const tapesHeld = CASSETTE_IDS.filter((id) => itemsHeld.includes(id)).length;
  const radioUnlocked = progress.radioUnlocked;

  return (
    <div className="hud-pause" role="dialog" aria-modal="true" aria-label="Paused" ref={panelRef}>
      <div className="hud-pause__panel window">
        <div className="title-bar">
          <div className="title-bar-text">Paused</div>
        </div>
        <div className="window-body">
          <p className="hud-pause__hint">Return to the storefront for the full menu.</p>
          <p className="hud-pause__luck" title="Earned by rituals; the dice spend it for you">
            <span aria-hidden="true">🍀</span> Luck <strong>{luck}</strong>
          </p>
          <p
            className="hud-pause__luck"
            title="Points from hoovering loot this descent — pizza, surfboards, sushi… Your best is saved for the leaderboard."
          >
            <span aria-hidden="true">🍕</span> Pizza Points{' '}
            <strong>{runScore.toLocaleString()}</strong>{' '}
            <span className="hud-pause__best">
              (best {progress.pizzaPointsBest.toLocaleString()}
              {bestCombo > 1 ? ` · ×${bestCombo} combo` : ''})
            </span>
          </p>
          {learnedSpells.map((sp) => (
            <p
              key={sp.id}
              className="hud-pause__luck"
              title={`${sp.school} · ${sp.blurb} — press ${sp.key.toUpperCase()} to cast${
                isCantrip(sp) ? '' : '; rest to recharge'
              }`}
            >
              <span aria-hidden="true">{sp.glyph}</span> {sp.name}{' '}
              <strong>{isCantrip(sp) ? '∞' : `${spellSlots}/${SPELL_SLOTS_MAX}`}</strong>
            </p>
          ))}
          {itemsHeld.length > 0 && (
            <div className="hud-pause__inventory">
              <p className="hud-pause__invtitle">Pockets</p>
              <ul className="hud-pause__invlist">
                {itemsHeld.map((id) => {
                  const item = itemById(id);
                  if (!item) return null;
                  return (
                    <li key={id} title={item.blurb}>
                      <span aria-hidden="true">{item.glyph}</span> {item.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {/* The TROPHY CASE — the lifetime haul (pizza slices etc.) + your best shrine
              fortune, the pause-menu twin of the 3D case back in the shop lobby. Only
              shows once you've collected/drawn something. */}
          {(Object.values(progress.lootTotals).some((n) => n > 0) || progress.bestFortune > 0) && (
            <div className="hud-pause__inventory">
              <p className="hud-pause__invtitle">Trophy case</p>
              <ul className="hud-pause__invlist">
                {LOOT.filter((l) => (progress.lootTotals[l.id] ?? 0) > 0).map((l) => (
                  <li key={l.id} title={`${progress.lootTotals[l.id]} collected, all-time`}>
                    <span aria-hidden="true">{l.glyph}</span> {l.label} ×{progress.lootTotals[l.id]}
                  </li>
                ))}
                {progress.bestFortune > 0 &&
                  (() => {
                    const f = fortuneByRank(progress.bestFortune);
                    return f ? (
                      <li title={`Your best shrine fortune: ${f.jp} ${f.en}`}>
                        <span aria-hidden="true">🎴</span> Best fortune {f.jp} {f.en}
                      </li>
                    ) : null;
                  })()}
              </ul>
            </div>
          )}
          <div className="hud-pause__progress" title="What you've turned up so far">
            <span>
              Rooms <strong>{visitedRooms.length}</strong>/{ROOMS.length}
            </span>
            <span>
              Secrets <strong>{progress.secretsFound.length}</strong>
            </span>
            <span>
              Games <strong>{progress.clearedGames.length}</strong>
            </span>
            {dancedCount(progress.secretsFound) > 0 && (
              <span>
                Danced <strong>{dancedCount(progress.secretsFound)}</strong>
              </span>
            )}
            {tapesHeld > 0 && (
              <span>
                Tapes{' '}
                <strong>
                  {tapesHeld}/{CASSETTE_IDS.length}
                </strong>
              </span>
            )}
          </div>
          <div className="hud-pause__todo">
            <p className="hud-pause__invtitle">
              To-Do{' '}
              <span className="hud-pause__todocount">
                {allQuestsDone(progress)
                  ? `★ ${completionPct(progress)}% — seen it all`
                  : `${completionPct(progress)}%`}
              </span>
            </p>
            <ul className="hud-pause__todolist">
              {questStatus(progress).map(({ quest, done }) => (
                <li
                  key={quest.id}
                  className={done ? 'is-done' : ''}
                  title={done ? 'Done' : quest.hint}
                >
                  <span aria-hidden="true">{done ? '✓' : '○'}</span> {quest.label}
                </li>
              ))}
            </ul>
          </div>
          <WorldMap visited={visitedRooms} current={currentRoom} />
          {/* The arcade leaderboard — sign your best PIZZA POINTS with three letters.
              Submit-only here (loadBoard={false}): opening the menu never hits the
              backend; the full ranked board is one tap away on /leaderboard. */}
          <LeaderboardPanel score={progress.pizzaPointsBest} showFullLink loadBoard={false} />
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
          {/* The current track's one-line liner note (what it's about) — the
              reward-is-sound spine, annotated. From songMeta (lfw). */}
          {playingSlug && songMeaning(playingSlug) && (
            <p className="hud-pause__songmeaning">{songMeaning(playingSlug)}</p>
          )}
          {/* Read along with whatever's playing — the words are a reward too.
              Shown whenever the current track has lyrics on file (not gated by
              the radio upgrade; reading is always allowed). */}
          {hasLyrics(playingSlug) && (
            <button
              className="hud-pause__lyricsbtn"
              onClick={() => openLyrics(playingSlug!)}
              title="Read the words to this song"
            >
              📜 read the words
            </button>
          )}
          <div className="hud-pause__actions">
            <button onClick={() => toggleObjectiveHud()}>
              ◎ objective: {objectiveHudOn ? 'on' : 'off'}
            </button>
            <button
              disabled={!audioReady}
              onClick={() => {
                audio.unlock();
                toggleMute();
              }}
            >
              ♪ music: {!audioReady ? 'loading…' : muted ? 'off' : 'on'}
            </button>
            <button
              onClick={() => {
                const pct = completionPct(progress);
                const secrets = progress.secretsFound.length;
                const best = progress.pizzaPointsBest.toLocaleString();
                const text = allQuestsDone(progress)
                  ? `🍕 I've seen it all on scoobertdoobert.pizza — 100%, ${secrets} secrets, best ${best} pizza points. Come get haunted:`
                  : `🍕 I'm ${pct}% into scoobertdoobert.pizza — ${visitedRooms.length} rooms, ${secrets} secrets, best ${best} pizza points. Come explore:`;
                void shareResult(text);
              }}
            >
              ↗ share
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
  );
}
