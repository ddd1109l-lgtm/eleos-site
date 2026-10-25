"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Globe, Loader2, MessageCircle, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { LANGUAGES, useI18n } from "@/i18n/I18nProvider";
import { SCALES, setPrefs, usePrefs } from "@/lib/prefs";
import { pauseSpeaking, resumeSpeaking, stopSpeaking, useSpeech } from "@/lib/speech";
import { openChat } from "./AskFawn";

export default function TopBar() {
  const { ui } = useI18n();
  const prefs = usePrefs();

  return (
    <>
      <header className="relative z-30 flex h-[4.25rem] shrink-0 items-center gap-2 border-b-2 border-ink bg-white px-3 sm:gap-3 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={ui("home")}>
          <Logo />
          <span className="hidden min-w-0 leading-tight min-[480px]:block">
            <span className="block font-display text-[1.35rem] font-bold leading-none text-accent-ink">{ui("brand")}</span>
            <span className="hidden truncate text-[0.82rem] text-muted lg:block">{ui("tagline")}</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LanguagePicker />
          <button
            type="button"
            onClick={() => {
              if (prefs.autoRead) stopSpeaking();
              setPrefs({ autoRead: !prefs.autoRead });
            }}
            aria-pressed={prefs.autoRead}
            className={`btn h-11 px-3 text-[0.95rem] ${prefs.autoRead ? "bg-sun" : "bg-white hover:bg-sun-soft"}`}
          >
            {prefs.autoRead ? <Volume2 size={19} aria-hidden /> : <VolumeX size={19} aria-hidden />}
            <span className="hidden md:inline">{prefs.autoRead ? ui("readAloudOn") : ui("readAloudOff")}</span>
            <span className="sr-only md:hidden">{ui("readAloud")}</span>
          </button>
          <div className="hidden h-11 items-center overflow-hidden rounded-[14px] border-2 border-ink shadow-[0_3px_0_var(--ink)] sm:flex" role="group" aria-label={ui("textSize")}>
            {SCALES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPrefs({ scale: i })}
                aria-pressed={prefs.scale === i}
                aria-label={[ui("textNormal"), ui("textLarge"), ui("textLargest")][i]}
                className={`grid h-full w-10 place-items-center font-display font-bold ${prefs.scale === i ? "bg-ink text-white" : "bg-white text-ink hover:bg-sun-soft"}`}
                style={{ fontSize: `${14 + i * 3}px` }}
              >
                A
              </button>
            ))}
          </div>
          <button type="button" onClick={openChat} className="btn h-11 bg-coral px-3 text-[0.95rem] text-white">
            <span className="relative flex size-2.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-white" />
            </span>
            <MessageCircle size={19} aria-hidden />
            <span className="hidden sm:inline">{ui("liveChat")}</span>
            <span className="sm:hidden">{ui("chatShort")}</span>
          </button>
        </div>
      </header>
      <SpeechBar />
    </>
  );
}

