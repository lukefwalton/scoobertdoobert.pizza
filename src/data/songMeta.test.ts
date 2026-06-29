import { describe, it, expect } from 'vitest';
import { SONG_META, songMeta, songMeaning, songTitle, fuzzyFindSlug } from './songMeta';
import { JUKEBOX_TRACKS } from './jukebox';

describe('song meta (liner notes)', () => {
  it('every jukebox track has a meta entry with a title + a meaning', () => {
    for (const t of JUKEBOX_TRACKS) {
      const m = SONG_META[t.slug];
      expect(m, `no songMeta for "${t.slug}"`).toBeTruthy();
      expect(m.title.length, `${t.slug} title`).toBeGreaterThan(0);
      expect(m.meaning && m.meaning.length > 0, `${t.slug} meaning`).toBe(true);
    }
  });

  it('meta has no orphan entries (every meta slug is a real catalog track)', () => {
    const catalog = new Set(JUKEBOX_TRACKS.map((t) => t.slug));
    for (const slug of Object.keys(SONG_META)) {
      expect(catalog.has(slug), `orphan songMeta "${slug}"`).toBe(true);
    }
  });

  it('no meaning contains raw markdown (it renders as plain text everywhere)', () => {
    // The pause HUD, lyric reader, and terminal all show `meaning` as plain text,
    // so a stray markdown link would render literally. Guard against it.
    for (const [slug, m] of Object.entries(SONG_META)) {
      expect(/\]\(|\[\*|\*\]/.test(m.meaning ?? ''), `${slug} meaning has markdown`).toBe(false);
    }
  });

  it('helpers resolve known slugs and fall back gracefully', () => {
    expect(songTitle('memory-lan')).toBe('MEMORY LAN');
    expect(songMeaning('memory-lan')).toMatch(/LAN-party/i);
    expect(songMeta('not-a-song')).toBeUndefined();
    expect(songMeaning('not-a-song')).toBeNull();
    expect(songTitle('not-a-song')).toBe('not-a-song');
  });
});

describe('fuzzyFindSlug (the forgiving terminal song/lyric lookup)', () => {
  // A fixture that exercises every tier of the matcher independently. 'memory-lan'
  // is deliberately a PREFIX of 'memory-lane-blues' so the exact-vs-prefix
  // precedence is actually observable; 'blues' lives only in a title, not a slug.
  const slugs = ['memory-lan', 'memory-lane-blues', 'ocean-view', 'best-day'];
  const titles: Record<string, string> = {
    'memory-lan': 'MEMORY LAN',
    'memory-lane-blues': 'Memory Lane Blues',
    'ocean-view': 'Ocean View',
    'best-day': 'Best Day',
  };
  const titleOf = (s: string) => titles[s] ?? s;

  it('returns undefined for an empty / whitespace query', () => {
    expect(fuzzyFindSlug(slugs, '', titleOf)).toBeUndefined();
    expect(fuzzyFindSlug(slugs, '   ', titleOf)).toBeUndefined();
  });

  it('prefers an exact slug match over a prefix match', () => {
    expect(fuzzyFindSlug(slugs, 'memory-lan', titleOf)).toBe('memory-lan');
  });

  it('falls back to a slug-prefix match', () => {
    expect(fuzzyFindSlug(slugs, 'ocean', titleOf)).toBe('ocean-view');
  });

  it('falls back to a dash-insensitive slug / title substring match', () => {
    expect(fuzzyFindSlug(slugs, 'ocean view', titleOf)).toBe('ocean-view'); // dash → space
    expect(fuzzyFindSlug(slugs, 'blues', titleOf)).toBe('memory-lane-blues'); // title-only word
  });

  it('is case-insensitive and returns undefined when nothing matches', () => {
    expect(fuzzyFindSlug(slugs, 'BEST', titleOf)).toBe('best-day');
    expect(fuzzyFindSlug(slugs, 'zzz-nope', titleOf)).toBeUndefined();
  });
});
