import { Head } from 'vite-react-ssg';
import '../styles/textonly.css';
import { DESTINATIONS, destById } from '../data/links';

// The genuinely flat fallback. No images, no scripts, no plug-ins — just a
// semantic list of every real destination, driven by the same links.ts source
// as the storefront. This is the accessibility / crawler floor of the site.
//
// <Head> gives /text its OWN title + canonical + social URL so it advertises
// itself as /text to crawlers and scrapers, not as the storefront.
export default function TextOnly() {
  return (
    <main className="textonly">
      <Head>
        <title>Text-Only Menu · Scoobert Doobert</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/text" />
        <meta
          name="description"
          content="Every destination on scoobertdoobert.pizza as a flat, text-only list. No images, no scripts, no plug-ins."
        />
        <meta name="robots" content="index,follow" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/text" />
        <meta property="og:title" content="Text-Only Menu · Scoobert Doobert" />
        <meta
          property="og:description"
          content="Every destination on scoobertdoobert.pizza as a flat, text-only list."
        />
      </Head>

      <h1>Scoobert Doobert &mdash; Text-Only Menu</h1>
      <p>Everything on this site, flat. No images, no scripts, no plug-ins.</p>
      <p>
        Scoobert Doobert is an artist, and a <b>mixing engineer &amp; producer for hire</b> &mdash;
        he mixes, produces, and plays on all of his own records.
      </p>
      <p>
        Hear the work:{' '}
        <a
          href={
            destById('reel')?.href ?? 'https://open.spotify.com/playlist/7pmgoZlkf6exw4BAJTQs7Q'
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          The Reel
        </a>{' '}
        (productions &amp; collabs throughout; the mixes are at the bottom). Hire him:{' '}
        <a
          href={destById('contact')?.href ?? 'mailto:beformer@aol.com'}
          target="_blank"
          rel="noopener noreferrer"
        >
          beformer@aol.com
        </a>
        .
      </p>
      <p>
        New here? Read <a href="/about">the story (Our Secret Recipe)</a>.
      </p>
      <p>
        日本語：
        <a href="/about/jp" hrefLang="ja" lang="ja">
          スクーバートについて (About, in Japanese)
        </a>
        .
      </p>
      <p>
        On a phone? Play <a href="/arcade">the Pizza Arcade</a> &mdash; jump the broken web buttons.
      </p>
      <p>
        Every song on file: <a href="/catalog">the song catalog</a> &mdash; liner notes for the
        whole discography.
      </p>
      <p>
        Feeling brave? <a href="/basement-stairs">The basement stairs are unlocked</a> &mdash; a
        self-guided tour of the rooms under the shop.
      </p>
      <p>
        <a href="/">&laquo; Back to the Electronic Pizza Storefront</a>
      </p>

      <hr />

      <ul>
        {DESTINATIONS.map((d) => (
          <li key={d.id}>
            <a
              href={d.href}
              {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {d.label}
            </a>
            {d.blurb ? `, ${d.blurb}` : null}
          </li>
        ))}
      </ul>

      <hr />

      <p>
        Want every link, everywhere? <a href="/links">Complete link archive</a> &mdash; streaming,
        press, podcast, releases, and live shows.
      </p>
      <p>
        Questions, comments, or a record that needs mixing?{' '}
        <a
          href={destById('contact')?.href ?? 'mailto:beformer@aol.com'}
          target="_blank"
          rel="noopener noreferrer"
        >
          Email the webmaster.
        </a>
      </p>
      <p>
        <small>&copy;1997 Scoobert Doobert, Inc. / The San Diego-ish Operation</small>
      </p>
    </main>
  );
}
