/**
 * Privacy filter. Runs on every user message and voice transcript BEFORE it reaches the model,
 * and on every model reply before it reaches the user.
 *
 * Over-masking is intentional: a false positive costs a re-phrase; a false negative leaks an ID.
 */

export type FindingKind = "ssn" | "mbi";
export type FilterResult = { text: string; masked: boolean; kinds: FindingKind[]; notice: string | null };

const MASK: Record<FindingKind, string> = { ssn: "[SSN removed]", mbi: "[Medicare number removed]" };

// Letters CMS never uses in an MBI: S, L, O, I, B, Z
const L = "[AC-HJKMNP-RT-Yac-hjkmnp-rt-y]";
const N = "[0-9]";
const AN = `(?:${L}|${N})`;
const SEP = "[\\s.-]?";

/**
 * MBI position rules (CMS): 1=digit 1-9, 2=letter, 3=letter|digit, 4=digit, 5=letter,
 * 6=letter|digit, 7=digit, 8=letter, 9=letter, 10=digit, 11=digit.
 * A single space, dot or dash is allowed between any two characters so "1EG4-TE5-MK73"
 * and a transcript like "1 E G 4 T E 5 M K 7 3" both match.
 */
const MBI = new RegExp(
  `(?<![A-Za-z0-9])[1-9]${SEP}${L}${SEP}${AN}${SEP}${N}${SEP}${L}${SEP}${AN}${SEP}${N}${SEP}${L}${SEP}${L}${SEP}${N}${SEP}${N}(?![A-Za-z0-9])`,
  "g",
);

/** 9 digits as 3-2-4 with optional separators, or 9 in a row. Also catches old SSN-based claim numbers (digits + letter). */
const SSN = /(?<!\d)\d{3}[\s.-]?\d{2}[\s.-]?\d{4}(?!\d)/g;

/** Any 9+ digits with spaces/dashes in odd groupings, e.g. "123 456 789" read aloud. */
const LOOSE_NINE = /(?<!\d)(?:\d[\s.-]?){8}\d(?![\d])/g;

const ZIP4 = /^\d{5}-\d{4}$/;

// Digit words in the app's languages: English, Spanish, French, Haitian Creole, Vietnamese.
// Words that are also everyday words ("to", "un", "ba" = father, "năm" = year) are left out of
// STRICT_DIGIT_WORDS, so they only count inside a run that is clearly a number.
const WORD_DIGITS: Record<string, string> = {
  zero: "0", oh: "0", o: "0", one: "1", two: "2", to: "2", too: "2", three: "3", four: "4", for: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  cero: "0", uno: "1", una: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9",
  "zéro": "0", un: "1", une: "1", deux: "2", trois: "3", quatre: "4", cinq: "5", sept: "7", huit: "8", neuf: "9",
  zewo: "0", en: "1", de: "2", twa: "3", kat: "4", senk: "5", sis: "6", "sèt": "7", uit: "8", "nèf": "9",
  "không": "0", "một": "1", hai: "2", ba: "3", "bốn": "4", "năm": "5", "sáu": "6", "bảy": "7", "tám": "8", "chín": "9",
};
const STRICT_DIGIT_WORDS = new Set([
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "zéro", "deux", "trois", "quatre", "cinq", "sept", "huit",
  "zewo", "twa", "kat", "senk", "sis", "sèt", "uit", "nèf",
  "hai", "bốn", "sáu", "bảy", "tám", "chín",
]);
const digitKey = (t: string) => t.normalize("NFC").toLowerCase();

/**
 * Voice transcripts sometimes spell numbers out ("one two three four five ..."). Convert runs of
 * number words to digits so the patterns above can see them. Ambiguous words (oh, to, for) only
 * convert when they sit inside a run that has at least 4 unambiguous digit words.
 */
export function normalizeSpokenDigits(text: string): string {
  const tokens = text.split(/(\s+|,|-)/);
  const isWord = (t: string) => WORD_DIGITS[digitKey(t)] !== undefined || /^\d$/.test(t);
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (!isWord(tokens[i])) { out.push(tokens[i]); i++; continue; }
    let j = i;
    const run: string[] = [];
    while (j < tokens.length && (isWord(tokens[j]) || /^(\s+|,|-)$/.test(tokens[j]) || tokens[j] === "")) {
      if (isWord(tokens[j])) run.push(tokens[j]);
      j++;
    }
    const strict = run.filter((t) => STRICT_DIGIT_WORDS.has(digitKey(t)) || /^\d$/.test(t)).length;
    if (strict >= 4) {
      out.push(run.map((t) => WORD_DIGITS[digitKey(t)] ?? t).join("") + " ");
    } else {
      out.push(...tokens.slice(i, j));
    }
    i = j;
  }
  return out.join("").replace(/\s+$/, (m) => (text.endsWith(" ") ? m : ""));
}

export function filterText(input: string): FilterResult {
  const kinds = new Set<FindingKind>();
  let text = normalizeSpokenDigits(input);

  text = text.replace(MBI, () => { kinds.add("mbi"); return MASK.mbi; });
  // ZIP+4 (70821-9278) shows up in addresses; leave exactly that shape alone.
  const ssnMask = (m: string) => {
    if (ZIP4.test(m)) return m;
    kinds.add("ssn");
    return MASK.ssn;
  };
  text = text.replace(SSN, ssnMask);
  text = text.replace(LOOSE_NINE, ssnMask);

  // If nothing was masked, return the original (un-normalized) text untouched.
  if (kinds.size === 0) return { text: input, masked: false, kinds: [], notice: null };

  const list = [...kinds];
  const what =
    list.length === 2 ? "Social Security or Medicare numbers" : list[0] === "ssn" ? "your Social Security number" : "your Medicare number";
  return {
    text,
    masked: true,
    kinds: list,
    notice: `You don't need to tell me ${what}. Write it straight onto the paper form. I removed it from this chat.`,
  };
}
