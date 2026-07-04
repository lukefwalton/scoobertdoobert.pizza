import { useEffect, useRef, type RefObject } from 'react';

// Modal a11y hygiene, factored out of MachineRoomFloor's install-gag dialog so
// every overlay shares one correct path (the audit found the in-world modals had
// none): when `open` flips true, move focus to the first focusable inside `ref`,
// TRAP Tab within it (wrap first↔last), optionally handle Escape, and on
// close/unmount RESTORE focus to whatever the user was on when it opened. Pair it
// with `role="dialog" aria-modal="true"` on the same element.
//
// `onEscape` is read through a ref so passing an inline handler doesn't re-run the
// effect (which would yank focus back to the first control on every render).
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
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      root
        ? Array.from(
            root.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
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
      if (root && !root.contains(document.activeElement)) {
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
      // Restore focus to the opener if it's still in the DOM.
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [open, ref]);
}
