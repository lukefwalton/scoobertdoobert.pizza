// ───────────────────────────────────────────────────────────────────────────
// src/data/commands.ts — the hidden terminal, as data (Phase 4).
//
// A dead-web SGI/X-Files command line. Summon it with the backtick (`) key. The
// commands are pure data + handlers here (no React, no stores), mirroring the
// links/floors/rooms single-source pattern: adding a command is one entry in
// COMMANDS, never terminal-component code. The Terminal component owns I/O,
// history, and the side effects (clear, navigation, the unease bump).
//
// FORBIDDEN commands are the bridge into Phase 5: running one fires the
// `terminal-forbidden-cmd` unease delta (declared dormant in dread.ts). The
// machine doesn't like being poked.
// ───────────────────────────────────────────────────────────────────────────

import type { Progress } from '../state/progressStore';
import { LYRICS, lyricFor, songsWithLyrics, findLyricSlug, hasLyrics } from './lyrics';
import { SONG_META, songMeta, fuzzyFindSlug } from './songMeta';
import { LMM_EPISODES, LMM_CONCEPT, LMM_HOME } from './lmm';
import { loreAt } from './lore';
import { ALBUMS } from './albums';
import { spellById, isCantrip, SPELL_SLOTS_MAX, type Spell } from './spells';
import { rollLuckyD20, critBanner } from '../lib/luck-core';

export type CommandCtx = {
  /** Args after the command name (already split on whitespace). */
  args: string[];
  /** Prior command lines this session (for `history`). */
  history: string[];
  /** The durable cross-session progress (localStorage), passed in by the Terminal
   *  so the dead-web `status`/`whoami` can read what the machine remembers about
   *  you — without commands.ts importing a store (kept pure: type-only). */
  progress: Progress;
};

export type CommandAction =
  | { type: 'clear' }
  | { type: 'navigate'; href: string; external?: boolean }
  | { type: 'close' };

export type CommandResult = {
  /** Lines to print under the entered command. */
  output: string[];
  /** Optional side effect for the Terminal to perform. */
  action?: CommandAction;
};

export type Command = {
  name: string;
  /** One-line summary in `help`. Omit to keep the command out of the listing. */
  help?: string;
  /** Running it nudges `unease` up — the machine doesn't like it. */
  forbidden?: boolean;
  run: (ctx: CommandCtx) => CommandResult;
};

// A tiny fake filesystem the dead-web `ls`/`cat` rummage through. Original copy.
const FILES: Record<string, string[]> = {
  'README.TXT': [
    'SCOOBERT DOOBERT INC. — ELECTRONIC PIZZA STOREFRONT',
    'workstation: SILICON SLICE™  (Pizza Graphics Workstation)',
    'if you can read this, the plug-in installed correctly.',
    'if you can read this and did NOT install the plug-in, please log off.',
  ],
  'MENU.TXT': [
    'six (6) unreleased demos, one thin crust, sealed with another thin crust,',
    'reverb, choice of toppings, and even more reverb.',
    'the best songs under one roof.™',
  ],
  'RAT.LOG': [
    'tenant: (the) rat',
    'rent: PAID (in full, in a currency management does not recognize)',
    'last seen: in the wall · in the hall · behind you · still behind you',
  ],
  '1101.BIN': [
    '01110011 01100001 01110110 01100101',
    '01110011 01100001 01101110 00100000',
    '01100100 01101001 01100101 01100111 01101111',
    '(hint: it is not a number. try /1101)',
  ],
  'EMPLOYEES.TXT': ['on duty: 1', 'on duty: 1', 'on duty: 1 (you keep counting the same one)'],
  'LMM.TXT': [
    'LOVE MUSIC MORE — staff listening, mandatory.',
    'a podcast about the craft of music. the manager hosts it.',
    '(the manager is the rat. the manager is also the philosopher. type `lmm`.)',
  ],
  'WORDS.TXT': [
    'lyrics are kept on file for legal reasons.',
    'type `lyrics` to read along. type `lore` for a deep cut.',
  ],
};

function helpListing(): string[] {
  const visible = COMMANDS.filter((c) => c.help);
  const width = Math.max(...visible.map((c) => c.name.length));
  return [
    'available commands:',
    ...visible.map((c) => `  ${c.name.padEnd(width + 2)}${c.help}`),
    '',
    '(some commands are not listed. the building is older than it looks.)',
  ];
}

