// Parse the maintained link trove (links.md, kept at the repo root and authored
// by Luke) into structured sections at build time. links.md stays the single
// source of truth — editing it on `main` is all it takes to update the archive
// page. The markdown is deliberately simple (## / ### headings + `- [text](url)`
// bullets), so a tiny line parser beats pulling in a markdown dependency.
import raw from '../../links.md?raw';

export type ArchiveLink = { text: string; url: string };
export type ArchiveSubsection = { title: string; links: ArchiveLink[] };
export type ArchiveSection = {
  title: string;
  links: ArchiveLink[]; // links directly under the ## before any ###
  subsections: ArchiveSubsection[];
};

const LINK_RE = /^-\s*\[([^\]]+)\]\(([^)]+)\)\s*$/;

export function parse(md: string): ArchiveSection[] {
  const sections: ArchiveSection[] = [];
  let section: ArchiveSection | undefined;
  let sub: ArchiveSubsection | undefined;

  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      section = { title: line.slice(3).trim(), links: [], subsections: [] };
      sub = undefined;
      sections.push(section);
      continue;
    }
    if (line.startsWith('### ')) {
      if (!section) continue;
      sub = { title: line.slice(4).trim(), links: [] };
      section.subsections.push(sub);
      continue;
    }
    const m = LINK_RE.exec(line);
    if (m && section) {
      const link: ArchiveLink = { text: m[1].trim(), url: m[2].trim() };
      (sub ?? section).links.push(link);
    }
  }
  return sections;
}

export const ARCHIVE_SECTIONS: ArchiveSection[] = parse(raw);

export const ARCHIVE_LINK_COUNT: number = ARCHIVE_SECTIONS.reduce(
  (n, s) => n + s.links.length + s.subsections.reduce((m, ss) => m + ss.links.length, 0),
  0,
);
