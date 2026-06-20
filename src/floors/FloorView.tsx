import '../styles/floors.css';
import { useSceneStore } from '../state/sceneStore';
import { FLOORS } from '../data/floors';
import { PlainFloor } from './PlainFloor';
import { StarburstFloor } from './StarburstFloor';
import { TableLayoutFloor } from './TableLayoutFloor';
import { MachineRoomFloor } from './MachineRoomFloor';
import { PlaceholderFloor } from './PlaceholderFloor';
import { FloorTransition } from './FloorTransition';
import type { Floor } from '../data/floors';

// Renders whichever floor the descent is on, plus the rot transition that fires
// between floors. Each template is a reusable component keyed off floor.template;
// adding a floor = a FLOORS entry (+ a template if its look is new). tableLayout
// + machineRoom are still placeholders until their checkpoints land.
function renderFloor(floor: Floor, index: number) {
  switch (floor.template) {
    case 'plain':
      return <PlainFloor floor={floor} />;
    case 'starburst':
      return <StarburstFloor floor={floor} />;
    case 'tableLayout':
      return <TableLayoutFloor floor={floor} />;
    case 'machineRoom':
      return <MachineRoomFloor floor={floor} />;
    default:
      // PlaceholderFloor stays the runtime safety net for a floor whose template
      // hasn't been built yet — but a real typo in FLOORS should be loud in dev.
      if (import.meta.env?.DEV) {
        console.warn(`[floors] no template for "${floor.template}" — using placeholder`);
      }
      return <PlaceholderFloor floor={floor} index={index} />;
  }
}

export function FloorView() {
  const currentFloor = useSceneStore((s) => s.currentFloor);
  const floor = FLOORS[currentFloor] ?? FLOORS[0];

  return (
    <>
      <FloorTransition />
      {renderFloor(floor, currentFloor)}
    </>
  );
}
