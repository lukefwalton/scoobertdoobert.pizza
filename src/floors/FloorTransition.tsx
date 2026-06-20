import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { BOTTOM_FLOOR } from '../data/floors';
import { audio } from '../audio/engine';

// The rot between floors. When currentFloor changes it flashes a CRT/scanline +
// desaturate overlay that holds opaque through the swap, then reveals the new
// floor underneath — and it DEEPENS with depth (more desaturated/darker the
// closer you get to the machine room). It also drives the progressive audio
// decay: each step bends the boot loop further down. Ascending un-rots both.
export function FloorTransition() {
  const currentFloor = useSceneStore((s) => s.currentFloor);
  const prev = useRef(currentFloor);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (prev.current === currentFloor) return;
    prev.current = currentFloor;
    audio.bendToDepth(currentFloor, BOTTOM_FLOOR);
    setFlashing(true);
    const t = window.setTimeout(() => setFlashing(false), 760);
    return () => window.clearTimeout(t);
  }, [currentFloor]);

  if (!flashing) return null;
  const depth = BOTTOM_FLOOR > 0 ? currentFloor / BOTTOM_FLOOR : 0;
  return (
    <div
      className="floor-rot"
      aria-hidden="true"
      style={{ '--rot': depth.toFixed(2) } as CSSProperties}
    />
  );
}
