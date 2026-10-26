"use client";

import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useSpeech } from "@/lib/speech";
import Avatar from "./Avatar";
import Chat, { type FormContext } from "./Chat";
import HelpDialog from "./HelpDialog";
import type { Aid, Progress } from "@/contract/spec-types";

const OPEN_EVENT = "eleos:open-chat";

/** Opens Dr. Fawn's chat from anywhere on the page (for example the header's Ask Dr. Fawn button). */
export const openChat = () => window.dispatchEvent(new Event(OPEN_EVENT));

type Props = {
  fieldId?: string;
  localFieldId?: string;
  progress?: Progress;
  onAid?: (aid: Aid) => void;
  request?: { text: string; nonce: number };
  openSignal?: number;
  /** Distance from the bottom of the screen, so the button can sit above a bottom sheet on phones. */
  bottom?: string;
  form?: FormContext;
};

// Dr. Fawn floats in the corner on every screen. Tapping him opens the chat.
// The chat stays mounted while closed, so the conversation isn't lost.
export default function AskFawn({ fieldId, localFieldId, progress, onAid, request, openSignal, bottom = "1.25rem", form }: Props) {
  const { ui } = useI18n();
  const { speaking } = useSpeech();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<{ text: string; nonce: number }>();
  const [hello, setHello] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setHello(false);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!request) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
    setPending(request);
  }, [request]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (openSignal) setOpen(true);
  }, [openSignal]);

  useEffect(() => {
    const t = setTimeout(() => setHello(false), 9000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <section
        role="dialog"
        aria-label={ui("askFawn")}
        aria-hidden={!open}
        className={`fixed z-50 flex flex-col overflow-hidden bg-white max-sm:inset-0 sm:bottom-[7.5rem] sm:right-5 sm:h-[min(640px,calc(100dvh-10rem))] sm:w-[420px] sm:rounded-3xl sm:border-2 sm:border-ink sm:shadow-[0_6px_0_var(--ink)] ${
          open ? "pop flex" : "hidden"
        }`}
      >
        <header className="flex items-center gap-3 border-b-2 border-ink bg-accent px-4 py-3 text-white">
          <Avatar size={48} talking={speaking} />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[1.3rem] font-bold leading-tight">{ui("askFawn")}</h2>
            <p className="flex items-center gap-1.5 truncate text-[0.88rem] text-white/90">
              <span className="size-2.5 shrink-0 rounded-full border border-white bg-mint" aria-hidden />
              {ui("online")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label={ui("preferPerson")}
            title={ui("preferPerson")}
            className="grid size-11 place-items-center rounded-xl bg-white/15 hover:bg-white/25"
          >
            <Phone size={21} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={ui("close")}
            className="grid size-11 place-items-center rounded-xl bg-white/15 hover:bg-white/25"
          >
            <X size={24} />
          </button>
        </header>
        <Chat fieldId={fieldId} localFieldId={localFieldId} progress={progress} pending={pending} onPerson={() => setHelpOpen(true)} onAid={onAid} form={form} />
      </section>
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

      <div className={`fixed right-4 z-40 flex items-end gap-2 sm:right-5 ${open ? "max-sm:hidden" : ""}`} style={{ bottom }}>
        {hello && !open && (
          <span className="pop mb-3 hidden rounded-2xl rounded-br-sm border-2 border-ink bg-white px-3.5 py-2 text-[1rem] font-bold shadow-[0_3px_0_var(--ink)] sm:block">
            {ui("askFawnLabel")}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setHello(false);
          }}
          aria-label={ui("askFawnLabel")}
          aria-expanded={open}
          className="group flex flex-col items-center"
        >
          <span className={open ? "" : "bob"}>
            <Avatar size={84} talking={speaking} className="drop-shadow-[0_4px_0_var(--ink)] transition group-hover:scale-105" />
          </span>
          <span className="-mt-3 rounded-full border-2 border-ink bg-sun px-3 py-0.5 font-display text-[0.95rem] font-bold text-ink shadow-[0_2px_0_var(--ink)]">
            {ui("askFawn")}
          </span>
        </button>
      </div>
    </>
  );
}

// On phones Dr. Fawn sits just above the bottom sheet; on desktop he sits in the corner.
export function MobileAwareFawn({ sheetOpen, ...rest }: Omit<Props, "bottom"> & { sheetOpen: boolean }) {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const bottom = desktop ? "1.25rem" : sheetOpen ? "calc(60dvh + 0.5rem)" : "calc(92px + 0.5rem)";
  return <AskFawn {...rest} bottom={bottom} />;
}
