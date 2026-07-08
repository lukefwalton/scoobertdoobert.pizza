import { useEffect, useMemo } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { FramedCover } from './CoverArt';
import {
  flatMat,
  makeAffineTexturedMaterial,
  makeBilingualSign,
  makeCheckerTexture,
  makeTextTexture,
} from './ps1';
import { useDispose } from '../lib/useDispose';
import { fogFor, ROOMS, type Room } from '../data/rooms';
import { JUKEBOX_TRACKS, isRoomSong, jukeboxTitle } from '../data/jukebox';
import { songMeta, songAlbum } from '../data/songMeta';
import { albumBySlug } from '../data/albums';
import { MASTER_TAPES } from '../data/restoration';
import { playbackUrlFor } from '../lib/trackSource';
import { loopIndexForUrl } from '../data/music';
import { audio } from '../audio/engine';
import { useMusicStore } from '../state/musicStore';
import { useProgressStore } from '../state/progressStore';
import { announce } from '../state/toastStore';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';
import { wrapText } from '../lib/textwrap';

// The Listening Room (視聴室) — the museum wing off the Tape Vault. One exhibit
// per catalog track down the two long walls: the album's cover in a gilt frame
// over a placard (title · year · meaning). A song that hasn't found you yet
// hangs as an EMPTY "???" frame whose placard names where it was last heard —
// the collection you're still assembling. A RESTORED track wears a gold HI-FI
// chip. Click a discovered exhibit and it plays (and becomes your station):
// a museum where every piece is playable. Sweet + hushed (dread stays out).

const WALL_X = 5.42; // exhibits sit just off the ±X walls (halfW 5.5)
const FRAME_Y = 1.9; // frame center height
const FRAME_SIZE = 1.35;

/** Where exhibit i hangs: alternating walls, 2.0 apart down the nave. */
export function exhibitSlot(i: number): { x: number; z: number; rotationY: number } {
  const wall = i % 2 === 0 ? -1 : 1;
  const j = Math.floor(i / 2);
  return { x: wall * WALL_X, z: -8 + j * 2.0, rotationY: (wall * -Math.PI) / 2 };
}

/** Play a discovered exhibit (the click / debug-hook verb): the track takes the
 *  loop voice (hi-fi if restored) and becomes the station that follows you out —
 *  the pickups.ts grammar. */
function playExhibit(slug: string) {
  audio.unlock();
  const url = playbackUrlFor(slug);
  void audio.playJukeboxTrack(url);
  useMusicStore.getState().setPreferred(loopIndexForUrl(url));
  announce(`♪ now playing — ${jukeboxTitle(slug)}`);
}

