import { describe, it, expect } from 'vitest';
import { albumNodes, recordingNodes, catalogGraph } from './discography';
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
});
