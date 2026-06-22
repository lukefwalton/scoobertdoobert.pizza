import { describe, it, expect, beforeEach, vi } from 'vitest';

// The durable store reads/writes localStorage, which the node test env lacks — so
// give it a tiny in-memory one (matching real browser behaviour) and re-import the
// store fresh per test (it's a module singleton). This covers the luck ECONOMY +
// the cross-tab merge fix (the spend path + the read-fresh-disk accumulation).

const KEY = 'sdp_progress_v1';

class MemStorage {
  store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
  clear(): void {
    this.store.clear();
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: unknown }).localStorage = new MemStorage();
});

async function freshStore() {
  vi.resetModules();
  return import('./progressStore');
}

describe('progressStore luck economy', () => {
  it('gainLuck accumulates; selectLuck is earned − spent', async () => {
    const { useProgressStore, selectLuck } = await freshStore();
    useProgressStore.getState().gainLuck(1);
    useProgressStore.getState().gainLuck(2);
    expect(selectLuck(useProgressStore.getState())).toBe(3);
  });

  it('spendLuck debits, caps at what you have, and never goes negative', async () => {
    const { useProgressStore, selectLuck } = await freshStore();
    useProgressStore.getState().gainLuck(3);
    useProgressStore.getState().spendLuck(2);
    expect(selectLuck(useProgressStore.getState())).toBe(1);
    useProgressStore.getState().spendLuck(99); // can't overspend
    expect(selectLuck(useProgressStore.getState())).toBe(0);
    expect(useProgressStore.getState().luckSpent).toBe(3); // only ever spent what existed
  });

  it('ignores non-positive gains and floors fractional luck (no dust the rolls can’t spend)', async () => {
    const { useProgressStore, selectLuck } = await freshStore();
    useProgressStore.getState().gainLuck(0);
    useProgressStore.getState().gainLuck(-5);
    expect(selectLuck(useProgressStore.getState())).toBe(0);
    useProgressStore.getState().gainLuck(2.7); // floored to 2
    expect(selectLuck(useProgressStore.getState())).toBe(2);
  });

  it('rollD20(useLuck=true) buys advantage for one luck; useLuck=false never burns it', async () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0); // every die = 1
    const { useProgressStore, selectLuck } = await freshStore();
    const { rollD20, LUCK_PER_ADVANTAGE } = await import('../lib/luck');
    useProgressStore.getState().gainLuck(10);
    const before = selectLuck(useProgressStore.getState());
    const r = rollD20(true);
    // Advantage costs exactly one luck — committed up front, so it debits even on a
    // roll the second die didn't rescue (here both dice are 1s).
    expect(r.luckSpent).toBe(LUCK_PER_ADVANTAGE);
    expect(selectLuck(useProgressStore.getState())).toBe(before - r.luckSpent); // debited exactly
    const mid = selectLuck(useProgressStore.getState());
    expect(rollD20(false).luckSpent).toBe(0); // a low-stakes roll burns nothing
    expect(selectLuck(useProgressStore.getState())).toBe(mid);
    rnd.mockRestore();
  });

  it('reads fresh disk first, so a concurrent tab’s earn is added to, not clobbered', async () => {
    const { useProgressStore, selectLuck } = await freshStore();
    useProgressStore.getState().gainLuck(2); // this tab: earned 2
    // Another tab earns 5 more, written straight to storage behind our back.
    const disk = JSON.parse(localStorage.getItem(KEY)!);
    localStorage.setItem(KEY, JSON.stringify({ ...disk, luckEarned: disk.luckEarned + 5 }));
    // This tab earns 1 more — it must stack on the other tab's write (2 + 5 + 1).
    useProgressStore.getState().gainLuck(1);
    expect(selectLuck(useProgressStore.getState())).toBe(8);
  });

  it('a concurrent tab’s spend is likewise honoured, not lost', async () => {
    const { useProgressStore, selectLuck } = await freshStore();
    useProgressStore.getState().gainLuck(6);
    const disk = JSON.parse(localStorage.getItem(KEY)!);
    localStorage.setItem(KEY, JSON.stringify({ ...disk, luckSpent: 2 })); // other tab spent 2
    useProgressStore.getState().spendLuck(1); // this tab spends 1 more → 3 total spent
    expect(selectLuck(useProgressStore.getState())).toBe(3); // 6 − (2 + 1)
  });
});
