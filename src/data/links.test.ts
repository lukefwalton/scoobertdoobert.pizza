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
    for (const id of ['contact', 'podcast', 'listen', 'reel']) {
      const d = destById(id);
      expect(d, `floors depend on destById('${id}')`).toBeDefined();
      expect(d?.href, `${id} href`).toMatch(/^(https?:\/\/|\/|mailto:)/);
    }
  });

  // ADDENDUM #8 — the CONVERT pass. The `contact` dest IS the hire CTA (one inbox,
  // one subject filter), and `reel` is the hire-reel playlist, a sanctioned
  // non-duplicate of `listen` (the artist page). Pin both so a copy edit can't
  // silently un-sell the site.
  describe('the hire funnel (ADDENDUM #8)', () => {
    it('contact is the hire mailto with the inquiry subject', () => {
      const contact = destById('contact');
      expect(contact?.href).toMatch(/^mailto:beformer@aol\.com\?subject=/);
      expect(contact?.href).toContain('Mixing');
    });

    it('reel is the hire-reel playlist, distinct from the listen artist page', () => {
      const reel = destById('reel');
      const listen = destById('listen');
      expect(reel?.href).toBe('https://open.spotify.com/playlist/7pmgoZlkf6exw4BAJTQs7Q');
      expect(reel?.href).not.toBe(listen?.href);
      // the "mixes at the bottom" orientation is part of the pitch — keep it.
      expect(reel?.blurb?.toLowerCase()).toContain('mixes');
    });

    it('the menu leads with the conversion trio: listen → reel → contact', () => {
      const menuIds = DESTINATIONS.filter((d) => d.group !== 'social').map((d) => d.id);
      expect(menuIds.slice(0, 3)).toEqual(['listen', 'reel', 'contact']);
    });
  });
});
