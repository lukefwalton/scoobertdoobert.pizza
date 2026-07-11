// ───────────────────────────────────────────────────────────────────────────
// src/data/lmm.ts — Love Music More, as data. Scoobert's (Luke's) podcast: a
// newsletter + show on the craft, philosophy, and history of music.
//
// A curated slice of the ~212 episodes, surfaced in the terminal (`lmm`): his own
// track production commentaries first (Boardwalk, KŌAN, the mixing workshop —
// the same songs you hear in-world), then the big-name guests. Each `url` and the
// concept are lifted verbatim from lukefwalton.com's episode notes (grep-verified
// against the lmm-episodes collection), so the repo stays standalone.
//
// The storefront `podcast` link (links.ts) is the front door; this is the deeper,
// goblin-mode peek for someone poking the terminal.
// ───────────────────────────────────────────────────────────────────────────

export type LmmEpisode = {
  /** The episode's title (as published). */
  title: string;
  /** Guest name, or null for a Scoobert solo / commentary episode. */
  guest: string | null;
  /** Listen link (YouTube for guest eps, Spotify for the solo commentaries). */
  url: string;
  /** A ≤120-char hook. */
  blurb: string;
};

export const LMM_CONCEPT =
  'Love Music More, a newsletter + podcast on the craft, philosophy, and history of music, hosted by Scoobert Doobert (Luke F. Walton), with guests from every corner of the business. Top 10% of music podcasts.';

/** The storefront's podcast destination (matches links.ts `podcast`). */
export const LMM_HOME = 'https://lovemusicmore.substack.com/';

// Scoobert's own track/record commentaries first (the in-world songs, from the
// inside), then notable guests. Verified episode links.
export const LMM_EPISODES: LmmEpisode[] = [
  {
    title: 'Boardwalk, track / production commentary',
    guest: null,
    url: 'https://open.spotify.com/episode/2TYRKCalZ5cJX6mSgJ65Y4',
    blurb:
      "Inside the stems of the surf-rock single 'Boardwalk': Ventures DNA, granular synths, the birth and death of sounds.",
  },
  {
    title: 'KŌAN LP overview + Think About It, commentary',
    guest: null,
    url: 'https://open.spotify.com/episode/6pWrSaNWju6uVjhYEmT4cV',
    blurb:
      'A kōan is true and false at once, the record holds its contradictions without resolving them.',
  },
  {
    title: 'a song to quit your job to, production commentary',
    guest: null,
    url: 'https://open.spotify.com/episode/6neNia00GUFkrNWqBWwaZB',
    blurb: 'Stem by stem: mellotron texture, bendable pitch, and knowing WHY so you can defend it.',
  },
  {
    title: 'A Mixing Workshop with Scoobert Doobert',
    guest: null,
    url: 'https://open.spotify.com/episode/17vEZw9jKPbRGCJulsl9ED',
    blurb:
      'Mixing is a taste sport. Why contrast beats any plugin, and how a mono reverb finally gets heard.',
  },
  {
    title: 'A Gentle Shelf with Andrew Scheps',
    guest: 'Andrew Scheps',
    url: 'https://www.youtube.com/watch?v=cKtP4c-7lto',
    blurb:
      'Adele, U2, Hozier, mix for a feel not a sound, why Adele had zero compression, and where AI helps.',
  },
  {
    title: 'The Additive Nature with Craig Bauer',
    guest: 'Craig Bauer',
    url: 'https://www.youtube.com/watch?v=wvl8vmh5ipw',
    blurb:
      'Grammy-winning mixer (Janet Jackson, Lupe, Destiny’s Child) inside his Chicago sessions with legends.',
  },
  {
    title: 'Making BIG Records with Phillip Broussard Jr.',
    guest: 'Phillip Broussard Jr.',
    url: 'https://www.youtube.com/watch?v=ZtWt750Ifmc',
    blurb:
      'RHCP, Adele, Eminem, Muse, Slipknot, Rick Rubin, session prep, phase, tape, and the mix.',
  },
  {
    title: '"Weird Al", Diamond Records & Snare Drums w/ Bermuda Schwartz',
    guest: 'Jon "Bermuda" Schwartz',
    url: 'https://www.youtube.com/watch?v=VAZwzeYUov8',
    blurb:
      "Weird Al's drummer of 40 years on diamond records, The Simpsons, and an absurd journey.",
  },
  {
    title: 'Tough Love from Twisted Sister’s Jay Jay French',
    guest: 'Jay Jay French',
    url: 'https://www.youtube.com/watch?v=f_5e1V34GDA',
    blurb: 'Brutally honest on the industry, how 9,000+ live shows led to going multi-platinum.',
  },
  {
    title: 'Harley Flanagan Is Wired for Chaos (Cro-Mags)',
    guest: 'Harley Flanagan',
    url: 'https://www.youtube.com/watch?v=Xlsq-j_VxSQ',
    blurb: 'Probably played CBGB more than anyone alive, a brutal life music got him through.',
  },
  {
    title: 'A Pioneer of Punk with Andy Shernoff (The Dictators)',
    guest: 'Andy Shernoff',
    url: 'https://www.youtube.com/watch?v=BGTB1ck3V2Q',
    blurb: "What's it like to invent a genre? '70s NYC, early CBGB, writing with the Ramones.",
  },
  {
    title: 'BBL Drizzy and Burrito Bot (AI Song Gen Tips)',
    guest: null,
    url: 'https://open.spotify.com/episode/7bUgGgLVBDU5zQmdx3rEJA',
    blurb: '"I made 1000 AI songs so you don’t have to." What music history teaches us about AI.',
  },
];
