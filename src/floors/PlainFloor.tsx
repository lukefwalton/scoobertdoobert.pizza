import { SampleMenu } from '../components/SampleMenu';
import { SocialLinks } from '../components/SocialLinks';
import { OrderForm } from '../components/OrderForm';
import { MuteToggle } from '../components/MuteToggle';
import { Marquee } from '../components/Marquee';
import { HitCounter } from '../components/HitCounter';
import { destById, resolveLinks, TEXT_ONLY_PATH } from '../data/links';
import { CASSETTE_IDS } from '../data/items';
import type { Floor } from '../data/floors';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore, selectRatGreeting, selectLuck } from '../state/progressStore';
import { useMounted } from '../lib/useMounted';
import { audio } from '../audio/engine';
import { FloorDoor } from './FloorDoor';
import { TrapDoor } from '../components/TrapDoor';

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
  const dests = resolveLinks(floor.links);
  const descend = useSceneStore((s) => s.descend);
  // The hire funnel (ADDENDUM #8) reads links.ts so the pitch can't drift from
  // the single source of truth. Fallbacks keep the anchors real if a dest moves.
  const reelHref =
    destById('reel')?.href ?? 'https://open.spotify.com/playlist/7pmgoZlkf6exw4BAJTQs7Q';
  const hireHref = destById('contact')?.href ?? 'mailto:beformer@aol.com';
  // Surface-safe returning-visitor wink (the rat clocks you) — now HISTORY-AWARE:
  // the greeting reflects what you've actually done (gone deep / found the back
  // room / heard the music), so coming back feels remembered, not generic. Gated
  // on useMounted so it's a post-hydration enhancement only — never in the
  // prerendered / JS-off HTML, and no hydration mismatch. Funny, not dread: the
  // storefront stays a safe zone (see docs/DESIGN.md "dosage").
  const mounted = useMounted();
  const greeting = useProgressStore(selectRatGreeting);
  const remembersYou = mounted ? greeting : null;
  // "What you did IN the game changes the shop" (Luke) — the first surface tell
  // keyed to the game layer: once your LUCK is high, someone's taped a clover to
  // the door. Post-hydration only (mounted), so the crawlable / JS-off front door
  // never shows it; sweet, never dread.
  const luck = useProgressStore(selectLuck);
  const lucky = mounted && luck >= 3;
  // More surface tells keyed to the persistence spine (the shop reflecting your
  // deeds), each a DIFFERENT axis of play, all sweet + post-hydration only:
  //  • beat the optional grass goblin → a little trophy by the register.
  //  • cassettes you turned up downstairs collect in the lost-and-found.
  const secretsFound = useProgressStore((s) => s.secretsFound);
  const itemsHeld = useProgressStore((s) => s.itemsHeld);
  const beatGoblin = mounted && secretsFound.includes('grass-cleared');
  const tapes = mounted ? itemsHeld.filter((id) => CASSETTE_IDS.includes(id)).length : 0;

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
          <div className="store-titlebar__text">
            <h1>{floor.title}</h1>
            {floor.copy && <p className="logline">{floor.copy}</p>}
          </div>
        </div>
      </header>

      {/* The animated GeoCities "chrome": a hazard-stripe construction bar, the
          period "best viewed" boast, and the odometer hit counter. Adds a lot of
          period LIFE for very few words. The blink is a slow 1.1s step (well under
          WCAG 2.3.1's 3/sec) and the whole strip goes still under reduced-motion. */}
      <div className="chrome-strip" aria-hidden="true">
        <span className="chrome-strip__const">
          <span className="chrome-strip__blink">&#9888; UNDER CONSTRUCTION &#9888;</span>
        </span>
        <span className="chrome-strip__netscape">Best viewed in Netscape Navigator 3.0</span>
      </div>

      <hr />

      {/* The hire block (ADDENDUM #8) — the second sanctioned loud exception,
          beside the order form. CLEAR FIRST, cheeky second: one skim yields
          artist · mixing engineer & producer for hire · The Reel · the mailto.
          Period chrome, but the words are unambiguous. Real anchors, JS-off safe. */}
      <section className="hire" aria-label="Services — mixing and production for hire">
        <p className="hire__head">
          <picture className="hire__new">
            <source srcSet="/gifs/new-badge-static.gif" media="(prefers-reduced-motion: reduce)" />
            <img src="/gifs/new-badge.gif" width={56} height={22} alt="New!" />
          </picture>{' '}
          THE WEBMASTER WORKS FOR HIRE
        </p>
        <p className="hire__body">
          <b>Scoobert Doobert</b> is an artist, and a <b>mixing engineer &amp; producer for hire</b>
          . He mixes, produces, and plays on all of his own records. I bet he can make yours sound
          saucy, too. Affordable rates. Hot honey costs extra.
        </p>
        <p className="hire__cta">
          <a href={reelHref} target="_blank" rel="noopener noreferrer">
            &#9654; Hear the work: The Reel
          </a>{' '}
          <span className="hire__note">
            (productions &amp; collabs throughout; <b>MIXES</b> are at the bottom)
          </span>
        </p>
        <p className="hire__cta">
          <a href={hireHref}>Hire him: beformer@aol.com</a>
        </p>
      </section>

      {/* The legible game door (ADDENDUM #8): the descent was previously findable
          only through jokes (the rat, the order form, a hidden seam). This says it
          plainly. Same progressive-enhancement anchor as the rat line — a REAL
          crawlable <a> to /text; with JS it ducks you downstairs instead. */}
      <aside className="playdoor" aria-label="The video game downstairs">
        <p className="playdoor__head">IS THERE A WHOLE WORLD UNDER THIS PIZZA SHOP?</p>
        <p className="playdoor__body">
          Free. No download<span aria-hidden="true">*</span>. Explore the basement &mdash; it&rsquo;s a
          video game.
        </p>
        <p className="playdoor__cta">
          <a
            href={TEXT_ONLY_PATH}
            onClick={(e) => {
              e.preventDefault();
              audio.unlock();
              descend();
            }}
          >
            ENTER THE SHOP &raquo;
          </a>
        </p>
        <p className="playdoor__fine">
          *requires a simulated (fake) download &mdash; that&rsquo;s the load screen
        </p>
      </aside>

      <hr />

      {/* The news, as a short scrolling headline. The RAT gag stays (he pays
          rent), but he no longer links off to a blog — clicking him ducks you
          downstairs into the building (the descent → the 3D world). */}
      <section className="news" aria-label="Announcements">
        <Marquee label="Storefront headline">
          <b>&#9733; RAT SPOTTED IN WALL &#9733;</b>
          {'  '}
          <a
            href={TEXT_ONLY_PATH}
            className="marquee__link"
            onClick={(e) => {
              // Progressive enhancement: with JS, following the rat ducks you
              // into the descent (toward the 3D world). It stays a REAL,
              // crawlable <a> so JS-off / no-CSS visitors get the flat index
              // (/text) instead of a dead control — never a link that only
              // exists as behavior.
              e.preventDefault();
              audio.unlock();
              descend();
            }}
          >
            Dare you follow him downstairs?! &raquo;
          </a>
          {'  ·  '}
          Six unreleased demos under one roof.
          {'  ·  '}
          Lo-Fi &bull; Hi-Fi &bull; Wi-Fi &bull; Stuffed Crust with Ranch.
          {'  ·  '}
        </Marquee>
        {remembersYou && (
          <p className="news-returning">
            <i>&mdash; The rat says: &ldquo;{remembersYou}&rdquo;</i>
          </p>
        )}
        {lucky && (
          <p className="news-lucky" title="Fortune favors the bold and tangy">
            <span aria-hidden="true">🍀</span>{' '}
            <i>Someone has taped a four-leaf clover to the door. Fortune favors the bold and tangy.</i>
          </p>
        )}
        {beatGoblin && (
          <p className="news-lucky" title="You got lucky downstairs">
            <span aria-hidden="true">🏆</span>{' '}
            <i>
              A little goblin-shaped trophy has appeared by the register. You got lucky&hellip;
            </i>
          </p>
        )}
        {tapes > 0 && (
          <p className="news-lucky" title="Cassettes in the lost-and-found">
            <span aria-hidden="true">📼</span>{' '}
            <i>
              The lost-and-found shoebox holds {tapes} cassette{tapes === 1 ? '' : 's'}.
            </i>
          </p>
        )}
      </section>

      <hr />

      <main>
        {/* Management floats beside the menu (the marquee above stays clean full-
            width). Period placement: the topping list wraps to its left. */}
        <figure className="snapshot snapshot--right">
          <img
            src="/press/scoobert-shades.jpg"
            alt="Scoobert Doobert reclining in red wraparound sunglasses, two long braids fanned out behind his head."
            width="150"
            height="150"
          />
          <figcaption>Management.</figcaption>
        </figure>
        <SampleMenu dests={dests} />

        <hr />

        <OrderForm />

        <hr />

        <figure className="snapshot snapshot--right">
          <img
            src="/press/scoobert-host.jpg"
            alt="Scoobert Doobert outdoors with googly eyes stuck across his face, one hand raised toward the camera."
            width="150"
            height="150"
          />
          <figcaption>Your host.</figcaption>
        </figure>
      </main>

      <hr />

      <aside className="arcade-callout" aria-label="The Pizza Arcade">
        <p className="arcade-callout__head">
          <span className="arcade-callout__new">NEW!</span> THE PIZZA ARCADE
        </p>
        <p className="arcade-callout__body">
          Stuck waiting on your pizza? Play <b>Scoobert&rsquo;s Pizza Run</b> &mdash; jump the
          broken web buttons. Works great on your handheld telephone.
        </p>
        <p className="arcade-callout__cta">
          <a href="/arcade">&#9654; INSERT COIN &mdash; PLAY NOW</a>
        </p>
      </aside>

      <hr />

      <section className="floor-down floor-down--plain" aria-label="Downstairs">
        <p className="floor-down__sign">
          STAFF ONLY &mdash; the rest of the building is downstairs.
        </p>
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
          Questions, comments, or a record that needs mixing?{' '}
          <a href={hireHref}>Email the webmaster.</a>
        </p>
        <SocialLinks />
        <p className="directory">
          Looking for something specific? <a href="/links">Complete link archive &raquo;</a>
        </p>
        <p className="directory">
          The basement stairs are unlocked. <a href="/basement-stairs">Self-guided tour &raquo;</a>
        </p>
        <p className="directory">
          <a href="/about/jp" hrefLang="ja" lang="ja">
            日本語版のご案内 (About, in Japanese) &raquo;
          </a>
        </p>
        <p className="counter-line">
          <HitCounter /> <span className="counter-line__label">visitors served since 1997</span>
        </p>
        <p className="copyright">&copy;1997 Scoobert Doobert, Inc. / The San Diego-ish Operation</p>
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

      {/* The soft spot in the floor. Renders nothing in the crawlable / JS-off
          HTML and nothing on mobile/reduced-motion — a desktop-only secret. */}
      <TrapDoor />
    </div>
  );
}
