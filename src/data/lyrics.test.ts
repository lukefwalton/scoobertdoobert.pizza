import { describe, it, expect } from 'vitest';
import { LYRICS, hasLyrics, findLyricSlug, songsWithLyrics } from './lyrics';
import { JUKEBOX_TRACKS } from './jukebox';

describe('lyrics data', () => {
  const catalog = new Set(JUKEBOX_TRACKS.map((t) => t.slug));

  it('every lyric slug is a real jukebox catalog slug', () => {
    for (const slug of songsWithLyrics()) {
      expect(catalog.has(slug), `"${slug}" is not in the jukebox catalog`).toBe(true);
    }
  });

  it('every lyric has a title and non-empty words', () => {
    for (const [slug, L] of Object.entries(LYRICS)) {
      expect(L.title, `${slug} title`).toBeTruthy();
      expect(L.lyrics.trim().length, `${slug} words`).toBeGreaterThan(0);
    }
  });

  it('instrumentals + covers carry NO lyrics (nothing to show)', () => {
    // These four are instrumentals / a cover with no published words.
    for (const slug of [
      'information',
      'jolly-roger-bay',
      'walking-balboa',
      'dancing-in-the-moonlight',
    ]) {
      expect(hasLyrics(slug), `${slug} should have no lyrics`).toBe(false);
    }
  });

  it('hasLyrics narrows null/undefined safely', () => {
    expect(hasLyrics(null)).toBe(false);
    expect(hasLyrics(undefined)).toBe(false);
    expect(hasLyrics('boardwalk')).toBe(true);
  });

  it('findLyricSlug resolves a slug, a prefix, and a title/word fragment', () => {
    expect(findLyricSlug('boardwalk')).toBe('boardwalk');
    expect(findLyricSlug('memory')).toBe('memory-lan');
    expect(findLyricSlug('japan')).toBe('gonna-go-to-japan'); // title word
    expect(findLyricSlug('california')).toBe('i-live-in-california'); // title fragment
    expect(findLyricSlug('definitely-not-a-song')).toBeUndefined();
  });
});
