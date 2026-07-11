import { useEffect, useRef } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { exposeTestGlobal } from '../lib/testHooks';
import { whisperFor } from '../data/whispers';

// ───────────────────────────────────────────────────────────────────────────
// PerceptionWhisper — a D&D PERCEPTION check on room entry. The first time you set
// foot in a room this session, roll a d20: beat the DC and you NOTICE a room-themed
// Scoobert detail (whispers.ts, mined from lfw), surfaced as a sweet ✦ toast. Miss
// it and you simply didn't notice, one attempt per room per session, so it stays
// a discovery, not a billboard. Renders nothing; it's an effect on currentRoom.
//
// It's a PASSIVE roll, a plain d20 that never spends your luck (luck is for the
// stakes rolls: the monster, the goblin, the trap door). With ?debug you always
// notice (deterministic for the smoke). Sweet only, never dread (taste guardrail).
// ───────────────────────────────────────────────────────────────────────────

const PERCEPTION_DC = 12; // a plain d20 → ~45% you notice it on first entry

export function PerceptionWhisper() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const transitioning = useSceneStore((s) => s.transitioning);
  const checked = useRef<Set<string>>(new Set());

  const debug =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

  useEffect(() => {
    if (transitioning) return; // wait until you've actually arrived (not mid-wipe)
    if (checked.current.has(currentRoom)) return; // one attempt per room per session
    checked.current.add(currentRoom);
    const whisper = whisperFor(currentRoom);
    if (!whisper) return; // nothing to notice here

    const roll = 1 + Math.floor(Math.random() * 20);
    if (!debug && roll < PERCEPTION_DC) return; // you just didn't notice

    // A short beat so the whisper doesn't collide with the room's own arrival toast.
    const t = window.setTimeout(() => {
      announce(`✦ You notice ${whisper}`, 'info');
      exposeTestGlobal('__sdpWhisper', { room: currentRoom, text: whisper });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [currentRoom, transitioning, debug]);

  return null;
}
