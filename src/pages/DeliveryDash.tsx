import { ArcadeCabinetPage } from '../components/ArcadeCabinetPage';
import { DeliveryDash as DeliveryDashGame } from '../components/DeliveryDash';

// /delivery-dash — DELIVERY DASH, the "cross the traffic" cabinet (hop the pizza
// scooter up through the lanes to the door, then again a notch faster). Standalone
// cabinet for mobile. See ArcadeCabinetPage for the shared shell.
export default function DeliveryDash() {
  return (
    <ArcadeCabinetPage
      slug="delivery-dash"
      title="Delivery Dash — Scoobert Doobert"
      neon="DELIVERY DASH"
      description="Delivery Dash — hop a pizza scooter up across lanes of late-90s traffic, get the pie to the door, and start again a notch faster. Get clipped and it's on the asphalt. A tiny cross-the-road arcade game for your phone."
      coldTitle="DELIVERY DASH"
      coldSub="Insert JavaScript to play. No quarters accepted."
      foot="Hop with the arrows or the ◀ ▲ ▼ ▶ pad — up toward the door, left/right to dodge. Reach the door to deliver and speed up. Your best is remembered on this device."
    >
      <DeliveryDashGame />
    </ArcadeCabinetPage>
  );
}
