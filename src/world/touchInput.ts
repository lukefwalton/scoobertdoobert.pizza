// The bridge between the on-screen touch HUD (DOM, src/components/TouchControls)
// and the first-person rig (src/world/Controls). Plain module-level refs, NOT a
// store: movement is read every frame inside useFrame, so it must never trigger
// a React re-render. The joystick writes a normalized vector each pointermove;
// Controls folds it into the same fwd/strafe it computes from WASD, so the two
// input methods coexist with zero changes to the movement math or room clamps.
//
// Cleared on world exit (reset) so a stale thumb can't leave the camera drifting.

// Normalized move vector: y = forward/back (+1 forward), x = strafe (+1 right).
// Magnitude in [0,1]; Controls multiplies by the same per-frame speed as keys.
const move = { x: 0, y: 0 };

// Jump is a rising-edge latch (like a fresh Space press): the button sets it,
// Controls consumes it once. This is what lets the touch jump feed the same
// spaceEdge / double-jump logic without holding a key down.
let jumpEdge = false;

export function setTouchMove(x: number, y: number): void {
  move.x = x;
  move.y = y;
}

export function getTouchMove(): { x: number; y: number } {
  return move;
}

/** Queue a single jump (rising edge). Consumed by `takeTouchJump()` next frame. */
export function queueTouchJump(): void {
  jumpEdge = true;
}

/** Read-and-clear the jump latch — true at most once per press. */
export function takeTouchJump(): boolean {
  if (!jumpEdge) return false;
  jumpEdge = false;
  return true;
}

/** Zero everything — called when the world unmounts so input can't leak. */
export function resetTouchInput(): void {
  move.x = 0;
  move.y = 0;
  jumpEdge = false;
}
