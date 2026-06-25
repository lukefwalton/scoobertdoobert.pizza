import { describe, it, expect } from 'vitest';
import { JUKEBOX_TRACKS, visibleJukeboxTracks, isRoomSong } from './jukebox';
import { ROOM_SONG_SLUGS } from './rooms';

// "Hidden until found": the jukebox shows the seed (non-room) catalog always, and
// a room-song only once the player has DISCOVERED it (entered its room).
describe('jukebox song discovery (visibleJukeboxTracks)', () => {
  const slugs = (ts: { slug: string }[]) => ts.map((t) => t.slug);

  it('there is at least one room-song and one seed song (a real split)', () => {
    expect(ROOM_SONG_SLUGS.size).toBeGreaterThan(0);
    const seed = JUKEBOX_TRACKS.filter((t) => !ROOM_SONG_SLUGS.has(t.slug));
    expect(seed.length).toBeGreaterThan(0);
  });

  it('with nothing discovered, shows exactly the seed (non-room) tracks', () => {
    const visible = visibleJukeboxTracks([]);
    expect(visible.every((t) => !ROOM_SONG_SLUGS.has(t.slug))).toBe(true);
    // every seed track is present
    const seed = JUKEBOX_TRACKS.filter((t) => !ROOM_SONG_SLUGS.has(t.slug));
    expect(slugs(visible)).toEqual(slugs(seed));
  });

  it('hides an undiscovered room-song and reveals it once discovered', () => {
    const aRoomSong = [...ROOM_SONG_SLUGS][0];
    expect(isRoomSong(aRoomSong)).toBe(true);
    expect(slugs(visibleJukeboxTracks([]))).not.toContain(aRoomSong);
    expect(slugs(visibleJukeboxTracks([aRoomSong]))).toContain(aRoomSong);
  });

  it('preserves catalog order (a stable dial), never duplicates', () => {
    const all = [...ROOM_SONG_SLUGS];
    const visible = visibleJukeboxTracks(all);
    // discovering everything = the whole catalog, in catalog order
    expect(slugs(visible)).toEqual(slugs(JUKEBOX_TRACKS));
  });

  it('ignores a discovered slug that is not a real room-song (no phantom rows)', () => {
    const before = slugs(visibleJukeboxTracks([]));
    const after = slugs(visibleJukeboxTracks(['not-a-real-slug']));
    expect(after).toEqual(before);
  });
});
