"use client";

import { ExternalLink, Landmark, Phone } from "lucide-react";
import { NATIONAL, stateByCode, telHref } from "@/data/states";
import { useI18n } from "@/i18n/I18nProvider";
import { usePrefs } from "@/lib/prefs";

/** The user's chosen state, from preferences. */
export function useUsState() {
  const { state } = usePrefs();
  return stateByCode(state);
}

/** Where to apply in the chosen state, plus the national helpers every state shares. */
export default function StateHelp({ compact = false }: { compact?: boolean }) {
  const { ui } = useI18n();
  const st = useUsState();
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border-2 border-ink bg-sky-soft p-4">
        <p className="flex items-center gap-2 font-display text-[1.15rem] font-bold">
          <Landmark size={20} aria-hidden /> {ui("yourStateTitle", { state: st.name })}
        </p>
        <p className="mt-1 text-[1rem] text-ink-2">{ui("yourStateBody", { state: st.name })}</p>
        <p className="mt-2 text-[1.08rem] font-bold">{st.agency}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          <a href={telHref(st.phone)} className="btn bg-accent px-4 py-2.5 text-[1.02rem] text-white">
            <Phone size={17} aria-hidden /> {ui("callLabel")} {st.phone}
          </a>
          <a href={st.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[1rem] font-bold text-accent underline underline-offset-2">
            {ui("visitWebsite")} <ExternalLink size={15} aria-hidden />
          </a>
        </div>
        {st.tty && (
          <p className="mt-2 text-[0.92rem] text-ink-2">
            {ui("ttyLabel")}: {st.tty}
          </p>
        )}
      </div>
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div className="rounded-2xl border-2 border-ink bg-mint-soft p-4">
          <p className="font-display text-[1.08rem] font-bold">{ui("shipTitle")}</p>
          <p className="mt-1 text-[0.98rem] text-ink-2">{ui("shipBody")}</p>
          <a href={NATIONAL.ship.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[1rem] font-bold text-accent underline underline-offset-2">
            {ui("findShip")} <ExternalLink size={15} aria-hidden />
          </a>
        </div>
        <div className="rounded-2xl border-2 border-ink bg-sun-soft p-4">
          <p className="font-display text-[1.08rem] font-bold">{ui("medicareLineTitle")}</p>
          <p className="mt-1 text-[0.98rem] text-ink-2">{ui("medicareLineBody")}</p>
          <a href={telHref(NATIONAL.medicare.phone)} className="mt-2 inline-flex items-center gap-1.5 text-[1rem] font-bold text-accent underline underline-offset-2">
            <Phone size={15} aria-hidden /> {NATIONAL.medicare.phone}
          </a>
          <p className="mt-1 text-[0.88rem] text-ink-2">
            {ui("ttyLabel")}: {NATIONAL.medicare.tty}
          </p>
        </div>
      </div>
    </div>
  );
}

/** A clear, always-visible note that this site teaches the form; it doesn't fill it out or send it. */
export function GuideOnlyNotice({ className = "" }: { className?: string }) {
  const { ui } = useI18n();
  return (
    <div role="note" className={`flex gap-3 rounded-2xl border-2 border-ink bg-mark px-4 py-3 ${className}`}>
      <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border-2 border-ink bg-white font-display text-[1.05rem] font-bold">
        i
      </span>
      <div>
        <p className="font-display text-[1.08rem] font-bold leading-snug">{ui("guideOnlyTitle")}</p>
        <p className="text-[0.98rem] leading-relaxed text-ink-2">{ui("guideOnlyBody")}</p>
      </div>
    </div>
  );
}
