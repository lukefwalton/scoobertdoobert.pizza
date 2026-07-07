import { Head } from 'vite-react-ssg';
import type { ReactNode } from 'react';
import '../styles/arcade.css';
import { MuteToggle } from './MuteToggle';
import { useMounted } from '../lib/useMounted';
import { useSaveSanDiegoWin } from '../lib/useSaveSanDiegoWin';
import { CabinetShelf } from './CabinetShelf';

// ───────────────────────────────────────────────────────────────────────────
// ArcadeCabinetPage — the shared period cabinet shell for a standalone game route
// (/crusteroids, /slice-breaker, /jazz-snake). Same progressive-enhancement
// contract as /arcade: prerenders to a real document (title, canonical, a real
// "back to storefront" anchor, an honest no-JS note); the live <canvas> only
// mounts after hydration (useMounted) so the crawlable / JS-off page is intact
// and the canvas never causes a mismatch. The dead-plain front door is untouched.
//
// The four older cabinet pages (/arcade, /poke, /chimes, /cultures) predate this
// and stay standalone; new cabinets share this shell so the boilerplate lives once.
// ───────────────────────────────────────────────────────────────────────────

export function ArcadeCabinetPage({
  slug,
  title,
  neon,
  description,
  coldTitle,
  coldSub,
  foot,
  children,
}: {
  /** Route slug (no leading slash), e.g. 'crusteroids'. Drives canonical/og url. */
  slug: string;
  /** <title> (page) — e.g. 'Crusteroids — Scoobert Doobert'. */
  title: string;
  /** The marquee word-art. */
  neon: string;
  /** <meta description> + og description. */
  description: string;
  /** Cold (JS-off) screen title + sub. */
  coldTitle: string;
  coldSub: string;
  /** The one-line how-to under the cabinet. */
  foot: ReactNode;
  /** The live game component (mounted only after hydration). */
  children: ReactNode;
}) {
  const mounted = useMounted();
  // Bank the 1101 ARG win — this shell hosts the standalone /save-san-diego route
  // (harmless on the other cabinet routes: the listener only reacts to 1101 posts).
  useSaveSanDiegoWin();
  const url = `https://www.scoobertdoobert.pizza/${slug}`;
  return (
    <main className="arcade-page">
      <Head>
        <title>{title}</title>
        <link rel="canonical" href={url} />
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <meta name="theme-color" content="#bf3a2b" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Head>

      <p className="arcade-util">
        <a href="/">&laquo; Back to the storefront</a>
        <MuteToggle />
      </p>

      <div className="arcade-cabinet">
        <div className="arcade-marquee">
          <h1 className="arcade-marquee__neon">{neon}</h1>
        </div>

        {mounted ? (
          children
        ) : (
          <div className="arcade-screen arcade-screen--cold">
            <p className="arcade-title">{coldTitle}</p>
            <p className="arcade-sub">{coldSub}</p>
            <p className="arcade-sub">
              Or just <a href="/text">browse the menu &raquo;</a>
            </p>
          </div>
        )}

        <p className="arcade-coinslot">1 PLAYER &middot; INSERT IMAGINATION</p>
      </div>

      <p className="arcade-foot">{foot}</p>
      <p className="arcade-foot">
        <CabinetShelf currentSlug={slug} />
      </p>
      <p className="arcade-foot arcade-foot--copy">
        &copy;1997 Scoobert Doobert, Inc. / The San Diego-ish Operation
      </p>
    </main>
  );
}
