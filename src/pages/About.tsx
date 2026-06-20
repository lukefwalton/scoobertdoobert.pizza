import { Head } from 'vite-react-ssg';
import '../styles/about.css';
import { destById } from '../data/links';

// ───────────────────────────────────────────────────────────────────────────
// /about — "Our Secret Recipe." The plain, credible page: the thing a search
// engine (and a curious human) sees when they want the story told straight, in
// contrast to the goblin-mode storefront. Clean, readable, semantic, crawlable.
// Real links throughout. (Facts drawn from the repo's structured data + press
// archive — Luke to correct/expand the parts only he can know.)
// ───────────────────────────────────────────────────────────────────────────
export default function About() {
  const listen = destById('listen')?.href ?? 'https://open.spotify.com/artist/5zKkCi9E4L8p6aRiCSJVTn';
  const catalog = destById('catalog')?.href ?? 'https://scoobertdoobert.bandcamp.com/';
  const lmm = destById('podcast')?.href ?? 'https://lovemusicmore.substack.com/';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': 'https://scoobertdoobert.pizza/about#page',
    name: 'About — Scoobert Doobert',
    url: 'https://scoobertdoobert.pizza/about',
    isPartOf: { '@id': 'https://scoobertdoobert.pizza/#website' },
    about: { '@id': 'https://lukefwalton.com/#scoobert' },
    mainEntity: { '@id': 'https://lukefwalton.com/#person' },
  };

  return (
    <main className="about">
      <Head>
        <title>About Scoobert Doobert — the solo music project of Luke Francis Walton</title>
        <link rel="canonical" href="https://scoobertdoobert.pizza/about" />
        <meta
          name="description"
          content="Scoobert Doobert is the solo recording project of Luke Francis Walton — a philosopher and multi-instrumentalist making lo-fi, indie, and bedroom pop in San Diego. The story, the catalog, and Love Music More."
        />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content="https://scoobertdoobert.pizza/about" />
        <meta property="og:title" content="About Scoobert Doobert" />
        <meta
          property="og:description"
          content="The solo recording project of philosopher and multi-instrumentalist Luke Francis Walton — lo-fi, indie, bedroom pop, made in San Diego."
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
          <strong>Scoobert Doobert</strong> is the solo recording project of{' '}
          <a href="https://lukefwalton.com/" rel="me">
            Luke Francis Walton
          </a>{' '}
          &mdash; a philosopher and multi-instrumentalist who writes, plays, and records
          lo-fi, indie, and bedroom pop in <strong>San Diego, California</strong>.
        </p>

        <p>
          The boot screen says it best: <em>a pizza shop off the coast of San Diego &mdash; it is
          actually a solo music project by a philosopher.</em> That second sentence is the literal
          truth. The pizza shop is a bit. The songs are not.
        </p>

        <h2>The music</h2>
        <p>
          Scoobert Doobert has been quietly prolific &mdash; a long run of self-recorded songs,
          EPs, and full albums made the DIY way, plus a vinyl release through New Cosmos Records.
          The songs tend to be warm and a little anxious at the same time: small, hand-built
          bedroom-pop about modern life, getting through the day, and being a person. Press along
          the way has come from <em>The New LoFi</em>, <em>Vents Magazine</em>, <em>Where the Music
          Meets</em>, San Diego&rsquo;s 91X, and others.
        </p>
        <p>
          The best way in is simply to listen:{' '}
          <a href={listen} target="_blank" rel="noopener noreferrer">
            streaming
          </a>{' '}
          or the{' '}
          <a href={catalog} target="_blank" rel="noopener noreferrer">
            full catalog on Bandcamp
          </a>
          . The whole index of everything &mdash; every profile, release, video, and interview
          &mdash; lives on the <a href="/links">link archive</a>.
        </p>

        <h2>Love Music More</h2>
        <p>
          Alongside his own records, Luke runs{' '}
          <a href={lmm} target="_blank" rel="noopener noreferrer">
            <em>Love Music More</em>
          </a>{' '}
          &mdash; a podcast and Substack about exactly what it says: loving music more, and
          championing the people who make it.
        </p>

        <h2>The philosophy of the pizza</h2>
        <p>
          This website is the goblin-mode archive of all of it. It opens as a deliberately ugly
          1996 &ldquo;electronic pizza storefront&rdquo; and, if you let it, falls backward through
          the web eras and drops you into a low-poly world off the coast of San Diego &mdash; a
          long-overdue delivery on a promise the early web made and never quite kept. The retro
          costume is a joke. Underneath, this is a real musician&rsquo;s home on the internet, and
          every link here goes somewhere real.
        </p>

        <hr />

        <nav className="about__links" aria-label="Where to go next">
          <a href={listen} target="_blank" rel="noopener noreferrer">
            Listen &raquo;
          </a>
          <a href={lmm} target="_blank" rel="noopener noreferrer">
            Love Music More &raquo;
          </a>
          <a href="/links">All the links &raquo;</a>
          <a href="/">&laquo; Back to the storefront</a>
        </nav>
      </article>
    </main>
  );
}
