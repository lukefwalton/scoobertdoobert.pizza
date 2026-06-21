import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { flatMat, makeTextTexture } from './ps1';
import { exposeTestGlobal } from '../lib/testHooks';
import { D20 } from './D20';
import { DiceMonster } from './DiceMonster';
import { useMonsterStore } from '../state/monsterStore';
import { useProgressStore } from '../state/progressStore';
import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { CRIT_MULT, type Crit } from '../lib/luck';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GrassBattleRoom — the wild-goblin encounter (the Pokémon beat). You arrive here
// via the screen-to-black room fade after the grass rustles. Reuses the dice
// monster + d20 roll-off WHOLESALE (shared monsterStore — it's the one goblin,
// bigger every time it wins), with grass-specific outcomes: WIN opens the grove
// (Luke: "winning gives you a new room"); LOSE/flee drops you back in the field
// with no penalty (taste guardrail — losing never hard-fails).
// ───────────────────────────────────────────────────────────────────────────

const MONSTER_POS: [number, number, number] = [0, 0.2, -3.4];

export function GrassBattleRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const last = useMonsterStore((s) => s.last);
  const resolved = useRef(false); // one outcome per encounter
  const timers = useRef<number[]>([]); // reward chord + the exit transition

  const groundMat = useMemo(() => flatMat('#6f8a45'), []); // trampled grass
  const ringMat = useMemo(() => flatMat('#566f34'), []);
  const signTex = useMemo(
    () =>
      makeTextTexture('A WILD GOBLIN\nAPPEARED!', { fg: '#fff0c0', bg: '#241600', w: 256, h: 110 }),
    [],
  );
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex }), [signTex]);
  useEffect(
    () => () => {
      signTex.dispose();
      groundMat.dispose();
      ringMat.dispose();
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    },
    [signTex, groundMat, ringMat],
  );

  const onRoll = (face: number, crit: Crit) => {
    if (resolved.current) return;
    const bout = useMonsterStore.getState().resolve(face, crit);
    resolved.current = true;
    if (bout.won) {
      // a rising reward chord (the reward is sound)
      ['D', 'F#', 'A'].forEach((n, i) =>
        timers.current.push(
          window.setTimeout(() => audio.playChime(noteToFreq(n, 5), 0, 0.16), i * 110),
        ),
      );
      useProgressStore.getState().findSecret('grass-cleared'); // the new room is earned
      if (crit === 'nat20') {
        useProgressStore.getState().gainLuck(CRIT_MULT);
        announce('NAT 20! ✦ the goblin bows · +3 luck · a path opens', 'crit-good');
      } else {
        announce('the goblin yields — a path opens in the grass', 'info');
      }
      timers.current.push(
        window.setTimeout(() => useSceneStore.getState().goToRoom('grove', 'default'), 1200),
      );
    } else {
      announce(
        crit === 'nat1' ? 'CRIT FAIL ☠ the goblin cackles and bolts…' : 'the goblin skitters off…',
        crit === 'nat1' ? 'crit-bad' : 'info',
      );
      timers.current.push(
        window.setTimeout(
          () => useSceneStore.getState().goToRoom('grassfield', 'fromBattle'),
          1200,
        ),
      );
    }
  };

  // Smoke hook: force a roll outcome deterministically (clicking a tumbling 3D die
  // through Playwright is fragile).
  useEffect(() => {
    exposeTestGlobal('__sdpBattleRoll', (face: number, crit: Crit) => onRoll(face, crit));
    return () => exposeTestGlobal('__sdpBattleRoll', undefined);
  }, []);

  return (
    <group>
      <ambientLight intensity={0.7} color="#ffe6bf" />
      <directionalLight position={[4, 9, 4]} intensity={0.8} color="#ffd79a" />

      {/* the trampled clearing where the grass gave way */}
      <mesh material={groundMat} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 6, D * 2 + 6]} />
      </mesh>
      <mesh material={ringMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3.4]}>
        <circleGeometry args={[2.4, 20]} />
      </mesh>

      {/* the bone — click to roll against the wild goblin */}
      <D20 position={[0, 1.0, 2.4]} onRoll={onRoll} lastRoll={last?.you ?? null} />
      {/* the goblin, across the clearing */}
      <DiceMonster position={MONSTER_POS} />
      {/* the wild-encounter banner */}
      <mesh material={signMat} position={[0, 2.8, -D + 0.3]}>
        <planeGeometry args={[2.6, 1.12]} />
      </mesh>
    </group>
  );
}
