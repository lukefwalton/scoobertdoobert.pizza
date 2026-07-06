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

export type ShareOutcome = 'shared' | 'copied' | 'unavailable';

export async function shareResult(text: string, url?: string): Promise<ShareOutcome> {
  const shareUrl = url ?? (typeof location !== 'undefined' ? location.origin + '/' : '');
  const full = shareUrl ? `${text} ${shareUrl}` : text;
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;

  // Web Share (mobile, some desktops): the native sheet. A cancel throws (AbortError)
  // — treat that as done rather than falling back to a surprise clipboard write.
  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ text, url: shareUrl || undefined, title: 'scoobertdoobert.pizza' });
    } catch {
      /* user dismissed the sheet — their choice; nothing more to do */
    }
    return 'shared';
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
