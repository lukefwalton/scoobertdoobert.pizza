import { Head } from 'vite-react-ssg';
import '../styles/cabinet.css';
import '../styles/booth.css';
import { PizzaCamBooth } from '../components/PizzaCamBooth';
import { CabinetShelf } from '../components/CabinetShelf';
import { useMounted } from '../lib/useMounted';

// ───────────────────────────────────────────────────────────────────────────
// /booth — the Pizza Cam™ cabinet: the site's ONE consensual real-camera
// surface (DESIGN.md "Webcam policy"), two instruments behind one gate —
// AIR DOUGH (wave to play a pentatonic voice) and TOPPING DRUMS (an EyeToy
// demake: hit the topping zones). Same progressive-enhancement contract as
// the other cabinets: crawlable prerender, real back anchor, and the live
// component (with its consent gate — no camera until an explicit press)
// only mounts after hydration. Registered rollable:false — a cabinet you
// walk to on purpose, never a slot-machine surprise.
// ───────────────────────────────────────────────────────────────────────────
export default function Booth() {
  const mounted = useMounted();

  return (
    <main className="booth-page">
      <Head>
        <title>Pizza Cam — The Pizza Arcade</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/booth" />
        <meta
          name="description"
          content="The Pizza Cam™ — an optional camera instrument. Wave your hands to toss dough and drum the toppings. Fully local: stays on your device, never sent to us."
        />
        <meta name="robots" content="index,follow" />
        <meta name="theme-color" content="#04040a" />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/booth" />
        <meta property="og:title" content="Pizza Cam — The Pizza Arcade" />
        <meta
          property="og:description"
          content="Wave your hands to toss dough and drum the toppings — a fully local camera instrument."
        />
      </Head>

      <p className="booth-util">
        <a href="/arcade">&laquo; Back to the arcade</a>
      </p>

      <div className="booth-cabinet">
        <div className="booth-marquee">
          <span className="booth-marquee__neon">PIZZA CAM&trade;</span>
        </div>

        {mounted ? (
          <PizzaCamBooth />
        ) : (
          <div className="booth-screen booth-screen--cold">
            <p className="booth-cold-title">PIZZA CAM&trade;</p>
            <p className="booth-cold-sub">Insert JavaScript &mdash; and a camera &mdash; to play.</p>
          </div>
        )}

        <p className="booth-coinslot">1 PLAYER &middot; WAVE TO PLAY</p>
      </div>

      <p className="booth-foot">
        Optional camera instrument &middot; enables hand control &middot; stays on your device
        &middot; never sent to us. The picture becomes 768 crunchy pixels, read for motion, and
        thrown away &mdash; nothing is recorded or uploaded.
      </p>
      <p className="booth-foot">
        <CabinetShelf currentSlug="booth" />
      </p>
      <p className="booth-foot booth-foot--copy">
        &copy;1997 Scoobert Doobert, Inc. / The San Diego-ish Operation
      </p>
    </main>
  );
}
