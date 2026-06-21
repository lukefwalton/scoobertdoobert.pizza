import { describe, it, expect } from 'vitest';
import { parse, ARCHIVE_SECTIONS } from './linkArchive';

describe('links.md parser', () => {
  it('groups `- [text](url)` bullets under ## sections and ### subsections', () => {
    const md = [
      '# Page title (ignored)',
      '## Streaming',
      '- [Bandcamp](https://bandcamp.example)',
      '### Playlists',
      '- [A list](https://list.example)',
      '## Press',
      '- [Zine](https://zine.example)',
    ].join('\n');
    const out = parse(md);
    expect(out.map((s) => s.title)).toEqual(['Streaming', 'Press']);
    expect(out[0].links).toEqual([{ text: 'Bandcamp', url: 'https://bandcamp.example' }]);
    expect(out[0].subsections).toEqual([
      { title: 'Playlists', links: [{ text: 'A list', url: 'https://list.example' }] },
    ]);
    expect(out[1].links).toEqual([{ text: 'Zine', url: 'https://zine.example' }]);
  });

  it('ignores links before any section and lines that are not link bullets', () => {
    const out = parse(['- [orphan](https://x)', 'plain prose', '## S', 'not a link'].join('\n'));
    expect(out).toHaveLength(1);
    expect(out[0].links).toHaveLength(0);
  });

  it('parses the real links.md into non-empty sections with non-blank text + urls', () => {
    expect(ARCHIVE_SECTIONS.length).toBeGreaterThan(0);
    for (const s of ARCHIVE_SECTIONS) {
      const all = [...s.links, ...s.subsections.flatMap((ss) => ss.links)];
      for (const l of all) {
        expect(l.text).not.toBe('');
        expect(l.url).toMatch(/^\S+$/);
      }
    }
  });
});
