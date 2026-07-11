import { ArcadeCabinetPage } from '../components/ArcadeCabinetPage';
import { Crusteroids as CrusteroidsGame } from '../components/Crusteroids';

// /crusteroids — Asteroids, pizza-mode (a standalone cabinet for mobile). See
// ArcadeCabinetPage for the shared shell + progressive-enhancement contract.
export default function Crusteroids() {
  return (
    <ArcadeCabinetPage
      slug="crusteroids"
      title="Crusteroids · Scoobert Doobert"
      neon="CRUSTEROIDS"
      description="Crusteroids, pilot a pizza-slice ship and blast the floating crusts. A tiny late-90s arcade game for your phone."
      coldTitle="CRUSTEROIDS"
      coldSub="Insert JavaScript to play. No quarters accepted."
      foot="Turn with ◀ ▶, THRUST to fly, tap the screen (or ◉) to fire. Your best is remembered on this device."
    >
      <CrusteroidsGame />
    </ArcadeCabinetPage>
  );
}
