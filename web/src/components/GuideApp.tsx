"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Check, ChevronDown, ChevronUp, Circle, CircleDot, Highlighter, Lock, Send, Star } from "lucide-react";
import { EXTRA_SPEC_LABELS, FIELDS, FORM, SECTIONS, fieldAt, sectionAt, sectionById, type Box } from "@/data/form";
import type { Aid } from "@/contract/spec-types";
import { useI18n } from "@/i18n/I18nProvider";
import { lookupTerm } from "@/lib/terms";
import { getPrefs } from "@/lib/prefs";
import { localFieldFor, localSectionId, shareableProgress, SPEC, specFieldsFor, useProgress, type ProgressReport } from "@/lib/progress";
import { speak, speakItems, type SpeakItem } from "@/lib/speech";
import AskFawn from "./AskFawn";
import ExplainCard, { fieldsIn, type Step } from "./ExplainCard";
import HelpDialog from "./HelpDialog";
import TopBar from "./TopBar";
import type { Pick } from "./FormViewer";

const FormViewer = dynamic(() => import("./FormViewer"), { ssr: false });

type Selected = { fieldId?: string; sectionId?: string; term?: string; finish?: boolean };

const BUBBLES = ["bg-coral", "bg-sun", "bg-mint", "bg-sky", "bg-pink", "bg-fawn"];

let counter = 0;
const nonce = () => ++counter;

