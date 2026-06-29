import { ArcadeCabinetPage } from '../components/ArcadeCabinetPage';
import { OrderUp as OrderUpGame } from '../components/OrderUp';

// /order-up — Simon, kitchen-side: watch the growing order, ring it back (a
// standalone cabinet for mobile). See ArcadeCabinetPage for the shared shell.
export default function OrderUp() {
  return (
    <ArcadeCabinetPage
      slug="order-up"
      title="Order Up — Scoobert Doobert"
      neon="ORDER UP"
      description="Order Up — watch the cook call a growing order on four singing topping pads, then ring it back from memory. A tiny late-90s arcade game for your phone."
      coldTitle="ORDER UP"
      coldSub="Insert JavaScript to play. No quarters accepted."
      foot="Watch the order light up the topping pads, then tap them back in order — Q/W/A/S or 1–4 work too. Each pad sings a note, so a good run plays a little tune. Your best is remembered on this device."
    >
      <OrderUpGame />
    </ArcadeCabinetPage>
  );
}
