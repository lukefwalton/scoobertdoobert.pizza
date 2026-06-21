import { Head } from 'vite-react-ssg';
import '../styles/archive.css';
import { ARCHIVE_SECTIONS, ARCHIVE_LINK_COUNT, type ArchiveLink } from '../data/linkArchive';

// The Link Archive — a deliberately exhaustive, crawlable directory of every
// Scoobert Doobert presence on the web (profiles, streaming, releases, the Love
// Music More podcast, press, live shows). It is both the SEO surface (hundreds
// of real, followable anchors tying the entity together) and a period easter
// egg: a 1996-style "Links" page / webring, reached from a quiet footer link
// rather than the main menu. Sourced from links.md so it stays single-source.

const A = ({ link }: { link: ArchiveLink }) => (
  <a href={link.url} target="_blank" rel="noopener noreferrer">
    {link.text}
  </a>
);

export default function LinkArchive() {
  // A lightweight CollectionPage graph — names the sections without enumerating
  // all ~450 items (that would bloat the head). The real SEO value is the
  // crawlable anchors in the body.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': 'https://www.scoobertdoobert.pizza/links#page',
    name: 'Scoobert Doobert — Link Archive',
    description:
      'A complete, crawlable index of every Scoobert Doobert link on the web: profiles, streaming, releases, the Love Music More podcast, press, and live shows.',
    url: 'https://www.scoobertdoobert.pizza/links',
    isPartOf: { '@id': 'https://www.scoobertdoobert.pizza/#website' },
    about: { '@id': 'https://lukefwalton.com/#scoobert' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: ARCHIVE_LINK_COUNT,
      itemListElement: ARCHIVE_SECTIONS.map((s, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: s.title,
      })),
    },
  };

  return (
    <main className="archive">
      <Head>
        <title>Link Archive — Scoobert Doobert</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/links" />
        <meta
          name="description"
          content="The complete index of every Scoobert Doobert link on the web: streaming, profiles, releases, the Love Music More podcast, press, radio, and live shows."
        />
        <meta name="robots" content="index,follow" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/links" />
        <meta property="og:title" content="Link Archive — Scoobert Doobert" />
        <meta
          property="og:description"
          content="Every Scoobert Doobert link on the web, in one crawlable place."
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Head>

      <h1>Scoobert Doobert &mdash; Link Archive</h1>
      <p className="archive__lede">
        The whole rolodex. Every Scoobert Doobert link in the building &mdash;{' '}
        {ARCHIVE_LINK_COUNT} of them &mdash; streaming, profiles, releases, the{' '}
        <i>Love Music More</i> podcast, press, radio, and live shows.
      </p>
      <p className="archive__nav">
        <a href="/">&laquo; Back to the Electronic Pizza Storefront</a>
        {' · '}
        <a href="/text">Text-only menu</a>
      </p>

      <hr />

      {ARCHIVE_SECTIONS.map((section) => (
        <section key={section.title} className="archive__section">
          <h2>{section.title}</h2>

          {section.links.length > 0 && (
            <ul className="archive__links">
              {section.links.map((link) => (
                <li key={link.url}>
                  <A link={link} />
                </li>
              ))}
            </ul>
          )}

          {section.subsections.map((sub) => (
            <div key={sub.title} className="archive__subsection">
              <h3>{sub.title}</h3>
              <ul className="archive__links">
                {sub.links.map((link) => (
                  <li key={link.url}>
                    <A link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      <hr />

      <p>
        <a href="/">&laquo; Back to the storefront</a>
      </p>
      <p>
        <small>&copy;1997 Scoobert Doobert, Inc. / The Santa Cruz-ish Operation</small>
      </p>
    </main>
  );
}
