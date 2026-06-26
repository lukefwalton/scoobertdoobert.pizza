import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture, makeTextTexture } from './ps1';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';
import { JUKEBOX_POS, fogFor, type Room } from '../data/rooms';
import { visibleJukeboxTracks, jukeboxTrackUrl } from '../data/jukebox';
import { loopIndexForUrl } from '../data/music';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { type Crit } from '../lib/luck';
import { announce } from '../state/toastStore';
import { useMusicStore } from '../state/musicStore';
import { useProgressStore } from '../state/progressStore';
import { D20 } from './D20';
import { ArcadeCabinet } from './ArcadeCabinet';

// The jukebox room — the music payoff at the end of the hall. Warm, dim, a
// little womb-like. The jukebox plays Scoobert's OWN catalog, "kinda fucked up"
// (tape-warbled, 8-bit loops in /audio/jukebox/), in place of the ambient boot
// loop: a track auto-selects on entry, clicking the cabinet cycles to the next,
// and the now-playing title shows on the amber readout. The engine localizes
// whatever's playing to the cabinet (JukeboxAudio's proximity duck), so the
// selected song swells as you cross to it and fades as you walk off. Leaving
// the room hands the loop voice back to the boot loop (restoreBoot).
// Drives the engine's spatial duck from camera distance to the jukebox.
function JukeboxAudio() {
  const { camera } = useThree();
  useEffect(() => {
    // Entering is a good moment to make sure the loop is actually running.
    audio.unlock();
    return () => audio.setProximityGain(1); // restore full volume on leaving
  }, []);
  useFrame(() => {
    const dx = camera.position.x - JUKEBOX_POS[0];
    const dz = camera.position.z - JUKEBOX_POS[2];
    const dist = Math.hypot(dx, dz);
    const NEAR = 2.2;
    const FAR = 10;
    const FLOOR = 0.16; // how quiet it gets across the room
    const t = Math.max(0, Math.min(1, (dist - NEAR) / (FAR - NEAR)));
    audio.setProximityGain(1 - (1 - FLOOR) * t);
  });
  return null;
}

function Jukebox({ title, onSelect }: { title: string; onSelect: () => void }) {
  const { gl } = useThree();
  const bodyMat = useMemo(() => flatMat('#3a1c2a'), []); // dark plum cabinet
  const trimMat = useMemo(() => flatMat('#c0843a'), []); // brass trim
  const glowMat = useMemo(() => flatMat('#ff7bd5'), []); // glowing arch (hot pink)
  // Amber VFD readout: dark glass, glowing amber text, regenerated per selection.
  const screenTex = useMemo(
    () => makeTextTexture(`NOW PLAYING\n${title}`, { fg: '#ffce6b', bg: '#160a02', w: 256, h: 96 }),
    [title],
  );
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ map: screenTex }), [screenTex]);
  useEffect(() => () => screenTex.dispose(), [screenTex]);
  const grilleTex = useMemo(() => {
    const t = makeCheckerTexture(10, '#1c0f16', '#2c1622');
    t.repeat.set(2, 2);
    return t;
  }, []);
  const grilleMat = useMemo(() => flatMat('#ffffff', { map: grilleTex }), [grilleTex]);
  const signTex = useMemo(
    () => makeTextTexture('WHAT DO YOU\nWANT TO HEAR?', { fg: '#ffe9c2', w: 256, h: 128 }),
    [],
  );
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, transparent: true }),
    [signTex],
  );

  const pulse = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (pulse.current)
      pulse.current.intensity = 0.9 + Math.sin(state.clock.elapsedTime * 2.1) * 0.28;
  });

  // Restore the world's resting cursor if we unmount while hovered.
  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  // Centered on JUKEBOX_POS, facing +Z (toward the player entering from +Z). The
  // whole cabinet is the control: click it to cycle to the next track.
  return (
    <group
      position={JUKEBOX_POS}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      {/* glow pool from the jukebox */}
      <pointLight
        ref={pulse}
        position={[0, 1.4, 1.4]}
        intensity={0.9}
        distance={11}
        color="#ff9ad6"
      />

      {/* cabinet */}
      <mesh material={bodyMat} position={[0, 0.2, 0]}>
        <boxGeometry args={[2.6, 3.4, 1.1]} />
      </mesh>
      {/* arched glowing crown */}
      <mesh material={glowMat} position={[0, 2.05, 0.2]}>
        <cylinderGeometry args={[1.35, 1.35, 0.7, 16, 1, false, 0, Math.PI]} />
      </mesh>
      {/* brass trim band */}
      <mesh material={trimMat} position={[0, 1.1, 0.56]}>
        <boxGeometry args={[2.4, 0.18, 0.12]} />
      </mesh>
      {/* amber display / now-playing window */}
      <mesh material={screenMat} position={[0, 1.5, 0.57]}>
        <planeGeometry args={[1.9, 0.7]} />
      </mesh>
      {/* speaker grille */}
      <mesh material={grilleMat} position={[0, 0.35, 0.57]}>
        <planeGeometry args={[2.0, 1.2]} />
      </mesh>
      {/* glowing select buttons */}
      {[-0.7, -0.23, 0.24, 0.71].map((x) => (
        <mesh key={x} material={glowMat} position={[x, -0.55, 0.57]}>
          <boxGeometry args={[0.26, 0.26, 0.08]} />
        </mesh>
      ))}
      {/* the MTV-M2 question, hovering above */}
      <mesh material={signMat} position={[0, 3.15, 0.3]}>
        <planeGeometry args={[3.0, 1.5]} />
      </mesh>
    </group>
  );
}

