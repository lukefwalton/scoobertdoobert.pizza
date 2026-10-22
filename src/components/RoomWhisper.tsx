import { useEffect, useRef } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { exposeTestGlobal } from '../lib/testHooks';
import { whisperFor } from '../data/whispers';

// ───────────────────────────────────────────────────────────────────────────
// RoomWhisper — the first time you set foot in a room this session, you NOTICE a
// room-themed Scoobert detail (whispers.ts, mined from lfw), surfaced as a sweet
// ✦ toast. Once per room per session, so it stays a discovery, not a billboard.
// Renders nothing; it's an effect on currentRoom.
//
// (2026-10, the complexity cut: this used to be a d20 "Perception check" against
// DC 12 — a hidden roll that only decided whether you saw the line at all, which
// read as nothing. The lore always shows now.) Sweet only, never dread (taste
// guardrail).
// ───────────────────────────────────────────────────────────────────────────

export function RoomWhisper() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const transitioning = useSceneStore((s) => s.transitioning);
  const noticed = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (transitioning) return; // wait until you've actually arrived (not mid-wipe)
    const whisper = whisperFor(currentRoom);
    // The test hook mirrors the CURRENT room — its whisper, or nothing to notice —
    // so a ?debug read can't see a previous room's line linger (test-hook convention).
    exposeTestGlobal('__sdpWhisper', whisper ? { room: currentRoom, text: whisper } : undefined);
    if (!whisper) return; // nothing to notice here
    if (noticed.current.has(currentRoom)) return; // once per room per session
    noticed.current.add(currentRoom);

    // Passive chatter: queued behind the room's own arrival toast (a song unlock,
    // a first-entry reward) — no hand-tuned stagger needed.
    announce(`✦ You notice ${whisper}`, 'info', { queue: true });
  }, [currentRoom, transitioning]);

  // Leaving the world: no room, so no whisper to read.
  useEffect(() => () => exposeTestGlobal('__sdpWhisper', undefined), []);

  return null;
}
