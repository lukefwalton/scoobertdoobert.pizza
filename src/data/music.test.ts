import { describe, it, expect } from 'vitest';
import { loopIndexForUrl, jukeboxTrackUrl, JUKEBOX_TRACKS, LOOP_OPTIONS } from './music';
import { ROOMS } from './rooms';

describe('jukebox loop indexing', () => {
  it('maps null (no track / boot) to loop slot 0', () => {
    expect(loopIndexForUrl(null)).toBe(0);
  });

  it('maps a real track url to its LOOP_OPTIONS slot (offset +1 past the boot loop)', () => {
    const first = JUKEBOX_TRACKS[0];
    expect(loopIndexForUrl(jukeboxTrackUrl(first.slug))).toBe(1);
  });

  it('maps an unknown url back to 0 rather than -1/NaN', () => {
    expect(loopIndexForUrl('/audio/jukebox/does-not-exist.mp3')).toBe(0);
  });

  it('LOOP_OPTIONS = the boot loop + every catalog track', () => {
    expect(LOOP_OPTIONS).toHaveLength(JUKEBOX_TRACKS.length + 1);
  });
});

// A SONG-ROOM (Room.song) plays one catalog track while you're inside it, then
// hands the loop voice back on exit (musicStore.restorePreferred). Guard the two
// ways the data can silently break: a typo'd slug (→ silence in-world instead of
// the song), and the song/musicRoom conflict (musicRoom FADES the carried song
// out, so a room can't sensibly be both).
describe('room songs (Room.song)', () => {
  const slugs = new Set(JUKEBOX_TRACKS.map((t) => t.slug));
  const songRooms = ROOMS.filter((r) => r.song);

  it('there is at least one song-room (the boardwalk wing wired its music)', () => {
    expect(songRooms.length).toBeGreaterThan(0);
  });

  for (const room of songRooms) {
    it(`${room.id}.song "${room.song}" is a real catalog slug`, () => {
      expect(slugs.has(room.song!), `unknown jukebox slug "${room.song}"`).toBe(true);
    });

    it(`${room.id} is not also a musicRoom (song + musicRoom conflict)`, () => {
      expect(room.musicRoom ?? false).toBe(false);
    });
  }
});
