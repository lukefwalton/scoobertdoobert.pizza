import { SampleMenu } from '../components/SampleMenu';
import { SocialLinks } from '../components/SocialLinks';
import { OrderForm } from '../components/OrderForm';
import { MuteToggle } from '../components/MuteToggle';
import { destById, resolveLinks, TEXT_ONLY_PATH } from '../data/links';
import type { Floor } from '../data/floors';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore, selectRatGreeting } from '../state/progressStore';
import { useMounted } from '../lib/useMounted';
import { audio } from '../audio/engine';
import { FloorDoor } from './FloorDoor';

// ───────────────────────────────────────────────────────────────────────────
// Floor 0 — the `plain` template. The offensively plain 1995–97 commercial web
// page: Times, horizontal rules, blue/purple links, a low-fi order form, a
// webmaster mailto. Barely-designed is the joke. This is the crawlable fallback
// floor — fully usable with JavaScript disabled — and the top of the descent.
//
// It reads its title + link set from floor data (src/data/floors.ts); the rest
// of the dead-plain furniture is the template's signature.
// ───────────────────────────────────────────────────────────────────────────
export function PlainFloor({ floor }: { floor: Floor }) {
  // The "inside scoop" points at the podcast (the behind-the-scenes talk show),
  // not at lukefwalton.com — that stays a subtle footer/schema backlink.
  const insideScoop = destById('podcast')?.href ?? TEXT_ONLY_PATH;
  const dests = resolveLinks(floor.links);
  const descend = useSceneStore((s) => s.descend);
  // Surface-safe returning-visitor wink (the rat clocks you) — now HISTORY-AWARE:
  // the greeting reflects what you've actually done (gone deep / found the back
  // room / heard the music), so coming back feels remembered, not generic. Gated
  // on useMounted so it's a post-hydration enhancement only — never in the
  // prerendered / JS-off HTML, and no hydration mismatch. Funny, not dread: the
  // storefront stays a safe zone (see docs/DESIGN.md "dosage").
  const mounted = useMounted();
  const greeting = useProgressStore(selectRatGreeting);
  const remembersYou = mounted ? greeting : null;

  return (
    <div className="store" data-floor={floor.id}>
      <p className="util">
        <a href={TEXT_ONLY_PATH}>text only version of this page</a>
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
          <h1>{floor.title}</h1>
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
        {remembersYou && (
          <p className="news-returning">
            <i>&mdash; The rat says: &ldquo;{remembersYou}&rdquo;</i>
          </p>
        )}
      </section>

      <hr />

      <main>
        <SampleMenu dests={dests} />

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
            It&rsquo;s one thin crust piled with six unreleased demos, then sealed
            with another thin crust, reverb, choice of toppings, and even more
            reverb.
          </p>
          <p className="slogan">
            <b>The Best Songs Under One Roof!&trade;</b> &nbsp; Lo-Fi &bull; Hi-Fi
            &bull; Stuffed Crust
          </p>
          <p className="recipe">
            <a href="/about">Our Secret Recipe &raquo;</a>
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
          <a href="https://distrokid.com/vip/lovemusicmore" target="_blank" rel="noopener noreferrer">
            get a discount on DistroKid &raquo;
          </a>
        </p>
      </aside>

      <hr />

      <section className="floor-down floor-down--plain" aria-label="Downstairs">
        <p className="floor-down__sign">STAFF ONLY &mdash; the rest of the building is downstairs.</p>
        <FloorDoor
          direction="down"
          label={floor.descendLabel}
          className="floor-door--plain"
          onActivate={() => {
            audio.unlock();
            descend();
          }}
        />
      </section>

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
          <a href="https://lovemusicmore.substack.com/" target="_blank" rel="noopener noreferrer">
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
  );
}
