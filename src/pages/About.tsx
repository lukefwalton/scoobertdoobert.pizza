import { Head } from 'vite-react-ssg';
import '../styles/about.css';
import { destById } from '../data/links';

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
// never a nav destination here.
// ───────────────────────────────────────────────────────────────────────────
export default function About() {
  const listen = destById('listen')?.href ?? 'https://open.spotify.com/artist/5zKkCi9E4L8p6aRiCSJVTn';
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': 'https://scoobertdoobert.pizza/about#page',
        name: 'About Scoobert Doobert',
        url: 'https://scoobertdoobert.pizza/about',
        isPartOf: { '@id': 'https://scoobertdoobert.pizza/#website' },
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
          'http://soundcloud.com/mrscoobertdoobert',
          'https://www.instagram.com/scoobertdoobert.pizza/',
          'https://www.tiktok.com/@mr.scoobert_doobert',
          'https://www.threads.net/@scoobertdoobert.pizza',
          'https://www.reddit.com/user/mrscoobertdoobert',
          'https://musicbrainz.org/artist/014129ba-f616-4754-a2a5-22933c639ab0',
          'https://www.discogs.com/artist/8593593-Scoobert-Doobert',
          'https://genius.com/artists/Scoobert-doobert',
          'https://discover.ajaxlibrary.ca/Author/Home?author=%22Doobert%2C%20Scoobert%22',
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
        '@type': 'Person',
        '@id': 'https://lukefwalton.com/#person',
        name: 'Luke Francis Walton',
        alternateName: ['Luke F. Walton', 'Scoobert Doobert'],
        url: 'https://lukefwalton.com/',
      },
    ],
  };

  return (
    <main className="about">
      <Head>
        <title>About Scoobert Doobert</title>
        <link rel="canonical" href="https://scoobertdoobert.pizza/about" />
        <meta
          name="description"
          content="Scoobert Doobert is a self-produced San Diego indie pop, chill pop, funk, and lofi music project: CHAI production across Sub Pop and Sony Music Japan, the four-part MÖBIUS cycle, the top-10% Love Music More podcast, and a Plato audiobook."
        />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content="https://scoobertdoobert.pizza/about" />
        <meta property="og:title" content="About Scoobert Doobert" />
        <meta
          property="og:description"
          content="Self-produced San Diego indie pop, chill pop, funk, and lofi. CHAI production across Sub Pop and Sony Music Japan, the MÖBIUS cycle, the Love Music More podcast, and a Plato audiobook."
        />
        <meta property="og:image" content="https://scoobertdoobert.pizza/press/scoobert-og.jpg" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Head>

      <article className="about__article">
        <p className="about__eyebrow">Our Secret Recipe</p>
        <h1>About Scoobert Doobert</h1>

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
          <strong>San Diego, California</strong>: self-produced indie pop, chill pop, funk,
          lofi, and homemade studio music for people who like hooks, jokes, feelings, tape
          hiss, beach weather, internet brain, and burritos.
        </p>

        <p>
          Born on the internet and raised near the coast, Scoobert Doobert makes songs that
          sound sunny even when they’re about trying not to collapse. The project lives
          somewhere between songwriter record, bedroom studio experiment, California
          postcard, comedy bit, and sincere little prayer. Most of the music is written,
          played, produced, recorded, and mixed by Scoobert himself, which is both the
          problem and the point.
        </p>

        <h2>The music</h2>
        <p>
          Before Scoobert Doobert became a full-time recording universe, Scoobert spent
          years as a working musician, touring as a guitarist and vocalist with The Doobie
          Brothers and opening for Gregg Allman while playing with Lara Johnston. After the
          road, the work moved deeper into production, engineering, and collaboration,
          eventually folding those skills back into the Scoobert catalog.
        </p>
        <p>
          The solo project started from a bedroom and slowly became a many-room house.
          Early releases led to <em>I’m an Idiot</em>, which landed on Spotify’s New Music
          Friday and helped connect Scoobert with the Japanese band CHAI. That became{' '}
          <em>Miracle (Scoobert Doobert Remix)</em> on Sub Pop’s <em>WINK TOGETHER</em>,
          followed by more production and songwriting with CHAI, including <em>WHOLE</em>,
          the theme for the NHK drama 恋せぬふたり, and <em>MY DREAM</em>, from the film
          さかなの子. The Japan thread runs all the way through: the collaborations kept
          going — CHAI, then OKAME, KOMAGOME, and the Tokyo band bed, whose Fuji TV drama
          theme Scoobert co-produced — alongside the language-learning, the live shows, and
          the general belief that a good melody can travel farther than your passport.
        </p>
        <p>
          Scoobert Doobert albums include <em>Big Hug</em> (a San Diego Music Award
          nominee), <em>KŌAN</em>, <em>Moonlight Beach</em>, <em>MÖB</em>, and <em>I</em>.{' '}
          <em>MÖB</em> and <em>I</em> open the MÖBIUS cycle, a four-part album arc about
          loops, memory, California, Japan, friendship, identity, and trying to get
          somewhere without fully leaving the place you started. The{' '}
          <a href={catalog} target="_blank" rel="noopener noreferrer">
            catalog
          </a>{' '}
          is large, strange, and still expanding: close to 300 registered compositions
          across singles, remixes, collaborations, demos, visual releases, alternate
          identities, and songs that may or may not exist because the burrito demanded it.
        </p>
        <p>
          The music has circulated through official playlists, indie and German radio,
          Japanese film and television, and international collaborations — and Scoobert has
          worked with a wide cast of artists and players including CHAI, OKAME, bed, Tamtam,
          Kerri Medders, Nina Francis, Lou Roy, Jamie Drake, Limón Limón, Victor Marc, and
          Josh Shpak. The best way in is simply to{' '}
          <a href={listen} target="_blank" rel="noopener noreferrer">
            listen
          </a>
          .
        </p>

        <h2>Love Music More</h2>
        <p>
          Scoobert Doobert also hosts{' '}
          <a href={lmm} target="_blank" rel="noopener noreferrer">
            <em>Love Music More</em>
          </a>
          , a newsletter and podcast on the craft, philosophy, and history of music — a
          top-10% music podcast with conversations across every genre and every role,
          backstage to the stage: Grammy-winning engineers and producers behind Adele,
          Beyoncé, Metallica, Janet Jackson, “Weird Al” Yankovic, Lana Del Rey, and St.
          Vincent, plus punk founders, scene-builders, and the people who actually decide
          how a record sounds. New episodes Tuesdays; deeper dives on Substack.
        </p>

        <h2>Plato, out loud</h2>
        <p>
          And beyond music, Scoobert has read the Greeks:{' '}
          <em>Plato’s Dialogues, as Read by Scoobert Doobert</em>, with the{' '}
          <em>Apology</em> out now on{' '}
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
          — and, improbably,{' '}
          <a href={ajaxLibrary} target="_blank" rel="noopener noreferrer">
            cataloged by a Canadian public library
          </a>
          , which means somewhere a librarian has filed the burrito under “author.”
        </p>

        <p>
          At its core, Scoobert Doobert is abundant songwriting with a smile on its face
          and a suspicious amount going on under the hood: beachy, dense, goofy, earnest,
          overcaffeinated, over-reverbed, and usually trying to hand you something warm
          before it disappears.
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
          This website is the goblin-mode archive of all of it. It opens as a deliberately
          ugly 1996 “electronic pizza storefront” and, if you let it, falls backward
          through the web eras and drops you into a low-poly world off the coast of San
          Diego — a long-overdue delivery on a promise the early web made and never quite
          kept. The retro costume is a joke. Underneath, this is a real musician’s home on
          the internet, and every link here goes somewhere real.
        </p>

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