export default function GuideApp() {
  const tr = useI18n();
  const { ui, lang } = tr;
  const { progress, engine, answer, markDone, reset } = useProgress();
  const [selected, setSelected] = useState<Selected>({});
  const [scrollTarget, setScrollTarget] = useState<{ box: Box; nonce: number }>();
  const [askRequest, setAskRequest] = useState<{ text: string; nonce: number }>();
  const [aid, setAid] = useState<Aid>();
  const [showTerms, setShowTerms] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [burst, setBurst] = useState<string>();

  // ?demo=finish loads a finished application and jumps straight to Finish.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("demo") !== "finish") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected({ finish: true });
    setSheetOpen(true);
  }, []);

  const field = FIELDS.find((f) => f.id === selected.fieldId);
  const section = sectionById(field?.section ?? selected.sectionId ?? "");
  const term = selected.term ? lookupTerm(selected.term) : undefined;
  const highlight = field?.box ?? (selected.sectionId ? section?.box : undefined);
  const finishOpen = selected.finish && engine.complete;

  const sectionStatus = (localId: string) => engine.sections.find((s) => localSectionId(s.id) === localId)?.status;

  const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;
  const scrollTo = (box: Box, page?: number) => setScrollTarget({ box: { ...box, page: box.page || page || 1 }, nonce: nonce() });

  const explainText = useCallback(
    (fieldId?: string, sectionId?: string, termName?: string) => {
      const f = FIELDS.find((x) => x.id === fieldId);
      const s = sectionById(sectionId ?? f?.section ?? "");
      const t = termName ? lookupTerm(termName) : undefined;
      return [
        t && `${tr.term(t, "term")}. ${tr.term(t, "plain")}`,
        f ? `${tr.field(f, "label")}. ${tr.field(f, "plain")}` : s && `${tr.section(s, "title")}. ${tr.section(s, "plain")}`,
        f && tr.field(f, "where") && `${ui("whereToFind")}: ${tr.field(f, "where")}`,
      ]
        .filter(Boolean)
        .join(". ");
    },
    [tr, ui],
  );

  const openField = useCallback(
    (localId: string, speakIt = true) => {
      const f = FIELDS.find((x) => x.id === localId);
      if (!f) return;
      setSelected({ fieldId: f.id });
      scrollTo(f.box, sectionById(f.section)?.box.page);
      setSheetOpen(true);
      if (speakIt && getPrefs().autoRead) speak(explainText(f.id), lang.code, f.label);
    },
    [explainText, lang.code],
  );

  const onPick = useCallback(
    (p: Pick) => {
      const f = fieldAt(p.page, p.x, p.y);
      const s = sectionAt(p.page, p.x, p.y);
      setSelected({ fieldId: f?.id, sectionId: f ? undefined : s?.id, term: p.term });
      // On phones the sheet covers the bottom half, so bring the field up top.
      const box = f?.box ?? s?.box;
      if (box && !isDesktop()) scrollTo(box, p.page);
      setSheetOpen(true);
      if (getPrefs().autoRead) speak(explainText(f?.id, f ? undefined : s?.id, p.term), lang.code, f?.label ?? s?.title);
    },
    [explainText, lang.code],
  );

  // After every button press, the engine decides where to go next.
  const afterPress = (r: ProgressReport, pressedSection?: string) => {
    if (pressedSection && r.sections.find((s) => s.id === pressedSection)?.status === "done") {
      setBurst(localSectionId(pressedSection));
      setTimeout(() => setBurst(undefined), 800);
    }
    if (r.nextFieldId) {
      const local = localFieldFor(r.nextFieldId);
      if (local) return openField(local);
    }
    if (r.complete) {
      setSelected({ finish: true });
      setSheetOpen(true);
    }
  };

  const onAnswer = (id: string, value: "yes" | "no") => afterPress(answer(id, value), SPEC.fields.find((f) => f.id === id)?.section);
  const onDone = (id: string) => afterPress(markDone(id), SPEC.fields.find((f) => f.id === id)?.section);

  const steps: Step[] = specFieldsFor(field?.id)
    .map((f) => ({ field: f, status: engine.statuses[f.id], answer: progress.answers[f.id] }))
    .filter((s) => s.status !== "hidden");

  const ask = useCallback((text: string) => setAskRequest({ text, nonce: nonce() }), []);

  const goToSection = (id: string) => {
    const s = sectionById(id);
    if (!s) return;
    setSelected({ sectionId: id });
    scrollTo(s.box);
    setSheetOpen(true);
    if (getPrefs().autoRead) speak(explainText(undefined, id), lang.code, s.title);
  };

  const sectionItems = (id: string): SpeakItem[] => {
    const s = sectionById(id)!;
    return [
      {
        text: [tr.section(s, "title"), tr.section(s, "plain"), tr.section(s, "skip")].filter(Boolean).join(". "),
        label: tr.section(s, "title"),
        onStart: () => {
          setSelected({ sectionId: id });
          scrollTo(s.box);
        },
      },
      ...fieldsIn(id).map((f) => ({
        text: [tr.field(f, "label"), tr.field(f, "plain"), tr.field(f, "where") && `${ui("whereToFind")}: ${tr.field(f, "where")}`].filter(Boolean).join(". "),
        label: tr.field(f, "label"),
        onStart: () => {
          setSelected({ fieldId: f.id });
          scrollTo(f.box, s.box.page);
        },
      })),
    ];
  };

  const readSection = (id: string) => speakItems(sectionItems(id), lang.code);
  const readForm = () => speakItems(SECTIONS.flatMap((s) => sectionItems(s.id)), lang.code);

  const openFinish = () => {
    if (!engine.complete) return;
    setSelected({ finish: true });
    setSheetOpen(true);
  };

  const specLabel = (id: string) => {
    if (EXTRA_SPEC_LABELS[id]) return tr.t(`sf.${id}`);
    const local = FIELDS.find((x) => x.id === localFieldFor(id));
    return local ? tr.field(local, "label")! : (SPEC.fields.find((f) => f.id === id)?.label ?? id);
  };

  const explain = (
    <ExplainCard
      steps={steps}
      onAnswer={onAnswer}
      onDone={onDone}
      aid={aid}
      onCloseAid={() => setAid(undefined)}
      onStartOver={() => {
        reset();
        setSelected({});
        window.history.replaceState(null, "", "/form");
      }}
      onPerson={() => setHelpOpen(true)}
      field={field}
      section={section}
      term={term}
      finish={finishOpen}
      onAsk={ask}
      onClear={() => setSelected({})}
      onReadSection={readSection}
      onReadForm={readForm}
    />
  );

  const stepsList = (
    <ol className="space-y-1.5">
      {SECTIONS.map((s, idx) => {
        const status = sectionStatus(s.id);
        const active = section?.id === s.id && !finishOpen;
        const specSectionId = s.id === "start" ? "cover" : s.id;
        const visible = SPEC.fields.filter((f) => f.section === specSectionId && engine.statuses[f.id] !== "hidden");
        return (
          <li key={s.id}>
            <div className={`relative flex items-center rounded-2xl border-2 ${active ? "border-ink bg-sun-soft shadow-[0_3px_0_var(--ink)]" : "border-transparent hover:bg-bg"}`}>
              <button
                type="button"
                onClick={() => goToSection(s.id)}
                aria-current={active ? "step" : undefined}
                className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2.5 text-start"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink font-display text-[1rem] font-bold ${
                    status === "done" ? "bg-mint text-white" : status === "skipped" ? "bg-line text-muted" : BUBBLES[idx % BUBBLES.length]
                  }`}
                >
                  {status === "done" ? <Star size={17} fill="currentColor" /> : (s.number ?? (s.id === "start" ? "★" : "✎"))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[1.02rem] ${active ? "font-bold" : ""} ${status === "skipped" ? "text-muted" : ""}`}>
                    {tr.section(s, "title")}
                  </span>
                  {status === "skipped" && <span className="block text-[0.85rem] font-bold text-muted">{ui("skipped")}</span>}
                  {status === "in_progress" && <span className="block text-[0.85rem] text-ink-2">{ui("inProgress")}</span>}
                </span>
              </button>
              {burst === s.id && <Confetti />}
            </div>
            {active && visible.length > 0 && (
              <ul className="mb-2 ms-7 mt-1.5 space-y-0.5 border-s-2 border-dashed border-line ps-3">
                {visible.map((f) => {
                  const st = engine.statuses[f.id];
                  const local = localFieldFor(f.id);
                  const on = local && field?.id === local;
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => local && openField(local)}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[0.95rem] ${on ? "bg-accent text-white" : "text-ink-2 hover:bg-white"}`}
                      >
                        {st === "done" ? (
                          <Check size={16} strokeWidth={3} className={on ? "" : "text-mint-ink"} aria-label={ui("doneTag")} />
                        ) : f.kind === "gate" ? (
                          <CircleDot size={16} aria-hidden />
                        ) : (
                          <Circle size={16} aria-hidden />
                        )}
                        <span className="truncate">{specLabel(f.id)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
      <li>
        <button
          type="button"
          onClick={openFinish}
          aria-disabled={!engine.complete}
          title={engine.complete ? undefined : ui("finishLocked")}
          className={`flex w-full items-center gap-3 rounded-2xl border-2 px-2.5 py-2.5 text-start ${
            finishOpen ? "border-ink bg-mint-soft shadow-[0_3px_0_var(--ink)]" : engine.complete ? "border-transparent hover:bg-bg" : "cursor-not-allowed border-transparent opacity-60"
          }`}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-accent text-white">
            {engine.complete ? <Send size={16} /> : <Lock size={15} />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[1.02rem] font-bold">{ui("finishStep")}</span>
            {!engine.complete && <span className="block text-[0.82rem] leading-snug text-muted">{ui("finishLocked")}</span>}
          </span>
        </button>
      </li>
    </ol>
  );

  const pct = engine.requiredTotal ? Math.round((engine.requiredDone / engine.requiredTotal) * 100) : 0;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_410px]">
        {/* Steps */}
        <nav aria-label={ui("steps")} className="hidden min-h-0 overflow-y-auto border-e-2 border-ink bg-white lg:block" dir={lang.rtl ? "rtl" : "ltr"}>
          <div className="px-4 pb-3 pt-5">
            <p className="font-display text-[1.25rem] font-bold">{ui("progress")}</p>
            <div className="mt-2 h-4 overflow-hidden rounded-full border-2 border-ink bg-bg" aria-hidden>
              <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[0.95rem] text-ink-2">{ui("sectionsDone", { done: engine.requiredDone, total: engine.requiredTotal })}</p>
          </div>
          <div className="px-2.5 pb-8">{stepsList}</div>
        </nav>

        {/* Form */}
        <main data-scroller className="min-h-0 overflow-y-auto pb-56 lg:pb-12">
          <div className="sticky top-0 z-10 border-b-2 border-ink bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {SECTIONS.map((s, idx) => {
                const status = sectionStatus(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goToSection(s.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 text-[0.95rem] font-bold ${
                      section?.id === s.id ? "bg-ink text-white" : status === "skipped" ? "bg-line text-muted" : "bg-white"
                    }`}
                  >
                    <span className={`size-2.5 rounded-full ${status === "done" ? "bg-mint" : BUBBLES[idx % BUBBLES.length]}`} aria-hidden />
                    {s.number ? `${s.number}. ` : ""}
                    {tr.section(s, "short")}
                    {status === "skipped" && ` · ${ui("skipped")}`}
                  </button>
                );
              })}
              {engine.complete && (
                <button type="button" onClick={openFinish} className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-3 py-1.5 text-[0.95rem] font-bold text-white">
                  <Send size={14} /> {ui("finishStep")}
                </button>
              )}
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-bg" aria-hidden>
              <div className="h-full bg-mint transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="px-3 pt-5 sm:px-5 lg:px-8 lg:pt-7">
            <div className="mx-auto mb-5 flex max-w-[920px] flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-[1.7rem] font-bold leading-tight text-accent-ink lg:text-[2rem]">{tr.t("form.name")}</h1>
                <p className="mt-1 text-[1rem] text-ink-2">
                  {FORM.code} · {ui("formBy")} ·{" "}
                  <a href={FORM.pdf} className="font-bold text-accent underline underline-offset-2" target="_blank" rel="noreferrer">
                    {ui("printForm")}
                  </a>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTerms(!showTerms)}
                aria-pressed={showTerms}
                className={`btn h-11 px-3 text-[0.95rem] ${showTerms ? "bg-mark" : "bg-white"}`}
              >
                <Highlighter size={18} aria-hidden /> {ui("highlights")}
              </button>
            </div>
            <FormViewer
              highlight={highlight}
              activeTerm={term?.term}
              showTerms={showTerms}
              scrollTarget={scrollTarget}
              onPick={onPick}
              onAskSelection={(text) => ask(`What does this part of the form mean: "${text}"`)}
            />
          </div>
        </main>

        {/* Explanation (desktop) */}
        <aside aria-label={ui("whatItAsks")} className="hidden min-h-0 overflow-y-auto border-s-2 border-ink bg-white px-5 pb-40 pt-5 lg:block">
          {explain}
        </aside>
      </div>

      {/* Explanation (phones): bottom sheet */}
      <section
        aria-label={ui("whatItAsks")}
        className={`fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] border-t-2 border-ink bg-white shadow-[0_-6px_0_rgb(30_27_58/0.08)] transition-[height] lg:hidden ${
          sheetOpen ? "h-[60dvh]" : "h-[92px]"
        }`}
      >
        <button type="button" onClick={() => setSheetOpen((o) => !o)} className="flex w-full shrink-0 items-center gap-3 px-5 pb-2 pt-2.5 text-start" aria-expanded={sheetOpen}>
          <span className="min-w-0 flex-1">
            <span className="mx-auto mb-2 block h-1.5 w-12 rounded-full bg-line" aria-hidden />
            <span className="block truncate pe-20 font-display text-[1.15rem] font-bold">
              {finishOpen ? ui("finishStep") : field ? tr.field(field, "label") : term ? tr.term(term, "term") : section ? tr.section(section, "title") : ui("tapAnything")}
            </span>
          </span>
          {sheetOpen ? <ChevronDown size={22} aria-label={ui("shrinkGuide")} /> : <ChevronUp size={22} aria-label={ui("expandGuide")} />}
        </button>
        {sheetOpen && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-1">{explain}</div>}
      </section>

      <MobileAwareFawn
        fieldId={specFieldsFor(field?.id)[0]?.id}
        localFieldId={field?.id}
        progress={shareableProgress(progress)}
        request={askRequest}
        sheetOpen={sheetOpen}
        onAid={(a) => {
          setAid(a);
          setSheetOpen(true);
        }}
      />
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

type FawnProps = {
  fieldId?: string;
  localFieldId?: string;
  progress: ReturnType<typeof shareableProgress>;
  request?: { text: string; nonce: number };
  sheetOpen: boolean;
  onAid: (aid: Aid) => void;
};

// On phones Dr. Fawn sits just above the bottom sheet; on desktop he sits in the corner.
function MobileAwareFawn({ sheetOpen, ...rest }: FawnProps) {
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

function Confetti() {
  const colors = ["var(--coral)", "var(--sun)", "var(--mint)", "var(--sky)", "var(--pink)", "var(--accent)"];
  return (
    <span aria-hidden className="pointer-events-none absolute right-6 top-1/2">
      {Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const dist = 30 + (i % 3) * 14;
        return (
          <span
            key={i}
            className="confetti"
            style={{ background: colors[i % colors.length], "--dx": `${Math.cos(angle) * dist}px`, "--dy": `${Math.sin(angle) * dist}px` } as React.CSSProperties}
          />
        );
      })}
    </span>
  );
}
