// The low-fi "delivery order" form — Name / Voice Phone / Favorite Cheese /
// Delivery Address / Continue. Offensively plain on purpose.
//
// THEATRICAL in Phase 1: there is no order backend. The form's whole job is to
// be the thing you fill out right before the Calzone Player™ install gag fires
// (step 3) and descends into the 3D world.
//
// PROGRESSIVE ENHANCEMENT + PRIVACY CONTRACT:
//   - The inputs intentionally have NO `name` attributes, so with JavaScript
//     off the GET submit navigates to /text with a CLEAN url — no name, phone,
//     or address is ever serialized into the query string (which would leak
//     PII into history, referrers, and server/edge logs). When a real order
//     backend exists, add names + a POST endpoint then, not before.
//   - With JavaScript on (step 3), a handler intercepts submit, preventDefault,
//     and runs the install gag. `data-descent-trigger` is that hook.
export function OrderForm() {
  return (
    <form
      id="order-form"
      className="order-form"
      method="get"
      action="/text"
      autoComplete="off"
      aria-label="Place your order"
      data-descent-trigger
    >
      <h2>Place Your Order</h2>

      <p className="field">
        <label htmlFor="of-name">Name:</label>
        <br />
        <input id="of-name" type="text" size={32} />
      </p>

      <p className="field">
        <label htmlFor="of-phone">Voice Phone:</label>
        <br />
        <input id="of-phone" type="tel" size={24} />
      </p>

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
        <label htmlFor="of-address">Delivery Address:</label>
        <br />
        <textarea id="of-address" rows={3} cols={32} />
      </p>

      <p className="field">
        <button type="submit">Continue</button>
      </p>
    </form>
  );
}
