import { ArcadeCabinetPage } from '../components/ArcadeCabinetPage';
import { PizzaRadar as PizzaRadarGame } from '../components/PizzaRadar';

// /pizza-radar — PIZZA RADAR 1996, a green-phosphor radar defense (the "alien
// shooter": sweep the turret, clear the descending saucers). Standalone cabinet
// for mobile. See ArcadeCabinetPage for the shared shell.
export default function PizzaRadar() {
  return (
    <ArcadeCabinetPage
      slug="pizza-radar"
      title="Pizza Radar 1996 — Scoobert Doobert"
      neon="PIZZA RADAR 1996"
      description="Pizza Radar 1996 — a green-phosphor radar defense. Saucers march in, you sweep a turret along the bottom and shoot them down before they reach the slice. A tiny late-90s arcade game for your phone."
      coldTitle="PIZZA RADAR 1996"
      coldSub="Insert JavaScript to play. No quarters accepted."
      foot="Move with the arrows, the ◀ ▶ pad, or by dragging; space / the ◎ button / a tap fires (the first press starts the round). Clear each wave before a saucer reaches the floor. Your best is remembered on this device."
    >
      <PizzaRadarGame />
    </ArcadeCabinetPage>
  );
}
