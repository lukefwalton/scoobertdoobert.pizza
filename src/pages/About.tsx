import { Head } from 'vite-react-ssg';
import '../styles/about.css';
import { destById } from '../data/links';
import { personNode } from '../data/identity';
import { ExternalLink as Ext } from '../components/ExternalLink';

// ───────────────────────────────────────────────────────────────────────────
// /about — "Our Secret Recipe." The plain, credible page: the thing a search
// engine (and a curious human) sees when they want the story told straight, in
// contrast to the goblin-mode storefront. Clean, readable, semantic, crawlable.
//
// ENTITY GRAPH: the three creative outputs (artist, podcast, audiobook) reuse
// the canonical @ids that already live on the lukefwalton.com hub — #scoobert,
// #lovemusicmore-podcast, #apology-audiobook — so a crawler resolves them to one
// creator with three outputs instead of forking a second set of .pizza-homed
// entities. lukefwalton.com stays a subtle backlink only (rel=me + JSON-LD @id),
// never a nav destination here. Collaborator links below point at each artist's
// own external home (verified via the hub's collaborators data), never at the hub.
// ───────────────────────────────────────────────────────────────────────────

export default function About() {
  const listen =
    destById('listen')?.href ?? 'https://open.spotify.com/artist/5zKkCi9E4L8p6aRiCSJVTn';
  const catalog = destById('catalog')?.href ?? 'https://scoobertdoobert.bandcamp.com/';
  const lmm = destById('podcast')?.href ?? 'https://lovemusicmore.substack.com/';

  // Plato audiobook + library catalog — real destinations, inlined here (one-off
  // mentions, not part of the storefront menu / hotspots in links.ts).
  const audiobookSpotify = 'https://open.spotify.com/show/0sSgSiGIWfaTibSoTD8RgG';
  const audiobookApple = 'https://books.apple.com/us/audiobook/apology-by-plato/id1710940329';
  const audiobookTuneIn =
    'https://tunein.com/radio/Stream-Platos-Dialogues-as-Read-by-Scoobert-Doobert-a115253/';
  const ajaxLibrary =
    'https://discover.ajaxlibrary.ca/Author/Home?author=%22Doobert%2C%20Scoobert%22';

  // Verified collaborator / placement homes (harvested from the lukefwalton.com
  // hub's collaborators data). External destinations only, never a hub nav link.
  const ext = {
    chai: 'https://www.subpop.com/artists/chai',
    winkTogether: 'https://www.subpop.com/releases/chai/wink_together',
    okame: 'https://manakana.bitfan.id/',
    komagome: 'https://www.komagomefc.com/',
    bed: 'https://bed2052.com/',
    germanRadio: 'https://www.egofm.de/',
    tamtam: 'https://www.youtube.com/channel/UCoMxi0h7K5WQIVRyxh2TZXg',
    otomachi:
      'https://www.songkick.com/festivals/3687082-zaotomati-the-otomachi/id/42121412--the-otomachi-festival-2024',
    three: 'https://www.toos.co.jp/3/',
    otomachiFlyer: 'https://www.instagram.com/p/C-vnLOVSPq-/',
    threeFlyer: 'https://www.instagram.com/p/DBIowJ9SM2s/',
    kerriMedders: 'https://en.wikipedia.org/wiki/Kerri_Medders',
    ninaFrancis: 'https://ninafrancismusic.com/',
    louRoy: 'https://www.singlouroy.com/',
    jamieDrake: 'https://www.jamiedrakemusic.com/',
    limonLimon: 'https://limonlimonmusic.bandcamp.com/',
    victorMarc: 'https://victormarc.com/',
    joshShpak: 'https://joshoo.com/',
    grizzardGraphics: 'https://lukebrogoitti.myportfolio.com/scoobert-doobert',
  };

  // The FAQ (ADDENDUM #8: AEO): one array drives BOTH the visible section and
  // the FAQPage JSON-LD, so the structured answers can never drift from the page
  // (Google requires the marked-up Q&As to be visible content). Facts only —
  // everything here is stated elsewhere on this page or in links.ts.
  const faq: { q: string; a: string }[] = [
    {
      q: 'Who is Scoobert Doobert?',
      a: 'Scoobert Doobert is the recording name of Luke Francis Walton, a musician from San Diego, California: self-produced indie pop, chill pop, funk, and lofi, close to 300 registered compositions, written, played, produced, and mixed by Scoobert himself.',
    },
    {
      q: 'Does Scoobert Doobert mix or produce records for other artists?',
      a: 'Yes — he is a mixing engineer & producer for hire. Credits include collaboration with CHAI across Sub Pop and Sony Music Japan and placements on NHK and Fuji TV, and he mixes, produces, and plays on all of his own records.',
    },
    {
      q: 'How do I hire Scoobert Doobert for mixing or production?',
      a: 'Email beformer@aol.com with the subject "Mixing / production inquiry". That address reaches him directly.',
    },
    {
      q: 'What is The Reel?',
      a: 'The Reel is his hire reel on Spotify: productions & collabs throughout the playlist, with the mixes at the bottom, proof of the work before you write.',
    },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': 'https://www.scoobertdoobert.pizza/about#page',
        name: 'About Scoobert Doobert',
        url: 'https://www.scoobertdoobert.pizza/about',
        inLanguage: 'en',
        isPartOf: { '@id': 'https://www.scoobertdoobert.pizza/#website' },
        about: { '@id': 'https://lukefwalton.com/#scoobert' },
        mainEntity: { '@id': 'https://lukefwalton.com/#scoobert' },
      },
      {
        '@type': 'MusicGroup',
        '@id': 'https://lukefwalton.com/#scoobert',
        name: 'Scoobert Doobert',
        description:
          'Self-produced San Diego indie pop, chill pop, alt-pop, funk, and lofi music project: nearly 300 compositions written, played, produced, and mixed by Scoobert himself. CHAI collaborator across Sub Pop and Sony Music Japan, with placements on NHK and Fuji TV; host of the Love Music More podcast; reader of Plato’s dialogues in spoken-word audiobook form.',
        disambiguatingDescription:
          'Music, podcast, and audio project of Luke Francis Walton. Not Luke Walton the NBA player and coach.',
        genre: ['indie pop', 'chill pop', 'alt-pop', 'funk', 'lo-fi', 'bedroom pop'],
        foundingDate: '2006',
        foundingLocation: { '@type': 'Place', name: 'San Diego, California' },
        location: { '@type': 'Place', name: 'San Diego, California' },
        recordLabel: { '@id': 'https://lukefwalton.com/#beformer' },
        award: 'San Diego Music Award nomination (Big Hug)',
        member: { '@id': 'https://lukefwalton.com/#person' },
        sameAs: [
          'https://open.spotify.com/artist/5zKkCi9E4L8p6aRiCSJVTn',
          'https://music.apple.com/us/artist/scoobert-doobert/1240946356',
          'https://scoobertdoobert.bandcamp.com/',
          'https://www.youtube.com/@scoobertdoobertburrito',
          'https://soundcloud.com/mrscoobertdoobert',
          'https://www.instagram.com/scoobertdoobert.pizza/',
          'https://www.tiktok.com/@mr.scoobert_doobert',
          'https://www.threads.net/@scoobertdoobert.pizza',
          'https://www.reddit.com/user/mrscoobertdoobert',
          'https://musicbrainz.org/artist/014129ba-f616-4754-a2a5-22933c639ab0',
          'https://www.discogs.com/artist/8593593-Scoobert-Doobert',
          'https://genius.com/artists/Scoobert-doobert',
          // Tidal artist, confirmed on the Wikidata item (Q140387739).
          'https://tidal.com/browse/artist/8793940',
          'https://discover.ajaxlibrary.ca/Author/Home?author=%22Doobert%2C%20Scoobert%22',
          'https://koookooorooo.com/scoobert-doobert',
        ],
      },
      {
        '@type': 'PodcastSeries',
        '@id': 'https://lukefwalton.com/#lovemusicmore-podcast',
        name: 'Love Music More',
        alternateName: 'Love Music More with Scoobert Doobert',
        description:
          'A newsletter and podcast on the craft, philosophy, and history of music, hosted by Scoobert Doobert, with guests from every genre and every role backstage to the stage. Ranked in the top 10% of music podcasts. New episodes Tuesdays.',
        url: 'https://lukefwalton.com/love-music-more/',
        webFeed: 'https://anchor.fm/s/58fb6244/podcast/rss',
        author: { '@id': 'https://lukefwalton.com/#scoobert' },
        sameAs: [
          'https://open.spotify.com/show/60DA9vSxpalAojp3Zp2T8h',
          'https://podcasts.apple.com/us/podcast/love-music-more-with-scoobert-doobert/id1567355195',
          'https://www.youtube.com/playlist?list=PLyFhmc3NqYe5rwvctk4OOb7emnuGVDFc-',
          'https://lovemusicmore.substack.com/',
        ],
      },
      {
        '@type': 'Audiobook',
        '@id': 'https://lukefwalton.com/#apology-audiobook',
        name: 'Apology by Plato',
        isPartOf: {
          '@type': 'CreativeWorkSeries',
          name: 'Plato’s Dialogues, as Read by Scoobert Doobert',
        },
        author: { '@type': 'Person', name: 'Plato' },
        readBy: { '@id': 'https://lukefwalton.com/#scoobert' },
        inLanguage: 'en',
        sameAs: [
          'https://open.spotify.com/show/0sSgSiGIWfaTibSoTD8RgG',
          'https://books.apple.com/us/audiobook/apology-by-plato/id1710940329',
          'https://tunein.com/radio/Stream-Platos-Dialogues-as-Read-by-Scoobert-Doobert-a115253/',
        ],
      },
      {
        '@type': 'MusicEvent',
        '@id': 'https://www.scoobertdoobert.pizza/#event-otomachi-2024',
        name: 'The Otomachi Festival 2024',
        startDate: '2024-10-14',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: 'Renzō-ji (蓮蔵寺)',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Zaō',
            addressRegion: 'Miyagi',
            addressCountry: 'JP',
          },
        },
        performer: { '@id': 'https://lukefwalton.com/#scoobert' },
      },
      {
        '@type': 'MusicEvent',
        '@id': 'https://www.scoobertdoobert.pizza/#event-three-2024',
        name: 'Scoobert Doobert at Shimokitazawa THREE (LOSS × beformer)',
        startDate: '2024-10-18',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'MusicVenue',
          name: 'Shimokitazawa THREE',
          sameAs: 'https://www.toos.co.jp/3/',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Setagaya',
            addressRegion: 'Tokyo',
            addressCountry: 'JP',
          },
        },
        organizer: { '@id': 'https://lukefwalton.com/#beformer' },
        performer: { '@id': 'https://lukefwalton.com/#scoobert' },
      },
      personNode('en'),
      {
        '@type': 'FAQPage',
        '@id': 'https://www.scoobertdoobert.pizza/about#faq',
        mainEntity: faq.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  };

  return (
    <main className="about">
      <Head>
        <title>About Scoobert Doobert</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/about" />
        <link rel="alternate" hrefLang="en" href="https://www.scoobertdoobert.pizza/about" />
        <link rel="alternate" hrefLang="ja" href="https://www.scoobertdoobert.pizza/about/jp" />
        <link rel="alternate" hrefLang="x-default" href="https://www.scoobertdoobert.pizza/about" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:locale:alternate" content="ja_JP" />
        <meta
          name="description"
          content="Scoobert Doobert is a self-produced San Diego indie pop, chill pop, funk, and lofi music project, and a mixing engineer & producer for hire (beformer@aol.com). CHAI production across Sub Pop and Sony Music Japan, the MÖBIUS cycle, the Love Music More podcast, and a Plato audiobook."
        />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/about" />
        <meta property="og:title" content="About Scoobert Doobert" />
        <meta
          property="og:description"
          content="Self-produced San Diego indie pop, chill pop, funk, and lofi. CHAI production across Sub Pop and Sony Music Japan, the MÖBIUS cycle, the Love Music More podcast, and a Plato audiobook."
        />
        <meta
          property="og:image"
          content="https://www.scoobertdoobert.pizza/press/scoobert-og-card.jpg"
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Head>

      <article className="about__article">
        <p className="about__eyebrow">Our Secret Recipe</p>
        <h1>About Scoobert Doobert</h1>

        <p className="about__langswitch">
          <a href="/about/jp" hrefLang="ja" lang="ja">
            日本語版 »
          </a>
        </p>

        <figure className="about__portrait">
          <img
            src="/press/scoobert-og.jpg"
            alt="Scoobert Doobert (Luke Francis Walton), googly eyes stuck across his face, one hand raised toward the camera."
            width="320"
            height="320"
          />
        </figure>

        <p className="about__lede">
          <strong>Scoobert Doobert</strong> is a lofi hifi wifi music project from{' '}
          <strong>San Diego, California</strong>: self-produced indie pop, chill pop, funk, lofi,
          and homemade studio music for people who like hooks, jokes, feelings, tape hiss, beach
          weather, internet brain, and burritos.
        </p>

        <p>
          Born on the internet and raised near the coast, Scoobert Doobert makes songs that sound
          sunny even when they’re about trying not to collapse. The project lives somewhere between
          songwriter record, bedroom studio experiment, California postcard, comedy bit, and sincere
          little prayer. Most of the music is written, played, produced, recorded, and mixed by
          Scoobert himself, which is both the problem and the point.
        </p>

        <h2>The music</h2>
        <p>
          Before Scoobert Doobert became a full-time recording universe, Scoobert spent years as a
          working musician, touring as a guitarist and vocalist with The Doobie Brothers and opening
          for Gregg Allman while playing with Lara Johnston. After the road, the work moved deeper
          into production, engineering, and collaboration, eventually folding those skills back into
          the Scoobert catalog.
        </p>
        <p>
          The solo project started from a bedroom and slowly became a many-room house. Early
          releases led to <em>I’m an Idiot</em>, which landed on Spotify’s New Music Friday and
          helped connect Scoobert with the Japanese band <Ext href={ext.chai}>CHAI</Ext>. That
          became <em>Miracle (Scoobert Doobert Remix)</em> on Sub Pop’s{' '}
          <Ext href={ext.winkTogether}>
            <em>WINK TOGETHER</em>
          </Ext>
          , followed by more production and songwriting with CHAI, including <em>WHOLE</em>, the
          theme for the NHK drama 恋せぬふたり, and <em>MY DREAM</em>, from the film さかなの子. The
          Japan thread runs all the way through: the collaborations kept going: CHAI, then{' '}
          <Ext href={ext.okame}>OKAME</Ext>, <Ext href={ext.komagome}>KOMAGOME</Ext>, and the Tokyo
          band <Ext href={ext.bed}>bed</Ext>, whose Fuji TV drama theme Scoobert co-produced,
          alongside the language-learning and a two-date run in October 2024:{' '}
          <Ext href={ext.otomachi}>The Otomachi Festival</Ext> at a mountain temple in Zaō, Miyagi (
          <Ext href={ext.otomachiFlyer}>Oct 14</Ext>), then an all-night LOSS × beformer party at{' '}
          <Ext href={ext.three}>Shimokitazawa THREE</Ext> in Tokyo (
          <Ext href={ext.threeFlyer}>Oct 18</Ext>), and the general belief that a good melody can
          travel farther than your passport.
        </p>
        <figure className="about__portrait">
          <img
            src="/press/scoobert-tokyo-2024.jpg"
            alt="Scoobert Doobert in Tokyo, October 2024."
            width="1000"
            height="666"
            loading="lazy"
          />
          <figcaption>Tokyo, October 2024</figcaption>
        </figure>
        <p>
          Scoobert Doobert albums include <em>Big Hug</em> (a San Diego Music Award nominee),{' '}
          <em>KŌAN</em>, <em>Moonlight Beach</em>, <em>MÖB</em>, and <em>I</em>. <em>MÖB</em> and{' '}
          <em>I</em> open the MÖBIUS cycle, a four-part album arc about loops, memory, California,
          Japan, friendship, identity, and trying to get somewhere without fully leaving the place
          you started. The{' '}
          <a href={catalog} target="_blank" rel="noopener noreferrer">
            catalog
          </a>{' '}
          is large, strange, and still expanding: close to 300 registered compositions across
          singles, remixes, collaborations, demos, visual releases, alternate identities, and songs
          that may or may not exist because the burrito demanded it. The cover art across the
          catalog, and the project’s visual identity, is the work of{' '}
          <Ext href={ext.grizzardGraphics}>Grizzard Graphics</Ext>.
        </p>
        <p>
          The music has circulated through official playlists, indie and{' '}
          <Ext href={ext.germanRadio}>German radio</Ext>, Japanese film and television, and
          international collaborations, and Scoobert has worked with a wide cast of artists and
          players including CHAI, OKAME, bed, <Ext href={ext.tamtam}>Tamtam</Ext>,{' '}
          <Ext href={ext.kerriMedders}>Kerri Medders</Ext>,{' '}
          <Ext href={ext.ninaFrancis}>Nina Francis</Ext>, <Ext href={ext.louRoy}>Lou Roy</Ext>,{' '}
          <Ext href={ext.jamieDrake}>Jamie Drake</Ext>, <Ext href={ext.limonLimon}>Limón Limón</Ext>
          , <Ext href={ext.victorMarc}>Victor Marc</Ext>, and{' '}
          <Ext href={ext.joshShpak}>Josh Shpak</Ext>. The best way in is simply to{' '}
          <a href={listen} target="_blank" rel="noopener noreferrer">
            listen
          </a>
          .
        </p>
        <p>
          And yes, the kitchen takes outside orders: Scoobert is a{' '}
          <b>mixing engineer &amp; producer for hire</b>. He mixes, produces, and plays on all of
          his own records, and he will do the same for yours. Hear the proof on{' '}
          <a
            href={
              destById('reel')?.href ?? 'https://open.spotify.com/playlist/7pmgoZlkf6exw4BAJTQs7Q'
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            The Reel
          </a>{' '}
          (productions &amp; collabs throughout; the mixes are at the bottom), then write to{' '}
          <a
            href={destById('contact')?.href ?? 'mailto:beformer@aol.com'}
            target="_blank"
            rel="noopener noreferrer"
          >
            beformer@aol.com
          </a>
          .
        </p>

        <h2>Love Music More</h2>
        <p>
          Scoobert Doobert also hosts{' '}
          <a href={lmm} target="_blank" rel="noopener noreferrer">
            <em>Love Music More</em>
          </a>
          , a newsletter and podcast on the craft, philosophy, and history of music, a top-10%
          music podcast with conversations across every genre and every role, backstage to the
          stage: Grammy-winning engineers and producers behind Adele, Beyoncé, Metallica, Janet
          Jackson, “Weird Al” Yankovic, Lana Del Rey, and St. Vincent, plus punk founders,
          scene-builders, and the people who actually decide how a record sounds. New episodes
          Tuesdays; deeper dives on Substack.
        </p>

        <h2>Plato, out loud</h2>
        <p>
          And beyond music, Scoobert has read the Greeks:{' '}
          <em>Plato’s Dialogues, as Read by Scoobert Doobert</em>, with the <em>Apology</em> out now
          on{' '}
          <a href={audiobookSpotify} target="_blank" rel="noopener noreferrer">
            Spotify
          </a>
          ,{' '}
          <a href={audiobookApple} target="_blank" rel="noopener noreferrer">
            Apple Books
          </a>
          , and{' '}
          <a href={audiobookTuneIn} target="_blank" rel="noopener noreferrer">
            TuneIn
          </a>{' '}
         , and, improbably,{' '}
          <a href={ajaxLibrary} target="_blank" rel="noopener noreferrer">
            cataloged by a Canadian public library
          </a>
          , which means somewhere a librarian has filed the burrito under “author.”
        </p>

        <p>
          At its core, Scoobert Doobert is abundant songwriting with a smile on its face and a
          suspicious amount going on under the hood: beachy, dense, goofy, earnest, overcaffeinated,
          over-reverbed, and usually trying to hand you something warm before it disappears.
        </p>
        <p>
          Scoobert Doobert is the recording, podcasting, and audio-project name of{' '}
          <a href="https://lukefwalton.com/" rel="me">
            Luke Francis Walton
          </a>
          .
        </p>

        <h2>The philosophy of the pizza</h2>
        <p>
          This website is the archive of all of it. It opens as a deliberately ugly 1996 “electronic
          pizza storefront” and, if you let it, falls backward through the web eras and drops you
          into a low-poly world off the coast of San Diego, a long-overdue delivery on a promise
          the early web made and never quite kept. The retro costume is a joke. Underneath, this is
          a real musician’s home on the internet, and every link here goes somewhere real.
        </p>

        <h2>Frequently asked questions</h2>
        <section className="about__faq" aria-label="Frequently asked questions">
          {faq.map(({ q, a }) => (
            <div key={q}>
              <h3>{q}</h3>
              <p>{a}</p>
            </div>
          ))}
        </section>

        <hr />

        <nav className="about__links" aria-label="Where to go next">
          <a href={listen} target="_blank" rel="noopener noreferrer">
            Listen »
          </a>
          <a href={catalog} target="_blank" rel="noopener noreferrer">
            Full catalog »
          </a>
          <a href={lmm} target="_blank" rel="noopener noreferrer">
            Love Music More »
          </a>
          <a href={audiobookSpotify} target="_blank" rel="noopener noreferrer">
            Plato’s Apology »
          </a>
          <a href="/links">All the links »</a>
          <a href="/">« Back to the storefront</a>
        </nav>
      </article>
    </main>
  );
}
