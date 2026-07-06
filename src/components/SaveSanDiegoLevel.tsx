import { useEffect, useRef } from 'react';
import { useModalFocus } from '../lib/useModalFocus';
import '../styles/level.css';

// ───────────────────────────────────────────────────────────────────────────
// SaveSanDiegoLevel — the 1101 text-adventure as a FULL-SCREEN LEVEL (Luke,
// 2026-07). A door in the Tape Vault raises this (sceneStore.levelOverlay) instead
// of wiping to a 3D room: you "step through a door and end up in a text-based
// adventure." It's the same shipped Twine story (public/1101.html), here it fills
// the screen with a "⟵ Return to the world" way back (also Esc). The story's
// opening name-prompt fires when the frame mounts, which is exactly when you chose
// to step through, so no gate is needed here (unlike the arcade cabinet).
// ───────────────────────────────────────────────────────────────────────────
export function SaveSanDiegoLevel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const detach = useRef<(() => void) | null>(null);
  useModalFocus(panelRef, true);

  // Esc from INSIDE the story (focus lands in the iframe once you're reading/typing)
  // must also return you to the world. The story is SAME-ORIGIN (public/1101.html),
  // so we can add a keydown listener to its own window; WorldHud's parent-window
  // listener covers Esc when focus is on the topbar. Cleaned up on unmount / reload.
  const attachFrameEsc = () => {
    detach.current?.();
    detach.current = null;
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    try {
      win.addEventListener('keydown', onKey);
      detach.current = () => win.removeEventListener('keydown', onKey);
    } catch {
      /* cross-origin (shouldn't happen for our own file) — parent Esc still works */
    }
  };
  useEffect(() => () => detach.current?.(), []);

  return (
    <div
      className="level-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="1101 (Save San Diego)"
      ref={panelRef}
    >
      <div className="level-topbar">
        <button type="button" className="level-back" onClick={onClose}>
          &larr; Return to the world
        </button>
        <span className="level-title">1101 · SAVE SAN DIEGO</span>
      </div>
      <iframe
        ref={frameRef}
        className="level-frame"
        src="/1101.html"
        title="1101 (Save San Diego)"
        onLoad={attachFrameEsc}
      />
    </div>
  );
}
