import { describe, it, expect } from 'vitest';
import { SONG_META, songMeta, songMeaning, songTitle } from './songMeta';
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
