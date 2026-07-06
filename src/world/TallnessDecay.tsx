import { useFrame } from '@react-three/fiber';
import { useScoreStore } from '../state/scoreStore';
import { useSceneStore } from '../state/sceneStore';

// The snacks wear off. Your loot-height gently settles back toward normal when
// you stop hoovering, so being "too tall" is always temporary — a way to get
// small again with no menu and no button. Mounted once in World; a no-op at
// normal height, and frozen while paused / mid-transition (time shouldn't pass).
export function TallnessDecay() {
  useFrame((_, delta) => {
    const s = useSceneStore.getState();
    if (s.paused || s.transitioning || s.divingTo) return;
    useScoreStore.getState().decayTallness(Math.min(delta, 0.05));
  });
  return null;
}
