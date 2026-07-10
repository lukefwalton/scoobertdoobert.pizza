// ───────────────────────────────────────────────────────────────────────────
// identity.ts — the single source of truth for the shared Person identity node.
//
// scoobertdoobert.pizza and lukefwalton.com describe ONE creator. Both sites use
// the canonical Person @id `https://lukefwalton.com/#person` (the hub's PERSON_ID),
// so a crawler resolves the storefront's references and the hub's node to a single
// entity — one person, two domains. We deliberately do NOT mint a separate
// Scoobert person, and we do NOT use `#luke-f-walton` (confirmed against the hub:
// it keeps `#person`).
//
// The TSX pages (`/about`, `/about/jp`) import `personNode()` so they never drift.
// `index.html` is static HTML and can't import this module — its inline Person
// node is a hand-maintained mirror; keep the two in sync when editing here.
// ───────────────────────────────────────────────────────────────────────────

/** The canonical Person @id, shared verbatim with the lukefwalton.com hub. */
export const PERSON_ID = 'https://lukefwalton.com/#person';

/**
 * The exhaustive canonical `sameAs` set for the person — the same identity set
 * the hub describes, so both domains describe the person identically. Built from
 * this site's real footer/menu profiles plus the cross-graph IDs; tracking params
 * (e.g. `?si=`) stripped. Includes `https://lukefwalton.com/` itself — the
 * bidirectional link that ties the storefront to the hub.
 *
 * Intentionally omitted to avoid fabrication (no verified URL / does not yet
 * exist): Google Scholar, AllMusic. Add them here once real. (Wikidata became
 * real — Q140387739, the hub carries it too — and is included below.)
 *
 * Also dropped as non-canonical per review (search/aggregator-style pages, not
 * stable identity-equivalent URLs): the Ajax Public Library author-search page
 * and koookooorooo.com. They remain on the #scoobert artist node (a catalog
 * listing there is defensible); they're just not Person-level identity claims.
 *
 * Deliberately NOT here: beformer.co — that's the record label (an organization),
 * modeled in the graph as the #beformer recordLabel node, not a page that
 * represents the person. sameAs on a Person is for person-representing URLs only.
 */
export const CANONICAL_SAMEAS: string[] = [
  // The hub — required for the bidirectional person↔hub link.
  'https://lukefwalton.com/',
  // Streaming / social (from the site footer + Sample Menu).
  'https://open.spotify.com/artist/5zKkCi9E4L8p6aRiCSJVTn',
  'https://music.apple.com/us/artist/scoobert-doobert/1240946356',
  'https://scoobertdoobert.bandcamp.com/',
  'https://soundcloud.com/mrscoobertdoobert',
  'https://www.youtube.com/@scoobertdoobertburrito',
  'https://www.tiktok.com/@mr.scoobert_doobert',
  'https://www.threads.net/@scoobertdoobert.pizza',
  'https://www.reddit.com/user/mrscoobertdoobert',
  'https://www.instagram.com/scoobertdoobert.pizza/',
  'https://anchor.fm/scoobertdoobert',
  'https://scoobertdoobert.threadless.com/',
  'https://lovemusicmore.substack.com/',
  // Cross-graph identifiers / authority files.
  // Wikidata person item (Luke Francis Walton, "known as Scoobert Doobert") —
  // the keystone anchor the hub's #person also carries.
  'https://www.wikidata.org/wiki/Q140387739',
  'https://orcid.org/0009-0005-9263-1954',
  'https://isni.org/isni/0000000530400539',
  'https://musicbrainz.org/artist/014129ba-f616-4754-a2a5-22933c639ab0',
  'https://philpeople.org/profiles/luke-f-walton',
  'https://github.com/lukefwalton',
  'https://www.discogs.com/artist/8593593-Scoobert-Doobert',
  'https://genius.com/artists/Scoobert-doobert',
];

/** Every name the person records / publishes under, EN + 日本語. */
export const PERSON_ALTERNATE_NAMES: string[] = [
  'Scoobert Doobert',
  'スクーバート・ドゥーバート',
  'Luke Francis Walton',
  'ルーク・F・ウォルトン',
];

/**
 * What the person DOES, for hire (ADDENDUM #8 — the CONVERT pass). Language-
 * invariant like `identifier`/`sameAs`; the descriptions are the plain pitch a
 * crawler/answer-engine can quote: he mixes and produces records for other
 * artists, and mixes/produces/plays on all of his own.
 */
export const PERSON_OCCUPATIONS = [
  { '@type': 'Occupation', name: 'Musician' },
  {
    '@type': 'Occupation',
    name: 'Mixing engineer',
    description: 'Mixes records for hire; mixes all of his own releases.',
  },
  {
    '@type': 'Occupation',
    name: 'Record producer',
    description: 'Produces records for hire; produces and plays on all of his own releases.',
  },
] as const;

/** Authority-file identifiers as schema.org PropertyValue entries. */
export const PERSON_IDENTIFIER = [
  { '@type': 'PropertyValue', propertyID: 'IPI', name: 'BMI Songwriter IPI', value: '00579587572' },
  { '@type': 'PropertyValue', propertyID: 'ISNI', value: '0000 0005 3040 0539' },
  { '@type': 'PropertyValue', propertyID: 'ORCID', value: '0009-0005-9263-1954' },
] as const;

const DISAMBIGUATION: Record<'en' | 'ja', string> = {
  en: 'American musician and record producer; recording name Scoobert Doobert — not the Scooby-Doo character.',
  ja: 'アメリカのミュージシャン／レコードプロデューサー。レコーディング名義はスクーバート・ドゥーバート。アニメ『スクービー・ドゥー』のキャラクターとは無関係。',
};

/**
 * The canonical Person JSON-LD node, hung off the shared `#person` @id. Spread
 * into a page's `@graph`. `lang` only swaps the human-readable
 * `disambiguatingDescription`; the @id, names, identifiers, and sameAs are
 * identical across pages so every WebPage resolves to the same entity.
 */
export function personNode(lang: 'en' | 'ja' = 'en') {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Luke F. Walton',
    alternateName: PERSON_ALTERNATE_NAMES,
    disambiguatingDescription: DISAMBIGUATION[lang],
    url: 'https://lukefwalton.com/',
    // Person→group back-pointer, the reciprocal of the MusicGroup's `member`
    // edge (name inlined so the edge resolves on pages without the full node).
    memberOf: {
      '@type': 'MusicGroup',
      '@id': 'https://lukefwalton.com/#scoobert',
      name: 'Scoobert Doobert',
    },
    hasOccupation: PERSON_OCCUPATIONS,
    identifier: PERSON_IDENTIFIER,
    sameAs: CANONICAL_SAMEAS,
  };
}
