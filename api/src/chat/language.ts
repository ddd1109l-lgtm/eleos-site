/**
 * The reply language comes from a box the user types into, and it lands in the system prompt.
 * Keep it to something that can only be a language name: letters (any script), spaces, hyphens,
 * apostrophes and parentheses, at most 4 words. Anything else means English.
 */
export function normalizeLanguage(raw: string | undefined): string {
  const cleaned = (raw ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{M} '’()-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.split(" ").length > 4) return "English";
  return cleaned;
}

export function isEnglish(language: string): boolean {
  return /^(en|english)\b/i.test(language.trim());
}

/** The app's built-in languages. Accepts a code or a common name in English or the language itself. */
const WHISPER: Record<string, "en" | "es" | "vi" | "fr" | "ht"> = {
  en: "en", english: "en",
  es: "es", spanish: "es", "español": "es", espanol: "es",
  vi: "vi", vietnamese: "vi", "tiếng việt": "vi", "tieng viet": "vi",
  fr: "fr", french: "fr", "français": "fr", francais: "fr",
  ht: "ht", "haitian creole": "ht", haitian: "ht", "kreyòl": "ht", kreyol: "ht", "kreyòl ayisyen": "ht", "kreyol ayisyen": "ht",
};

/** en/es/vi/fr/ht for a code or common name, else undefined. Used for the Whisper hint and for the server's own fixed text. */
export function languageCode(raw: string | undefined): "en" | "es" | "vi" | "fr" | "ht" | undefined {
  return WHISPER[(raw ?? "").normalize("NFC").trim().toLowerCase()];
}
