// Masks Social Security numbers and Medicare Beneficiary Identifiers before text leaves the browser
// (and again on the server). MBI pattern follows the CMS position rules; dashes and spaces allowed.

// Same separator in both places (or none), so ZIP+4 codes like 70821-9278 are left alone.
const SSN = /\b(?:\d{3}-\d{2}-\d{4}|\d{3} \d{2} \d{4}|\d{3}\.\d{2}\.\d{4}|\d{9})\b/g;

// Letters exclude S, L, O, I, B, Z. Positions: 1 num(1-9), 2 alpha, 3 alnum, 4 num, 5 alpha, 6 alnum, 7 num, 8 alpha, 9 alpha, 10 num, 11 num.
const A = "[AC-HJKMNP-RT-Y]";
const AN = "[AC-HJKMNP-RT-Y0-9]";
const SEP = "[-\\s]?";
const MBI = new RegExp(`\\b[1-9]${A}${AN}\\d${SEP}${A}${AN}\\d${SEP}${A}${A}\\d\\d\\b`, "gi");

export type MaskResult = { text: string; masked: ("ssn" | "mbi")[] };

export function maskSensitive(input: string): MaskResult {
  const masked: MaskResult["masked"] = [];
  let text = input.replace(MBI, () => {
    masked.push("mbi");
    return "[Medicare number removed]";
  });
  text = text.replace(SSN, () => {
    masked.push("ssn");
    return "[Social Security number removed]";
  });
  return { text, masked };
}

export const PRIVACY_NOTE =
  "You don't need to tell me that number. Write it straight onto the paper form. I removed it before sending your message.";
