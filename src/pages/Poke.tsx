import { Head } from 'vite-react-ssg';
import '../styles/poke.css';
import { FaceStretch } from '../components/FaceStretch';
import { MuteToggle } from '../components/MuteToggle';
import { useMounted } from '../lib/useMounted';

// ───────────────────────────────────────────────────────────────────────────
// /poke — a second arcade cabinet: "Poke Scoobert," the face-stretch instrument
// (src/components/FaceStretch.tsx). Same progressive-enhancement contract as the
// rest of the site: prerenders to a real document with a real title and a real
// "back" anchor; the live canvas instrument only mounts after hydration.
// Period CRT-cabinet shell (sharp/beveled, no rounded-flat-modern).
// ───────────────────────────────────────────────────────────────────────────
export default function Poke() {
  const mounted = useMounted();

  return (
    <main className="poke-page">
      <Head>
        <title>Poke Scoobert — The Pizza Arcade</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/poke" />
        <meta
          name="description"
          content="Poke Scoobert — grab his face and pull. A Mario-64-style face-stretch toy that plays his music as you stretch. Best on a touchscreen."
        />
        <meta name="robots" content="index,follow" />
        <meta name="theme-color" content="#04040a" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/poke" />
        <meta property="og:title" content="Poke Scoobert — The Pizza Arcade" />
        <meta
          property="og:description"
          content="Grab his face and pull — it plays his music as you stretch."
        />
      </Head>

      <p className="poke-util">
        <a href="/arcade">&laquo; Back to the arcade</a>
        <MuteToggle />
      </p>

      <div className="poke-cabinet">
        <div className="poke-marquee">
          <span className="poke-marquee__neon">POKE SCOOBERT</span>
        </div>

        {mounted ? (
          <FaceStretch />
        ) : (
          <div className="poke-screen poke-screen--cold">
            <p className="poke-cold-title">POKE SCOOBERT</p>
            <p className="poke-cold-sub">Insert JavaScript to poke. He doesn&rsquo;t mind.</p>
          </div>
        )}

        <p className="poke-coinslot">1 PLAYER &middot; HANDS ON THE GLASS</p>
      </div>

      <p className="poke-foot">
        Grab and pull — it bends his music as you stretch. Stays on this device; nothing is sent
        anywhere.
      </p>
      <p className="poke-foot">
        &#9654; Next cabinet: <a href="/chimes">PENDULUM CHIMES</a> &mdash; tap to ring the bells.
      </p>
      <p className="poke-foot poke-foot--copy">
        Scoobert Doobert&rsquo;s likeness &amp; music &copy; Luke F. Walton dba Scoobert Doobert.
      </p>
    </main>
  );
}
