import { Head } from 'vite-react-ssg';
import '../styles/storefront.css';
import { SampleMenu } from '../components/SampleMenu';
import { SocialLinks } from '../components/SocialLinks';
import { OrderForm } from '../components/OrderForm';
import { AudioBootstrap } from '../components/AudioBootstrap';
import { Descent } from '../components/Descent';
import { MuteToggle } from '../components/MuteToggle';
import { WorldMount } from '../components/WorldMount';
import { destById } from '../data/links';

// ───────────────────────────────────────────────────────────────────────────
// The front door. An offensively plain 1995–97 commercial web page: Times,
// horizontal rules, blue/purple links, a low-fi order form, a webmaster mailto.
// Barely-designed is the joke. NO chrome word-art, NO starfield, NO 3D splash —
// that SGI/Silicon Surf aesthetic is deferred to the Phase 2 "machine room"
// floor. This page must be fully usable and crawlable with JavaScript disabled;
// everything fancier is progressive enhancement layered on top.
// ───────────────────────────────────────────────────────────────────────────

export default function Storefront() {
  // The "inside scoop" points at the podcast (the actual behind-the-scenes
  // talk show), not at lukefwalton.com — that stays a subtle footer/schema
  // backlink, not a navigation destination.
  const insideScoop = destById('podcast')?.href ?? '/text';

  return (
    <>
      <Head>
        <title>Electronic Pizza Storefront — Scoobert Doobert</title>
        <link rel="canonical" href="https://scoobertdoobert.pizza/" />
        <meta
          name="description"
          content="A pizza shop off the coast of San Diego. (It is actually a solo music project by a philosopher.)"
        />
        <meta property="og:url" content="https://scoobertdoobert.pizza/" />
        <meta property="og:title" content="Electronic Pizza Storefront — Scoobert Doobert" />
        <meta
          property="og:description"
          content="A pizza shop off the coast of San Diego. (It is actually a solo music project by a philosopher.)"
        />
      </Head>
      <AudioBootstrap />
      <WorldMount />
      <Descent />
      <a className="skip-link" href="#menu">
        Skip to the menu
      </a>

      <div className="store">
        <p className="util">
          <a href="/text">text only version of this page</a>
          <MuteToggle />
        </p>

        <header className="store-header">
          <div className="store-titlebar">
            <img
              src="/logo-sd.jpg"
              alt=""
              aria-hidden="true"
              className="store-logo"
              width="84"
              height="74"
            />
            <h1>Scoobert Doobert&rsquo;s Electronic Pizza Storefront</h1>
          </div>
          <p className="logline">
            A pizza shop off the coast of San Diego.
            <br />
            (It is actually a solo music project by a philosopher.)
          </p>
          <p className="netscape">
            This page is best viewed in Netscape Navigator 3.0 at 800&times;600.
          </p>
        </header>

        <hr />

        <section className="news" aria-label="Announcements">
          <figure className="snapshot snapshot--right">
            <img
              src="/press/scoobert-shades.jpg"
              alt="Scoobert Doobert reclining in red wraparound sunglasses, two long braids fanned out behind his head."
              width="150"
              height="150"
            />
            <figcaption>Management.</figcaption>
          </figure>
          <p>
            <b>RAT SPOTTED IN WALL &mdash; MANAGEMENT INSISTS HE PAYS RENT.</b>
            <br />
            <a href={insideScoop} target="_blank" rel="noopener noreferrer">
              Click here for the inside scoop.
            </a>
          </p>
        </section>

        <hr />

        <main>
          <SampleMenu />

          <hr />

          <OrderForm />

          <hr />

          <section className="desc" aria-label="About the pizza">
            <figure className="snapshot snapshot--right">
              <img
                src="/press/scoobert-host.jpg"
                alt="Scoobert Doobert outdoors with googly eyes stuck across his face, one hand raised toward the camera."
                width="150"
                height="150"
              />
              <figcaption>Your host.</figcaption>
            </figure>
            <p>
              It&rsquo;s one thin crust piled with six unreleased demos, then
              sealed with another thin crust, reverb, choice of toppings, and
              even more reverb.
            </p>
            <p className="slogan">
              <b>The Best Songs Under One Roof!&trade;</b> &nbsp; Lo-Fi &bull;
              Hi-Fi &bull; Stuffed Crust
            </p>
          </section>
        </main>

        <hr />

        <aside className="coupon" aria-label="DistroKid coupon">
          <span className="coupon__cut" aria-hidden="true">
            &#9986; - - - - - - - - - - - - - - - -
          </span>
          <p>
            <b>COUPON:</b> Are you a musician? Distribute your music and{' '}
            <a
              href="https://distrokid.com/vip/lovemusicmore"
              target="_blank"
              rel="noopener noreferrer"
            >
              get a discount on DistroKid &raquo;
            </a>
          </p>
        </aside>

        <hr />

        <footer>
          <p>
            Questions or comments?{' '}
            <a href="mailto:beformer@aol.com?subject=Comment%20for%20the%20Webmaster">
              Email the webmaster.
            </a>
          </p>
          <SocialLinks />
          <p className="directory">
            Looking for something specific? <a href="/links">Complete link archive &raquo;</a>
          </p>
          <p className="lmm">
            <a
              href="https://lovemusicmore.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/brand/gg_ScoobertDoobert_LoveMusicMore.png"
                alt="Love Music More"
                className="lmm-logo"
                width="110"
                height="111"
              />
            </a>
          </p>
          <p className="copyright">
            &copy;1997 Scoobert Doobert, Inc. / The Santa Cruz-ish Operation
          </p>
          <p className="credit">
            Site by{' '}
            <a href="https://maxhorwich.com" target="_blank" rel="noopener noreferrer">
              Max Horwich
            </a>{' '}
            &times; Scoobert Doobert.
          </p>
          <p className="identity">
            Scoobert Doobert is the recording name of{' '}
            <a href="https://lukefwalton.com/" rel="me">
              Luke Francis Walton
            </a>
            .
          </p>
        </footer>
      </div>
    </>
  );
}
