import { describe, it, expect } from 'vitest';
import { loopIndexForUrl, jukeboxTrackUrl, JUKEBOX_TRACKS, LOOP_OPTIONS } from './music';

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
