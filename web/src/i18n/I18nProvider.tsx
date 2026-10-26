"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { FEATURED, resolveLanguage, type Language } from "./languages";
import { EN, makeTranslator, type Translator } from "./strings";

export type { Language } from "./languages";
export const LANGUAGES = FEATURED;

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
  /** The language that last failed to translate, for the error message. */
  failed?: string;
  setLanguage: (lang: Language) => void;
};

const I18nContext = createContext<Ctx | null>(null);

const cacheKey = (name: string) => `eleos-i18n-v4-${name.toLowerCase()}`;

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(FEATURED[0]);
  const [dict, setDict] = useState<Record<string, string>>();
  const [status, setStatus] = useState<Status>("idle");
  const [failed, setFailed] = useState<string>();

  const setLanguage = useCallback(async (picked: Language) => {
    const next = resolveLanguage(picked);
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
      setFailed(next.name);
      setStatus("error");
      setLang(FEATURED[0]);
      setDict(undefined);
      try {
        localStorage.removeItem("eleos-lang");
      } catch {}
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

  const value = useMemo(() => ({ ...makeTranslator(dict), lang, status, failed, setLanguage }), [dict, lang, status, failed, setLanguage]);
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

  // On-device translation first (private, free, and works without the AI), then the AI on the server.
  const loaded = await translateInBrowser(lang).catch((e) => {
    console.warn("browser translation unavailable", e);
    return translateWithServer(lang);
  });
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

/** Names and numbers that stay the same in every language. */
const KEEP_AS_IS = new Set(["ui.brand", "ui.medicareLineTitle", "ui.ttyLabel"]);

// The browser's built-in, on-device Translator (Chrome on computers). It needs a language code.
async function translateInBrowser(lang: Language): Promise<Loaded> {
  const T = (globalThis as unknown as { Translator?: TranslatorAPI }).Translator;
  if (!T || !lang.code) throw new Error("no browser translator");
  const target = lang.code === "zh-TW" ? "zh-Hant" : lang.code.split("-")[0];
  const pair = { sourceLanguage: "en", targetLanguage: target };
  if ((await T.availability(pair)) === "unavailable") throw new Error(`no on-device model for ${target}`);
  const translator = await T.create(pair);
  const entries = Object.entries(EN).filter(([k]) => !KEEP_AS_IS.has(k));
  const strings: Record<string, string> = {};
  // Placeholders like {state} are kept out of the text the translator sees, then put back.
  const piece = async (part: string) => {
    if (!part.trim() || /^\{\w+\}$/.test(part)) return part;
    const [, lead, core, trail] = part.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
    return lead + (await translator.translate(core)) + trail;
  };
  const translate = async (v: string) => (await Promise.all(v.split(/(\{\w+\})/).map(piece))).join("");
  for (let i = 0; i < entries.length; i += 25) {
    await Promise.all(
      entries.slice(i, i + 25).map(async ([k, v]) => {
        strings[k] = await translate(v);
      }),
    );
  }
  return { strings };
}

type TranslatorAPI = {
  availability: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<{ translate: (s: string) => Promise<string> }>;
};
