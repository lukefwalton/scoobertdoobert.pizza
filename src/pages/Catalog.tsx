import { Head } from 'vite-react-ssg';
import '../styles/catalog.css';
import { JUKEBOX_TRACKS } from '../data/jukebox';
import { SONG_META } from '../data/songMeta';
import { albumBySlug } from '../data/albums';
import { catalogGraph } from '../data/discography';
import { hasLyrics } from '../data/lyrics';
import { useMounted } from '../lib/useMounted';
import { useProgressStore } from '../state/progressStore';
import { isSongDiscovered, isSongRestored } from '../data/restoration';

// /catalog — the liner-notes shelf: every song on file, as a real crawlable
// document (the 2026 backend under the 1996 skin). Title, year, the record it
// lives on (with its cover), and the one-line meaning — all read from the same
// songMeta/albums data the in-world Listening Room placards use, plus a
// MusicRecording JSON-LD @graph so the catalog is machine-readable too.
//
// Progressive enhancement contract (the /leaderboard precedent): the document
// is FULLY STATIC — every track, always (discovery is a game-world concept, not
// a crawl gate). One mounted-gated column layers your OWN copy's state on top:
// ✓ found in the world, ★ playing hi-fi. Prerender and hydration can't diverge.

const ORIGIN = 'https://www.scoobertdoobert.pizza';

// The per-row "your copy" chip (JS-only; reads the durable progress spine).
function YourCopy({ slug }: { slug: string }) {
  const discovered = useProgressStore((s) => isSongDiscovered(s, slug));
  const restored = useProgressStore((s) => isSongRestored(s, slug));
  if (restored) return <span className="catalog-chip catalog-chip--hifi">★ HI-FI</span>;
  if (discovered) return <span className="catalog-chip">✓ found</span>;
  return <span className="catalog-chip catalog-chip--dim">not yet found</span>;
}

export default function Catalog() {
  const mounted = useMounted();
  const jsonLd = catalogGraph();
  return (
    <main className="catalog-page">
      <Head>
        <title>The Song Catalog · Scoobert Doobert</title>
        <link rel="canonical" href={`${ORIGIN}/catalog`} />
        <meta
          name="description"
          content="Every Scoobert Doobert song on file, liner notes for the whole catalog: year, record, and what each one is about."
        />
        <meta name="robots" content="index,follow" />
        <meta property="og:url" content={`${ORIGIN}/catalog`} />
        <meta property="og:title" content="The Song Catalog · Scoobert Doobert" />
        <meta
          property="og:description"
          content="Liner notes for every Scoobert Doobert song: year, record, and what each one is about."
        />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Head>

      <h1>The Song Catalog</h1>
      <p>
        Every Scoobert Doobert song on file, all {JUKEBOX_TRACKS.length} of them, with their liner
        notes. These are the same records the jukebox downstairs spins (lo-fi, on purpose) and the
        Listening Room hangs on its walls. Streaming-quality versions live at the real record stores
       , see <a href="/text">the text-only menu</a> for every destination.
      </p>
      <p>
        <a href="/">&laquo; Back to the Electronic Pizza Storefront</a>
      </p>

      <hr />

      <ol className="catalog-list">
        {JUKEBOX_TRACKS.map(({ slug }) => {
          const meta = SONG_META[slug];
          const album = meta?.album ? albumBySlug(meta.album) : undefined;
          return (
            <li key={slug} className="catalog-row" id={`song-${slug}`}>
              {album ? (
                <img
                  src={album.art}
                  alt={`${album.title} album cover`}
                  width={96}
                  height={96}
                  loading="lazy"
                  className="catalog-cover"
                />
              ) : (
                <span className="catalog-cover catalog-cover--none" aria-hidden="true">
                  ♪
                </span>
              )}
              <div>
                <h2>{meta?.title ?? slug}</h2>
                <p className="catalog-facts">
                  {meta?.year ?? '—'}
                  {album ? <> · from “{album.title}”</> : <> · unreleased</>}
                  {hasLyrics(slug) ? ' · has words' : ' · instrumental'}
                  {mounted && (
                    <>
                      {' · '}
                      <YourCopy slug={slug} />
                    </>
                  )}
                </p>
                {meta?.meaning && <p className="catalog-meaning">{meta.meaning}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <hr />
      <p>
        Words &amp; music &copy; Luke F. Walton dba Scoobert Doobert. All rights reserved. The liner
        notes are the artist&rsquo;s own.
      </p>
    </main>
  );
}
