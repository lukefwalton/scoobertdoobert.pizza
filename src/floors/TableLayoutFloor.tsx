import { useState } from 'react';
import '../styles/tablelayout.css';
import { resolveLinks } from '../data/links';
import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { FloorDoor } from './FloorDoor';
import { KidsBallPit } from './KidsBallPit';
import type { Floor } from '../data/floors';

// ───────────────────────────────────────────────────────────────────────────
// Floor 2 — the `tableLayout` template (2000). Sliced-GIF brand bar, beveled
// gradient buttons, a table layout. The gags:
//   1. a section-gate fork (McDonald's "Adult Section" spirit). The grown-up
//      sections drop to the freezer stairs; the Kids Menu opens a real ball pit.
//   2. a clickable pizza-box image map (Space Jam hub energy) where the slices
//      are nav targets pointed at real links.ts destinations.
// A memory of 2000, not 2000.
// ───────────────────────────────────────────────────────────────────────────

// gag 1 — the section gate.
const SECTIONS = ['Kids Menu', 'Adult Section', "Manager's Office"];

// gag 2 — the pizza image map. SVG pie slices, each a real anchor.
function PizzaImageMap({ dests }: { dests: ReturnType<typeof resolveLinks> }) {
  const n = Math.max(dests.length, 1);
  const cx = 100;
  const cy = 100;
  const r = 92;
  const rl = 60;
  return (
    <svg
      className="tl-pizza"
      viewBox="0 0 200 200"
      role="group"
      aria-label="Pizza menu — pick a slice"
    >
      <circle cx={cx} cy={cy} r={r + 4} className="tl-pizza__crust" />
      {dests.map((d, i) => {
        const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
        const am = (a0 + a1) / 2;
        const x0 = (cx + r * Math.cos(a0)).toFixed(1);
        const y0 = (cy + r * Math.sin(a0)).toFixed(1);
        const x1 = (cx + r * Math.cos(a1)).toFixed(1);
        const y1 = (cy + r * Math.sin(a1)).toFixed(1);
        const lx = cx + rl * Math.cos(am);
        const ly = cy + rl * Math.sin(am);
        const path = `M${cx},${cy} L${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} Z`;
        return (
          <a
            key={d.id}
            href={d.href}
            className={`tl-slice tl-slice--${i % 2}`}
            {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            <title>{d.label}</title>
            <path d={path} />
            <text x={lx} y={ly + 4} className="tl-slice__num">
              {i + 1}
            </text>
          </a>
        );
      })}
    </svg>
  );
}

export function TableLayoutFloor({ floor }: { floor: Floor }) {
  const descend = useSceneStore((s) => s.descend);
  const ascend = useSceneStore((s) => s.ascend);
  const dests = resolveLinks(floor.links);
  const [ballPit, setBallPit] = useState(false);
  const deeper = () => {
    audio.unlock();
    descend();
  };
  const pickSection = (section: string) => {
    audio.unlock();
    if (section === 'Kids Menu') setBallPit(true);
    else descend(); // the grown-up sections still drop to the freezer stairs
  };

  return (
    <div className="tl" data-floor={floor.id}>
      <div className="tl__brandbar" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="tl__brandbar-slice" />
        ))}
        <span className="tl__brandbar-name">{floor.title}</span>
      </div>

      <table className="tl__table" role="presentation">
        <tbody>
          <tr>
            <td className="tl__cell tl__cell--gate">
              <h2 className="tl__h">Please select your party:</h2>
              <div className="tl__gate">
                {SECTIONS.map((s) => (
                  <button key={s} type="button" className="tl__btn" onClick={() => pickSection(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="tl__fine">
                (grown-ups get the freezer stairs &middot; kids get the ball pit)
              </p>
            </td>
          </tr>
          <tr>
            <td className="tl__cell tl__cell--pizza">
              <h2 className="tl__h">&hellip;or just point at a slice:</h2>
              <div className="tl__pizzawrap">
                <PizzaImageMap dests={dests} />
                <ol className="tl__legend">
                  {dests.map((d) => (
                    <li key={d.id}>
                      <a
                        href={d.href}
                        {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {d.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="tl__doors">
        <FloorDoor direction="up" label="Back upstairs" onActivate={ascend} />
        <FloorDoor direction="down" label={floor.descendLabel} onActivate={deeper} />
      </div>

      {ballPit && <KidsBallPit onBack={() => setBallPit(false)} />}
    </div>
  );
}
