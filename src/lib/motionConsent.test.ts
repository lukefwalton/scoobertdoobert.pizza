import { describe, it, expect, afterEach } from 'vitest';
import { hasMotionConsent, grantMotionConsent } from './motionConsent';

// The reduced-motion opt-in memory. The node test env has no sessionStorage, so
// each test installs the exact storage shape it needs (a working one, an absent
// one, a throwing one) and restores the global afterward. This locks the try/catch
// guard that exists for Safari private mode / storage-disabled browsers.
const g = globalThis as unknown as { sessionStorage?: Storage };
const real = g.sessionStorage;
afterEach(() => {
  g.sessionStorage = real;
});

function installWorkingStorage() {
  const m = new Map<string, string>();
  g.sessionStorage = {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

function installThrowingStorage() {
  g.sessionStorage = {
    getItem: () => {
      throw new Error('SecurityError: storage disabled');
    },
    setItem: () => {
      throw new Error('SecurityError: storage disabled');
    },
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

describe('motionConsent', () => {
  it('is false on a fresh store, true after granting (round-trip)', () => {
    installWorkingStorage();
    expect(hasMotionConsent()).toBe(false);
    grantMotionConsent();
    expect(hasMotionConsent()).toBe(true);
  });

  it('reports false when storage is unavailable (no throw)', () => {
    g.sessionStorage = undefined;
    expect(hasMotionConsent()).toBe(false);
    expect(() => grantMotionConsent()).not.toThrow();
  });

  it('swallows a throwing storage (Safari private mode) rather than crashing the gate', () => {
    installThrowingStorage();
    expect(hasMotionConsent()).toBe(false); // read is guarded
    expect(() => grantMotionConsent()).not.toThrow(); // write is guarded
  });
});
