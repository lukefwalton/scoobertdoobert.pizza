import { roomById, type RoomDoor } from '../data/rooms';

// Routing for the objective compass: given where you ARE and the room your next
// objective is IN, find the door to step through next, and the on-screen arrow
// angle toward it. Pure + three-free so it unit-tests cleanly.

/** BFS over the room graph (NON-hidden doors only — you can't route through a door
 *  you haven't revealed) from `current` to `target`; return the door OUT of
 *  `current` on a shortest path, or null if same room / unreachable via known doors. */
export function nextHopDoor(current: string, target: string): RoomDoor | null {
  if (current === target) return null;
  const queue: string[] = [current];
  const cameFrom = new Map<string, { room: string; door: RoomDoor }>();
  const seen = new Set<string>([current]);
  while (queue.length) {
    const r = queue.shift() as string;
    if (r === target) break;
    for (const d of roomById(r).doors) {
      if (d.hidden || seen.has(d.to)) continue;
      seen.add(d.to);
      cameFrom.set(d.to, { room: r, door: d });
      queue.push(d.to);
    }
  }
  if (!seen.has(target)) return null;
  // Walk back from target; the door whose source room IS current is the next hop.
  let node = target;
  let hop: RoomDoor | null = null;
  while (node !== current) {
    const step = cameFrom.get(node);
    if (!step) return null;
    hop = step.door;
    node = step.room;
  }
  return hop;
}

/** On-screen rotation in DEGREES (clockwise, 0 = straight ahead) for an up-arrow
 *  pointing from camera (hx,hz,yaw) toward world point (tx,tz). yaw matches
 *  Controls (forward = (sin yaw, cos yaw)); screen-right = cross(forward, up), so
 *  the clockwise angle is `yaw − bearing` (verified against the live render). */
export function arrowDeg(tx: number, tz: number, hx: number, hz: number, yaw: number): number {
  const bearing = Math.atan2(tx - hx, tz - hz);
  let rel = yaw - bearing;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel)); // normalize to [-π, π]
  return (rel * 180) / Math.PI;
}
