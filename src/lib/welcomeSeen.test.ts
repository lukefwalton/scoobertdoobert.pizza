import { describe, it, expect, afterEach } from 'vitest';
import { welcomeSeen, markWelcomeSeen } from './welcomeSeen';

// The once-per-visit memory of the Scoobertverse welcome card. Same shape as the
// motionConsent test: the node env has no sessionStorage, so each test installs the
// exact storage it needs (working / absent / throwing) and restores it after. Locks
// the try/catch guard for Safari private mode / storage-disabled browsers.
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

describe('welcomeSeen', () => {
  it('is false on a fresh visit, true after the card has played (round-trip)', () => {
    installWorkingStorage();
    expect(welcomeSeen()).toBe(false);
    markWelcomeSeen();
    expect(welcomeSeen()).toBe(true);
  });

  it('reports false when storage is unavailable (no throw)', () => {
    g.sessionStorage = undefined;
    expect(welcomeSeen()).toBe(false);
    expect(() => markWelcomeSeen()).not.toThrow();
  });

  it('swallows a throwing storage (Safari private mode) rather than crashing the HUD', () => {
    installThrowingStorage();
    expect(welcomeSeen()).toBe(false);
    expect(() => markWelcomeSeen()).not.toThrow();
  });
});
