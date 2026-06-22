// The album catalog — Scoobert's covers, the art that hangs as in-world PAINTINGS
// (CoverArt.tsx) and the portals you dive into. Generated from the real art by
// scripts/make-album-covers.mjs (source in media/album-art/, degraded derivatives
// in public/brand/albums/). Add a cover = drop art in + re-run the script.
//
// Luke's covers are his copyright (© Luke F. Walton dba Scoobert Doobert, all rights
// reserved) — only the degraded web derivatives ship; this just indexes them.
import catalog from './albums.json';

export type Album = {
  /** Stable id used by paintings/doors (e.g. 'moonlight-beach'). */
  slug: string;
  /** Display title for the plaque / pause-menu / alt text. */
  title: string;
  /** The degraded cover URL under public/. */
  art: string;
  /** A representative jukebox-catalog slug (jukebox.catalog.json) — what plays when
   *  you dive into this cover (the reward is sound). Absent if there's no public track. */
  track?: string;
};

export const ALBUMS: Album[] = catalog as Album[];

const BY_SLUG = new Map(ALBUMS.map((a) => [a.slug, a]));

/** Resolve an album by slug (undefined if a painting references an unknown one). */
export const albumBySlug = (slug: string): Album | undefined => BY_SLUG.get(slug);
