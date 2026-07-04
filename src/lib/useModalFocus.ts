import { useEffect, useRef, type RefObject } from 'react';

// Modal a11y hygiene, factored out of MachineRoomFloor's install-gag dialog so
// every overlay shares one correct path (the audit found the in-world modals had
// none): when `open` flips true, move focus to the first focusable inside `ref`,
// TRAP Tab within it (wrap first↔last), optionally handle Escape, and on
// close/unmount RESTORE focus to whatever the user was on when it opened. Pair it
// with `role="dialog" aria-modal="true"` on the same element.
//
// STACKING: dialogs CAN be co-present — e.g. the lyrics reader opens on top of the
// pause menu, so `paused` and `lyricsSong` are both true. Each open dialog would
// otherwise install its own document keydown handler and treat focus in any OTHER
// dialog as "escaped", yanking it back — the underlying menu fighting the top one
// for every Tab. So a module-level stack tracks the open roots and ONLY the topmost
// (last-opened) owns Tab-trapping + focus pull-back at any moment; the ones beneath
// it stand down until they're on top again. Restoring to the captured opener on
// close naturally hands focus back DOWN the stack (the control that launched the
// top layer usually lives in the layer beneath it).
//
// `onEscape` is read through a ref so passing an inline handler doesn't re-run the
// effect (which would yank focus back to the first control on every render).
const modalStack: HTMLElement[] = [];

export function useModalFocus(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  onEscape?: () => void,
): void {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;
    const opener = document.activeElement as HTMLElement | null;
    modalStack.push(root);
    // This root owns the keyboard only while it's the top of the stack.
    const isTop = () => modalStack[modalStack.length - 1] === root;

    const focusables = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      // Only the front dialog traps; the ones beneath stand down (else they'd all
      // fire and each would pull focus back into its own root).
      if (!isTop()) return;
      if (e.key === 'Escape') {
        escRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      // Also pull focus back inside if it has somehow escaped the dialog.
      if (!root.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = modalStack.lastIndexOf(root);
      if (i !== -1) modalStack.splice(i, 1);
      // Restore focus to the opener if it's still in the DOM — which, for a stacked
      // dialog, hands focus back to the layer beneath that launched it.
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [open, ref]);
}
