import { describe, it, expect } from 'vitest';
import { ROOM_WHISPERS, whisperFor } from './whispers';
import { ROOMS } from './rooms';

describe('room whispers', () => {
  it('every whisper targets a real room and reads cleanly', () => {
    const ids = new Set(ROOMS.map((r) => r.id));
    for (const [roomId, text] of Object.entries(ROOM_WHISPERS)) {
      expect(ids.has(roomId), `whisper for unknown room "${roomId}"`).toBe(true);
      expect(text.length).toBeGreaterThan(0);
      expect(text.length, `whisper for "${roomId}" too long`).toBeLessThanOrEqual(200);
    }
  });

  it('whisperFor returns the line for a mapped room and undefined otherwise', () => {
    expect(whisperFor('california')).toBe(ROOM_WHISPERS['california']);
    expect(whisperFor('shop')).toBeUndefined(); // the safe spawn has nothing to notice
    expect(whisperFor('no-such-room')).toBeUndefined();
  });

  it('the safe spawn + arcade arenas stay quiet (no whisper pulls focus there)', () => {
    for (const quiet of ['shop', 'grassbattle']) expect(whisperFor(quiet)).toBeUndefined();
  });
});
