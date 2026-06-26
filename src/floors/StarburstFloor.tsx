import '../styles/starburst.css';
import { destById, resolveLinks, TEXT_ONLY_PATH, type Dest } from '../data/links';
import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { FloorDoor } from './FloorDoor';
import type { Floor } from '../data/floors';

// ───────────────────────────────────────────────────────────────────────────
// Floor 1 — the `starburst` template (1999). Loud, primary-colored, busy: a
// spinning starburst headline, a left-rail nav, a blinking rat headline, a
// marquee, an "under eternal construction" strip, a leet visitor counter. The
// register is a MEMORY of 1999, not 1999 — a beat too eager, slightly wrong.
// Real links throughout; doors down/up like every floor.
// ───────────────────────────────────────────────────────────────────────────
export function StarburstFloor({ floor }: { floor: Floor }) {
  const descend = useSceneStore((s) => s.descend);
  const ascend = useSceneStore((s) => s.ascend);
  const dests = resolveLinks(floor.links);
  const inside = destById('podcast')?.href ?? TEXT_ONLY_PATH;
  const ext = (d: Dest) =>
    d.external ? { target: '_blank' as const, rel: 'noopener noreferrer' } : {};

  return (
    <div className="sb" data-floor={floor.id}>
      <div className="sb__marquee" aria-hidden="true">
        <span>
          ★ NOW SERVING SIX UNRELEASED DEMOS UNDER ONE ROOF ★ BEST VIEWED IN NETSCAPE NAVIGATOR 3.0
          ★ Y2K READY ★ SIGN OUR GUESTBOOK ★ NOW SERVING SIX UNRELEASED DEMOS UNDER ONE ROOF ★
        </span>
      </div>

      <header className="sb__head">
        <div className="sb__star" aria-hidden="true">
          <span className="sb__star-text">NEW!</span>
        </div>
        <h1 className="sb__title">{floor.title}</h1>
        <p className="sb__sub">est. 1996 &middot; still online &middot; the {floor.era} edition</p>
      </header>

      {/* a GeoCities rainbow <hr>, made by our own GIF encoder; decorative (alt=""),
          with a still frame under reduced motion. */}
      <picture>
        <source srcSet="/gifs/rainbow-rule-static.gif" media="(prefers-reduced-motion: reduce)" />
        <img className="sb__rule" src="/gifs/rainbow-rule.gif" width={168} height={8} alt="" />
      </picture>

      <div className="sb__body">
        <nav className="sb__rail" aria-label="Main menu">
          <p className="sb__rail-h">&raquo; MAIN MENU &laquo;</p>
          <ul>
            {dests.map((d) => (
              <li key={d.id}>
                <a href={d.href} {...ext(d)}>
                  {d.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="sb__counter">
            You are visitor #<b>00013337</b>
          </p>
        </nav>

        <main className="sb__main">
          <div className="sb__news">
            <p className="sb__rat">
              <b>RAT SPOTTED IN WALL &mdash; MANAGEMENT INSISTS HE PAYS RENT</b>
            </p>
            <p>
              <a href={inside} target="_blank" rel="noopener noreferrer">
                Click here for the inside scoop.
              </a>
            </p>
            {floor.copy && <p className="sb__copy">{floor.copy}</p>}
          </div>

          <p className="sb__sparkles" aria-hidden="true">
            <span>★</span>
            <span>✦</span>
            <span>✧</span>
            <span>★</span>
            <span>✦</span>
            <span>✧</span>
            <span>★</span>
          </p>

          <div
            className="sb__construction"
            role="img"
            aria-label="This site is under eternal construction"
          >
            <span className="sb__cone" aria-hidden="true">
              &#9888;
            </span>
            <span className="sb__cc-plate">UNDER&nbsp;ETERNAL&nbsp;CONSTRUCTION</span>
            <span className="sb__cone" aria-hidden="true">
              &#9888;
            </span>
          </div>

          {/* The site's "dancing baby": a REAL animated GIF, printed from scratch by
              our own GIF89a encoder (scripts/make-gifs.mjs). <picture> swaps to a
              still first frame under prefers-reduced-motion — a GIF can't be paused
              by CSS, so the static frame IS the WCAG accommodation. */}
          <picture className="sb__dancer">
            <source
              srcSet="/gifs/dancing-pizza-static.gif"
              media="(prefers-reduced-motion: reduce)"
            />
            <img
              className="sb__dancer-img"
              src="/gifs/dancing-pizza.gif"
              width={64}
              height={64}
              alt="A dancing slice of pizza"
            />
          </picture>

          {/* "Sign My Guestbook!" — a REAL crawlable anchor. The marquee up top has
              promised a guestbook for years; this finally delivers one. It points at
              the contact destination — the webmaster who "reads every comment" — so
              signing the book IS mailing him, the exact 1999 guestbook contract (no
              fake '#'; the constitution's hard rule). The NEW! blinky beside it is our
              OWN GIF (make-gifs.mjs); <picture> serves a still under reduced motion. */}
          <div className="sb__guestbook">
            <a className="sb__gbook" href={destById('contact')?.href ?? TEXT_ONLY_PATH}>
              <span aria-hidden="true">&#9997;</span> Sign My Guestbook!
            </a>
            <picture className="sb__newblink">
              <source srcSet="/gifs/new-badge-static.gif" media="(prefers-reduced-motion: reduce)" />
              <img src="/gifs/new-badge.gif" width={56} height={22} alt="New!" />
            </picture>
          </div>

          <div className="sb__doors">
            <FloorDoor direction="up" label="Back upstairs" onActivate={ascend} />
            <FloorDoor
              direction="down"
              label={floor.descendLabel}
              onActivate={() => {
                audio.unlock();
                descend();
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
