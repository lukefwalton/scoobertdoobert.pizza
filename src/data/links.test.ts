import { describe, it, expect } from 'vitest';
import { DESTINATIONS, destById } from './links';

// links.ts is the SINGLE SOURCE OF TRUTH for every primary destination, and its
// own header states a HARD RULE: every `href` is a real URL or in-site route,
// NEVER '#'. A destination that is only 3D geometry — or a dead '#' — is invisible
// to crawlers and screen readers (the constitution). These guard that rule at the
// cheapest layer (a unit test), so a dropped or typo'd href fails fast here instead
// of only in a browser smoke.
describe('links — every destination is a real, crawlable anchor', () => {
  it('never ships a placeholder href (no "#", no empty)', () => {
    for (const d of DESTINATIONS) {
      expect(d.href, `${d.id} href`).toBeTruthy();
      expect(d.href.trim(), `${d.id} href`).not.toBe('');
      expect(d.href, `${d.id} href`).not.toBe('#');
      // a real destination is an absolute URL, an in-site route, or a mailto.
      expect(d.href, `${d.id} href`).toMatch(/^(https?:\/\/|\/|mailto:)/);
    }
  });

  // The era floors hard-reference these ids via `destById(id)?.href ?? fallback`.
  // That fallback degrades to a REAL page (never '#'), so the never-'#' rule holds
  // even if one vanished — but the floors MEAN to point here (the 1999 guestbook →
  // contact, the news → podcast, the webring → listen). Asserting they resolve keeps
  // the fallback a true safety net, not a silent downgrade the render would hide.
  it('resolves the destinations the era floors depend on', () => {
    for (const id of ['contact', 'podcast', 'listen']) {
      const d = destById(id);
      expect(d, `floors depend on destById('${id}')`).toBeDefined();
      expect(d?.href, `${id} href`).toMatch(/^(https?:\/\/|\/|mailto:)/);
    }
  });
});