function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <rect x="1.5" y="1.5" width="37" height="37" rx="11" fill="var(--accent)" stroke="var(--ink)" strokeWidth="3" />
      <rect x="11" y="9" width="18" height="22" rx="3" fill="#fff" stroke="var(--ink)" strokeWidth="2" />
      <rect x="14.5" y="14" width="11" height="2.6" rx="1.3" fill="var(--sun)" />
      <rect x="14.5" y="19" width="8" height="2.2" rx="1.1" fill="#c9d0f3" />
      <rect x="14.5" y="23.5" width="6" height="2.2" rx="1.1" fill="#c9d0f3" />
      <path d="M27 27 l3 3 l5 -7" fill="none" stroke="var(--mint)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LanguagePicker() {
  const { ui, lang, setLanguage, status } = useI18n();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (name: string) => {
    const known = LANGUAGES.find((l) => l.name.toLowerCase() === name.toLowerCase() || l.native.toLowerCase() === name.toLowerCase());
    void setLanguage(known ?? { name, native: name, code: "" });
    setOpen(false);
    setCustom("");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="btn h-11 bg-sky-soft px-3 text-[0.95rem] hover:bg-sky/30"
      >
        {status === "loading" ? <Loader2 size={19} className="animate-spin" aria-hidden /> : <Globe size={19} aria-hidden />}
        <span className="max-w-[7.5rem] truncate">{status === "loading" ? ui("translating") : lang.native}</span>
        <span className="sr-only">{ui("chooseLanguage")}</span>
      </button>
      {status === "error" && (
        <p role="alert" className="pop absolute right-0 top-14 w-64 rounded-2xl border-2 border-ink bg-coral-soft p-3 text-[0.95rem] shadow-[0_3px_0_var(--ink)]">
          {ui("translateFail")}
        </p>
      )}
      {open && (
        <div className="pop absolute right-0 top-14 z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-3xl border-2 border-ink bg-white p-3 shadow-[0_5px_0_var(--ink)]" style={{ transformOrigin: "top right" }}>
          <p className="px-2 pb-2 font-display text-[1.15rem] font-bold">{ui("chooseLanguage")}</p>
          <ul role="listbox" aria-label={ui("chooseLanguage")} className="grid max-h-[50vh] grid-cols-2 gap-1.5 overflow-y-auto">
            {LANGUAGES.map((l) => (
              <li key={l.name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={lang.name === l.name}
                  onClick={() => choose(l.name)}
                  className={`flex w-full items-center justify-between gap-1 rounded-xl border-2 px-3 py-2 text-left text-[0.98rem] ${
                    lang.name === l.name ? "border-ink bg-sun-soft font-bold" : "border-transparent hover:border-line hover:bg-bg"
                  }`}
                >
                  <span className="truncate" lang={l.code}>
                    {l.native}
                  </span>
                  {lang.name === l.name && <Check size={16} className="shrink-0" aria-hidden />}
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 border-t-2 border-line pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (custom.trim()) choose(custom.trim());
            }}
          >
            <label htmlFor="custom-lang" className="px-1 text-[0.9rem] font-bold text-ink-2">
              {ui("otherLanguage")}
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="custom-lang"
                value={custom}
                onChange={(e) => setCustom(e.target.value.slice(0, 40))}
                placeholder={ui("otherPlaceholder")}
                className="min-w-0 flex-1 rounded-xl border-2 border-ink px-3 py-2 text-[1rem] outline-none focus:ring-4 focus:ring-accent/20"
              />
              <button type="submit" disabled={!custom.trim()} className="btn bg-accent px-3 text-white" aria-label={ui("useLanguage")}>
                <Check size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Floating "now reading" pill with pause and stop.
function SpeechBar() {
  const { ui } = useI18n();
  const { speaking, paused, label } = useSpeech();
  if (!speaking) return null;
  return (
    <div className="pop fixed left-1/2 top-[4.9rem] z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-ink bg-ink py-1.5 pl-4 pr-1.5 text-white shadow-[0_4px_0_rgb(0_0_0/0.25)]">
      <Volume2 size={18} aria-hidden className="text-sun" />
      <span className="max-w-[45vw] truncate text-[0.95rem] font-bold">
        {ui("nowReading")}
        {label ? `: ${label}` : ""}
      </span>
      <button
        type="button"
        onClick={paused ? resumeSpeaking : pauseSpeaking}
        aria-label={paused ? ui("resume") : ui("pause")}
        className="grid size-9 place-items-center rounded-full bg-white/15 hover:bg-white/25"
      >
        {paused ? <Play size={17} /> : <Pause size={17} />}
      </button>
      <button type="button" onClick={stopSpeaking} aria-label={ui("stop")} className="grid size-9 place-items-center rounded-full bg-coral hover:brightness-110">
        <Square size={15} fill="currentColor" />
      </button>
    </div>
  );
}
