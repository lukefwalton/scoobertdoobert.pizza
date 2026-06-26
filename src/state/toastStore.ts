import { create } from 'zustand';

// ───────────────────────────────────────────────────────────────────────────
// toastStore — transient in-world announcements (the game layer's "feedback").
//
// One ephemeral message at a time: luck earned at the shrine ("🍀 Fortune smiles
// · +1"), a crit on a roll ("NAT 20!" / "CRIT FAIL"). WorldHud renders it and
// auto-dismisses it after a beat. Deliberately NOT in progressStore (that's the
// durable save) and NOT in sceneStore (nav) — it's pure passing UI. Each announce
// bumps `id` so re-announcing the same text still re-triggers the toast.
// ───────────────────────────────────────────────────────────────────────────

export type ToastKind = 'info' | 'luck' | 'crit-good' | 'crit-bad';

export type Toast = { id: number; msg: string; kind: ToastKind };

type ToastState = {
  toast: Toast | null;
  announce: (msg: string, kind?: ToastKind) => void;
  clear: () => void;
};

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  announce: (msg, kind = 'info') => set({ toast: { id: ++seq, msg, kind } }),
  clear: () => set({ toast: null }),
}));

/** Non-React announce (for callers outside components — same single-toast slot). */
export const announce = (msg: string, kind: ToastKind = 'info'): void =>
  useToastStore.getState().announce(msg, kind);

/** How long a toast stays up, scaled to READING TIME so a long message (the spell-
 *  learn line, the finale) lingers while a short "NAT 20!" keeps the snappy beat:
 *  ~55ms/char over a base, FLOORED at 2800ms (no regression for short ones) and
 *  CAPPED at 9000ms (never hangs). Pure + unit-tested; WorldHud drives the timer. */
export function toastDurationMs(msg: string): number {
  return Math.min(9000, Math.max(2800, 1800 + msg.length * 55));
}
