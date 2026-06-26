// ───────────────────────────────────────────────────────────────────────────
// src/data/whispers.ts — room-themed "you notice…" lore whispers.
//
// One curated Scoobert detail per room (mined from lore.ts / the lfw catalog),
// surfaced by a PERCEPTION check on first entry this session (see
// PerceptionWhisper). It's the lfw-as-brain sprinkle with a D&D wrapper: beat the
// DC and you notice something true about the philosopher-who-makes-pizza-music.
//
// TASTE GUARDRAIL: every whisper is sweet/funny, never dread — the depths stay
// eerie by their environment, but what you NOTICE in them is a warm fact (the
// goblin-mode warmth peeking through). Keyed by room id; rooms not listed simply
// have nothing to notice. Keep each ≤200 chars, liftable on its own.
// ───────────────────────────────────────────────────────────────────────────

export const ROOM_WHISPERS: Record<string, string> = {
  // ── the music wing ──
  jukebox:
    'a chart cutting tacked to the wall: “Don’t Worry” hit #1 on Munich’s egoFM in 2021. Muso.AI files him Top 1% songwriter — near 300 compositions.',
  practice:
    'a bathrobe slung over an amp. He tracked the whole 2018 LP $WAMI$ alone in one, minus a few drum-and-bass moments played by Louis Cole.',
  // ── the deep / wrong rooms (still sweet things to notice) ──
  classified:
    'a stamped file: DERRIDA MAKES A DIFFÉRANCE. Its verdict on whether any of this matters — “we do not matter much, if at all.”',
  dicepit:
    'a koan scratched into the felt: does a dog have Buddha-nature? “Mu.” He just says, “I am the dog lol.” Moo.',
  gallery:
    'a museum tag fallen behind a statue. The Getty once filed Scoobert under “doppelgängers” — flagged as a lookalike for a figure in a Degas.',
  // ── the Japan wing ──
  shrine:
    'a torn ticket stub. His first night ever in Japan landed on his birthday and ended in a four-hour jam in Kanda — 20-plus songs with locals.',
  'metro-tunnel':
    'graffiti reading けど今できない. “Gonna Go to Japan” is a whole trip taken in imagination — until the last line cracks: “but I can’t right now.”',
  frutiger:
    'a faint NHK bug in the corner. He produced and remixed for the band CHAI — a drama, a film theme — written up in Japan’s Sound & Recording Magazine.',
  grove:
    'a stick half-sunk in the water, looking bent at the surface. His whole philosophy is that stick: it only looks bent. So is language.',
  // ── the digital-nostalgia branch ──
  memorylane:
    'an old cartridge labeled 1101. It’s nothing but 7-bit ASCII binary — decoded: “scoobertdoobert dot pizza / slash save san diego.” A website, sung.',
  internet:
    'a cereal box with a CD-ROM taped to it. “MEMORY LAN” is that exact 90s ache — blow the cartridge, paste ASCII art on AIM, a LAN party that won’t end.',
  // ── the sweet SoCal surface ──
  boardwalk:
    'initials carved in the rail over Moonlight Beach. This whole boardwalk is the San Diego his songs keep walking back to.',
  california:
    'a sun-faded postcard. “I Live in California” — and he really does: a San Diego AI-company founder by day, goblin by night.',
  zoo: 'a keeper’s note about the capybaras. “Gonna Go to Japan” dreams of exactly this — a capybara onsen, 7-Eleven ramen, the Shinkansen.',
  oceanview:
    'a half-buried Walkman still warm. He caught Guillain-Barré at USC — lost his sight and his guitar hands for months, and clawed all the way back.',
};

/** The whisper for a room id, or undefined if that room has nothing to notice. */
export function whisperFor(roomId: string): string | undefined {
  return ROOM_WHISPERS[roomId];
}
