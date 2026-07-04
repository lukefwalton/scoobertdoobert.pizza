// A one-slot mailbox from a scripted camera move (the tube-slide ride) back to
// Controls. Controls owns yaw/pitch privately in refs; while a ride animates the
// camera, Controls is frozen (inputFrozen), so when the ride ends it posts the
// heading it left the camera at here — Controls consumes it on its next live
// frame instead of snapping back to the pre-ride heading. Module-level like
// inputFrozen: plain data, no store churn, at most one pending pose.

let pending: { yaw: number; pitch?: number } | null = null;

/** Post the heading the camera should resume with (called as a ride ends). */
export function handOffHeading(yaw: number, pitch?: number): void {
  pending = { yaw, pitch };
}

/** Take (and clear) the pending heading, if any. Controls calls this each frame. */
export function takeHeading(): { yaw: number; pitch?: number } | null {
  const p = pending;
  pending = null;
  return p;
}
