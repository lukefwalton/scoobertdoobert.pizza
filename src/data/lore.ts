// ───────────────────────────────────────────────────────────────────────────
// src/data/lore.ts — Scoobert lore, as data. Short, true, goblin-mode facts about
// the philosopher-who-makes-pizza-music, mined from lukefwalton.com (the about
// page, the song meanings, the Japan work). Surfaced as the terminal `lore`
// command (a `fortune`-style random pull) — the deep-cut flavor for someone
// poking around. Each line is liftable on its own; keep them ≤160 chars.
//
// These are facts about Luke / Scoobert (his biography + his songs' meanings),
// baked in so the repo stays standalone. Original phrasing, his content.
// ───────────────────────────────────────────────────────────────────────────

export const LORE: string[] = [
  'Scoobert Doobert is the goblin-mode music alias of Luke F. Walton — a San Diego AI-company founder and philosopher who writes, plays, produces, and mixes his own records.',
  'Three names, one person: he records as Scoobert Doobert, takes credits as Luke Francis Walton, and writes as Luke F. Walton.',
  'By day he founded Surmado (managed AI for small businesses) and researches AI "answerability." The philosopher behind the pizza.',
  '"Derrida Makes a Différance" puns deferred meaning against physics — matter the stuff vs. matters the importance. Verdict: "we do not matter much, if at all."',
  'Its escape hatch: "living in the meaningless, a freedom can come out of it" — landing on a homophone, "to be the sun / to be a son."',
  'He caught Guillain-Barré syndrome at USC — lost his sight and the ability to play guitar, crawled up his stairs for months, wore a pirate eyepatch for half a year.',
  'His whole philosophy is a stick in a river: it looks bent at the waterline but isn’t. Language is a stick in the water too.',
  'On the Zen koan of Joshu’s Dog (does a dog have Buddha-nature? "Mu"): "We’ll get to the dog. I am the dog lol." Hence the dog mask. Moo.',
  'The KŌAN track "無門関" (Mumonkan) is sung in Japanese and admits it can’t read its own kanji: "um... I wonder?"',
  'Hidden KŌAN track "1101" is nothing but 7-bit ASCII binary. Decoded: "scoobert doobert dot pizza / slash save san diego" — the website sung as a song.',
  '"1101" is binary for 13 — and also reads like a date, 11/01. The track refuses to say which.',
  'He produced and remixed for Japanese band CHAI — a Sub Pop remix plus an NHK drama and a film theme — his studio work ran in Japan’s Sound & Recording Magazine.',
  '"Gonna Go to Japan" is a whole trip taken in imagination — Shinkansen, 7-Eleven ramen, capybara onsen — until the last line cracks: "けど今できない" (but I can’t right now).',
  'His first night ever in Japan landed on his birthday and ended in a four-hour Kanda jam — 20+ songs with local musicians.',
  'The Scooby-Doo gang runs through the catalog: "Mystery Machine," "Snuggle With Shaggy," "Shaggy’s Anthem," "What a Velma What a Night."',
  '"Mystery Machine" is the Scooby van as a time machine pointed backward: "work for a bank twenty years, forget I had friends, steal a van, mystery machine."',
  '"Shaggy’s Anthem" is cartoon courage under capitalism: "funny how the monsters are the ones you trusted from the very start."',
  'He tracked the whole 2018 LP $WAMI$ alone in a bathrobe — except a few drum-and-bass moments played by Louis Cole.',
  'He has the burrito brain bad: a song that’s just "It’s time to eat a shrimp burrito" on loop, and the YouTube handle @ScoobertDoobertBurrito.',
  '"MEMORY LAN" is a 90s LAN-party Möbius ache — blow the cartridge, copy-paste ASCII art on AIM, a cereal box with a CD-ROM on it.',
  'Every song on his debut LP "Finding $D" was written, recorded, mixed, and mastered in a single day.',
  'Muso.AI ranked Scoobert Doobert Top 1% of Artists AND Top 1% of Songwriters — close to 300 registered compositions.',
  'He interned at Surfdog Records packing Brian Setzer CDs into mailers — then hit #1 on Munich’s egoFM chart with "Don’t Worry" (2021).',
  'The about page admits he was "once filed under museum doppelgängers by the Getty" — flagged as a lookalike of a figure in a Degas.',
];

/** A lore line for a 0-based pull index (wraps). Lets the terminal step a counter
 *  for variety without Math.random in the data layer. */
export const loreAt = (i: number): string => LORE[((i % LORE.length) + LORE.length) % LORE.length];
