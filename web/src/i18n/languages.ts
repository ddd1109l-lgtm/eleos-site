// Every language the picker can search. Names come from the browser (Intl.DisplayNames), so
// "Italian", "Italiano" and "it" all find the same entry.

export type Language = { name: string; native: string; code: string; rtl?: boolean };

export const FEATURED: Language[] = [
  { name: "English", native: "English", code: "en-US" },
  { name: "Spanish", native: "Español", code: "es-US" },
  { name: "Vietnamese", native: "Tiếng Việt", code: "vi-VN" },
  { name: "French", native: "Français", code: "fr-FR" },
  { name: "Haitian Creole", native: "Kreyòl ayisyen", code: "ht-HT" },
  { name: "Chinese (Simplified)", native: "简体中文", code: "zh-CN" },
  { name: "Arabic", native: "العربية", code: "ar", rtl: true },
  { name: "Korean", native: "한국어", code: "ko-KR" },
  { name: "Tagalog", native: "Tagalog", code: "fil-PH" },
  { name: "Portuguese", native: "Português", code: "pt-BR" },
  { name: "Russian", native: "Русский", code: "ru-RU" },
  { name: "Hindi", native: "हिन्दी", code: "hi-IN" },
];

const CODES = [
  "af", "am", "ar", "az", "be", "bg", "bn", "bs", "ca", "ceb", "chr", "cs", "cy", "da", "de", "el", "en", "eo", "es", "et",
  "eu", "fa", "fi", "fil", "fr", "fy", "ga", "gd", "gl", "gu", "ha", "haw", "he", "hi", "hmn", "hr", "ht", "hu", "hy", "id",
  "ig", "is", "it", "ja", "jv", "ka", "kk", "km", "kn", "ko", "ku", "ky", "la", "lb", "lo", "lt", "lv", "mg", "mi", "mk",
  "ml", "mn", "mr", "ms", "mt", "my", "nb", "ne", "nl", "nv", "ny", "or", "pa", "pl", "ps", "pt", "qu", "ro", "ru", "rw",
  "sd", "si", "sk", "sl", "sm", "sn", "so", "sq", "sr", "st", "su", "sv", "sw", "ta", "te", "tg", "th", "ti", "tk", "to",
  "tr", "tt", "ug", "uk", "ur", "uz", "vi", "xh", "yi", "yo", "yue", "zh-CN", "zh-TW", "zu",
];

const RTL = new Set(["ar", "fa", "he", "ps", "sd", "ug", "ur", "yi"]);

function displayName(code: string, inLocale: string) {
  try {
    return new Intl.DisplayNames([inLocale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

let all: Language[] | undefined;

export function allLanguages(): Language[] {
  if (all) return all;
  const seen = new Set(FEATURED.map((l) => l.code.split("-")[0]));
  const rest = CODES.filter((c) => !seen.has(c.split("-")[0]) || c === "zh-TW")
    .map((code) => {
      const name = displayName(code, "en");
      const native = displayName(code, code);
      return { name, native: native.charAt(0).toLocaleUpperCase(code) + native.slice(1), code, rtl: RTL.has(code.split("-")[0]) };
    })
    .filter((l) => l.name !== l.code)
    .sort((a, b) => a.name.localeCompare(b.name));
  all = [...FEATURED, ...rest];
  return all;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Best matches for what the user typed, by English name, native name or code. */
export function searchLanguages(query: string): Language[] {
  const q = norm(query);
  const list = allLanguages();
  if (!q) return list;
  const scored = list
    .map((l) => {
      const fields = [norm(l.name), norm(l.native), l.code.toLowerCase()];
      const score = fields.some((f) => f === q) ? 0 : fields.some((f) => f.startsWith(q)) ? 1 : fields.some((f) => f.includes(q)) ? 2 : 9;
      return { l, score };
    })
    .filter((x) => x.score < 9)
    .sort((a, b) => a.score - b.score);
  return scored.map((x) => x.l);
}

/** Turns a typed name like "italian" into a known language, so it gets a code for speech and translation. */
export function resolveLanguage(input: Language): Language {
  if (input.code) return input;
  return searchLanguages(input.name)[0] ?? input;
}
