import { useHeadingStore } from '../state/headingStore';
import { useSceneStore } from '../state/sceneStore';
import { questStatus } from '../data/quests';
import { nextHopDoor, arrowDeg } from '../lib/wayfinding';
import type { Progress } from '../state/progressStore';

// The always-on directed-play chip (Agency/Clarity): your next undone objective +
// a compass arrow toward the room it's in. The heading subscription lives HERE so
// the ~15 Hz camera-pose updates only re-render this little chip, not all of
// WorldHud. Hidden during pause/transition/dialog (passed as `hidden`) and via the
// pause-menu toggle. WCAG-safe — a rotating arrow, no flash.
export function ObjectiveHud({
  progress,
  currentRoom,
  hidden,
}: {
  progress: Progress;
  currentRoom: string;
  hidden: boolean;
}) {
  const on = useSceneStore((s) => s.objectiveHudOn);
  const heading = useHeadingStore();

  if (!on || hidden) return null;
  const undone = questStatus(progress).find((q) => !q.done)?.quest;
  if (!undone) return null; // all objectives done — the finale takes over (later commit)

  const target = undone.room;
  const here = !!target && target === currentRoom;
  const hop = target && !here ? nextHopDoor(currentRoom, target) : null;
  const deg = hop
    ? arrowDeg(hop.position[0], hop.position[2], heading.x, heading.z, heading.yaw)
    : null;

  return (
    <div className="hud-objective" role="status">
      {deg !== null ? (
        <span
          className="hud-objective__arrow"
          style={{ transform: `rotate(${deg}deg)` }}
          aria-hidden="true"
        >
          ↑
        </span>
      ) : (
        <span className="hud-objective__mark" aria-hidden="true">
          {here ? '◎' : '•'}
        </span>
      )}
      <span className="hud-objective__text">
        <span className="hud-objective__label">{undone.label}</span>
        <span className="hud-objective__hint">
          {here ? 'You’re here — look around.' : undone.hint}
        </span>
      </span>
    </div>
  );
}
