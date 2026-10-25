"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EN, makeTranslator, type Translator } from "./strings";

export type Language = { name: string; native: string; code: string; rtl?: boolean };

export const LANGUAGES: Language[] = [
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

// Spanish and Vietnamese (the languages the paper form offers), French and Haitian Creole ship
// with the app, so they work offline. Every other language is translated on demand and cached on this device.
const BUILT_IN: Record<string, () => Promise<Record<string, string>>> = {
  Spanish: () => import("./es").then((m) => m.default),
  Vietnamese: () => import("./vi").then((m) => m.default),
  French: () => import("./fr").then((m) => m.default),
  "Haitian Creole": () => import("./ht").then((m) => m.default),
};

type Status = "idle" | "loading" | "error";

type Ctx = Translator & {
  lang: Language;
  status: Status;
  setLanguage: (lang: Language) => void;
};

const I18nContext = createContext<Ctx | null>(null);

const cacheKey = (name: string) => `eleos-i18n-v1-${name.toLowerCase()}`;

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(LANGUAGES[0]);
  const [dict, setDict] = useState<Record<string, string>>();
  const [status, setStatus] = useState<Status>("idle");

  const setLanguage = useCallback(async (next: Language) => {
    try {
      localStorage.setItem("eleos-lang", JSON.stringify(next));
    } catch {}
    if (next.name === "English") {
      setLang(next);
      setDict(undefined);
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      const loaded = await loadDictionary(next);
      setDict(loaded.strings);
      setLang({ ...next, code: loaded.code ?? next.code, rtl: loaded.rtl ?? next.rtl });
      setStatus("idle");
    } catch (e) {
      console.error("translation failed", e);
      setStatus("error");
      setLang(LANGUAGES[0]);
      setDict(undefined);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("eleos-lang");
      // Restore the saved language after mount so server and client renders match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) void setLanguage(JSON.parse(saved));
    } catch {}
  }, [setLanguage]);

  useEffect(() => {
    document.documentElement.lang = lang.code;
  }, [lang]);

  const value = useMemo(() => ({ ...makeTranslator(dict), lang, status, setLanguage }), [dict, lang, status, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}

type Loaded = { strings: Record<string, string>; code?: string; rtl?: boolean };

async function loadDictionary(lang: Language): Promise<Loaded> {
  const builtIn = BUILT_IN[lang.name];
  if (builtIn) return { strings: await builtIn() };

  try {
    const cached = localStorage.getItem(cacheKey(lang.name));
    if (cached) return JSON.parse(cached);
  } catch {}

  const loaded = await translateWithServer(lang).catch(() => translateInBrowser(lang));
  try {
    localStorage.setItem(cacheKey(lang.name), JSON.stringify(loaded));
  } catch {}
  return loaded;
}

async function translateWithServer(lang: Language): Promise<Loaded> {
  const entries = Object.entries(EN);
  const chunks: [string, string][][] = [];
  for (let i = 0; i < entries.length; i += 70) chunks.push(entries.slice(i, i + 70));

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang.name, strings: Object.fromEntries(chunk) }),
      });
      if (!res.ok) throw new Error(`translate ${res.status}`);
      return (await res.json()) as { strings: Record<string, string>; code?: string; rtl?: boolean };
    }),
  );
  const strings = Object.assign({}, ...results.map((r) => r.strings));
  if (Object.keys(strings).length < entries.length * 0.9) throw new Error("incomplete translation");
  return { strings, code: results[0]?.code, rtl: results[0]?.rtl };
}

// Fallback: Chrome's on-device Translator API, when the language has a known code.
async function translateInBrowser(lang: Language): Promise<Loaded> {
  const T = (globalThis as unknown as { Translator?: TranslatorAPI }).Translator;
  if (!T || !lang.code) throw new Error("no browser translator");
  const target = lang.code.split("-")[0];
  const translator = await T.create({ sourceLanguage: "en", targetLanguage: target });
  const strings: Record<string, string> = {};
  for (const [k, v] of Object.entries(EN)) strings[k] = await translator.translate(v);
  return { strings };
}

type TranslatorAPI = {
  create: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<{ translate: (s: string) => Promise<string> }>;
};
