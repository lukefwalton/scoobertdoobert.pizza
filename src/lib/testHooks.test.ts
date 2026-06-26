import { describe, it, expect, afterEach } from 'vitest';
import { exposeTestGlobal, isTestEntrance, isDebugEntrance } from './testHooks';

// Proves the centralized gate: exposeTestGlobal (which every __sdp* hook rides,
// including the arcade force-lose hooks) NEVER leaks a global outside the ?world /
// ?debug test entrances. The node env has no window, so we install a minimal mock
// with a settable location.search.

type WinShape = { location: { search: string }; [k: string]: unknown };
const g = globalThis as unknown as { window?: WinShape };
const realWindow = g.window;
const setSearch = (search: string) => {
  g.window = { location: { search } };
};
afterEach(() => {
  g.window = realWindow;
});

describe('exposeTestGlobal gating', () => {
  it('is a NO-OP outside a test entrance — a hook never reaches a normal session', () => {
    setSearch('');
    expect(isTestEntrance()).toBe(false);
    exposeTestGlobal('__sdpUnitProbe', 123);
    expect(g.window!.__sdpUnitProbe).toBeUndefined();
  });

  it('exposes the global on the ?debug entrance, and removes it when set to undefined', () => {
    setSearch('?debug=1');
    expect(isDebugEntrance()).toBe(true);
    exposeTestGlobal('__sdpUnitProbe', 123);
    expect(g.window!.__sdpUnitProbe).toBe(123);
    exposeTestGlobal('__sdpUnitProbe', undefined); // undefined REMOVES it (presence checks)
    expect('__sdpUnitProbe' in g.window!).toBe(false);
  });

  it('also exposes on the wider ?world entrance (read-only state globals ride it)', () => {
    setSearch('?world=1');
    expect(isTestEntrance()).toBe(true);
    expect(isDebugEntrance()).toBe(false); // ?world is NOT the debug gate
    exposeTestGlobal('__sdpUnitProbe2', 'x');
    expect(g.window!.__sdpUnitProbe2).toBe('x');
  });

  it('a bare query (e.g. ?worldly) does not satisfy the gate (word-boundary match)', () => {
    setSearch('?worldly=1');
    expect(isTestEntrance()).toBe(false);
    exposeTestGlobal('__sdpUnitProbe3', 1);
    expect(g.window!.__sdpUnitProbe3).toBeUndefined();
  });
});
