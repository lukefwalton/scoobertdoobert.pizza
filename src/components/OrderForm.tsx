// The low-fi "delivery order" form — Name / Voice Phone / Favorite Cheese /
// Delivery Address / Continue. This is the easter-egg ENTRANCE (submitting it
// fires the Calzone Player™ descent), so per Luke it is intentionally the one
// LOUD element on the otherwise dead-plain page: a period "ORDER ONLINE!"
// callout, not a buried newsletter-looking form.
//
// THEATRICAL in Phase 1: there is no order backend. PROGRESSIVE ENHANCEMENT +
// PRIVACY CONTRACT:
//   - Inputs have NO `name` attributes, so the no-JS GET submit navigates to
//     /text with a CLEAN url — no name/phone/address is serialized (which would
//     leak PII into history, referrers, logs). When a real backend exists, add
//     names + a POST endpoint then.
//   - With JS on (step 3), a handler intercepts submit and runs the install gag.
//     `data-descent-trigger` is that hook.
export function OrderForm() {
  return (
    <div className="order-callout">
      <h2 className="order-callout__header">
        <span className="order-callout__new">&#9733; NEW! &#9733;</span> Order Online &mdash;
        Hot &amp; Fresh
      </h2>
      <form
        id="order-form"
        className="order-form"
        method="get"
        action="/text"
        autoComplete="off"
        aria-label="Place your order"
        data-descent-trigger
      >
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

        <p className="order-cta">
          <button type="submit">Continue &#9654;</button>
        </p>
        <p className="order-hint">
          Place an order to see the kitchen. (You may need a plug-in.)
        </p>
      </form>
    </div>
  );
}
