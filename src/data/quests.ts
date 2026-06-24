// ───────────────────────────────────────────────────────────────────────────
// src/data/quests.ts — the to-do list (three-free, like items.ts).
//
// A quest is a tiny derived objective: a label, a one-line hint, and a `done(p)`
// predicate read straight off the durable progressStore. NO new state — quests
// are a *view* of progress you've already made, so the pause-menu "To-Do" list
// can never desync from what you've actually done. Adding one is a one-liner.
//
// Pillar: Clear Objectives (direction without hand-holding) + Feedback (the list
// ticks as you play). Order roughly mirrors the descent so the list reads as a
// gentle path, surface → deep.
// ───────────────────────────────────────────────────────────────────────────

import type { Progress } from '../state/progressStore';

export type Quest = {
  /** Stable id (for keys + the announce-on-complete diff). */
  id: string;
  /** Pause-menu line, sweet storefront voice. */
  label: string;
  /** One-line nudge toward it — never a spoiler walkthrough. */
  hint: string;
  /** Room id where you'd accomplish it — the objective compass points here.
   *  Omitted for objectives with no single place (e.g. "step inside"). */
  room?: string;
  /** Done purely from durable progress (no quest-specific state). */
  done: (p: Progress) => boolean;
};

export const QUESTS: Quest[] = [
  {
    id: 'enter-world',
    label: 'Step inside the shop',
    hint: 'Install the Calzone Player and go through the front door.',
    done: (p) => p.everEnteredWorld,
  },
  {
    id: 'earn-luck',
    label: 'Pay your respects',
    hint: 'Find the wayside shrine and clap twice at the offering box.',
    room: 'shrine',
    done: (p) => p.luckEarned > 0,
  },
  {
    id: 'unlock-radio',
    label: 'Tune the radio',
    hint: 'Roll the bone at the jukebox to unlock the flip-through radio.',
    room: 'jukebox',
    done: (p) => p.radioUnlocked,
  },
  {
    id: 'find-locker-key',
    label: 'Pocket the rusted key',
    hint: 'It rests on the poolrooms deck — then find the door it opens.',
    room: 'poolrooms',
    done: (p) => p.itemsHeld.includes('pool-locker-key'),
  },
  {
    id: 'find-closet-key',
    label: 'Pocket the brass key',
    hint: 'It’s on the back-hall floor — it opens the SUPPLY closet nearby.',
    room: 'hallway',
    done: (p) => p.itemsHeld.includes('hall-closet-key'),
  },
  {
    id: 'beat-dice',
    label: 'Beat the thing at dice',
    hint: 'Duck into the back room off the pool and roll the bone against it.',
    room: 'dicepit',
    done: (p) => p.secretsFound.includes('dice-monster'),
  },
  {
    id: 'clear-goblin',
    label: 'See off the grass goblin',
    hint: 'Wander the tall grass off the shrine until something leaps out.',
    room: 'grassfield',
    done: (p) => p.secretsFound.includes('grass-cleared'),
  },
  {
    id: 'dance-with-entity',
    label: 'Dance with a wanderer',
    hint: 'Down in the deep levels, get close to a wandering thing and press E.',
    room: 'liminal',
    done: (p) => p.secretsFound.some((s) => s.startsWith('danced:')),
  },
  {
    id: 'reach-terminus',
    label: 'Ride to the end of the line',
    hint: 'Follow the shrine’s tracks down, then to where they finally stop.',
    room: 'terminus',
    done: (p) => p.visitedRooms.includes('terminus'),
  },
];

export type QuestStatus = { quest: Quest; done: boolean };

/** Every quest paired with whether it's done, in list order. */
export function questStatus(p: Progress): QuestStatus[] {
  return QUESTS.map((quest) => ({ quest, done: quest.done(p) }));
}

/** How many quests are complete (for the "n / total" readout). */
export function questsDone(p: Progress): number {
  return QUESTS.reduce((n, q) => n + (q.done(p) ? 1 : 0), 0);
}
