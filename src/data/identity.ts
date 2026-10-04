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

// The project's founding year as the hub declares it (SCOOBERT_DOOBERT.founded in
// lukefwalton.com/src/lib/scoobert-doobert.ts feeds #scoobert's foundingDate there).
// index.html mirrors it by hand on its #scoobert node; identity.test.ts pins that mirror
// to this constant so the two sites cannot drift apart silently.
export const SCOOBERT_FOUNDING_DATE = '2017';

/**
 * The canonical `sameAs` set for the PERSON: only URLs that represent Luke F.
 * Walton himself, matching the hub's #person (lukefwalton.com
 * `src/lib/person.ts`). Includes `https://lukefwalton.com/` itself, the link
 * that ties the storefront to the hub.
 *
 * Deliberately NOT here: anything that identifies the Scoobert Doobert project
 * (Spotify 5zKkCi9E…, Apple, Bandcamp, the project YouTube/Instagram/TikTok/
 * Threads/Reddit/SoundCloud, MusicBrainz 014129ba…, Discogs, Genius, Threadless).
 * Scoobert Doobert is Luke F. Walton's primary music project, a MusicGroup he
 * founded, not an alias of the person, so its identifiers live only on the
 * #scoobert node. The Love Music More newsletter and its old Anchor feed are a
 * separate co-owned show, not the person either. beformer.co is the label, an
 * organization. `identity.test.ts` fails if any URL here also appears on
 * #scoobert.
 */
export const CANONICAL_SAMEAS: string[] = [
  // The hub, the person's own site.
  'https://lukefwalton.com/',
  // Wikidata person item (Q140387739, instance of human), the keystone anchor
  // the hub's #person also carries.
  'https://www.wikidata.org/wiki/Q140387739',
  'https://orcid.org/0009-0005-9263-1954',
  'https://isni.org/isni/0000000530400539',
  'https://philpeople.org/profiles/luke-f-walton',
  'https://github.com/lukefwalton',
  'https://www.linkedin.com/in/lukefwalton',
  'https://www.imdb.com/name/nm3306688/',
  // Person-level music credits: AllMusic files them under his own name, and
  // this Spotify artist is the "Luke Francis Walton" songwriter/composer split.
  'https://www.allmusic.com/artist/luke-francis-walton-mn0003549942',
  'https://open.spotify.com/artist/6r813w5d6mXW3QWUHJvwo4',
  'https://www.instagram.com/lukefwalton/',
];

/**
 * Other names the PERSON is credited under, EN + 日本語. "Scoobert Doobert" is
 * deliberately not here: it names the project (#scoobert), not the human.
 */
export const PERSON_ALTERNATE_NAMES: string[] = ['Luke Francis Walton', 'ルーク・F・ウォルトン'];

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
  en: 'American musician, mixing engineer and record producer from San Diego; founder of the music project Scoobert Doobert. Not the Scooby-Doo character.',
  ja: 'サンディエゴ出身のアメリカのミュージシャン、ミキシング・エンジニア、レコードプロデューサー。音楽プロジェクト Scoobert Doobert（スクーバート・ドゥーバート）の創設者。アニメ『スクービー・ドゥー』のキャラクターとは無関係。',
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
