import '../styles/starburst.css';
import { destById, resolveLinks, type Dest } from '../data/links';
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
  const inside = destById('podcast')?.href ?? '/text';
  const ext = (d: Dest) =>
    d.external ? { target: '_blank' as const, rel: 'noopener noreferrer' } : {};

  return (
    <div className="sb">
      <div className="sb__marquee" aria-hidden="true">
        <span>
          ★ NOW SERVING SIX UNRELEASED DEMOS UNDER ONE ROOF ★ BEST VIEWED IN NETSCAPE NAVIGATOR
          3.0 ★ Y2K READY ★ SIGN OUR GUESTBOOK ★ NOW SERVING SIX UNRELEASED DEMOS UNDER ONE ROOF ★
        </span>
      </div>

      <header className="sb__head">
        <div className="sb__star" aria-hidden="true">
          <span className="sb__star-text">NEW!</span>
        </div>
        <h1 className="sb__title">{floor.title}</h1>
        <p className="sb__sub">est. 1996 &middot; still online &middot; the {floor.era} edition</p>
      </header>

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

          <p className="sb__construction">
            <span className="sb__cone" aria-hidden="true">
              &#9888;
            </span>{' '}
            This site is under <b>eternal</b> construction.{' '}
            <span className="sb__cone" aria-hidden="true">
              &#9888;
            </span>
          </p>

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
