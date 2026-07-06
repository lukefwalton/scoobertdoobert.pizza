import { Head } from 'vite-react-ssg';
import '../styles/arcade.css';
import { RunnerGame } from '../components/RunnerGame';
import { MuteToggle } from '../components/MuteToggle';
import { CabinetShelf } from '../components/CabinetShelf';
import { useMounted } from '../lib/useMounted';

// ───────────────────────────────────────────────────────────────────────────
// /arcade — the mobile reward made a real, crawlable route.
//
// Desktop's payoff is the descent into the 3D world; that world is gated off on
// mobile / reduced-motion by construction (CLAUDE.md), so on a phone the
// MINIGAME is the experience beyond the dead-plain site. This wraps the
// touch-first Pizza Run runner in a period arcade-cabinet shell.
//
// Progressive enhancement, exactly like the rest of the site: the page
// prerenders to a real document with a real title, a real "back to storefront"
// anchor, and an honest no-JS note. The live <canvas> game only mounts after
// hydration (useMounted) — so the crawlable / JS-off version is intact and the
// canvas never causes a hydration mismatch. The dead-plain front door is
// untouched; this is an additive destination, not a gate.
// ───────────────────────────────────────────────────────────────────────────
export default function Arcade() {
  const mounted = useMounted();

  return (
    <main className="arcade-page">
      <Head>
        <title>The Pizza Arcade — Scoobert Doobert</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/arcade" />
        <meta
          name="description"
          content="Scoobert's Pizza Run — a tiny late-90s arcade game. Jump the broken web buttons. Best played on your phone."
        />
        <meta name="robots" content="index,follow" />
        <meta name="theme-color" content="#bf3a2b" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/arcade" />
        <meta property="og:title" content="The Pizza Arcade — Scoobert Doobert" />
        <meta
          property="og:description"
          content="Scoobert's Pizza Run — jump the broken web buttons. A tiny arcade game for your phone."
        />
      </Head>

      <p className="arcade-util">
        <a href="/">&laquo; Back to the storefront</a>
        <MuteToggle />
      </p>

      <div className="arcade-cabinet">
        <div className="arcade-marquee">
          <span className="arcade-marquee__neon">THE PIZZA ARCADE</span>
        </div>

        {mounted ? (
          <RunnerGame />
        ) : (
          <div className="arcade-screen arcade-screen--cold">
            <p className="arcade-title">SCOOBERT&rsquo;S PIZZA RUN</p>
            <p className="arcade-sub">Insert JavaScript to play. No quarters accepted.</p>
            <p className="arcade-sub">
              Or just <a href="/text">browse the menu &raquo;</a>
            </p>
          </div>
        )}

        <p className="arcade-coinslot">1 PLAYER &middot; INSERT IMAGINATION</p>
      </div>

      <p className="arcade-foot">
        Tap (or press space) to jump the broken web buttons. Your best run is remembered on this
        device.
      </p>
      <p className="arcade-foot">
        <CabinetShelf currentSlug="arcade" />
      </p>
      <p className="arcade-foot arcade-foot--copy">
        &copy;1997 Scoobert Doobert, Inc. / The San Diego-ish Operation
      </p>
    </main>
  );
}
