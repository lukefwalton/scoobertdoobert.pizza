import { Head } from 'vite-react-ssg';
import '../styles/arcade.css';
import '../styles/leaderboard.css';
import { LeaderboardPanel } from '../components/LeaderboardPanel';
import { useProgressStore } from '../state/progressStore';
import { useMounted } from '../lib/useMounted';

// /leaderboard — the arcade high-score board as its own crawlable route (a share +
// SEO surface), dressed in a RIOT of our own GIFs (gold trophies, licking flames,
// raining coins, a dancing pizza, a rainbow rule, a starfield wallpaper) — all
// printed by our hand-rolled GIF89a encoder (scripts/make-gifs.mjs), every one with
// a *-static twin served under prefers-reduced-motion (WCAG 2.3.1). Same
// progressive-enhancement contract as /arcade: a real prerendered document; the
// live board (localStorage best + /api/score fetch) mounts post-hydration.

// A decorative GIF with its reduced-motion still (alt="" — pure flair).
function Gif({
  name,
  w,
  h,
  className,
  alt = '',
}: {
  name: string;
  w: number;
  h: number;
  className?: string;
  alt?: string;
}) {
  return (
    <picture className={className}>
      <source srcSet={`/gifs/${name}-static.gif`} media="(prefers-reduced-motion: reduce)" />
      <img src={`/gifs/${name}.gif`} width={w} height={h} alt={alt} />
    </picture>
  );
}

function LiveBoard() {
  const best = useProgressStore((s) => s.pizzaPointsBest);
  return <LeaderboardPanel score={best} rows={25} />;
}

export default function Leaderboard() {
  const mounted = useMounted();
  return (
    <main className="arcade-page lb-page">
      <Head>
        <title>Pizza Points High Scores — Scoobert Doobert</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/leaderboard" />
        <meta
          name="description"
          content="The Scoobert Doobert PIZZA POINTS leaderboard — collect pizza, surfboards and sushi in the 3D world, then sign the board with three letters."
        />
        <meta name="robots" content="index,follow" />
        <meta name="theme-color" content="#bf3a2b" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/leaderboard" />
        <meta property="og:title" content="Pizza Points High Scores — Scoobert Doobert" />
        <meta
          property="og:description"
          content="Collect loot in the 3D pizza world for PIZZA POINTS, then put your initials on the board."
        />
      </Head>

      {/* coin-rain tiling down the two margins — peak GeoCities (decorative). A
          tiling background (an <img> can't repeat); the CSS swaps to the *-static
          twin under prefers-reduced-motion, so it still respects WCAG 2.3.1. */}
      <div className="lb-coins lb-coins--l" aria-hidden="true" />
      <div className="lb-coins lb-coins--r" aria-hidden="true" />

      <p className="arcade-util">
        <a href="/">&laquo; Back to the storefront</a>
      </p>

      {/* a banner of flames over the cabinet */}
      <Gif name="flames" w={120} h={28} className="lb-flames" />

      <div className="arcade-cabinet lb-cabinet">
        <div className="arcade-marquee lb-marquee">
          <Gif name="trophy" w={48} h={56} className="lb-trophy" />
          <h1 className="arcade-marquee__neon">HIGH SCORES</h1>
          <Gif name="trophy" w={48} h={56} className="lb-trophy" />
        </div>

        {mounted ? (
          <div className="arcade-screen">
            <LiveBoard />
          </div>
        ) : (
          <div className="arcade-screen arcade-screen--cold">
            <p className="arcade-title">PIZZA POINTS HIGH SCORES</p>
            <p className="arcade-sub">The board loads with JavaScript.</p>
            <p className="arcade-sub">
              Or just <a href="/text">browse the menu &raquo;</a>
            </p>
          </div>
        )}

        <p className="arcade-coinslot">TOP 25 &middot; THREE LETTERS ONLY</p>
      </div>

      <div className="lb-dancers">
        <Gif name="dancing-pizza" w={64} h={64} alt="A dancing slice of pizza" />
        <Gif name="dancing-pizza" w={64} h={64} alt="A dancing slice of pizza" />
      </div>

      <Gif name="rainbow-rule" w={168} h={8} className="lb-rule" />

      <p className="arcade-foot">
        Collect 🍕 🌯 🍣 🛹 🏄 in the 3D world for PIZZA POINTS, build a combo, then sign the board.
      </p>
      <p className="arcade-foot">
        &#9654; <a href="/arcade">THE PIZZA ARCADE</a>
      </p>
      <p className="arcade-foot arcade-foot--copy">
        &copy;1997 Scoobert Doobert, Inc. / The San Diego-ish Operation
      </p>
    </main>
  );
}
