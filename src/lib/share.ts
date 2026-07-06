import { announce } from '../state/toastStore';

// ───────────────────────────────────────────────────────────────────────────
// share.ts — the site's one social lever ("share fuel", invoked all over DESIGN
// but with zero code until now). Opens the native share sheet where it exists
// (mobile + some desktops), else copies the text + url to the clipboard and toasts
// a confirmation. JS-only progressive enhancement — never in the crawlable
// fallback, only wired from in-world/leaderboard UI after hydration.
//
// Every async path is guarded: a denied/absent API or a user who cancels the sheet
// just resolves (a cancel is a CHOICE, not an error, so we don't silently copy
// instead). Returns WHAT it did so callers/tests can branch; the toast is a side
// effect, not the contract.
// ───────────────────────────────────────────────────────────────────────────

// 'shared' = the native sheet OPENED (the payload left via Web Share) — this
// DELIBERATELY includes a user-cancelled sheet: a cancel is the user's choice, so we
// don't second-guess it with a surprise clipboard write. 'copied' = the clipboard
// fallback wrote + toasted. 'unavailable' = neither path was possible (toast shown).
export type ShareOutcome = 'shared' | 'copied' | 'unavailable';

export async function shareResult(text: string, url?: string): Promise<ShareOutcome> {
  const shareUrl = url ?? (typeof location !== 'undefined' ? location.origin + '/' : '');
  const full = shareUrl ? `${text} ${shareUrl}` : text;
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;

  // Web Share (mobile, some desktops): the native sheet. A cancel throws AbortError
  // — treat THAT as done (their choice; no surprise clipboard write). Any OTHER
  // failure (Web Share present but rejecting — permissions, an unsupported payload)
  // falls through to the clipboard so the user still gets their link.
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ text, url: shareUrl || undefined, title: 'scoobertdoobert.pizza' });
      return 'shared';
    } catch (e) {
      // Match a cancel by NAME, not just `instanceof DOMException`: the spec says a cancel
      // is a DOMException AbortError, but some engines reject with a plain error object —
      // and a deliberate cancel must never fall through to a surprise clipboard write.
      if ((e as { name?: string } | null | undefined)?.name === 'AbortError') return 'shared';
      /* a real share failure — fall through to the clipboard fallback below */
    }
  }

  // Clipboard fallback (desktop): copy the whole line + confirm.
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(full);
      announce('link copied — paste it anywhere 📋');
      return 'copied';
    } catch {
      /* clipboard blocked (permissions / insecure context) — fall through */
    }
  }

  announce('couldn’t open share — the URL is in your address bar');
  return 'unavailable';
}
