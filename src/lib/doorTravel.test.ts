import { describe, it, expect, beforeEach, vi } from 'vitest';

// enterDoor talks to the audio engine + the dive ripple; neither belongs in a
// pure unit test, so stub them. The store logic (goToRoom / openLevel) is real.
const playDoorThunk = vi.fn();
vi.mock('../audio/engine', () => ({
  audio: {
    unlock: vi.fn(),
    playDoorThunk: (...a: unknown[]) => playDoorThunk(...a),
  },
}));
const diveInto = vi.fn();
vi.mock('./dive', () => ({ diveInto: (...a: unknown[]) => diveInto(...a) }));

import { enterDoor } from './doorTravel';
import { useSceneStore } from '../state/sceneStore';

beforeEach(() => {
  useSceneStore.setState({ pendingRoom: null, transitioning: false, levelOverlay: null });
  diveInto.mockClear();
  playDoorThunk.mockClear();
});

describe('enterDoor', () => {
  it('a plain doorway wipes to the target — and thunks', () => {
    enterDoor({ to: 'jukebox', spawn: 'fromHall' });
    expect(useSceneStore.getState().pendingRoom).toEqual({ to: 'jukebox', spawn: 'fromHall' });
    expect(playDoorThunk).toHaveBeenCalledTimes(1); // the plain doorway "chunk"
  });

  it('a painting portal dives instead of wiping — no thunk', () => {
    enterDoor({ to: 'frutiger', spawn: 'default', albumSlug: 'moonlight-beach' });
    expect(diveInto).toHaveBeenCalledWith('moonlight-beach', 'frutiger', 'default');
    expect(playDoorThunk).not.toHaveBeenCalled(); // the dive carries its own drama
  });

  it('a level door raises an overlay in place — no wipe, no thunk', () => {
    enterDoor({ to: 'tapevault', spawn: 'default', opensLevel: 'save-san-diego' });
    expect(useSceneStore.getState().levelOverlay).toBe('save-san-diego');
    expect(useSceneStore.getState().pendingRoom).toBeNull(); // didn't travel
    expect(playDoorThunk).not.toHaveBeenCalled();
  });
});
