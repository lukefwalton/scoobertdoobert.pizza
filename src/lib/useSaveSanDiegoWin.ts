import { useEffect } from 'react';
import { useProgressStore } from '../state/progressStore';

// ───────────────────────────────────────────────────────────────────────────
// useSaveSanDiegoWin — banks the 1101 ARG's completion. public/1101.html (the
// same-origin Twine game) postMessages { source:'1101', type:'ending', result:'win' }
// from its iframe when the "SAN DIEGO IS SAVED" terminus renders; this listener
// catches it and banks the durable 'saved-san-diego' secret — the BONUS objective
// (tracked in the To-Do list, never gating the ★100% finale).
//
// The stable contract HERE is the MESSAGE shape ({source,type,result}); how
// 1101.html decides to fire it — matching its unique climactic win line, since a
// static Harlowe export can only run JS from its one user-script block, not from a
// passage body — is that file's own concern, swappable without touching this.
//
// ORIGIN-CHECKED: only messages from our own origin count, so a hostile embedder /
// stray frame can't forge a completion. Mounted wherever the ARG can be reached —
// the immersive level + the in-world arcade cabinet (via WorldMount) and the
// standalone /save-san-diego route (via ArcadeCabinetPage) — because a window
// 'message' listener is global to whoever posts. findSecret is idempotent, so a
// double-mount (or replaying the win) is a harmless no-op.
// ───────────────────────────────────────────────────────────────────────────

export function useSaveSanDiegoWin(): void {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return; // same-origin only
      const d = e.data as { source?: string; type?: string; result?: string } | null;
      if (d && d.source === '1101' && d.type === 'ending' && d.result === 'win') {
        useProgressStore.getState().findSecret('saved-san-diego');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}
