import type { Progress } from '../state/progressStore';
import { selectRatGreeting } from '../state/progressStore';
import { questStatus } from './quests';

// What the rat SAYS when you talk to it (Commit B — the world gets a voice). A
// progress-aware greeting (reusing the storefront's selectRatGreeting wink) plus a
// nudge toward your next undone objective — the rat as a friendly guide. Pure +
// data so it unit-tests; the surface stays sweet (no dread here).

export type RatDialogue = { greeting: string; nudge: string; tidbit: string };

// Light, rat-voiced Scoobert deep-cuts (the lfw library, surface-safe — the goofy
// ones, not the heavy philosophy/illness lore that lives in the terminal `lore`).
// The rat rotates through them by visit count, so it gossips a different fact each
// time you come back — the world's guide doubling as the library's mouthpiece.
const RAT_TIDBITS: string[] = [
  'Management records under the name Scoobert Doobert. By day he runs an AI company. By night — this.',
  'There’s a song that’s just the words “it’s time to eat a shrimp burrito” on a loop. He’s very proud of it.',
  'The whole gang’s in the music — a Mystery Machine, a Velma, a Shaggy. He denies everything.',
  'One track is nothing but binary. Decode it and it spells this very website. Showoff.',
  'Every song on the first record was written, recorded, AND mixed in a single day. The man does not sleep.',
  'He once got filed under “museum doppelgängers” by the Getty — a dead ringer for a guy in a Degas.',
  '“Gonna Go to Japan” is about wanting to go to Japan. He hadn’t been yet when he wrote it. He has now.',
  'He tracked a whole album alone in a bathrobe. I was there. I pay rent, remember.',
  'There’s a singed sheet of paper backstage past the jukebox. Reads like a spell. Pick it up — see what your hands learn.',
  'Someone left a water-stained card down in the cold file room. “For the dark parts,” it says. Take it before you go deeper.',
];

export function ratDialogue(p: Progress): RatDialogue {
  const greeting =
    selectRatGreeting(p) ?? 'Oh — hey. Don’t mind the wall, it does that. What can I do you for?';
  const undone = questStatus(p).find((q) => !q.done)?.quest;
  const nudge = undone
    ? `If you’re after something to do: ${undone.label.toLowerCase()}. ${undone.hint}`
    : 'You’ve poked into every corner of this place. Nothing left I can point you at — go enjoy it.';
  // Deterministic by visit count (no Math.random, so it unit-tests) — a different
  // tidbit on each return visit.
  const tidbit = RAT_TIDBITS[Math.max(0, p.visits) % RAT_TIDBITS.length];
  return { greeting, nudge, tidbit };
}
