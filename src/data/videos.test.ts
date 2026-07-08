import { describe, it, expect } from 'vitest';
import {
  ytEmbed,
  ytWatch,
  songVideo,
  albumVideo,
  tvVideoFor,
  songAlbumSlug,
  TV_SPOTS,
} from './videos';
import { ALBUMS } from './albums';
import { ROOMS } from './rooms';

// A bare YouTube VIDEO id is 11 chars of [A-Za-z0-9_-]; a playlist id is longer
// and prefixed (PL… / OLAK5uy_… etc). These guard against a typo'd / truncated id
// silently shipping the wrong clip — the exact bug this whole file exists to fix.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^(PL|OLAK5uy_|RD|UU|LL|FL)[A-Za-z0-9_-]+$/;
const isWellFormed = (id: string) => VIDEO_ID.test(id) || PLAYLIST_ID.test(id);

describe('youtube url builders', () => {
  it('embeds a single video id as /embed/<id> (no-cookie, click-to-load)', () => {
    const e = ytEmbed('A_mbXWe1JFA');
    expect(e).toContain('youtube-nocookie.com/embed/A_mbXWe1JFA');
    expect(e).not.toContain('videoseries');
  });

  it('embeds a playlist id as /embed/videoseries?list=<id>', () => {
    const e = ytEmbed('OLAK5uy_koKNRc2F0YM1rdfX91dAi17hI-TEcO4Dw');
    expect(e).toContain('embed/videoseries?list=OLAK5uy_');
  });

  it('builds the real watch link for video vs playlist', () => {
    expect(ytWatch('A_mbXWe1JFA')).toBe('https://www.youtube.com/watch?v=A_mbXWe1JFA');
    expect(ytWatch('PLyFhmc3NqYe5rwvctk4OOb7emnuGVDFc-')).toContain('/playlist?list=PL');
  });
});

describe('songVideo resolution chain', () => {
  it('a song with its OWN video resolves to that video, titled as a music video', () => {
    const v = songVideo('memory-lan'); // official MV
    expect(v.embed).toContain('rMAjzP-pIno');
    expect(v.watch).toContain('rMAjzP-pIno');
    expect(v.title).toMatch(/MEMORY LAN/i);
    expect(v.title).toMatch(/MUSIC VIDEO/i);
  });

  it('a song with no own video falls back to its album’s video', () => {
    // underwater has no clip; its album MÖB carries one (the lead single video).
    const v = songVideo('underwater');
    const mob = ALBUMS.find((a) => a.slug === 'mob')!;
    expect(v.embed).toContain(mob.video!);
    expect(v.title).toMatch(/MÖB/);
  });

  it('a song with neither own nor album video falls back to the TV-spots channel', () => {
    // ocean-view → Moonlight Beach, which has no album video → general channel.
    const v = songVideo('ocean-view');
    expect(v.embed).toBe(TV_SPOTS.embed);
  });
});

describe('albumVideo + tvVideoFor', () => {
  it('an album with a video resolves to it, album-branded', () => {
    const v = albumVideo('koan');
    const koan = ALBUMS.find((a) => a.slug === 'koan')!;
    expect(v.embed).toContain(koan.video!);
    expect(v.title).toMatch(/KOAN|koan/i);
  });

  it('tvVideoFor prefers a songSlug over an albumSlug (song video is most specific)', () => {
    const v = tvVideoFor({ songSlug: 'mystery-machine', albumSlug: 'koan' });
    expect(v.embed).toContain('A_mbXWe1JFA'); // the song's MV, not koan's
  });

  it('tvVideoFor with only an albumSlug uses the album video', () => {
    expect(tvVideoFor({ albumSlug: 'big-hug' }).embed).toContain('gdo4a4jv2nY');
  });

  it('tvVideoFor falls to an explicit albumSlug when the songSlug is UNresolved (not the channel)', () => {
    // ocean-view has neither its own clip nor an album mapping, so on its own it
    // would fall straight to TV_SPOTS — but a room pairing it with an explicit
    // albumSlug must get THAT album's video first (the bug the review bot caught).
    const v = tvVideoFor({ songSlug: 'ocean-view', albumSlug: 'koan' });
    const koan = ALBUMS.find((a) => a.slug === 'koan')!;
    expect(v.embed).toContain(koan.video!);
    expect(v.embed).not.toBe(TV_SPOTS.embed);
  });
});

describe('video ids are well-formed (no truncation / typos ship)', () => {
  for (const a of ALBUMS) {
    if (a.video) {
      it(`album "${a.slug}" video id is a valid youtube id`, () => {
        expect(isWellFormed(a.video!), `bad id "${a.video}"`).toBe(true);
      });
    }
  }
});

// The GLOBAL-MUTE contract's data half: YoutubeFacade derives its postMessage
// target from `new URL(video.embed).origin`, so every embed the registry can
// ever hand it must be an ABSOLUTE, parseable URL on the no-cookie host — a
// malformed/relative embed would silently degrade post-load mute forwarding
// into the catch path (the review bot's flag). ytEmbed() constructs these, so
// this pins the constructor's output shape across every resolvable video.
describe('every embed is an absolute no-cookie URL (the mute postMessage target)', () => {
  const allEmbeds: Array<[string, string]> = [
    ['TV_SPOTS', TV_SPOTS.embed],
    ...ALBUMS.map((a) => [`album ${a.slug}`, albumVideo(a.slug).embed] as [string, string]),
    ...ROOMS.filter((r) => r.tv).map(
      (r) => [`room ${r.id} CRT`, tvVideoFor(r.tv!).embed] as [string, string],
    ),
  ];
  for (const [label, embed] of allEmbeds) {
    it(`${label} embed parses to the no-cookie origin`, () => {
      const origin = new URL(embed).origin; // throws on a relative/malformed embed
      expect(origin).toBe('https://www.youtube-nocookie.com');
    });
  }
});

// Every in-world CRT (room.tv) must resolve to a real, non-empty clip — and if it
// names a songSlug, that resolution must surface a usable embed (the whole point
// of the room having a TV). Guards a room.tv typo from shipping a dead screen.
describe('every room CRT resolves to a real clip', () => {
  const tvRooms = ROOMS.filter((r) => r.tv);

  it('there is at least one in-world CRT', () => {
    expect(tvRooms.length).toBeGreaterThan(0);
  });

  for (const room of tvRooms) {
    it(`${room.id} CRT resolves to an embeddable clip`, () => {
      const v = tvVideoFor(room.tv!);
      expect(v.embed).toMatch(/youtube-nocookie\.com\/embed\//);
      expect(v.title.length).toBeGreaterThan(0);
    });

    // A song-room's CRT should name the SAME track the room is scored to, so the
    // set plays the very song you're hearing (not some other record's clip).
    if (room.tv!.songSlug && room.song) {
      it(`${room.id} CRT song matches the room song`, () => {
        expect(room.tv!.songSlug).toBe(room.song);
      });
    }

    // A song that has its own cover record should show real sleeve art on the tube.
    if (room.tv!.songSlug) {
      it(`${room.id} CRT song has a resolvable sleeve (or honest none)`, () => {
        const cover = songAlbumSlug(room.tv!.songSlug!);
        if (cover) expect(ALBUMS.some((a) => a.slug === cover)).toBe(true);
      });
    }
  }
});
