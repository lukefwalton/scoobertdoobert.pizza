import '../styles/floors.css';
import { useSceneStore } from '../state/sceneStore';
import { FLOORS } from '../data/floors';
import { PlainFloor } from './PlainFloor';
import { PlaceholderFloor } from './PlaceholderFloor';
import { FloorTransition } from './FloorTransition';

// Renders whichever floor the descent is on, plus the rot transition that fires
// between floors. Each template is a reusable component keyed off floor.template;
// adding a floor = a FLOORS entry (+ a template if its look is new). The 1999 /
// 2000 / machine-room templates are still placeholders until later checkpoints.
export function FloorView() {
  const currentFloor = useSceneStore((s) => s.currentFloor);
  const floor = FLOORS[currentFloor] ?? FLOORS[0];

  return (
    <>
      <FloorTransition />
      {floor.template === 'plain' ? (
        <PlainFloor floor={floor} />
      ) : (
        <PlaceholderFloor floor={floor} index={currentFloor} />
      )}
    </>
  );
}
