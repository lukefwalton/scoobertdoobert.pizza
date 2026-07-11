// ───────────────────────────────────────────────────────────────────────────
// src/data/videos.ts — VIDEO, as data. The ONE place that decides which YouTube
// clip a CRT plays (the visual sibling of music.ts).
//
// Everything is a privacy-enhanced, CLICK-TO-LOAD embed (YoutubeFacade): nothing
// is fetched from YouTube until you press play (no cookies until opt-in; the panel
// stays light), and a real <a> watch link is always in the DOM as the JS-off /
// screen-reader fallback. Luke's channel / his content.
//
// The data is just YouTube IDs (verified against lukefwalton.com). A CRT resolves
// its clip through one chain, the song's OWN music video, else its record's
// video, else the general TV-spots channel, so a room only declares what it has
// (a `songSlug` and/or an `albumSlug`) and always gets something real and on-topic.
// "Exploration's reward is sound" — and, at the CRT, its picture too.
// ───────────────────────────────────────────────────────────────────────────
import { albumBySlug } from './albums';
import { jukeboxTitle } from './jukebox';

/** What a CRT plays: an embed (loaded on click) + a real watch link + a title,
 *  and an optional caption shown under the player (defaults to the channel blurb). */
export type TvVideo = { embed: string; watch: string; title: string; blurb?: string };

// --- YouTube URL builders (privacy-enhanced) --------------------------------
// A bare id is either a single VIDEO (11 chars) or a PLAYLIST (PL… / OLAK5uy_…
// auto-album / RD radio / UU uploads). One detector lets a single string in the
// data be either, and the CRT plays the right form without the data saying which.
const PLAYLIST_RE = /^(PL|OLAK5uy_|RD|UU|LL|FL)/;
const isPlaylistId = (id: string): boolean => PLAYLIST_RE.test(id);
const EMBED_TAIL = 'rel=0&modestbranding=1&playsinline=1';

/** The no-cookie embed URL for a video OR playlist id (YoutubeFacade adds &autoplay). */
export function ytEmbed(id: string): string {
  return isPlaylistId(id)
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${id}&${EMBED_TAIL}`
    : `https://www.youtube-nocookie.com/embed/${id}?${EMBED_TAIL}`;
}
/** The real, crawlable watch URL for a video OR playlist id (the a11y / JS-off link). */
export function ytWatch(id: string): string {
  return isPlaylistId(id)
    ? `https://www.youtube.com/playlist?list=${id}`
    : `https://www.youtube.com/watch?v=${id}`;
}

// The general channel playlist — the ultimate fallback when a room names no song
// or its song/record has no clip of its own.
const TV_SPOTS_LIST = 'PLyFhmc3NqYe5rwvctk4OOb7emnuGVDFc-';
export const TV_SPOTS: TvVideo & { blurb: string } = {
  title: 'SCOOBERT DOOBERT: TV SPOTS',
  blurb: 'Music videos, two 360 films, and one virtual concert from the Void.',
  embed: ytEmbed(TV_SPOTS_LIST),
  watch: ytWatch(TV_SPOTS_LIST),
};

// SONG_VIDEOS — a jukebox slug → its OWN YouTube clip (verified against the song's
// lukefwalton.com page). `official` = a produced music video; `video` = an
// upload / visualizer. This is the most specific match for a song-room's CRT.
type SongVideo = { id: string; kind: 'official' | 'video' };
const SONG_VIDEOS: Record<string, SongVideo> = {
  information: { id: '0PgFfxhzqdE', kind: 'video' },
  'best-day-ever': { id: 'wR2Ev0FaEms', kind: 'video' },
  'my-friend-scoobert': { id: '7xfTx5gDQ6Q', kind: 'video' },
  'mystery-machine': { id: 'A_mbXWe1JFA', kind: 'official' },
  'i-live-in-california': { id: 'vGywF3QeCuc', kind: 'official' },
  boardwalk: { id: '-EYpF1Xsw2A', kind: 'official' },
  'all-my-friends-live-on-the-internet': { id: '16Xymn7W9_w', kind: 'video' },
  'memory-lan': { id: 'rMAjzP-pIno', kind: 'official' },
};

