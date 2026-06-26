import { ArcadeCabinetPage } from '../components/ArcadeCabinetPage';
import { JazzSnake as JazzSnakeGame } from '../components/JazzSnake';

// /jazz-snake — Snake, where every bite plays the next note of a climbing scale (a
// standalone cabinet for mobile). See ArcadeCabinetPage for the shared shell.
export default function JazzSnake() {
  return (
    <ArcadeCabinetPage
      slug="jazz-snake"
      title="Jazz Snake — Scoobert Doobert"
      neon="JAZZ SNAKE"
      description="Jazz Snake — eat the toppings, grow the snake, and play a climbing pentatonic run with every bite. A tiny late-90s arcade game for your phone."
      coldTitle="JAZZ SNAKE"
      coldSub="Insert JavaScript to play. No quarters accepted."
      foot="Steer with the arrows, the dpad, or a swipe. Every topping you eat plays the next note. Your best is remembered on this device."
    >
      <JazzSnakeGame />
    </ArcadeCabinetPage>
  );
}
