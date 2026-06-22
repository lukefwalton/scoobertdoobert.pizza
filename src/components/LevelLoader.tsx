import { useEffect, useRef } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { useLevelStore } from '../state/levelStore';
import { roomById, FIRST_ROOM } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// LevelLoader — GLB levels now AUTO-ENTER (Luke: the loads are fast enough that the
// old loader minigame just broke the flow rather than adding anything). The instant
// the asset resolves, GlbRoom flips levelStore.ready, this overlay clears, and
// Controls unfreezes input off that same `ready` — no minigame, no tap-to-enter, no
// separate `entered` flag. A calm panel covers a SLOW load; a FAILED load offers
// TURN BACK so a broken asset can never trap the player. Mounted in WorldMount.
// ───────────────────────────────────────────────────────────────────────────
export function LevelLoader() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const goToRoom = useSceneStore((s) => s.goToRoom);
  const ready = useLevelStore((s) => s.ready);
  const error = useLevelStore((s) => s.error);
  const room = roomById(currentRoom);
  const isGlb = !!room.glb;
  // Latches a TURN BACK so repeated clicks can't enqueue overlapping recovery polls;
  // abortTimer holds the pending poll so a stale one can't fire after we've moved on.
  const aborting = useRef(false);
  const abortTimer = useRef<number | undefined>(undefined);
  // Focus the recovery button when the error overlay appears, so a failed load is
  // recoverable by KEYBOARD (Enter/Space) and a screen reader lands on the way out —
  // the old loader had a global Enter handler; an autofocused button replaces it.
  const errBtn = useRef<HTMLButtonElement>(null);

  // New room → clear the overlay state. Does NOT touch `ready` (GlbRoom owns that via
  // mount/unmount — see levelStore — which is what makes cached re-entry safe).
  useEffect(() => {
    aborting.current = false;
    if (abortTimer.current !== undefined) window.clearTimeout(abortTimer.current);
    useLevelStore.getState().prepareForRoom();
  }, [currentRoom]);

  useEffect(
    () => () => {
      if (abortTimer.current !== undefined) window.clearTimeout(abortTimer.current);
    },
    [],
  );

  // Move focus to the recovery button the moment the error overlay shows, so a broken
  // load is escapable with the keyboard alone (Enter/Space) and screen readers land
  // on the action — not just clickable with a mouse.
  useEffect(() => {
    if (error) errBtn.current?.focus();
  }, [error]);

  // Loaded (or not a GLB room) → no overlay at all.
  if (!isGlb || (ready && !error)) return null;

  // Recovery: bounce out the room's EXPLICIT recover target if it has one, else its
  // first door, else the shop — waiting out the entry wipe so goToRoom isn't
  // swallowed by its `transitioning` debounce.
  const onAbort = () => {
    if (aborting.current) return;
    aborting.current = true;
    const go = () => {
      if (useSceneStore.getState().transitioning) {
        abortTimer.current = window.setTimeout(go, 60);
        return;
      }
      const recover = room.glb?.recoverTo;
      if (recover) goToRoom(recover.to, recover.spawn ?? 'default');
      else if (room.doors[0]) goToRoom(room.doors[0].to, room.doors[0].toSpawn ?? 'default');
      else goToRoom(FIRST_ROOM, 'default');
    };
    go();
  };

  if (error) {
    return (
      <div className="level-loader" data-level-loader data-loader-state="error" role="alert">
        <div className="level-loader__panel">
          <p className="level-loader__title">Couldn’t load {room.title}.</p>
          <button ref={errBtn} type="button" className="level-loader__btn" onClick={onAbort}>
            Turn back
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="level-loader" data-level-loader data-loader-state="loading" aria-live="polite">
      <div className="level-loader__panel">
        <p className="level-loader__title">Loading {room.title}…</p>
      </div>
    </div>
  );
}
