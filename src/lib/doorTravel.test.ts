import { describe, it, expect, beforeEach, vi } from 'vitest';

// enterDoor talks to the audio engine + the dive ripple; neither belongs in a
// pure unit test, so stub them. The store logic (lock check + goToRoom) is real.
vi.mock('../audio/engine', () => ({
  audio: { unlock: vi.fn(), playChime: vi.fn() },
}));
const diveInto = vi.fn();
vi.mock('./dive', () => ({ diveInto: (...a: unknown[]) => diveInto(...a) }));

import { enterDoor, doorLocked } from './doorTravel';
import { useProgressStore } from '../state/progressStore';
import { useSceneStore } from '../state/sceneStore';

const KEY = 'pool-locker-key';

beforeEach(() => {
  useProgressStore.setState({ itemsHeld: [] });
  useSceneStore.setState({ pendingRoom: null, transitioning: false });
  diveInto.mockClear();
});

describe('enterDoor key lock', () => {
  it('blocks a locked door when the key is missing — no navigation', () => {
    const ok = enterDoor({ to: 'lockerroom', spawn: 'fromPool', requiresKey: KEY });
    expect(ok).toBe(false);
    expect(useSceneStore.getState().pendingRoom).toBeNull();
    expect(useSceneStore.getState().transitioning).toBe(false);
  });

  it('opens the same door once the key is held', () => {
    useProgressStore.getState().collectItem(KEY);
    const ok = enterDoor({ to: 'lockerroom', spawn: 'fromPool', requiresKey: KEY });
    expect(ok).toBe(true);
    expect(useSceneStore.getState().pendingRoom).toEqual({ to: 'lockerroom', spawn: 'fromPool' });
  });

  it('an ordinary (keyless) door always opens', () => {
    const ok = enterDoor({ to: 'jukebox', spawn: 'fromHall' });
    expect(ok).toBe(true);
    expect(useSceneStore.getState().pendingRoom).toEqual({ to: 'jukebox', spawn: 'fromHall' });
  });

  it('a painting portal dives instead of wiping (and honors the lock)', () => {
    enterDoor({ to: 'frutiger', spawn: 'default', albumSlug: 'moonlight-beach' });
    expect(diveInto).toHaveBeenCalledWith('moonlight-beach', 'frutiger', 'default');
  });

  it('doorLocked reflects whether the key is held', () => {
    expect(doorLocked({ requiresKey: KEY })).toBe(true);
    useProgressStore.getState().collectItem(KEY);
    expect(doorLocked({ requiresKey: KEY })).toBe(false);
    expect(doorLocked({ requiresKey: undefined })).toBe(false);
  });
});
