import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { applyVertexSnap, makeAffineTexturedMaterial, makeCheckerTexture, makeTextTexture } from './ps1';
import { D20 } from './D20';
import { DiceMonster } from './DiceMonster';
import { useMonsterStore, monsterScale } from '../state/monsterStore';
import { useDreadStore } from '../state/dreadStore';
import { useProgressStore } from '../state/progressStore';
import { DREAD } from '../data/dread';
import { cueUrl } from '../data/music';
import { audio } from '../audio/engine';
import type { Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// DicePitRoom — Phase 6. A dim felt-and-stone gambling nook off the poolrooms.
// You roll the d20 against the MONSTER: beat its roll and the REWARD IS SOUND (a
// track kicks in); lose or tie and IT GROWS (monsterStore). Lose enough and it's
// too big to move — a room-filling lump you just walk past. Reading the bout is a
// little amber sign. Losing nudges unease (the 'mobius-loop'-style poke); a first
// win records a secret so the rat clocks it back upstairs.
// ───────────────────────────────────────────────────────────────────────────

function flatMat(color: string, map?: THREE.Texture): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, map, flatShading: true, side: THREE.DoubleSide });
  applyVertexSnap(m, 64);
  return m;
}

const MONSTER_POS: [number, number, number] = [0, 0, -3.6];

export function DicePitRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const fog = { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };

  const last = useMonsterStore((s) => s.last);
  const losses = useMonsterStore((s) => s.losses);
  const wins = useMonsterStore((s) => s.wins);
  const maxed = useMonsterStore((s) => s.maxed);

  // Warm dim felt floor + stone walls — a back-room card table, not the bright pool.
  const feltTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#2a1a2e', '#34203a'); // deep purple felt
    t.repeat.set(2, 2);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(feltTex, 1, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feltTex, fog.color, fog.near, fog.far],
  );
  const wallTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#241a22', '#2c2029');
    t.repeat.set(Math.round(W / 1.5), 2);
    return t;
  }, [W]);
  const wallMat = useMemo(() => flatMat('#ffffff', wallTex), [wallTex]);
  const ceilMat = useMemo(() => flatMat('#140e16'), []);
  const tableMat = useMemo(() => flatMat('#3a2030'), []);

  // The amber bout readout — regenerated per bout / state.
  // NB: a win never shrinks it — the monster only ever bloats (one-directional;
  // the smoke asserts monotonic growth). So win copy must NOT imply a size drop.
  const signText = maxed
    ? 'IT IS TOO BIG\nTO MOVE NOW'
    : last
      ? `YOU ${last.you} — IT ${last.it}\n${last.won ? 'A HIT! — LISTEN…' : 'IT GROWS…'}`
      : 'ROLL THE BONE\nvs THE THING';
  const signTex = useMemo(
    () =>
      makeTextTexture(signText, {
        fg: maxed ? '#ff9a8a' : last && !last.won ? '#ffb38a' : '#ffce6b',
        bg: '#160a02',
        w: 256,
        h: 110,
      }),
    [signText, maxed, last],
  );
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex }), [signTex]);
  useEffect(() => () => signTex.dispose(), [signTex]);

  // Warm the reward track on entry; hand the loop back to the boot ambience on
  // leave (and clear the test hook).
  useEffect(() => {
    audio.preloadJukebox([cueUrl('diceReward')]);
    return () => {
      audio.restoreBoot();
      if (typeof window !== 'undefined') {
        (window as Window & { __sdpMonster?: unknown }).__sdpMonster = undefined;
      }
    };
  }, []);

  // Publish the monster state for the smoke (gated to the test entrances).
  useEffect(() => {
    if (typeof window !== 'undefined' && /[?&](world|debug)(=|&|$)/.test(window.location.search)) {
      (
        window as Window & {
          __sdpMonster?: { losses: number; wins: number; scale: number; maxed: boolean };
        }
      ).__sdpMonster = { losses, wins, scale: monsterScale(losses), maxed };
    }
  }, [losses, wins, maxed]);

  // A roll: resolve the bout, then reward sound on a win / unease poke on a loss.
  const onRoll = (face: number) => {
    const bout = useMonsterStore.getState().resolve(face);
    if (bout.won) {
      void audio.playJukeboxTrack(cueUrl('diceReward'));
      useProgressStore.getState().findSecret('dice-monster'); // the rat clocks it
    } else {
      const d = DREAD.triggers['mobius-loop'] ?? 0.12; // reuse a gentle poke
      const ds = useDreadStore.getState();
      ds.setUnease(Math.min(1, ds.unease + d * 0.6));
    }
  };

  return (
    <group>
      {/* low warm fill — a felt-lit nook; a hot pool over the table */}
      <ambientLight intensity={0.4} color="#caa6c0" />
      <pointLight position={[0, H - 0.6, 1]} intensity={0.7} distance={12} color="#ffd9a8" />

      {/* floor / ceiling */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      <mesh material={ceilMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>

      {/* walls */}
      <mesh material={wallMat} rotation-y={Math.PI / 2} position={[-W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={-Math.PI / 2} position={[W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={Math.PI} position={[0, H / 2, D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>

      {/* the card table you roll on */}
      <mesh material={tableMat} position={[0, 0.75, 0.4]}>
        <cylinderGeometry args={[1.3, 1.3, 0.18, 16]} />
      </mesh>
      <mesh material={tableMat} position={[0, 0.37, 0.4]}>
        <cylinderGeometry args={[0.2, 0.3, 0.75, 8]} />
      </mesh>

      {/* the bone — click to roll against the thing (sits on the table) */}
      <D20 position={[0, 1.0, 0.4]} onRoll={onRoll} lastRoll={last?.you ?? null} />

      {/* the monster, across the table */}
      <DiceMonster position={MONSTER_POS} />

      {/* the amber bout sign on the back wall, above the thing */}
      <mesh material={signMat} position={[0, 2.6, -D + 0.08]}>
        <planeGeometry args={[2.4, 1.05]} />
      </mesh>
    </group>
  );
}
