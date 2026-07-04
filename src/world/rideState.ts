// Is a scripted ride (the botanical garden's tube slide) currently driving the
// camera? Module-level flag, same grammar as inputFrozen: the ride animates the
// camera itself, so all normal world input (move/look, door E, pickups) freezes
// for the duration. Not a store — nothing re-renders off it; it's read per frame.

let riding = false;

export function setRiding(v: boolean): void {
  riding = v;
}

export function isRiding(): boolean {
  return riding;
}
