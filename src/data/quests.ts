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
import { CASSETTE_IDS } from './items';

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
  /** A BONUS objective: it shows in the To-Do list (and gets its ✓ + toast), but it
   *  does NOT count toward completionPct / allQuestsDone — so the ★100% finale bar
   *  stays on the always-reachable objectives, and an optional side-thread (the 1101
   *  ARG — pure share-fuel, off the main path) never gates the capstone. It's also
   *  skipped by the objective compass / rat nudge (those track the main path). */
  bonus?: boolean;
};

export const QUESTS: Quest[] = [
  {
    id: 'enter-world',
    label: 'Step inside the shop',
    hint: 'Install the Calzone Player and go through the front door.',
    done: (p) => p.everEnteredWorld,
  },
  {
    id: 'learn-jump',
    label: 'Learn to jump',
    hint: 'A glowing skill orb floats in the shop — walk into it to learn the hop.',
    room: 'shop',
    done: (p) => p.secretsFound.includes('jump-unlocked'),
  },
  {
    id: 'earn-luck',
    label: 'Pay your respects',
    hint: 'Find the wayside shrine and clap twice at the offering box.',
    room: 'shrine',
    // Keys off the shrine clap specifically (set in ShrineRoom.doClap), NOT any
    // luck — so the ✓ can't tick from a tape/dance you found elsewhere. A legacy
    // save that clapped before this secret existed self-heals by re-clapping once
    // (trivially replayable); a luckEarned/radioUnlocked backfill is deliberately
    // NOT done — it would re-introduce the very false-positive this fixes.
    done: (p) => p.secretsFound.includes('shrine-clap'),
  },
  {
    id: 'draw-fortune',
    label: 'Draw your fortune',
    hint: 'Beside the offering box at the shrine — shake the おみくじ box for a paper fortune.',
    room: 'shrine',
    // A BONUS side-ritual (like the ARG): it shows in the To-Do list with its own ✓ +
    // toast, giving luck a legible OBJECTIVE, but it stays off the ★100% finale bar so
    // the always-reachable capstone set is unchanged. Keyed off the draw secret, so any
    // single fortune completes it (always solvable — the friction budget holds).
    bonus: true,
    done: (p) => p.secretsFound.includes('omikuji-drawn'),
  },
  {
    id: 'unlock-radio',
    label: 'Tune the radio',
    hint: 'Roll the bone at the jukebox to unlock the flip-through radio.',
    room: 'jukebox',
    // Keys off the jukebox d20 roll specifically (set in JukeboxRoom.rollTo), NOT
    // radioUnlocked — which a tape pickup also sets, so pocketing a cassette used
    // to falsely complete this. (unlockRadio() stays the real upgrade flag.)
    done: (p) => p.secretsFound.includes('jukebox-roll'),
  },
  {
    id: 'ride-slide',
    label: 'Ride the tube slide',
    hint: 'Through the hedges off the park path — walk right into the green mouth.',
    room: 'garden',
    done: (p) => p.secretsFound.includes('garden-slide'),
  },
  {
    id: 'play-turtle',
    label: 'Play the Turtle one more time',
    hint: 'The old venue off North Park — step up to the mic where the stage was.',
    room: 'turtle',
    done: (p) => p.secretsFound.includes('turtle-stage'),
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
    id: 'collect-tapes',
    label: 'Find the lost cassettes',
    // Count derived from CASSETTE_IDS so it never drifts when a `track` item is
    // added (the Basement Sessions master tapes grew this from 4 to 7).
    hint: `${CASSETTE_IDS.length} tapes hide around the place — pocket each to hear it and tune the radio.`,
    done: (p) => CASSETTE_IDS.every((id) => p.itemsHeld.includes(id)),
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
  {
    id: 'saved-san-diego',
    label: 'Save San Diego',
    hint: 'Play the 1101 cartridge’s little text adventure — all the way to the end.',
    // A BONUS thread: the one piece of real branching narrative (the 1101 ARG). It's
    // optional share-fuel off the main path, so it never gates the ★100% finale.
    bonus: true,
    done: (p) => p.secretsFound.includes('saved-san-diego'),
  },
];

// The SCORED objectives (everything that isn't a bonus) — completion % and the
// finale gate count only these, so an optional side-thread can't move the ★100% bar.
const SCORED_QUESTS = QUESTS.filter((q) => !q.bonus);

export type QuestStatus = { quest: Quest; done: boolean };

/** Every quest paired with whether it's done, in list order. */
export function questStatus(p: Progress): QuestStatus[] {
  return QUESTS.map((quest) => ({ quest, done: quest.done(p) }));
}

/** How many SCORED quests are complete (for the "n / total" readout). Bonus
 *  objectives are excluded so they never move the completion bar. */
export function questsDone(p: Progress): number {
  return SCORED_QUESTS.reduce((n, q) => n + (q.done(p) ? 1 : 0), 0);
}

/** Completion percent across the SCORED objectives (0..100) — the pause-menu badge. */
export function completionPct(p: Progress): number {
  return Math.round((questsDone(p) / SCORED_QUESTS.length) * 100);
}

/** Has the player finished every SCORED objective? Triggers the finale (the win
 *  arc). Bonus objectives (the ARG) are NOT required. */
export function allQuestsDone(p: Progress): boolean {
  return questsDone(p) === SCORED_QUESTS.length;
}

/** Is the always-on objective chip actually on screen? The HUD toggle is on, it
 *  isn't hidden (pause / dialog / room wipe), and there's still an undone
 *  objective. The SINGLE source of truth shared by ObjectiveHud (its render gate)
 *  and WorldHud (which drops the announce toast below the chip only when it's truly
 *  showing) — so the two can never drift. */
export function objectiveChipVisible(p: Progress, opts: { on: boolean; hidden: boolean }): boolean {
  // Only the main path drives the compass — a lingering BONUS objective (the ARG)
  // must not keep the chip up after the ★100% finale.
  return opts.on && !opts.hidden && questStatus(p).some((q) => !q.done && !q.quest.bonus);
}
