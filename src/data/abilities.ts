// ───────────────────────────────────────────────────────────────────────────
// src/data/abilities.ts — earned VERBS (three-free, like items/quests).
//
// The RPG layer isn't only luck + loot: some movement abilities are UNLOCKED by
// exploring, then persist. Each ability is a durable progressStore.secretsFound
// id + the room you earn it in. Keeping the id here (not a string literal in two
// files) means Controls (the gate), TurtleRoom (the grant), and any future quest
// all agree on one constant.
//
// JUMP is the first: you literally LEARN TO JUMP at the Jumping Turtle (the
// site's best pun — a dead all-ages venue named the Jumping Turtle hands you the
// jump verb). Before that, Space does nothing; after, it hops, everywhere,
// forever. A capability reward for finding the deep surface venue.
// ───────────────────────────────────────────────────────────────────────────

/** Durable secretsFound id gating the Space-to-jump verb (granted in the turtle
 *  room, checked in Controls). */
export const JUMP_SECRET = 'jump-unlocked';