// SONG_ALBUM — a jukebox slug → the album whose video stands in when the song has
// no clip of its own (its record's lead-single video / visualizer, set in
// albums.json). Only songs whose album carries a `video`. Songs absent here with
// no own clip (e.g. the Moonlight Beach tracks) resolve to the TV-spots channel.
const SONG_ALBUM: Record<string, string> = {
  information: 'koan',
  '1101': 'koan',
  'jolly-roger-bay': 'koan',
  boardwalk: 'koan',
  'all-my-friends-live-on-the-internet': 'koan',
  'my-friend-scoobert': 'finding-sd',
  'velma-what-a-night': 'finding-sd',
  'mystery-machine': 'masks-and-monsters',
  'i-live-in-california': 'big-hug',
  'walking-balboa': 'little-hug',
  'memory-lan': 'mob',
  underwater: 'mob',
  daydreaming: 'i',
  'watercolor-sky': 'i',
};

/** The album slug whose COVER ART a CRT should show for a song (its own album if
 *  mapped), so a song-only TV can still display a real record sleeve. */
export function songAlbumSlug(songSlug: string): string | undefined {
  return SONG_ALBUM[songSlug];
}

/** The album's own CRT video: its `video` id (single or playlist), album-titled;
 *  the TV-spots channel if the album has none. Used by an album-painting CRT. */
export function albumVideo(slug: string): TvVideo {
  const a = albumBySlug(slug);
  const title = a ? `${a.title.toUpperCase()}, VIDEO` : TV_SPOTS.title;
  if (a?.video)
    return {
      embed: ytEmbed(a.video),
      watch: ytWatch(a.video),
      title,
      blurb: `From the record ${a.title}.`,
    };
  return { embed: TV_SPOTS.embed, watch: TV_SPOTS.watch, title, blurb: TV_SPOTS.blurb };
}

/** The best CRT clip for a SONG (a jukebox slug): the song's own music video if it
 *  has one (song-titled), else its record's video (album-titled), else the general
 *  TV spots. The reward for finding a song-room is its picture, too. */
export function songVideo(slug: string): TvVideo {
  const own = SONG_VIDEOS[slug];
  if (own) {
    const label = own.kind === 'official' ? 'MUSIC VIDEO' : 'VIDEO';
    return {
      embed: ytEmbed(own.id),
      watch: ytWatch(own.id),
      title: `${jukeboxTitle(slug)}, ${label}`,
      blurb:
        own.kind === 'official'
          ? 'Scoobert Doobert, official music video.'
          : 'Scoobert Doobert, straight off the record.',
    };
  }
  const album = SONG_ALBUM[slug];
  if (album) return albumVideo(album);
  return { embed: TV_SPOTS.embed, watch: TV_SPOTS.watch, title: TV_SPOTS.title };
}

/** Resolve the clip for a room CRT spec: the song's video wins (most specific),
 *  else the album's, else the TV-spots channel. The single entry point TvSet
 *  uses, so a room declares only what it has (`songSlug` and/or `albumSlug`).
 *
 *  Order matters: a song's OWN video → its record's video → the caller's explicit
 *  `albumSlug` → TV spots. The explicit album is consulted BEFORE the channel
 *  fallback, so a room that pairs an unresolved songSlug with an albumSlug still
 *  gets the album's clip (not the generic channel) — the bug the review bot
 *  caught: songVideo() alone would skip the caller's album and fall to TV_SPOTS. */
export function tvVideoFor(spec: { songSlug?: string; albumSlug?: string }): TvVideo {
  if (spec.songSlug) {
    if (SONG_VIDEOS[spec.songSlug]) return songVideo(spec.songSlug); // the song's own clip
    const album = SONG_ALBUM[spec.songSlug] ?? spec.albumSlug; // its record, else the caller's
    if (album) return albumVideo(album);
  } else if (spec.albumSlug) {
    return albumVideo(spec.albumSlug);
  }
  return { embed: TV_SPOTS.embed, watch: TV_SPOTS.watch, title: TV_SPOTS.title };
}
