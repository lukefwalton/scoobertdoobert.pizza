import { useSceneStore } from '../state/sceneStore';
import { FLOORS } from '../data/floors';
import { PlainFloor } from './PlainFloor';

// Renders whichever floor the descent is currently on. Each template is a
// reusable component keyed off floor.template; adding a floor means adding a
// FLOORS entry and (if its look is new) a case here. Until the 1999 / 2000 /
// machine-room templates land in later checkpoints, everything falls back to
// the plain floor.
export function FloorView() {
  const currentFloor = useSceneStore((s) => s.currentFloor);
  const floor = FLOORS[currentFloor] ?? FLOORS[0];

  switch (floor.template) {
    case 'plain':
    default:
      return <PlainFloor floor={floor} />;
  }
}
