import { useMounted } from '../lib/useMounted';
import { useProgressStore } from '../state/progressStore';

// The odometer visitor counter every 1996 homepage had — an LCD-green digit
// strip in a little black box. It's decorative period furniture, not a real
// analytics widget, so the crawlable / JS-off HTML renders a fixed seed. After
// hydration it nudges the count by how much you've actually poked around (a wink
// at the persistence spine — the shop noticing you), so a returning explorer
// sees a slightly higher number. No motion, no flashing: the "life" is the look.
const SEED = 40_617;

export function HitCounter() {
  const mounted = useMounted();
  const secrets = useProgressStore((s) => s.secretsFound.length);
  const items = useProgressStore((s) => s.itemsHeld.length);
  const count = mounted ? SEED + secrets * 3 + items : SEED;
  const digits = String(count).padStart(6, '0').split('');

  return (
    <span className="hit-counter" aria-label={`Visitor number ${count}`}>
      <span className="hit-counter__box" aria-hidden="true">
        {digits.map((d, i) => (
          <span key={i} className="hit-counter__digit">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}
