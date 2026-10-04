import { describe, it, expect } from 'vitest';
import { albumNodes, recordingNodes, catalogGraph, HUB_ALBUM_SLUG } from './discography';
import { JUKEBOX_TRACKS } from './jukebox';

describe('discography JSON-LD (the /catalog graph)', () => {
  it('emits one MusicRecording per catalog track, byArtist the shared #scoobert', () => {
    const nodes = recordingNodes();
    expect(nodes.length).toBe(JUKEBOX_TRACKS.length);
    for (const n of nodes) {
      expect(n['@type']).toBe('MusicRecording');
      expect(n.byArtist).toEqual({ '@id': 'https://lukefwalton.com/#scoobert' });
      expect(n.name).toBeTruthy();
    }
  });

  it('every inAlbum reference resolves to an album node IN the same graph', () => {
    const albumIds = new Set(albumNodes().map((a) => a['@id']));
    for (const n of recordingNodes()) {
      const ref = (n as { inAlbum?: { '@id': string } }).inAlbum;
      if (ref) expect(albumIds.has(ref['@id']), `${n['@id']} → dangling ${ref['@id']}`).toBe(true);
    }
    // and catalogGraph actually ships both node sets together
    const graph = catalogGraph()['@graph'];
    expect(graph.length).toBe(albumNodes().length + recordingNodes().length);
  });

  it('never re-declares the canonical #scoobert MusicGroup (it would shadow index.html)', () => {
    const graph = JSON.stringify(catalogGraph());
    expect(graph).not.toContain('"MusicGroup"');
  });

  it('every album names Luke (#person) as copyrightHolder of the masters', () => {
    for (const a of albumNodes()) {
      expect(a.copyrightHolder).toEqual({ '@id': 'https://lukefwalton.com/#person' });
    }
  });

  it('every HUB_ALBUM_SLUG key is a pizza album slug (a renamed album cannot leave a stale key behind)', () => {
    const slugs = new Set(albumNodes().map((a) => a['@id'].split('#album-')[1]));
    for (const key of Object.keys(HUB_ALBUM_SLUG)) expect(slugs.has(key), `stale key ${key}`).toBe(true);
  });

  it('hub sameAs points at a real lukefwalton.com album id, only for mapped slugs', () => {
    for (const a of albumNodes()) {
      const slug = a['@id'].split('#album-')[1];
      const sameAs = (a as { sameAs?: string }).sameAs;
      if (HUB_ALBUM_SLUG[slug]) {
        expect(sameAs).toBe(`https://lukefwalton.com/albums/${HUB_ALBUM_SLUG[slug]}/#album`);
      } else {
        expect(sameAs).toBeUndefined();
      }
    }
  });
});
