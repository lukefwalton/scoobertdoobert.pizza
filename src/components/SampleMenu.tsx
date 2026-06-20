import { DESTINATIONS } from '../data/links';
import { ToppingIcon } from './ToppingIcon';

// The "Sample Menu" — the topping-icon nav row. Every item is a real <a href>
// straight from links.ts, so it is crawlable and works with JavaScript off.
// This list is also the mobile / reduced-motion fallback (step 6): a plain,
// complete index of where you can actually go.
export function SampleMenu() {
  return (
    <nav id="menu" className="menu" aria-label="Sample Menu">
      <h2>Sample Menu</h2>
      <ul className="menu-list">
        {DESTINATIONS.map((d) => (
          <li key={d.id}>
            <ToppingIcon topping={d.topping} />{' '}
            <a
              href={d.href}
              className={d.deadpan ? 'deadpan' : undefined}
              {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {d.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
