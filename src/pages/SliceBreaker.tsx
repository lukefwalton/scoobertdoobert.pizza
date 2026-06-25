import { ArcadeCabinetPage } from '../components/ArcadeCabinetPage';
import { SliceBreaker as SliceBreakerGame } from '../components/SliceBreaker';

// /slice-breaker — Breakout, pizza-mode (a standalone cabinet for mobile). See
// ArcadeCabinetPage for the shared shell + progressive-enhancement contract.
export default function SliceBreaker() {
  return (
    <ArcadeCabinetPage
      slug="slice-breaker"
      title="Slice Breaker — Scoobert Doobert"
      neon="SLICE BREAKER"
      description="Slice Breaker — slide the spatula and knock an olive through a wall of toppings. A tiny late-90s arcade game for your phone."
      coldTitle="SLICE BREAKER"
      coldSub="Insert JavaScript to play. No quarters accepted."
      foot="Slide the spatula (drag, or ◀ ▶), tap to launch the olive, clear every topping. Your best is remembered on this device."
    >
      <SliceBreakerGame />
    </ArcadeCabinetPage>
  );
}
