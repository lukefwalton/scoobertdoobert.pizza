import { describe, it, expect, afterEach } from 'vitest';
import { getCameraChoice, armCamera, declineCamera } from './cameraConsent';

// The Pizza Cam opt-in memory — same storage-shape drill as motionConsent.test:
// the node env has no sessionStorage, so each test installs the shape it needs
// and restores the global afterward, locking the try/catch guards.
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

describe('cameraConsent', () => {
  it('is null on a fresh visit; arm and decline round-trip', () => {
    installWorkingStorage();
    expect(getCameraChoice()).toBe(null);
    armCamera();
    expect(getCameraChoice()).toBe('armed');
    declineCamera();
    expect(getCameraChoice()).toBe('declined');
  });

  it('a corrupted stored value reads as null (never a surprise arm)', () => {
    installWorkingStorage();
    sessionStorage.setItem('sdp:camera-choice', 'banana');
    expect(getCameraChoice()).toBe(null);
  });

  it('reports null when storage is unavailable (no throw)', () => {
    g.sessionStorage = undefined;
    expect(getCameraChoice()).toBe(null);
    expect(() => armCamera()).not.toThrow();
    expect(() => declineCamera()).not.toThrow();
  });

  it('swallows a throwing storage (Safari private mode)', () => {
    installThrowingStorage();
    expect(getCameraChoice()).toBe(null);
    expect(() => armCamera()).not.toThrow();
    expect(() => declineCamera()).not.toThrow();
  });
});
