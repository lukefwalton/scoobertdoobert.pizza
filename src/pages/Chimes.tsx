import { Head } from 'vite-react-ssg';
import '../styles/chimes.css';
import { ChimesCabinet } from '../components/ChimesCabinet';
import { CabinetShelf } from '../components/CabinetShelf';
import { useMounted } from '../lib/useMounted';

// ───────────────────────────────────────────────────────────────────────────
// /chimes — a third arcade cabinet: "Pendulum Chimes," a tap-to-play bell
// instrument (src/components/ChimesCabinet.tsx). Same progressive-enhancement
// contract as the rest of the site: it prerenders to a real crawlable document
// with a real title and a real "back" anchor; the live <canvas> instrument only
// mounts after hydration, so the JS-off page is intact and there's no hydration
// mismatch. Period CRT-cabinet shell. The sound is synthesised — nothing ships.
// ───────────────────────────────────────────────────────────────────────────
export default function Chimes() {
  const mounted = useMounted();

  return (
    <main className="chimes-page">
      <Head>
        <title>Pendulum Chimes — The Pizza Arcade</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/chimes" />
        <meta
          name="description"
          content="Pendulum Chimes — a tap-to-play bell instrument. Pendulums swing at harmonic ratios and strike tuned bells; the cascade is never the same twice."
        />
        <meta name="robots" content="index,follow" />
        <meta name="theme-color" content="#04040a" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/chimes" />
        <meta property="og:title" content="Pendulum Chimes — The Pizza Arcade" />
        <meta
          property="og:description"
          content="Tap the glass and the bells swing — a generative chime instrument you play."
        />
      </Head>

      <p className="chimes-util">
        <a href="/arcade">&laquo; Back to the arcade</a>
      </p>

      <div className="chimes-cabinet">
        <div className="chimes-marquee">
          <span className="chimes-marquee__neon">PENDULUM CHIMES</span>
        </div>

        {mounted ? (
          <ChimesCabinet />
        ) : (
          <div className="chimes-screen chimes-screen--cold">
            <p className="chimes-cold-title">PENDULUM CHIMES</p>
            <p className="chimes-cold-sub">Insert JavaScript to ring the bells.</p>
          </div>
        )}

        <p className="chimes-coinslot">1 PLAYER &middot; TAP TO SWING</p>
      </div>

      <p className="chimes-foot">
        Pendulums swing at harmonic ratios and strike tuned bells. All sound is made on your device,
        live &mdash; nothing is recorded or sent anywhere.
      </p>
      <p className="chimes-foot">
        <CabinetShelf currentSlug="chimes" />
      </p>
      <p className="chimes-foot chimes-foot--copy">
        &copy;1997 Scoobert Doobert, Inc. / The Santa Cruz-ish Operation
      </p>
    </main>
  );
}
