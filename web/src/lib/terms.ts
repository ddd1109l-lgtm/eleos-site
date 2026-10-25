import { TERMS, type Term } from "@/data/form";

type Entry = { key: string; term: Term };

const ENTRIES: Entry[] = TERMS.flatMap((term) =>
  [term.term, ...(term.aliases ?? [])].map((key) => ({ key: key.toLowerCase(), term })),
).sort((a, b) => b.key.length - a.key.length);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest phrases first so "Medicare Savings Program" wins over "Medicare".
const PATTERN = new RegExp(
  `(?<![\\w-])(${ENTRIES.map((e) => escape(e.key)).join("|")})(?![\\w-])`,
  "gi",
);

export function lookupTerm(text: string): Term | undefined {
  const key = text.toLowerCase().replace(/[.,:;?()]+$/g, "").trim();
  return ENTRIES.find((e) => e.key === key)?.term;
}

export type Piece = { text: string; term?: Term };

// Splits a run of form text into glossary phrases and plain text.
export function splitTerms(text: string): Piece[] {
  const pieces: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const start = m.index ?? 0;
    if (start > last) pieces.push({ text: text.slice(last, start) });
    pieces.push({ text: m[0], term: lookupTerm(m[0]) });
    last = start + m[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}
