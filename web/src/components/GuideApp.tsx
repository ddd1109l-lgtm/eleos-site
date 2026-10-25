"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Check,
  ChevronDown,
  Highlighter,
  LifeBuoy,
  Phone,
  X,
} from "lucide-react";
import {
  FIELDS,
  FORM,
  HELP,
  SECTIONS,
  fieldAt,
  sectionAt,
  sectionById,
  type Box,
} from "@/data/form";
import { lookupTerm } from "@/lib/terms";
import ExplainCard from "./ExplainCard";
import Chat from "./Chat";
import type { Pick } from "./FormViewer";

const FormViewer = dynamic(() => import("./FormViewer"), { ssr: false });

type Selected = { fieldId?: string; sectionId?: string; term?: string };

const SCALES = [1, 1.125, 1.25];

export default function GuideApp() {
  const [selected, setSelected] = useState<Selected>({});
  const [scrollTarget, setScrollTarget] = useState<{
    box: Box;
    nonce: number;
  }>();
  const [pending, setPending] = useState<{ text: string; nonce: number }>();
  const [done, setDone] = useState<string[]>([]);
  const [scaleIdx, setScaleIdx] = useState(0);
  const [showTerms, setShowTerms] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"explain" | "ask">("explain");
  const [sheetOpen, setSheetOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const [explainOpen, setExplainOpen] = useState(true);

  // Progress and text size stay on this device only.
  useEffect(() => {
    try {
      // Read after mount so the server render and first client render match.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(JSON.parse(localStorage.getItem("msp-done") ?? "[]"));
      setScaleIdx(Number(localStorage.getItem("msp-scale") ?? 0) || 0);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ui-scale",
      String(SCALES[scaleIdx]),
    );
    try {
      localStorage.setItem("msp-scale", String(scaleIdx));
    } catch {}
  }, [scaleIdx]);

  const toggleDone = (id: string) => {
    setDone((d) => {
      const next = d.includes(id) ? d.filter((x) => x !== id) : [...d, id];
      try {
        localStorage.setItem("msp-done", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const field = FIELDS.find((f) => f.id === selected.fieldId);
  const section = sectionById(field?.section ?? selected.sectionId ?? "");
  const term = selected.term ? lookupTerm(selected.term) : undefined;
  const highlight =
    field?.box ?? (selected.sectionId ? section?.box : undefined);

  const onPick = useCallback((p: Pick) => {
    const f = fieldAt(p.page, p.x, p.y);
    const s = sectionAt(p.page, p.x, p.y);
    setSelected({
      fieldId: f?.id,
      sectionId: f ? undefined : s?.id,
      term: p.term,
    });
    // On phones the guide sheet covers the bottom half, so bring the field up top.
    const box = f?.box ?? s?.box;
    if (box && !window.matchMedia("(min-width: 1024px)").matches) {
      setScrollTarget({ box: { ...box, page: box.page || p.page }, nonce: nonce() });
    }
    setMobileTab("explain");
    setSheetOpen(true);
    setExplainOpen(true);
  }, []);

  const ask = useCallback((text: string) => {
    setPending({ text, nonce: nonce() });
    setMobileTab("ask");
    setSheetOpen(true);
    setExplainOpen(false);
  }, []);

  const goToSection = (id: string) => {
    const s = sectionById(id);
    if (!s) return;
    setSelected({ sectionId: id });
    setScrollTarget({ box: s.box, nonce: nonce() });
  };

  const currentSectionId = section?.id;
  const progress = useMemo(
    () => Math.round((done.length / SECTIONS.length) * 100),
    [done],
  );

  const explain = (
    <ExplainCard
      field={field}
      section={section}
      term={term}
      onAsk={ask}
      onClear={() => setSelected({})}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <Header
        scaleIdx={scaleIdx}
        setScaleIdx={setScaleIdx}
        showTerms={showTerms}
        setShowTerms={setShowTerms}
        onHelp={() => setHelpOpen(true)}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[256px_minmax(0,1fr)_420px]">
        {/* Section list */}
        <nav
          aria-label="Form sections"
          className="hidden min-h-0 overflow-y-auto border-r border-line bg-surface lg:block"
        >
          <div className="px-5 pb-3 pt-5">
            <p className="text-[0.85rem] font-bold uppercase tracking-wide text-muted">
              Your progress
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-bg"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-ok transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.9rem] text-ink-2">
              {done.length} of {SECTIONS.length} sections done
            </p>
          </div>
          <ol className="space-y-0.5 px-2.5 pb-6">
            {SECTIONS.map((s) => {
              const isDone = done.includes(s.id);
              const active = currentSectionId === s.id;
              return (
                <li
                  key={s.id}
                  className={`group flex items-center rounded-xl ${active ? "bg-accent-soft" : "hover:bg-bg"}`}
                >
                  <button
                    type="button"
                    onClick={() => goToSection(s.id)}
                    aria-current={active ? "step" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2.5 text-left"
                  >
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full text-[0.9rem] font-bold ${
                        isDone
                          ? "bg-ok text-white"
                          : active
                            ? "bg-accent text-white"
                            : "bg-bg text-ink-2"
                      }`}
                    >
                      {isDone ? (
                        <Check size={17} strokeWidth={3} />
                      ) : (
                        (s.number ?? "•")
                      )}
                    </span>
                    <span
                      className={`truncate text-[1rem] ${active ? "font-bold text-accent-ink" : "text-ink"}`}
                    >
                      {s.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDone(s.id)}
                    aria-label={
                      isDone
                        ? `Mark ${s.title} as not done`
                        : `Mark ${s.title} as done`
                    }
                    aria-pressed={isDone}
                    className={`mr-1.5 grid size-8 shrink-0 place-items-center rounded-lg border ${
                      isDone
                        ? "border-ok bg-ok-soft text-ok"
                        : "border-line text-transparent hover:text-muted group-hover:border-muted/50"
                    }`}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Form */}
        <main data-scroller className="min-h-0 overflow-y-auto pb-40 lg:pb-10">
          <div className="sticky top-0 z-10 border-b border-line bg-bg/90 px-4 py-2.5 backdrop-blur lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSection(s.id)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[0.95rem] ${
                    currentSectionId === s.id
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-surface text-ink"
                  }`}
                >
                  {s.number ? `${s.number}. ` : ""}
                  {s.short}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 pt-5 lg:px-8 lg:pt-7">
            <div className="mx-auto mb-5 flex max-w-[920px] flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[1.6rem] font-bold leading-tight lg:text-[1.85rem]">
                  {FORM.name}
                </h1>
                <p className="mt-1 text-[1rem] text-muted">
                  {FORM.code} · Louisiana Department of Health ·{" "}
                  <a
                    href={FORM.pdf}
                    className="text-accent underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Print the form
                  </a>
                </p>
              </div>
            </div>
            <FormViewer
              highlight={highlight}
              activeTerm={term?.term}
              showTerms={showTerms}
              scrollTarget={scrollTarget}
              onPick={onPick}
              onAskSelection={(text) =>
                ask(`What does this part of the form mean: "${text}"`)
              }
            />
          </div>
        </main>

        {/* Guide panel (desktop) */}
        {isDesktop && (
          <aside
            aria-label="Guide"
            className="hidden min-h-0 flex-col border-l border-line bg-surface lg:flex"
          >
            {explainOpen ? (
              <div className="max-h-[55%] shrink-0 overflow-y-auto border-b border-line px-5 py-5">
                {explain}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setExplainOpen(true)}
                className="flex shrink-0 items-center gap-3 border-b border-line px-5 py-3.5 text-left hover:bg-bg"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.8rem] font-bold uppercase tracking-wide text-muted">
                    {field || section || term ? "Looking at" : "Tip"}
                  </span>
                  <span className="block truncate text-[1.02rem] font-bold">
                    {field?.label ?? term?.term ?? section?.title ?? "Tap anything on the form to see what it means"}
                  </span>
                </span>
                <ChevronDown size={20} className="shrink-0 text-muted" aria-hidden />
                <span className="sr-only">Show explanation</span>
              </button>
            )}
            <h2 className="px-5 pt-4 text-[1.15rem] font-bold">Ask a question</h2>
            <Chat fieldId={field?.id} pending={pending} />
          </aside>
        )}
      </div>

      {/* Guide panel (mobile bottom sheet) */}
      {!isDesktop && (
        <section
          aria-label="Guide"
          className={`fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl border-t border-line bg-surface shadow-[0_-8px_30px_rgb(15_27_45/0.12)] transition-[height] lg:hidden ${
            sheetOpen ? "h-[62dvh]" : "h-[132px]"
          }`}
        >
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            className="flex w-full items-center justify-center pt-2"
            aria-label={sheetOpen ? "Shrink the guide" : "Expand the guide"}
            aria-expanded={sheetOpen}
          >
            <span className="h-1.5 w-12 rounded-full bg-line" />
          </button>
          <div className="flex gap-1 px-4 pt-2" role="tablist">
            {(["explain", "ask"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={mobileTab === t}
                onClick={() => {
                  setMobileTab(t);
                  setSheetOpen(true);
                }}
                className={`flex-1 rounded-xl py-2.5 text-[1.02rem] font-bold ${mobileTab === t ? "bg-ink text-white" : "bg-bg text-ink-2"}`}
              >
                {t === "explain" ? "What it means" : "Ask a question"}
              </button>
            ))}
            {sheetOpen && (
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Shrink the guide"
                className="grid size-11 place-items-center rounded-xl text-muted"
              >
                <ChevronDown size={22} />
              </button>
            )}
          </div>
          <div
            className={`min-h-0 flex-1 flex-col ${sheetOpen ? "flex" : "hidden"}`}
          >
            {mobileTab === "explain" ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {explain}
              </div>
            ) : (
              <Chat fieldId={field?.id} pending={pending} />
            )}
          </div>
        </section>
      )}

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

let counter = 0;
const nonce = () => ++counter;

// Only one chat is mounted at a time, so a question is never sent twice.
function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function Header({
  scaleIdx,
  setScaleIdx,
  showTerms,
  setShowTerms,
  onHelp,
}: {
  scaleIdx: number;
  setScaleIdx: (n: number) => void;
  showTerms: boolean;
  setShowTerms: (b: boolean) => void;
  onHelp: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <Logo />
        <div className="min-w-0 leading-tight">
          <p className="hidden truncate text-[1.1rem] font-bold min-[440px]:block">
            Medicare Savings Guide
          </p>
          <p className="hidden truncate text-[0.85rem] text-muted sm:block">
            Plain-language help for Louisiana&apos;s application
          </p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowTerms(!showTerms)}
          aria-pressed={showTerms}
          className={`hidden h-10 items-center gap-2 rounded-xl border px-3 text-[0.95rem] font-bold md:inline-flex ${
            showTerms
              ? "border-mark-line/50 bg-mark text-[#5c4100]"
              : "border-line text-ink-2 hover:bg-bg"
          }`}
        >
          <Highlighter size={18} aria-hidden /> Highlights{" "}
          {showTerms ? "on" : "off"}
        </button>
        <div
          className="flex h-10 items-center rounded-xl border border-line"
          role="group"
          aria-label="Text size"
        >
          {SCALES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setScaleIdx(i)}
              aria-pressed={scaleIdx === i}
              aria-label={["Normal text", "Large text", "Largest text"][i]}
              className={`grid h-full w-10 place-items-center font-bold first:rounded-l-xl last:rounded-r-xl ${
                scaleIdx === i ? "bg-ink text-white" : "text-ink-2 hover:bg-bg"
              }`}
              style={{ fontSize: `${14 + i * 3}px` }}
            >
              A
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onHelp}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-3.5 text-[0.98rem] font-bold text-white hover:bg-accent-ink"
        >
          <LifeBuoy size={19} aria-hidden />
          <span className="hidden sm:inline">Talk to a person</span>
          <span className="sm:hidden">Help</span>
        </button>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      aria-hidden
      className="shrink-0"
    >
      <rect width="36" height="36" rx="10" fill="var(--accent)" />
      <rect x="10" y="8" width="16" height="20" rx="2.5" fill="#fff" />
      <rect
        x="13"
        y="13"
        width="10"
        height="2.2"
        rx="1.1"
        fill="var(--mark-line)"
      />
      <rect x="13" y="17.5" width="8" height="2" rx="1" fill="#c9d4ee" />
      <rect x="13" y="21.5" width="6" height="2" rx="1" fill="#c9d4ee" />
    </svg>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lines = [
    {
      title: HELP.laship.name,
      detail:
        "Free, private, one-on-one help from a trained counselor. They can also check if you might get full Medicaid.",
      phone: HELP.laship.phone,
      link: HELP.laship.url,
    },
    {
      title: "Questions about this form",
      detail: `${HELP.medicaid.name} · ${HELP.medicaid.hours} · TTY ${HELP.medicaid.tty}`,
      phone: HELP.medicaid.phone,
    },
    {
      title: HELP.answers.name,
      detail:
        "Louisiana's aging and disability resource center. You can also apply through them.",
      phone: HELP.answers.phone,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="rise w-full max-w-lg rounded-3xl bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="help-title" className="text-[1.5rem] font-bold">
              Talk to a real person
            </h2>
            <p className="mt-1 text-[1.05rem] text-ink-2">
              These calls are free. You can ask a family member to join you.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-bg"
          >
            <X size={22} />
          </button>
        </div>
        <ul className="mt-5 space-y-3">
          {lines.map((l) => (
            <li key={l.title} className="rounded-2xl border border-line p-4">
              <p className="text-[1.1rem] font-bold">{l.title}</p>
              <p className="mt-1 text-[1rem] leading-relaxed text-ink-2">
                {l.detail}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <a
                  href={`tel:${l.phone.replace(/[^\d]/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[1.05rem] font-bold text-white hover:bg-accent-ink"
                >
                  <Phone size={18} aria-hidden /> {l.phone}
                </a>
                {l.link && (
                  <a
                    href={l.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[1rem] text-accent underline underline-offset-2"
                  >
                    Visit website
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