export const COMMANDS: Command[] = [
  {
    name: 'help',
    help: 'list the commands you are allowed to know about',
    run: () => ({ output: helpListing() }),
  },
  {
    name: 'ls',
    help: 'list the files in this directory',
    run: () => ({ output: [...Object.keys(FILES), 'DEMOS/', 'classified/  (access denied)'] }),
  },
  {
    name: 'cat',
    help: 'print a file — try `cat README.TXT`',
    run: ({ args }) => {
      const name = (args[0] ?? '').toUpperCase();
      if (!name) return { output: ['usage: cat <FILE> — try `ls`'] };
      const f = FILES[name] ?? FILES[name + '.TXT'];
      if (f) return { output: f };
      if (name.startsWith('CLASSIFIED'))
        return { output: ['cat: classified/: access denied. (ask the rat.)'] };
      return { output: [`cat: ${args[0]}: no such file. try \`ls\`.`] };
    },
  },
  {
    name: 'whoami',
    help: 'ask the machine who you are',
    run: ({ progress }) => {
      const out = ['guest@scoobertdoobert', '(the machine is not convinced you are a guest.)'];
      // The machine remembers returning deep-divers — the persistence spine, made
      // diegetic. Surface-safe phrasing; the real dread lives downstairs.
      if (progress.maxUnease >= 0.7)
        out.push('(it has seen you all the way down. it has not forgotten.)');
      else if (progress.everEnteredWorld)
        out.push('(you have been downstairs before. it noticed.)');
      return { output: out };
    },
  },
  {
    name: 'status',
    help: 'what the machine has on file about you',
    run: ({ progress }) => {
      const yn = (b: boolean) => (b ? 'YES' : 'no');
      const secrets = progress.secretsFound.length;
      return {
        output: [
          'SCOOBERT DOOBERT INC. — VISITOR RECORD',
          `  visits logged ....... ${progress.visits}`,
          `  plug-in installed ... ${yn(progress.everEnteredWorld)}`,
          `  floors descended .... ${progress.maxFloor}`,
          `  rooms walked ........ ${progress.visitedRooms.length}`,
          `  secrets uncovered ... ${secrets}${secrets ? '  (' + progress.secretsFound.join(', ') + ')' : ''}`,
          `  games cleared ....... ${progress.clearedGames.length}`,
          ' ',
          '(the machine keeps better records than it admits.)',
        ],
      };
    },
  },
  {
    name: 'luck',
    help: 'how lucky the machine has you down as',
    run: ({ progress }) => {
      // Mirrors selectLuck — computed inline so commands.ts stays store-free (the
      // Terminal hands us a progress snapshot; we never import the store here).
      const luck = Math.max(0, progress.luckEarned - progress.luckSpent);
      return {
        output: [
          'LUCK — the house edge, pointed your way',
          `  banked .............. ${luck}`,
          `  earned, all-time .... ${progress.luckEarned}`,
          `  spent for you ....... ${progress.luckSpent}`,
          ' ',
          ...(luck > 0
            ? [
                'with luck banked, the machine rolls a SECOND die behind every stakes',
                'roll and keeps the higher face — quietly, while it lasts. you never',
                'spend it by hand. be lucky.',
              ]
            : [
                'nothing banked. the dice are honest with you right now.',
                'earn some at the shrine: find the offering box, clap twice. 二拍手.',
              ]),
        ],
      };
    },
  },
  {
    name: 'spells',
    help: 'the spells you have learned',
    run: ({ progress }) => {
      const known = progress.knownSpells
        .map((id) => spellById(id))
        .filter((s): s is Spell => Boolean(s));
      if (known.length === 0) {
        return {
          output: [
            'SPELLBOOK — empty.',
            'you have learned nothing yet. a scroll is shelved in the dark somewhere',
            'downstairs; read it and the words are yours.',
          ],
        };
      }
      // Mirrors selectSpellSlots — inline, same store-free reason as `luck`.
      const slots = Math.max(
        0,
        Math.min(SPELL_SLOTS_MAX, progress.spellSlotsGained - progress.spellSlotsSpent),
      );
      const width = Math.max(...known.map((s) => s.name.length));
      return {
        output: [
          'SPELLBOOK — what you can cast (the key casts it out in the world):',
          ...known.map(
            (s) =>
              `  ${s.glyph}  ${s.name.padEnd(width + 2)}[${s.key}]  ${
                isCantrip(s) ? 'cantrip · free' : `${s.slotCost} slot`
              }`,
          ),
          ' ',
          `spell slots ......... ${slots}/${SPELL_SLOTS_MAX}  (rest at a shrine to refill)`,
        ],
      };
    },
  },
  {
    name: 'roll',
    help: 'roll the bones — a d20, your luck nudges it',
    run: ({ progress }) => {
      const luck = Math.max(0, progress.luckEarned - progress.luckSpent);
      // A free "feeling lucky?" peek: it uses your luck for D&D advantage but NEVER
      // spends it (rollLuckyD20 is pure — only the world's STAKES rolls debit the
      // save). So this shows the system tipping the dice your way, at no cost.
      const r = rollLuckyD20(luck);
      const banner = critBanner(r.crit); // ★ NAT 20 ★ / ☠ CRIT FAIL ☠ / none
      const out = [`🎲 d20 → ${r.face}${banner ? `   ${banner}` : ''}`];
      // Key the advantage note off what the roll ACTUALLY did (luckSpent), not just
      // whether you have luck — so the copy can't claim advantage the helper didn't take.
      if (r.luckSpent > 0)
        out.push(
          `(your ${luck} luck rolled a second die behind it, kept the higher — a peek; nothing spent.)`,
        );
      out.push(
        r.crit === 'nat20'
          ? 'the machine likes you today.'
          : r.crit === 'nat1'
            ? 'the machine does not like you today.'
            : 'the bones settle. nothing fated, this time.',
      );
      return { output: out };
    },
  },
  {
    name: 'lyrics',
    help: 'read the words — `lyrics` to list, `lyrics boardwalk` to read one',
    run: ({ args }) => {
      const q = args.join(' ').trim();
      if (!q) {
        const slugs = songsWithLyrics();
        const width = Math.max(...slugs.map((s) => s.length));
        return {
          output: [
            'WORDS ON FILE — read one with `lyrics <name>`:',
            ...slugs.map((s) => `  ${s.padEnd(width + 2)}${LYRICS[s].title}`),
            '',
            '(instrumentals + covers have no words to print.)',
          ],
        };
      }
      const slug = findLyricSlug(q);
      const L = slug ? lyricFor(slug) : undefined;
      if (!L) return { output: [`lyrics: nothing on file matching "${q}". try \`lyrics\`.`] };
      return {
        output: [
          `♪ ${L.title.toUpperCase()}`,
          ...(L.meaning ? ['  ' + L.meaning] : []),
          '',
          ...L.lyrics.split('\n'),
          '',
          '— Scoobert Doobert. © Luke F. Walton. all rights reserved.',
        ],
      };
    },
  },
  {
    name: 'song',
    help: 'the liner notes — `song boardwalk` for what a track is about',
    run: ({ args }) => {
      const q = args.join(' ').trim().toLowerCase();
      const slugs = Object.keys(SONG_META);
      if (!q) {
        return {
          output: [
            'THE CATALOG (liner notes — `song <name>`):',
            ...slugs.map((s) => `  ${SONG_META[s].title}`),
          ],
        };
      }
      const slug = fuzzyFindSlug(slugs, q, (s) => SONG_META[s].title);
      const m = slug ? songMeta(slug) : undefined;
      if (!m || !slug)
        return { output: [`song: nothing matching "${q}". try \`song\` or \`discography\`.`] };
      const out = [`♪ ${m.title.toUpperCase()}${m.year ? `  (${m.year})` : ''}`];
      if (m.meaning) out.push('  ' + m.meaning);
      if (hasLyrics(slug)) out.push('', `  the words are on file — try \`lyrics ${slug}\`.`);
      else out.push('', '  (instrumental / cover — no words.)');
      return { output: out };
    },
  },
  {
    name: 'lmm',
    help: 'Love Music More — the podcast. `lmm` to list, `lmm 1` to listen',
    run: ({ args }) => {
      const n = parseInt(args[0] ?? '', 10);
      if (Number.isInteger(n) && n >= 1 && n <= LMM_EPISODES.length) {
        const ep = LMM_EPISODES[n - 1];
        return {
          output: [`opening: ${ep.title}…`, ep.url],
          action: { type: 'navigate', href: ep.url, external: true },
        };
      }
      return {
        output: [
          LMM_CONCEPT,
          '',
          'EPISODES (listen with `lmm <n>`):',
          ...LMM_EPISODES.map(
            (ep, i) =>
              `  ${String(i + 1).padStart(2)}. ${ep.title}${ep.guest ? '' : '  [scoobert]'}`,
          ),
          '',
          `more at ${LMM_HOME}`,
        ],
      };
    },
  },
  {
    name: 'lore',
    help: 'a deep cut about the management (run it again for another)',
    run: ({ history }) => ({
      output: ['…', loreAt(history.length)],
    }),
  },
  {
    name: 'discography',
    help: 'the records on file',
    run: () => {
      const width = Math.max(...ALBUMS.map((a) => a.title.length));
      return {
        output: [
          'SCOOBERT DOOBERT — THE RECORDS:',
          ...ALBUMS.map((a) => `  ${a.title.padEnd(width + 2)}${a.video ? '▶ has a video' : ''}`),
          '',
          '(switch a CRT on in the world to watch one. or `catalog` for the shop.)',
        ],
      };
    },
  },
  {
    name: 'about',
    help: 'what is this place',
    run: () => ({
      output: [
        'scoobertdoobert.pizza — a pizza shop off the coast of San Diego.',
        'it is actually a solo music project by a philosopher.',
        'silicon graphics promised navigable 3D worlds in the browser in 1996.',
        'this is that promise, ~30 years late, as a haunted pizza CD-ROM.',
      ],
    }),
  },
  {
    name: 'echo',
    help: 'repeat after me',
    run: ({ args }) => ({ output: [args.join(' ')] }),
  },
  {
    name: 'date',
    help: 'what time is it (here)',
    run: () => ({
      output: ['Fri Jun 20 1997 — 25:61:99 PST', '(the clock down here is unreliable.)'],
    }),
  },
  {
    name: 'history',
    help: 'what you have typed',
    run: ({ history }) => ({
      output: history.length ? history.map((h, i) => `  ${i + 1}  ${h}`) : ['(nothing yet)'],
    }),
  },
  {
    name: 'clear',
    help: 'wipe the screen',
    run: () => ({ output: [], action: { type: 'clear' } }),
  },
  {
    name: 'exit',
    help: 'close the terminal',
    run: () => ({ output: ['logging off…'], action: { type: 'close' } }),
  },
  {
    name: 'menu',
    help: 'go back to the storefront',
    run: () => ({
      output: ['returning to the storefront…'],
      action: { type: 'navigate', href: '/' },
    }),
  },

  // ── hidden easter eggs (not in `help`) ─────────────────────────────────────
  {
    name: 'rat',
    run: () => ({
      output: [
        'the rat pays rent.',
        'the rat does not flee anymore.',
        'the rat is looking at you.',
      ],
    }),
  },
  {
    name: '1101',
    run: () => ({
      output: ['decoding…', 'SAVE SAN DIEGO', '> opening /1101'],
      action: { type: 'navigate', href: '/1101.html' },
    }),
  },
  {
    name: 'pizza',
    run: () => ({
      output: [
        '        ( )',
        '       (   )',
        '    .-"""""-.',
        '   /  *  *  \\   one (1) pizza.',
        '  |  *  *  * |  no refunds.',
        '   \\  *  *  /',
        '    `-.....-`',
      ],
    }),
  },
  {
    name: 'mobius',
    run: () => ({
      output: [
        'you walk forward.',
        'you arrive where you started.',
        'you are slightly different.',
        '∞',
      ],
    }),
  },

  // ── forbidden: the machine doesn't like these (bumps unease) ────────────────
  {
    name: 'sudo',
    forbidden: true,
    run: () => ({ output: ['this incident has been reported.', '(to whom, it will not say.)'] }),
  },
  {
    name: 'rm',
    forbidden: true,
    run: () => ({ output: ['rm: refusing to remove what is already gone.'] }),
  },
  {
    name: 'unlock',
    forbidden: true,
    run: () => ({ output: ['nothing down here is locked.', 'that was never the problem.'] }),
  },
  {
    name: 'kill',
    forbidden: true,
    run: () => ({
      output: ['no such process.', 'it was never running.', 'it is just always here.'],
    }),
  },
];

const BY_NAME = new Map(COMMANDS.map((c) => [c.name, c]));

/** Resolve a typed line to a command + ctx. Unknown verbs return null. */
export function lookupCommand(name: string): Command | undefined {
  return BY_NAME.get(name.toLowerCase());
}
