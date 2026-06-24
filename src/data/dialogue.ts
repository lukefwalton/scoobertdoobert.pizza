import type { Progress } from '../state/progressStore';
import { selectRatGreeting } from '../state/progressStore';
import { questStatus } from './quests';

// What the rat SAYS when you talk to it (Commit B — the world gets a voice). A
// progress-aware greeting (reusing the storefront's selectRatGreeting wink) plus a
// nudge toward your next undone objective — the rat as a friendly guide. Pure +
// data so it unit-tests; the surface stays sweet (no dread here).

export type RatDialogue = { greeting: string; nudge: string };

export function ratDialogue(p: Progress): RatDialogue {
  const greeting =
    selectRatGreeting(p) ?? 'Oh — hey. Don’t mind the wall, it does that. What can I do you for?';
  const undone = questStatus(p).find((q) => !q.done)?.quest;
  const nudge = undone
    ? `If you’re after something to do: ${undone.label.toLowerCase()}. ${undone.hint}`
    : 'You’ve poked into every corner of this place. Nothing left I can point you at — go enjoy it.';
  return { greeting, nudge };
}
