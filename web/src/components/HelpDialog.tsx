"use client";

import { useEffect } from "react";
import { Phone, X } from "lucide-react";
import { HELP } from "@/data/form";
import { useI18n } from "@/i18n/I18nProvider";
import StateHelp, { useUsState } from "./StateHelp";

// Free human help, reachable from the chat at any time. Louisiana keeps its verified local lines;
// every other state gets its Medicaid office plus the national SHIP and 1-800-MEDICARE.
export default function HelpDialog({ onClose }: { onClose: () => void }) {
  const { ui } = useI18n();
  const st = useUsState();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lines = [
    { title: HELP.laship.name, detail: ui("helpLaship"), phone: HELP.laship.phone, link: HELP.laship.url, color: "bg-mint-soft" },
    { title: ui("helpFormTitle"), detail: `${HELP.medicaid.name} · ${HELP.medicaid.hours} · TTY ${HELP.medicaid.tty}`, phone: HELP.medicaid.phone, color: "bg-sky-soft" },
    { title: HELP.answers.name, detail: ui("helpAnswers"), phone: HELP.answers.phone, color: "bg-sun-soft" },
  ];

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="pop card max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="help-title" className="font-display text-[1.6rem] font-bold">
              {ui("helpTitle")}
            </h2>
            <p className="mt-1 text-[1.05rem] text-ink-2">{ui("helpBody")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={ui("close")} className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-bg">
            <X size={24} />
          </button>
        </div>
        {!st.hasForm && (
          <div className="mt-5">
            <StateHelp compact />
          </div>
        )}
        <ul className={`mt-5 space-y-3 ${st.hasForm ? "" : "hidden"}`}>
          {lines.map((l) => (
            <li key={l.title} className={`rounded-2xl border-2 border-ink p-4 ${l.color}`}>
              <p className="font-display text-[1.15rem] font-bold">{l.title}</p>
              <p className="mt-1 text-[1rem] leading-relaxed text-ink-2">{l.detail}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a href={`tel:${l.phone.replace(/[^\d]/g, "")}`} className="btn bg-accent px-4 py-2.5 text-[1.05rem] text-white">
                  <Phone size={18} aria-hidden /> {l.phone}
                </a>
                {l.link && (
                  <a href={l.link} target="_blank" rel="noreferrer" className="text-[1rem] font-bold text-accent underline underline-offset-2">
                    {ui("visitWebsite")}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
