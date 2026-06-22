// The "TV spots" — Scoobert's music videos, surfaced in-world as a privacy-enhanced
// YouTube PLAYLIST embed (no-cookie, CLICK-TO-LOAD). The crawlable / JS-off fallback
// is the `videos` link in links.ts (the storefront + pause menu already carry it);
// this is just the in-world enhancement. Luke's channel/playlist — his content.
//
// Why a facade (load-on-click): nothing from YouTube is fetched until you press play,
// so the page stays instant (the "loads instantly" non-negotiable) and sets no
// tracking cookies until you opt in. youtube-nocookie + rel=0 keep the chrome minimal.
export const TV_SPOTS = {
  title: 'SCOOBERT DOOBERT — TV SPOTS',
  blurb: 'Music videos, two 360 films, and one virtual concert from the Void.',
  /** Privacy-enhanced no-cookie playlist embed — only mounted after a click. */
  embed:
    'https://www.youtube-nocookie.com/embed/videoseries?list=PLyFhmc3NqYe5rwvctk4OOb7emnuGVDFc-&rel=0&modestbranding=1&playsinline=1',
  /** Real, crawlable watch link — the in-dialog a11y / JS-off fallback. */
  watch: 'https://www.youtube.com/playlist?list=PLyFhmc3NqYe5rwvctk4OOb7emnuGVDFc-',
} as const;

import { albumBySlug } from './albums';

/** What a CRT plays: an embed (loaded on click) + a real watch link + a title. */
export type TvVideo = { embed: string; watch: string; title: string };

/** The TV content for an album: its OWN playlist if mapped (album.video, a YouTube
 *  playlist id), else Scoobert's general TV-spots playlist. Title is album-branded.
 *  So the CRT on the far side of each painting shows that record's videos. */
export function albumVideo(slug: string): TvVideo {
  const a = albumBySlug(slug);
  const title = a ? `${a.title.toUpperCase()} — VIDEO` : TV_SPOTS.title;
  if (a?.video) {
    return {
      embed: `https://www.youtube-nocookie.com/embed/videoseries?list=${a.video}&rel=0&modestbranding=1&playsinline=1`,
      watch: `https://www.youtube.com/playlist?list=${a.video}`,
      title,
    };
  }
  return { embed: TV_SPOTS.embed, watch: TV_SPOTS.watch, title };
}
