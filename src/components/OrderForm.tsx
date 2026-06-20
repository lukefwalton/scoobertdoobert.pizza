// The low-fi "delivery order" form — Name / Voice Phone / Favorite Cheese /
// Delivery Address / Continue. Offensively plain on purpose.
//
// PROGRESSIVE ENHANCEMENT CONTRACT:
//   - With JavaScript OFF (the fallback layer): this is a real <form> that
//     GET-submits to /text, the flat menu. It always does something real.
//   - With JavaScript ON (step 3, not built yet): a handler will intercept
//     submit, preventDefault, and fire the Calzone Player™ install gag — the
//     order is what "requires the plug-in" — which descends into the 3D world.
//
// The `data-descent-trigger` hook is where step 3 attaches. Leaving the real
// action="/text" intact means the no-JS path is never broken by the upgrade.
export function OrderForm() {
  return (
    <form
      id="order-form"
      className="order-form"
      method="get"
      action="/text"
      aria-label="Place your order"
      data-descent-trigger
    >
      <h2>Place Your Order</h2>

      <p className="field">
        <label htmlFor="of-name">Name:</label>
        <br />
        <input id="of-name" type="text" name="name" size={32} autoComplete="name" />
      </p>

      <p className="field">
        <label htmlFor="of-phone">Voice Phone:</label>
        <br />
        <input id="of-phone" type="tel" name="voice_phone" size={24} />
      </p>

      <p className="field">
        <label htmlFor="of-cheese">Favorite Cheese:</label>
        <br />
        <select id="of-cheese" name="favorite_cheese" defaultValue="mozzarella">
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
        <textarea id="of-address" name="delivery_address" rows={3} cols={32} />
      </p>

      <p className="field">
        <button type="submit">Continue</button>
      </p>
    </form>
  );
}
