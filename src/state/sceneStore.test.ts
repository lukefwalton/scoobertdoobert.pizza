import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore, nextIntroStage, introRevealed, type IntroStage } from './sceneStore';

// The entry cadence's state machine (welcome → teach → reveal → settled) is now a
// DISTRIBUTED handoff — WelcomeOverlay, ControlHint and WorldHud each advance one
// beat — so the ordering and the only-from-the-named-stage guard get a cheap
// logic-level test beside the end-to-end shoot:intro smoke.
const ORDER: IntroStage[] = ['welcome', 'teach', 'reveal', 'settled'];

describe('entry cadence (introStage)', () => {
  beforeEach(() => {
    useSceneStore.setState({ introStage: 'settled', worldActive: false });
  });

  it('nextIntroStage walks the beats in order and parks at settled', () => {
    expect(nextIntroStage('welcome')).toBe('teach');
    expect(nextIntroStage('teach')).toBe('reveal');
    expect(nextIntroStage('reveal')).toBe('settled');
    expect(nextIntroStage('settled')).toBe('settled');
  });

  it('introRevealed is true only from the reveal beat on', () => {
    expect(ORDER.map(introRevealed)).toEqual([false, false, true, true]);
  });

  it('defaults to settled, so nothing outside the world is ever gated', () => {
    expect(useSceneStore.getState().introStage).toBe('settled');
  });

  it('enterWorld rewinds the cadence to welcome', () => {
    useSceneStore.getState().enterWorld();
    expect(useSceneStore.getState().introStage).toBe('welcome');
    expect(useSceneStore.getState().worldActive).toBe(true);
  });

  it('advanceIntro steps forward only from the named stage (idempotent, never backwards)', () => {
    const { enterWorld, advanceIntro } = useSceneStore.getState();
    enterWorld();
    advanceIntro('welcome');
    expect(useSceneStore.getState().introStage).toBe('teach');
    // A late/duplicate call from the beat that already handed off is a no-op…
    advanceIntro('welcome');
    expect(useSceneStore.getState().introStage).toBe('teach');
    // …and a beat can't skip ahead of the one currently owning the cadence.
    advanceIntro('reveal');
    expect(useSceneStore.getState().introStage).toBe('teach');
    advanceIntro('teach');
    advanceIntro('reveal');
    expect(useSceneStore.getState().introStage).toBe('settled');
    advanceIntro('settled');
    expect(useSceneStore.getState().introStage).toBe('settled');
  });

  it('a fresh enterWorld restarts the cadence after it settled', () => {
    const s = useSceneStore.getState();
    s.enterWorld();
    s.advanceIntro('welcome');
    s.advanceIntro('teach');
    s.advanceIntro('reveal');
    expect(useSceneStore.getState().introStage).toBe('settled');
    s.enterWorld('shrine');
    expect(useSceneStore.getState().introStage).toBe('welcome');
  });
});
