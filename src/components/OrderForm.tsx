import type { FormEvent } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore, selectDeepDiver } from '../state/progressStore';
import { useMounted } from '../lib/useMounted';
import { audio } from '../audio/engine';
import { isLowPower } from '../lib/lowPower';
import { TEXT_ONLY_PATH } from '../data/links';

// The easter-egg entrance — a loud period "ORDER ONLINE!" callout. Simplified to
// Favorite Cheese + an OPTIONAL, opt-in Email.
//
// PRIVACY: the email is captured only with JavaScript AND an explicit opt-in,
// POSTed (never serialized into a URL) to /api/order which writes it to Vercel
// Blob. The inputs are nameless, so the no-JS fallback (GET to /text) transmits
// nothing. The capture is fire-and-forget: it never blocks the descent, and a
// failed/absent backend is swallowed.
export function OrderForm() {
  // The storefront CTA now STARTS THE DESCENT (floor 0 → 1) rather than firing
  // the install directly — the Calzone Player install moved to the machine room
  // at the bottom of the descent (Phase 2).
  const descend = useSceneStore((s) => s.descend);
  // THE MASK CRACKS (Phase 5, ckpt5): the storefront is a safe zone and stays
  // sweet for a cold/casual visitor — but for someone whose saved high-water
  // dread is deep, one line curdles. Gated on useMounted so it's a post-hydration
  // enhancement only (never in the prerendered / JS-off HTML, no mismatch). Funny-
  // uncanny, not traumatic: it's still, technically, pizza customer service.
  const mounted = useMounted();
  const deep = useProgressStore(selectDeepDiver);
  const curdled = mounted && deep;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = (document.getElementById('of-email') as HTMLInputElement | null)?.value.trim() ?? '';
    const optin = (document.getElementById('of-optin') as HTMLInputElement | null)?.checked ?? false;
    const cheese = (document.getElementById('of-cheese') as HTMLSelectElement | null)?.value ?? '';
    // Honeypot — humans never see or fill this; a value means a bot.
    const website = (document.getElementById('of-website') as HTMLInputElement | null)?.value ?? '';

    if (!website && optin && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      void fetch('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, cheese, optin: true, website }),
      }).catch(() => {
        /* capture is best-effort; never block the experience */
      });
    }

    // Mobile / reduced-motion stay on floor zero and just get the flat list;
    // everyone else starts the descent through the era floors.
    if (isLowPower()) {
      window.location.assign(TEXT_ONLY_PATH);
    } else {
      audio.unlock();
      descend();
    }
  }

  return (
    <div className="order-callout">
      <h2 className="order-callout__header">
        <span className="order-callout__new">&#9733; NEW! &#9733;</span> Order Online &mdash;
        Hot &amp; Fresh
      </h2>
      <form id="order-form" className="order-form" method="get" action="/text" onSubmit={onSubmit}>
        <p className="field">
          <label htmlFor="of-cheese">Favorite Cheese:</label>
          <br />
          <select id="of-cheese" defaultValue="mozzarella">
            <option value="mozzarella">Mozzarella</option>
            <option value="provolone">Provolone</option>
            <option value="the-white-one">The White One</option>
            <option value="extra">Extra (all of it)</option>
            <option value="none">No Cheese (Monk Mode)</option>
          </select>
        </p>

        <p className="field">
          <label htmlFor="of-email">Email (optional):</label>
          <br />
          <input id="of-email" type="email" size={28} autoComplete="email" placeholder="you@example.com" />
        </p>

        <p className="field optin-field">
          <label htmlFor="of-optin">
            <input id="of-optin" type="checkbox" /> Email me when there&rsquo;s a new release. No
            spam.
          </label>
        </p>

        {/* Honeypot: off-screen, not display:none, hidden from AT + tab order.
            Real visitors never fill it; bots that fill every field get dropped. */}
        <p className="hp-field" aria-hidden="true">
          <label htmlFor="of-website">Website (leave blank)</label>
          <input id="of-website" type="text" tabIndex={-1} autoComplete="off" />
        </p>

        <p className="order-cta">
          <button type="submit">Continue &#9654;</button>
        </p>
        <p className="order-hint">
          {curdled
            ? 'An employee will call to verify your order. An employee is already inside.'
            : 'Place an order to see the kitchen. (You may need a plug-in.)'}
        </p>
      </form>
    </div>
  );
}
