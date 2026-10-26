"use client";

import Link from "next/link";
import { MessageCircle, Pause, Play, Square, Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { SCALES, setPrefs, usePrefs } from "@/lib/prefs";
import { pauseSpeaking, resumeSpeaking, stopSpeaking, useSpeech } from "@/lib/speech";
import { openChat } from "./AskFawn";
import { LanguagePicker, StatePicker } from "./Pickers";

export default function TopBar() {
  const { ui } = useI18n();
  const prefs = usePrefs();

  return (
    <>
      <header className="relative z-30 flex h-[4.25rem] shrink-0 items-center gap-1.5 border-b-2 border-ink bg-white px-2 sm:gap-3 sm:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={ui("home")}>
          <Logo />
          <span className="hidden min-w-0 leading-tight min-[480px]:block">
            <span className="block font-display text-[1.35rem] font-bold leading-none text-accent-ink">{ui("brand")}</span>
            <span className="hidden truncate text-[0.82rem] text-muted lg:block">{ui("tagline")}</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <StatePicker />
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
          <div className="hidden h-11 items-center overflow-hidden rounded-[14px] border-2 border-ink shadow-[0_3px_0_var(--ink)] lg:flex" role="group" aria-label={ui("textSize")}>
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
            <span className="relative hidden size-2.5 sm:flex" aria-hidden>
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
