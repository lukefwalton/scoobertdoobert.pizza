import { ArcadeCabinetPage } from '../components/ArcadeCabinetPage';
import { BurritoBelt as BurritoBeltGame } from '../components/BurritoBelt';

// /burrito-belt — BURRITO BELT, the "falling blocks" stacker (ingredient pieces
// roll down the belt; fill a row to wrap it off). Standalone cabinet for mobile.
// See ArcadeCabinetPage for the shared shell.
export default function BurritoBelt() {
  return (
    <ArcadeCabinetPage
      slug="burrito-belt"
      title="Burrito Belt · Scoobert Doobert"
      neon="BURRITO BELT"
      description="Burrito Belt, stacks of fillings roll down the belt; slide and rotate them to fill a row all the way across and it wraps up and rolls off. A tiny late-90s falling-blocks arcade game for your phone."
      coldTitle="BURRITO BELT"
      coldSub="Insert JavaScript to play. No quarters accepted."
      foot="Move with the arrows or the ◀ ▶ pad, rotate with ↑ / ↻, soft-drop with ↓ / the ▼ button (hold), hard-drop with space / the ⤓ button. Fill a row to wrap it off the belt. Your best is remembered on this device."
    >
      <BurritoBeltGame />
    </ArcadeCabinetPage>
  );
}
