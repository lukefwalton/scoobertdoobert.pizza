import { create } from 'zustand';

// ───────────────────────────────────────────────────────────────────────────
// toastStore — transient in-world announcements (the game layer's "feedback").
//
// One toast SHOWS at a time, on two lanes (the game-design cleanup — every
// system talks through this channel and they used to clobber each other, which
// call sites patched with hand-tuned setTimeout staggers; the lanes replace all
// of those):
//   - DEFAULT (direct feedback — "you just did a thing, here's the result": a
//     fortune draw, a dice crit, a spell): shows IMMEDIATELY, replacing whatever
//     is up — the original single-slot contract every action site assumes.
//   - `{ queue: true }` (passive chatter — quest ✓s, whispers, song unlocks,
//     first-entry rewards): waits its turn in a short FIFO behind the current
//     toast, deduped, capped at the 4 newest (a burst drops its oldest WAITING
//     lines, never the one on screen).
//   - clear() dismisses the current toast and promotes the next in line.
// Deliberately NOT in progressStore (that's the durable save) and NOT in
// sceneStore (nav) — it's pure passing UI.
// ───────────────────────────────────────────────────────────────────────────

export type ToastKind = 'info' | 'luck' | 'crit-good' | 'crit-bad';

export type Toast = { id: number; msg: string; kind: ToastKind };

export type AnnounceOpts = {
  /** Passive chatter: wait behind the showing toast instead of replacing it. */
  queue?: boolean;
};

const QUEUE_MAX = 4;

type ToastState = {
  toast: Toast | null;
  queue: Toast[];
  announce: (msg: string, kind?: ToastKind, opts?: AnnounceOpts) => void;
  clear: () => void;
};

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  queue: [],
  announce: (msg, kind = 'info', opts) =>
    set((s) => {
      const next = { id: ++seq, msg, kind };
      // Direct feedback (the default): show NOW — replace whatever is up (the
      // old single-slot contract; the waiting queue is untouched and follows).
      if (!opts?.queue) return { toast: next };
      if (!s.toast) return { toast: next };
      // Already on screen or already waiting → don't stack a duplicate.
      if (s.toast.msg === msg || s.queue.some((q) => q.msg === msg)) return {};
      return { queue: [...s.queue, next].slice(-QUEUE_MAX) };
    }),
  clear: () => set((s) => ({ toast: s.queue[0] ?? null, queue: s.queue.slice(1) })),
}));

/** Non-React announce (for callers outside components, same two-lane slot). */
export const announce = (msg: string, kind: ToastKind = 'info', opts?: AnnounceOpts): void =>
  useToastStore.getState().announce(msg, kind, opts);

/** How long a toast stays up, scaled to READING TIME so a long message (the spell-
 *  learn line, the finale) lingers while a short "NAT 20!" keeps the snappy beat:
 *  ~55ms/char over a base, FLOORED at 2800ms (no regression for short ones) and
 *  CAPPED at 9000ms (never hangs). Pure + unit-tested; WorldHud drives the timer. */
export function toastDurationMs(msg: string): number {
  return Math.min(9000, Math.max(2800, 1800 + msg.length * 55));
}

/** The actual dismiss delay WorldHud uses: full reading time when nothing waits,
 *  but with a QUEUE behind it the current toast steps aside sooner (still ≥ the
 *  2.6s it takes to read a short line) so feedback never lags far behind play. */
export function toastDismissMs(msg: string, queued: boolean): number {
  return queued ? Math.min(toastDurationMs(msg), 2600) : toastDurationMs(msg);
}
