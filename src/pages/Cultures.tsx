import { Head } from 'vite-react-ssg';
import '../styles/cultures.css';
import { CulturesCabinet } from '../components/CulturesCabinet';
import { useMounted } from '../lib/useMounted';

// ───────────────────────────────────────────────────────────────────────────
// /cultures — a fourth arcade cabinet: "Cultures," a living-colony drone you
// stir (src/components/CulturesCabinet.tsx). Same progressive-enhancement
// contract as the rest of the site: it prerenders to a real crawlable document
// with a real title and a real "back" anchor; the live <canvas> instrument only
// mounts after hydration. Period CRT-cabinet shell. The sound is synthesised —
// nothing ships.
// ───────────────────────────────────────────────────────────────────────────
export default function Cultures() {
  const mounted = useMounted();

  return (
    <main className="cultures-page">
      <Head>
        <title>Cultures — The Pizza Arcade</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/cultures" />
        <meta
          name="description"
          content="Cultures — a living-colony drone you stir. Cells drift, attract by musical interval, and breed notes when they touch. A generative instrument you play with a fingertip."
        />
        <meta name="robots" content="index,follow" />
        <meta name="theme-color" content="#04040a" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/cultures" />
        <meta property="og:title" content="Cultures — The Pizza Arcade" />
        <meta
          property="og:description"
          content="Stir the colony and it sings — a generative drone instrument made of living cultures."
        />
      </Head>

      <p className="cultures-util">
        <a href="/arcade">&laquo; Back to the arcade</a>
      </p>

      <div className="cultures-cabinet">
        <div className="cultures-marquee">
          <span className="cultures-marquee__neon">CULTURES</span>
        </div>

        {mounted ? (
          <CulturesCabinet />
        ) : (
          <div className="cultures-screen cultures-screen--cold">
            <p className="cultures-cold-title">CULTURES</p>
            <p className="cultures-cold-sub">Insert JavaScript to grow the colony.</p>
          </div>
        )}

        <p className="cultures-coinslot">1 PLAYER &middot; STIR TO PLAY</p>
      </div>

      <p className="cultures-foot">
        Live cultures &mdash; like a sourdough starter, but it sings. Cells attract by musical
        interval and breed notes when they meet. All sound is made on your device; nothing is sent
        anywhere.
      </p>
      <p className="cultures-foot">
        &#9654; Other cabinets: <a href="/arcade">PIZZA RUN</a> &middot;{' '}
        <a href="/poke">POKE SCOOBERT</a> &middot; <a href="/chimes">PENDULUM CHIMES</a>
      </p>
      <p className="cultures-foot cultures-foot--copy">
        &copy;1997 Scoobert Doobert, Inc. / The Santa Cruz-ish Operation
      </p>
    </main>
  );
}