function Exhibit({ slug, index }: { slug: string; index: number }) {
  const { gl } = useThree();
  const { x, z, rotationY } = exhibitSlot(index);
  // Reactive per-track state (primitive selectors, so re-renders are cheap and
  // exact): discovered mirrors data/restoration.isSongDiscovered; restored
  // mirrors isSongRestored — inlined against the live store fields.
  const discovered = useProgressStore((s) => !isRoomSong(slug) || s.discoveredSongs.includes(slug));
  const restored = useProgressStore(
    (s) =>
      s.restoredSongs.includes(slug) ||
      MASTER_TAPES.some((m) => m.track === slug && s.itemsHeld.includes(m.id)),
  );

  const meta = songMeta(slug);
  const album = discovered ? albumBySlug(songAlbum(slug) ?? '') : undefined;
  // Where an unfound song was last heard — the placard IS the treasure hint.
  const owningRoom = useMemo(() => ROOMS.find((r) => r.song === slug)?.title, [slug]);

  // The placard: a small museum label under the frame. Value-keyed on what it
  // shows (the ShopFittings pattern); useDispose retires the old texture when
  // discovery/restoration flips it.
  const placardTex = useMemo(() => {
    const lines = discovered
      ? [
          ...wrapText(meta?.title ?? slug, 24),
          meta?.year ? `${meta.year}` : '—',
          '',
          ...wrapText(meta?.meaning ?? '', 30),
        ]
      : ['???', '', 'not yet archived', ...wrapText(`last heard near “${owningRoom ?? '…'}”`, 26)];
    return makeTextTexture(lines.join('\n'), {
      fg: discovered ? '#d8cfae' : '#6f6a7e',
      bg: '#151118',
      w: 256,
      h: 256,
    });
  }, [discovered, meta, slug, owningRoom]);
  const placardMat = useMemo(() => new THREE.MeshBasicMaterial({ map: placardTex }), [placardTex]);
  useDispose(placardTex, placardMat);

  // The gold HI-FI chip on a restored frame's corner.
  const chipTex = useMemo(
    () =>
      restored ? makeTextTexture('HI-FI', { fg: '#1a1408', bg: '#e9c964', w: 64, h: 32 }) : null,
    [restored],
  );
  const chipMat = useMemo(
    () => (chipTex ? new THREE.MeshBasicMaterial({ map: chipTex }) : null),
    [chipTex],
  );
  useDispose(chipTex, chipMat);

  // The empty frame for an unfound song (dim bars + a dark void — deliberately
  // NOT a hung cover; an absence, waiting).
  const emptyFrameMat = useMemo(() => flatMat('#5a5348'), []);
  const voidMat = useMemo(() => flatMat('#0a080d', { side: THREE.DoubleSide }), []);
  useDispose(emptyFrameMat, voidMat);

  // ?debug ACTION hook: drive the real exhibit verb without pixel-walking.
  useEffect(() => {
    if (!isDebugEntrance()) return;
    const key = `__sdpExhibit:${slug}`;
    exposeTestGlobal(key, () => {
      if (discovered) playExhibit(slug);
      else announce('🖼 an empty frame — this song hasn’t found you yet');
    });
    return () => exposeTestGlobal(key, undefined);
  }, [slug, discovered]);

  return (
    <group
      position={[x, 0, z]}
      rotation-y={rotationY}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (discovered) playExhibit(slug);
        else announce('🖼 an empty frame — this song hasn’t found you yet');
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      {/* a generous invisible hit target over frame + placard */}
      <mesh position={[0, 1.55, 0.08]}>
        <boxGeometry args={[1.8, 2.5, 0.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {discovered ? (
        <group position={[0, FRAME_Y, 0]}>
          <FramedCover art={album?.art} album={meta?.title ?? slug} size={FRAME_SIZE} />
        </group>
      ) : (
        <group position={[0, FRAME_Y, 0]}>
          {/* dim empty frame */}
          {(
            [
              [0, FRAME_SIZE / 2 + 0.08, FRAME_SIZE + 0.32, 0.16],
              [0, -FRAME_SIZE / 2 - 0.08, FRAME_SIZE + 0.32, 0.16],
            ] as const
          ).map(([fx, fy, fw, ft], i) => (
            <mesh key={i} material={emptyFrameMat} position={[fx, fy, 0]}>
              <boxGeometry args={[fw, ft, 0.12]} />
            </mesh>
          ))}
          {(
            [
              [-FRAME_SIZE / 2 - 0.08, 0],
              [FRAME_SIZE / 2 + 0.08, 0],
            ] as const
          ).map(([fx, fy], i) => (
            <mesh key={i} material={emptyFrameMat} position={[fx, fy, 0]}>
              <boxGeometry args={[0.16, FRAME_SIZE, 0.12]} />
            </mesh>
          ))}
          <mesh material={voidMat}>
            <planeGeometry args={[FRAME_SIZE, FRAME_SIZE]} />
          </mesh>
        </group>
      )}
      {/* the HI-FI chip, pinned to the frame's lower-right corner */}
      {chipMat && (
        <mesh material={chipMat} position={[FRAME_SIZE / 2 + 0.06, FRAME_Y - FRAME_SIZE / 2, 0.12]}>
          <planeGeometry args={[0.42, 0.21]} />
        </mesh>
      )}
      {/* the placard under the frame */}
      <mesh material={placardMat} position={[0, 0.82, 0.02]}>
        <planeGeometry args={[0.95, 0.95]} />
      </mesh>
    </group>
  );
}

export function ListeningRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#14101a', '#191423'); // dark parquet-ish
    t.repeat.set(4, 7);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 6, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#161220', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#0c0a12'), []);
  const benchMat = useMemo(() => flatMat('#2a2433'), []);
  const signTex = useMemo(
    () =>
      makeBilingualSign('視聴室', 'THE LISTENING ROOM', {
        bg: '#151120',
        accent: '#e9c964',
        jpColor: '#e8e2f2',
        enColor: '#b9b0cc',
      }),
    [],
  );
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, transparent: true }),
    [signTex],
  );
  useDispose(floorTex, benchMat, signTex, signMat);

  return (
    <group>
      {/* hushed museum dusk: a soft wash + warm gallery pools down the nave —
          dim enough to stay a hush, bright enough that the frames READ */}
      <ambientLight intensity={0.6} color="#cfc4ec" />
      <pointLight position={[0, 3.2, -6]} intensity={0.9} distance={13} color="#ffe2b0" />
      <pointLight position={[0, 3.2, 0]} intensity={0.9} distance={13} color="#ffe2b0" />
      <pointLight position={[0, 3.2, 6]} intensity={0.9} distance={13} color="#ffe2b0" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* the bilingual house sign over the way back to the vault */}
      <mesh material={signMat} position={[0, 2.9, -9.4]}>
        <planeGeometry args={[2.6, 0.98]} />
      </mesh>

      {/* the collection — one exhibit per catalog track, down both long walls */}
      {JUKEBOX_TRACKS.map((t, i) => (
        <Exhibit key={t.slug} slug={t.slug} index={i} />
      ))}

      {/* a museum bench mid-nave (sit with the collection — set dressing) */}
      <mesh material={benchMat} position={[0, 0.28, 0]}>
        <boxGeometry args={[0.6, 0.16, 2.6]} />
      </mesh>
      <mesh material={benchMat} position={[0, 0.1, -1]}>
        <boxGeometry args={[0.5, 0.2, 0.24]} />
      </mesh>
      <mesh material={benchMat} position={[0, 0.1, 1]}>
        <boxGeometry args={[0.5, 0.2, 0.24]} />
      </mesh>
    </group>
  );
}
