// Scoobert Doobert discography as schema.org MusicAlbum nodes.
//
// Built data-driven from albums.json (the storefront's album grid) so adding an
// album never means hand-editing JSON-LD. Every album is `byArtist` the shared
// canonical #scoobert id (homed on lukefwalton.com), so these reconcile to the
// same artist the rest of the network describes — including the hub's own dated,
// tracklisted MusicAlbum pages at lukefwalton.com/albums/.
//
// Release dates and streaming links are intentionally NOT asserted here: the hub
// (/albums/) is the canonical, dated source of truth for each release. These
// nodes give .pizza a crawlable discography tied to the artist without
// duplicating — or risking drift from — that authoritative metadata.

import albums from './albums.json';

const ORIGIN = 'https://www.scoobertdoobert.pizza';
const SCOOBERT_ID = 'https://lukefwalton.com/#scoobert';

type AlbumEntry = { slug: string; title: string; art: string };

export function albumNodes() {
  return (albums as AlbumEntry[]).map((album) => ({
    '@type': 'MusicAlbum',
    '@id': `${ORIGIN}/#album-${album.slug}`,
    name: album.title,
    byArtist: { '@id': SCOOBERT_ID },
    image: `${ORIGIN}${album.art}`,
  }));
}

// One @graph of MusicAlbum nodes. Each links to the artist via `byArtist`
// (#scoobert) — we deliberately do NOT re-declare a #scoobert MusicGroup node
// here: the canonical one lives in index.html, and a second partial copy would
// shadow it (the post-build identity check resolves #scoobert by @id).
export function discographyGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': albumNodes(),
  };
}
