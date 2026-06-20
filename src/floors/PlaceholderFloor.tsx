import { useSceneStore } from '../state/sceneStore';
import { destById, type Dest } from '../data/links';
import { BOTTOM_FLOOR, type Floor } from '../data/floors';
import { FloorDoor } from './FloorDoor';

// Stand-in for the era floors (starburst / tableLayout / machineRoom) until
// their real templates land in later checkpoints. It's intentionally plain —
// the point of THIS checkpoint is the descent mechanic: every floor is a real,
// usable links page you enter/leave through doors, with the rot deepening as you
// go. Each floor still surfaces real links from floors.ts.
export function PlaceholderFloor({ floor, index }: { floor: Floor; index: number }) {
  const descend = useSceneStore((s) => s.descend);
  const ascend = useSceneStore((s) => s.ascend);
  const dests = floor.links.map((id) => destById(id)).filter(Boolean) as Dest[];
  const isBottom = index >= BOTTOM_FLOOR;

  return (
    <div className="floor-placeholder" data-template={floor.template}>
      <p className="floor-era">— {floor.era} —</p>
      <h1>{floor.title}</h1>
      {floor.copy && <p className="floor-copy">{floor.copy}</p>}
      <p className="floor-note">
        (placeholder — the <code>{floor.template}</code> era styling lands in a later checkpoint)
      </p>

      <ul className="floor-links">
        {dests.map((d) => (
          <li key={d.id}>
            <a href={d.href} {...(d.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {d.label}
            </a>
          </li>
        ))}
      </ul>

      <div className="floor-doors">
        <FloorDoor direction="up" label="Back upstairs" onActivate={ascend} />
        {isBottom ? (
          <p className="floor-note floor-note--terminus">
            Terminus. The Calzone Player&trade; install + the push through the screen into the
            world fire here (Checkpoint 3).
          </p>
        ) : (
          <FloorDoor direction="down" label={floor.descendLabel} onActivate={descend} />
        )}
      </div>
    </div>
  );
}
