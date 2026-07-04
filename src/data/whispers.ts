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
  kitchen:
    'a flour-dusted rack of pizza pans, each tuned to a note. The site’s whole joke, here: a pizza shop that’s secretly a one-man music project — where the pies and the songs both get made.',
  // ── the basement sessions (the studio wing — warm, where it's all made) ──
  liveroom:
    'amps stacked three deep and a kit set for one. He plays the drums, the keys, the bass — a whole band tracked after dark by one guy in a basement.',
  controlroom:
    'the desk, every fader his own hand. Before any of this he interned at Surfdog Records, packing Brian Setzer CDs into mailers down the coast.',
  tapevault:
    'shelves of reels, hundreds of them. Every song on his debut LP “Finding SD” was written, recorded, mixed and mastered in a single day.',
  lounge:
    'the rat fast asleep in the good armchair, paying its rent in dreams. A lava lamp, a TV warming up — the one room he lets himself rest.',
  // ── the deep / wrong rooms (still sweet things to notice) ──
  classified:
    'a stamped file: DERRIDA MAKES A DIFFÉRANCE. Its verdict on whether any of this matters — “we do not matter much, if at all.”',
  dicepit:
    'a koan scratched into the felt: does a dog have Buddha-nature? “Mu.” He just says, “I am the dog lol.” Moo.',
  gallery:
    'a museum tag fallen behind a statue. The Getty once filed Scoobert under “doppelgängers” — flagged as a lookalike for a figure in a Degas.',
  theremin:
    'no strings, no words — just a wavering pitch you coax from the air. Like his KŌAN track 無門関, sung in Japanese while admitting it can’t read its own kanji: “um… I wonder?”',
  // ── the Japan wing ──
  shrine:
    'a torn ticket stub. His first night ever in Japan landed on his birthday and ended in a four-hour jam in Kanda — 20-plus songs with locals.',
  'metro-tunnel':
    'graffiti reading けど今できない. “Gonna Go to Japan” is a whole trip taken in imagination — until the last line cracks: “but I can’t right now.”',
  frutiger:
    'a faint NHK bug in the corner. He produced and remixed for the band CHAI — a drama, a film theme — written up in Japan’s Sound & Recording Magazine.',
  grove:
    'a stick half-sunk in the water, looking bent at the surface. His whole philosophy is that stick: it only looks bent. So is language.',
  grassrooms:
    '草の間 means “the grass room” — but online 草 = “lol” (laughter sprouts like grass: www → 草), so really you’re standing in the LOL room. The too-blue ceiling agrees.',
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
  balboa:
    'a brass plaque by the path. “Walking Balboa” strolls this exact park — San Diego’s Balboa, the one in his backyard, organ pavilion and all.',
  garden:
    'a lily pad tipped like an umbrella. In Japanese the frog is 蛙 — kaeru — which also means “to return home.” That’s why he keeps the door open; you always come back.',
  tubes:
    'a lone sock at the bottom of the ball pit. Every PlayPlace was a liminal space before we had the word — warm plastic, and the muffled roar of somewhere you can’t quite see out of.',
  grotto:
    'the cave answers you back a half-second late. Of course there’s a grotto behind the garden — the menu always promised a choice of toppings and even more reverb.',
  bamboo:
    'the knocker fills, tips, and cracks against its stone — 鹿威し, the deer-scarer. The lion on the gate outside insists, loudly, that it’s called a shishi-odoshi after him. 獅子.',
  turtle:
    'a set list still taped to the monitor wedge. The Jumping Turtle, San Marcos — all ages. He played this room in high school; if you stand where the stage was, it remembers.',
  mainstreet:
    'every window dark but one. A small town at 3am is the original liminal space — the place you grew up, emptied of everyone who made it yours, still perfectly lit and waiting.',
  diner:
    'the deer on the wall has kind eyes, which is worse. An all-night diner is a promise: someone is awake, the coffee is on, you are not the last person on earth. The heads are just making sure.',
  moonlight:
    'a string of bulbs swaying over the floor. “Dancing in the Moonlight” was cut the way he cuts everything — every part himself, after dark.',
  bestday:
    'the marquee just reads BEST DAY EVER. It’s the very loop that plays while the whole site boots up — his sunniest three minutes, on repeat.',
  tidepools:
    'a tide chart curling off a piling. “Daydreaming” is the mint-and-cream one — the lagoon-calm breather you earn after the murk.',
  northpark:
    'a chalkboard outside a North Park bar. “Velma, What a Night” — a real San Diego neighborhood, a fake Saturday, one beer too many.',
};

/** The whisper for a room id, or undefined if that room has nothing to notice. */
export function whisperFor(roomId: string): string | undefined {
  return ROOM_WHISPERS[roomId];
}