// The d20's crits land an OUTCOME, the music way (DESIGN: "I rolled a 1 and got
// the cursed one"). nat 20 = the pristine pressing — a bright ascending sparkle;
// nat 1 = the cursed pressing — a low, detuned "bad-luck" womp. Goofy-uncanny but
// sweet (the jukebox stays a safe room — taste guardrail), and juicy SOUND either
// way ("dice are juicy sound too"). Both one-shots are mute-aware + brickwall-limited.
function playCritFlavor(crit: Crit) {
  if (crit === 'nat20') {
    announce('🎲 NAT 20 — the pristine pressing!', 'crit-good');
    ['E', 'G', 'B', 'E'].forEach((n, k) =>
      window.setTimeout(
        () => audio.playChime(noteToFreq(n, k === 3 ? 6 : 5), 0.15, 0.1, 0.6),
        k * 80,
      ),
    );
  } else if (crit === 'nat1') {
    announce('🎲 CRIT FAIL — you got the cursed pressing…', 'crit-bad');
    audio.playTone(noteToFreq('C', 3), 240, 0.1);
    window.setTimeout(() => audio.playTone(noteToFreq('G', 2), 360, 0.1), 150);
  }
}

export function JukeboxRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // The tracks this cabinet shows: the seed catalog + whatever SONG-ROOMS the
  // player has discovered ("hidden until found"). Room-songs you haven't wandered
  // into yet simply aren't on the dial. Recomputed if a new song is unlocked
  // (the room remounts on re-entry, so this is usually a fresh read anyway).
  const discovered = useProgressStore((s) => s.discoveredSongs);
  const tracks = useMemo(() => visibleJukeboxTracks(discovered), [discovered]);

  // Which visible track the jukebox is on. Clicking the cabinet advances it in
  // order; rolling the d20 jumps to whatever the dice picks (the chaos path).
  const [index, setIndex] = useState(0);
  const [roll, setRoll] = useState<number | null>(null);
  const track = tracks[Math.min(index, tracks.length - 1)];
  const cycle = () => {
    audio.playChime(noteToFreq('E', 5), 0.25, 0.09, 0.5); // a little bell on track change
    setIndex((i) => (i + 1) % tracks.length);
  };
  // A d20 face (1..20) maps onto the VISIBLE tracks by modulo, so every unlocked
  // track is reachable and the rolled number still reads as a real D&D roll.
  // Rolling the bone is also the UPGRADE: it unlocks the flip-through radio
  // (durable) and makes the rolled track your STATION, so it follows you out of
  // the room (setPreferred records the pick without re-playing; restorePreferred
  // hands it back on exit instead of the boot loop). We map the chosen track to
  // its STABLE LOOP_OPTIONS index by slug, so filtering the dial never desyncs the
  // engine's loop-voice indices.
  const rollTo = (face: number, crit: Crit) => {
    setRoll(face);
    const i = (face - 1) % tracks.length;
    setIndex(i);
    useProgressStore.getState().unlockRadio();
    useMusicStore.getState().setPreferred(loopIndexForUrl(jukeboxTrackUrl(tracks[i].slug)));
    playCritFlavor(crit); // nat 20 → pristine, nat 1 → cursed (the gamble payoff)
    exposeTestGlobal('__sdpDice', face);
    exposeTestGlobal('__sdpDiceCrit', crit);
  };

  // ?debug-only ACTION hook: force a specific d20 face (+ its crit) so a smoke can
  // drive the nat 20 / nat 1 payoffs deterministically (the real die is random).
  // Stricter gate (isDebugEntrance), like __sdpGoToRoom / the force-lose hooks.
  useEffect(() => {
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpRollDice', (face: number) => {
      // Untrusted entry point: a real d20 face is an integer 1..20. Reject anything
      // else so a malformed debug call can't index an impossible track (e.g.
      // tracks[-1].slug throws) or unlock/mutate music state off a junk "roll".
      if (!Number.isInteger(face) || face < 1 || face > 20) return;
      rollTo(face, face === 20 ? 'nat20' : face === 1 ? 'nat1' : null);
    });
    return () => exposeTestGlobal('__sdpRollDice', undefined);
    // mount-once: rollTo closes over the room-stable `tracks` + stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Entering: warm the whole catalog so cycling is instant. Leaving: hand the
  // loop voice back to the ambient boot loop and clear the test selection global
  // (so a later smoke can't read a stale "still on this track" after exit).
  // __sdpDice is cleared on BOTH enter and exit so it always means "the roll
  // from THIS visit" (edge-triggered), never a sticky last-roll-since-page-load.
  useEffect(() => {
    audio.preloadJukebox(tracks.map((t) => jukeboxTrackUrl(t.slug)));
    exposeTestGlobal('__sdpDice', undefined);
    exposeTestGlobal('__sdpDiceCrit', undefined);
    // The dial the player can actually see this visit (seed + discovered) — for the
    // discovery smoke to assert "hidden until found".
    exposeTestGlobal(
      '__sdpJukeboxVisible',
      tracks.map((t) => t.slug),
    );
    return () => {
      // Leaving the cabinet hands the loop voice back to the user's chosen track
      // (the switcher), not unconditionally to boot.
      useMusicStore.getState().restorePreferred();
      exposeTestGlobal('__sdpJukebox', undefined);
      exposeTestGlobal('__sdpJukeboxVisible', undefined);
      exposeTestGlobal('__sdpDice', undefined);
      exposeTestGlobal('__sdpDiceCrit', undefined);
    };
    // mount-once: preload the visible catalog + manage the test globals for this
    // visit. `tracks` is stable for the room's lifetime (re-entry remounts).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play the selected track — runs on entry (index 0) and on every cycle.
  useEffect(() => {
    void audio.playJukeboxTrack(jukeboxTrackUrl(track.slug));
    // Expose the selection for the rooms smoke (auto-play + click-to-cycle),
    // gated to the test entrances so it isn't part of the normal global surface.
    exposeTestGlobal('__sdpJukebox', { index, slug: track.slug });
  }, [index, track.slug]);

  const carpetTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#3a0f24', '#511633'); // deep magenta carpet
    t.repeat.set(3, 3);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(carpetTex, 3, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carpetTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#241026', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#160a18'), []);

  return (
    <group>
      {/* warm low fill so the cabinet glow does most of the work */}
      <ambientLight intensity={0.34} color="#c98fb6" />

      {/* the box shell */}
      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      <Jukebox title={track.title} onSelect={cycle} />
      {/* a procedural arcade cabinet humming in the corner of the music shrine */}
      <ArcadeCabinet
        position={[-3.6, 0, -4.4]}
        rotationY={0.7}
        tint="#b8348f"
        marquee="PIZZA RUN"
      />
      {/* The dice-music selector: roll for a random track. Off to the side of
          the cabinet, on the player's path in from the door. */}
      {/* the music selector is a LOW-STAKES roll — a "high" face means nothing
          here, so it never spends luck (useLuck={false}); chaos stays the point */}
      <D20 position={[2.7, 1.0, -3.4]} onRoll={rollTo} lastRoll={roll} useLuck={false} />
      <JukeboxAudio />
    </group>
  );
}
