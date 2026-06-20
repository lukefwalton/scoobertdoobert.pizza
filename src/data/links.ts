// ───────────────────────────────────────────────────────────────────────────
// src/data/links.ts — SINGLE SOURCE OF TRUTH for every primary destination.
//
// The storefront "Sample Menu", the text-only fallback page, and (later) the
// in-world 3D hotspots all read from this list. Adding or changing a link means
// editing THIS file only — never scene code, never the storefront markup.
//
// HARD RULE: `href` is ALWAYS a real URL or a real in-site route. Never '#'.
// A destination that exists only as 3D geometry is invisible to crawlers and
// screen readers and does not count.
// ───────────────────────────────────────────────────────────────────────────

export type Era = '1994' | '1996' | '1999' | '2000' | 'world';

export type ToppingId =
  | 'pepperoni'
  | 'mushroom'
  | 'pepper'
  | 'olive'
  | 'basil'
  | 'onion'
  | 'chili'
  | 'anchovy';

export type Dest = {
  /** Stable id. Referenced by hotspots so links stay single-source. */
  id: string;
  /** Storefront / nav label, in the 1999 register. */
  label: string;
  /** Real URL or in-site route. ALWAYS real, never '#'. */
  href: string;
  /** Copy shown in the in-world dialog (later phases). */
  blurb?: string;
  /** Which topping icon represents it in the Sample Menu. */
  topping?: ToppingId;
  /** Which descent floor surfaces it (later phases). */
  era?: Era;
  /** External link => open in a new tab with rel=noopener. */
  external?: boolean;
  /** The one intentionally-boring corporate link. Renders deadpan/gray. */
  deadpan?: boolean;
  /** 'social' = secondary platform link (compact row); default behaves as menu. */
  group?: 'menu' | 'social';
};

export const DESTINATIONS: Dest[] = [
  {
    id: 'listen',
    label: "what's hot @ the .pizza?",
    href: 'https://open.spotify.com/artist/5zKkCi9E4L8p6aRiCSJVTn',
    blurb: 'Six unreleased demos under one thin crust. Streaming everywhere.',
    topping: 'pepperoni',
    era: '1999',
    external: true,
  },
  {
    id: 'videos',
    label: 'see the TV spots',
    href: 'https://www.youtube.com/c/ScoobertDoobertBurrito',
    blurb: 'Music videos, two 360 films, and one virtual concert from the Void.',
    topping: 'mushroom',
    era: '1999',
    external: true,
  },
  {
    id: 'catalog',
    label: 'more about our menu',
    href: 'https://scoobertdoobert.bandcamp.com/',
    blurb: 'The full catalog. MÖB. I. US. MÖBIUS. Big Hug. KŌAN. Moonlight Beach.',
    topping: 'olive',
    era: '2000',
    external: true,
  },
  {
    id: 'podcast',
    label: 'community involvement',
    href: 'https://lovemusicmore.substack.com/',
    blurb: 'Love Music More — a podcast. New episodes Tuesdays.',
    topping: 'basil',
    era: '2000',
    external: true,
  },
  {
    id: 'contact',
    label: 'submit a comment to the webmaster',
    href: 'mailto:beformer@aol.com',
    blurb: 'The webmaster reads every comment. The webmaster may also be the rat.',
    topping: 'onion',
    era: '1994',
  },
  {
    id: 'beformer',
    label: 'the usual corporate stuff',
    href: 'https://beformer.co',
    blurb: 'Corporate. (It is a record label.)',
    topping: 'anchovy',
    era: '2000',
    external: true,
    deadpan: true,
  },

  // --- secondary platform links, restored from the live site so the rebuild
  //     doesn't drop real backlinks / merch. Rendered as a compact social row,
  //     not in the curated Sample Menu. ---
  {
    id: 'applemusic',
    label: 'Apple Music',
    href: 'https://music.apple.com/us/artist/scoobert-doobert/1240946356',
    blurb: 'Scoobert on Apple Music.',
    group: 'social',
    external: true,
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    href: 'http://soundcloud.com/mrscoobertdoobert',
    blurb: 'Scoobert on SoundCloud.',
    group: 'social',
    external: true,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    href: 'https://www.tiktok.com/@mr.scoobert_doobert',
    blurb: 'Scoobert on TikTok.',
    group: 'social',
    external: true,
  },
  {
    id: 'threads',
    label: 'Threads',
    href: 'https://www.threads.net/@scoobertdoobert.pizza',
    blurb: 'Scoobert on Threads.',
    group: 'social',
    external: true,
  },
  {
    id: 'reddit',
    label: 'Reddit',
    href: 'https://www.reddit.com/user/mrscoobertdoobert',
    blurb: 'Scoobert on Reddit.',
    group: 'social',
    external: true,
  },
  {
    id: 'merch',
    label: 'T-Shirts',
    href: 'https://scoobertdoobert.threadless.com/',
    blurb: 'Scoobert merch on Threadless.',
    group: 'social',
    external: true,
  },
  {
    id: 'podcastfeed',
    label: 'Podcast feed',
    href: 'https://anchor.fm/scoobertdoobert',
    blurb: 'The Love Music More podcast feed.',
    group: 'social',
    external: true,
  },
];

/** The curated storefront menu (everything that isn't a secondary social link). */
export const MENU_DESTINATIONS = DESTINATIONS.filter((d) => d.group !== 'social');
/** Secondary platform links for the compact social row. */
export const SOCIAL_DESTINATIONS = DESTINATIONS.filter((d) => d.group === 'social');

/** The flat text-only fallback route — the canonical "no JS / mobile / reduced
 *  motion / install-unavailable" destination. Use this constant rather than
 *  hardcoding the path so the branches can't drift. */
export const TEXT_ONLY_PATH = '/text';

/** Convenience lookup used by the storefront news blurb + later hotspots. */
export function destById(id: string): Dest | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}

/**
 * Resolve a floor/room's `links` (Dest ids) to real destinations. Unknown ids
 * are dropped, but warned about in dev so a typo in FLOORS/ROOMS surfaces
 * instead of silently rendering a short nav.
 */
export function resolveLinks(ids: string[]): Dest[] {
  const out: Dest[] = [];
  for (const id of ids) {
    const d = destById(id);
    if (d) out.push(d);
    else if (import.meta.env?.DEV) console.warn(`[links] unknown link id: "${id}"`);
  }
  return out;
}
