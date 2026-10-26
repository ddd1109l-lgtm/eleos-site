"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, ChevronDown, ChevronUp, CircleHelp, ExternalLink, FileText, FileUp, Highlighter, Lock, MessageCircleQuestion, Printer, Send, Volume2, X } from "lucide-react";
import { DOCUMENTS, type Box, type Term } from "@/data/form";
import { genericFieldFor, type GenericField } from "@/data/genericFields";
import { CHECKED_ON, formForState } from "@/data/stateForms";
import { telHref } from "@/data/states";
import { useI18n } from "@/i18n/I18nProvider";
import { getPrefs } from "@/lib/prefs";
import { maskSensitive } from "@/lib/privacy";
import { speak } from "@/lib/speech";
import { lookupTerm } from "@/lib/terms";
import { MobileAwareFawn } from "./AskFawn";
import Avatar from "./Avatar";
import { Badge, Finish } from "./ExplainCard";
import HelpDialog from "./HelpDialog";
import { GuideOnlyNotice, useUsState } from "./StateHelp";
import TopBar from "./TopBar";
import type { Pick } from "./FormViewer";

const FormViewer = dynamic(() => import("./FormViewer"), { ssr: false });

const BUBBLES = ["bg-coral", "bg-sun", "bg-mint", "bg-sky", "bg-pink", "bg-fawn"];

/** What the user tapped: the line it sits on, the topic that line is about, and any glossary word. */
type Selected = { page?: number; line?: string; box?: Box; topic?: GenericField; term?: Term; finish?: boolean };

let counter = 0;
const nonce = () => ++counter;

// Every state except Louisiana: the state's own application (or the federal model form), with the
// same tap-to-explain, highlight-to-ask and read-aloud as the Louisiana guide. These forms have no
// hand-made field map, so the explanation comes from the words on the tapped line.
export default function GenericFormApp() {
  const tr = useI18n();
  const { ui, t, lang } = tr;
  const st = useUsState();
  const stateForm = formForState(st.code);
  const [own, setOwn] = useState<{ url: string; name: string }>();
  const [pages, setPages] = useState(0);
  const [selected, setSelected] = useState<Selected>({});
  const [scrollTarget, setScrollTarget] = useState<{ box: Box; nonce: number }>();
  const [askRequest, setAskRequest] = useState<{ text: string; nonce: number }>();
  const [showTerms, setShowTerms] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [visiblePage, setVisiblePage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const pdf = own?.url ?? stateForm.pdf;

  // A new state or a new file starts fresh.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected({});
    setPages(0);
    setVisiblePage(1);
  }, [pdf]);

  useEffect(() => () => void (own && URL.revokeObjectURL(own.url)), [own]);

  // Track which page is on screen, for the page list.
  useEffect(() => {
    if (!pages) return;
    const scroller = document.querySelector("[data-scroller]");
    if (!scroller) return;
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setVisiblePage(Number((top.target as HTMLElement).dataset.page));
      },
      { root: scroller, rootMargin: "-30% 0px -60% 0px" },
    );
    const t = setTimeout(() => scroller.querySelectorAll("[data-page]").forEach((el) => io.observe(el)), 300);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, [pages, pdf]);

  const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;

  const goToPage = (n: number) => {
    setScrollTarget({ box: { page: n, x0: 0, y0: 0, x1: 0, y1: 0 }, nonce: nonce() });
    setVisiblePage(n);
  };

  const explainText = (s: Selected) =>
    [
      s.term && `${tr.term(s.term, "term")}. ${tr.term(s.term, "plain")}`,
      s.topic ? `${t(`gf.${s.topic.id}.label`)}. ${t(`gf.${s.topic.id}.plain`)}` : !s.term && ui("lineUnknown"),
      s.topic?.where && `${ui("whereToFind")}: ${t(`gf.${s.topic.id}.where`)}`,
    ]
      .filter(Boolean)
      .join(". ");

  const onPick = useCallback(
    (p: Pick) => {
      // Prefer the exact cell that was tapped (table rows hold several questions), then the whole line.
      const run = p.line?.run;
      const runTopic = run && run.text !== p.line?.text ? genericFieldFor(run.text) : undefined;
      const use = runTopic && run ? run : p.line;
      const line = use ? maskSensitive(use.text).text : p.word;
      const next: Selected = {
        page: p.page,
        line,
        box: use ? { ...use.box, page: p.page } : undefined,
        topic: runTopic ?? (line ? genericFieldFor(line) : undefined),
        term: p.term ? lookupTerm(p.term) : undefined,
      };
      setSelected(next);
      if (next.box && !isDesktop()) setScrollTarget({ box: next.box, nonce: nonce() });
      setSheetOpen(true);
      if (getPrefs().autoRead) speak(explainText(next), lang.code, next.topic?.label);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang.code, tr],
  );

  const ask = useCallback((text: string) => setAskRequest({ text, nonce: nonce() }), []);

  const openFile = (file?: File) => {
    if (!file || !/pdf$/i.test(file.type || file.name)) return;
    setOwn({ url: URL.createObjectURL(file), name: file.name.replace(/\.pdf$/i, "") });
  };

  const openFinish = () => {
    setSelected({ finish: true });
    setSheetOpen(true);
  };

  const title = own ? own.name : stateForm.title;
  const formLabel = own ? ui("yourForm") : stateForm.model ? stateForm.formId : `${stateForm.formId}${stateForm.revision ? ` · ${stateForm.revision}` : ""}`;

  const explain = selected.finish ? (
    <Finish onClear={() => setSelected({})} onStartOver={() => setSelected({})} onPerson={() => setHelpOpen(true)} />
  ) : (
    <LineCard selected={selected} onAsk={ask} onClear={() => setSelected({})} speakText={explainText(selected)} />
  );

  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1);

  const pageList = (
    <ol className="space-y-1.5">
      {pageNumbers.map((n, idx) => {
        const active = visiblePage === n && !selected.finish;
        return (
          <li key={n}>
            <button
              type="button"
              onClick={() => goToPage(n)}
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 px-2.5 py-2 text-start ${active ? "border-ink bg-sun-soft shadow-[0_3px_0_var(--ink)]" : "border-transparent hover:bg-bg"}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink font-display text-[1rem] font-bold ${BUBBLES[idx % BUBBLES.length]}`}>{n}</span>
              <span className={`text-[1.02rem] ${active ? "font-bold" : ""}`}>{ui("pageN", { n })}</span>
            </button>
          </li>
        );
      })}
      {pages > 0 && (
        <li>
          <button
            type="button"
            onClick={openFinish}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 px-2.5 py-2.5 text-start ${selected.finish ? "border-ink bg-mint-soft shadow-[0_3px_0_var(--ink)]" : "border-transparent hover:bg-bg"}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-accent text-white">
              <Send size={16} />
            </span>
            <span className="text-[1.02rem] font-bold">{ui("finishStep")}</span>
          </button>
        </li>
      )}
    </ol>
  );

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_410px]">
        {/* Pages */}
        <nav aria-label={ui("pages")} className="hidden min-h-0 overflow-y-auto border-e-2 border-ink bg-white lg:block" dir={lang.rtl ? "rtl" : "ltr"}>
          <p className="px-4 pb-2 pt-5 font-display text-[1.25rem] font-bold">{ui("pages")}</p>
          <div className="px-2.5 pb-8">{pageList}</div>
        </nav>

        {/* Form */}
        <main data-scroller className="min-h-0 overflow-y-auto pb-56 lg:pb-12">
          {pages > 0 && (
            <div className="sticky top-0 z-10 border-b-2 border-ink bg-white/95 px-3 py-2.5 backdrop-blur lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-0.5">
                {pageNumbers.map((n, idx) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    aria-label={ui("pageN", { n })}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 text-[0.95rem] font-bold ${visiblePage === n ? "bg-ink text-white" : "bg-white"}`}
                  >
                    <span className={`size-2.5 rounded-full ${BUBBLES[idx % BUBBLES.length]}`} aria-hidden />
                    {n === 1 ? ui("pageN", { n }) : n}
                  </button>
                ))}
                <button type="button" onClick={openFinish} className="flex shrink-0 items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-3 py-1.5 text-[0.95rem] font-bold text-white">
                  <Send size={14} /> {ui("finishStep")}
                </button>
              </div>
            </div>
          )}
          <div className="px-3 pt-5 sm:px-5 lg:px-8 lg:pt-7">
            <div className="mx-auto mb-5 flex max-w-[920px] flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1.5 inline-flex rounded-full border-2 border-ink bg-sun px-3 py-0.5 text-[0.88rem] font-bold">
                  {own ? ui("yourForm") : stateForm.model ? ui("modelTitle") : ui("officialForm", { state: st.name })}
                </p>
                <h1 className="font-display text-[1.5rem] font-bold leading-tight text-accent-ink [overflow-wrap:anywhere] lg:text-[1.9rem]">{title}</h1>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[1rem] text-ink-2">
                  <span>{formLabel}</span>
                  {!own && (
                    <>
                      <a href={stateForm.source} className="inline-flex items-center gap-1 font-bold text-accent underline underline-offset-2" target="_blank" rel="noreferrer">
                        {ui("officialSource")} <ExternalLink size={14} aria-hidden />
                      </a>
                    </>
                  )}
                  <a href={pdf} className="inline-flex items-center gap-1 font-bold text-accent underline underline-offset-2" target="_blank" rel="noreferrer">
                    <Printer size={14} aria-hidden /> {ui("printForm")}
                  </a>
                </p>
              </div>
              <button type="button" onClick={() => setShowTerms(!showTerms)} aria-pressed={showTerms} className={`btn h-11 px-3 text-[0.95rem] ${showTerms ? "bg-mark" : "bg-white"}`}>
                <Highlighter size={18} aria-hidden /> {ui("highlights")}
              </button>
            </div>

            <div className="mx-auto mb-5 max-w-[920px] space-y-3">
              <GuideOnlyNotice />
              <div role="note" className="rounded-2xl border-2 border-ink bg-sky-soft px-4 py-3 text-[0.98rem] leading-relaxed text-ink-2">
                {own ? (
                  <p>{ui("openOwnFormHint")}</p>
                ) : stateForm.model ? (
                  <>
                    <p>{ui("modelBody", { state: st.name, agency: st.agency })}</p>
                    <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-bold">
                      <a href={telHref(st.phone)} className="text-accent underline underline-offset-2">
                        {ui("callLabel")} {st.phone}
                      </a>
                      <a href={st.url} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                        {ui("visitWebsite")}
                      </a>
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      {ui("officialFormNote", {
                        state: st.name,
                        formId: stateForm.formId,
                        rev: stateForm.revision ? `, ${stateForm.revision}` : "",
                        date: new Date(`${CHECKED_ON}T12:00:00`).toLocaleDateString(lang.code, { month: "long", day: "numeric", year: "numeric" }),
                      })}
                    </p>
                    {stateForm.general && <p className="mt-1.5 font-bold text-ink">{ui("generalFormNote", { state: st.name })}</p>}
                  </>
                )}
                <div className="mt-2.5 flex flex-col gap-2 border-t-2 border-dashed border-ink/20 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                  {!own && <p className="text-[0.92rem]">{ui("openOwnFormHint")}</p>}
                  {own ? (
                    <button type="button" onClick={() => setOwn(undefined)} className="btn shrink-0 self-start bg-white px-4 py-2 text-[0.98rem]">
                      <ArrowLeft size={17} aria-hidden /> {ui("backToState", { state: st.name })}
                    </button>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn shrink-0 self-start bg-white px-4 py-2 text-[0.98rem] hover:bg-sun-soft sm:self-auto">
                      <FileUp size={17} aria-hidden /> {ui("openOwnForm")}
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      openFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Keyed by file, so a new form starts with a fresh viewer. */}
            <FormViewer
              key={pdf}
              pdf={pdf}
              highlight={selected.box}
              activeTerm={selected.term?.term}
              showTerms={showTerms}
              scrollTarget={scrollTarget}
              onPick={onPick}
              onPageCount={setPages}
              onAskSelection={(text) => ask(`What does this part of the form mean: "${maskSensitive(text).text}"`)}
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
        className={`fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[28px] border-t-2 border-ink bg-white shadow-[0_-6px_0_rgb(30_27_58/0.08)] transition-[height] lg:hidden ${sheetOpen ? "h-[60dvh]" : "h-[92px]"}`}
      >
        <button type="button" onClick={() => setSheetOpen((o) => !o)} className="flex w-full shrink-0 items-center gap-3 px-5 pb-2 pt-2.5 text-start" aria-expanded={sheetOpen}>
          <span className="min-w-0 flex-1">
            <span className="mx-auto mb-2 block h-1.5 w-12 rounded-full bg-line" aria-hidden />
            <span className="block truncate pe-20 font-display text-[1.15rem] font-bold">
              {selected.finish
                ? ui("finishStep")
                : selected.term
                  ? tr.term(selected.term, "term")
                  : selected.topic
                    ? t(`gf.${selected.topic.id}.label`)
                    : selected.line
                      ? selected.line
                      : ui("tapAnything")}
            </span>
          </span>
          {sheetOpen ? <ChevronDown size={22} aria-label={ui("shrinkGuide")} /> : <ChevronUp size={22} aria-label={ui("expandGuide")} />}
        </button>
        {sheetOpen && <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 pt-1">{explain}</div>}
      </section>

      <MobileAwareFawn
        request={askRequest}
        sheetOpen={sheetOpen}
        form={{ state: st.name, title, formId: own ? "" : stateForm.formId, model: !own && stateForm.model, own: !!own, line: selected.line?.slice(0, 300), topic: selected.topic?.label }}
      />
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function LineCard({ selected, onAsk, onClear, speakText }: { selected: Selected; onAsk: (q: string) => void; onClear: () => void; speakText: string }) {
  const tr = useI18n();
  const { ui, t, lang } = tr;
  const { line, topic, term } = selected;
  const isEnglish = lang.name === "English";

  if (!line && !term) return <GenericWelcome />;

  const topicLabel = topic && t(`gf.${topic.id}.label`);
  const question = term
    ? `What does "${term.term}" mean on this form?`
    : line
      ? `What does this line on my form mean, and what should I write: "${line.slice(0, 200)}"`
      : `Can you explain "${topic?.label}"?`;

  return (
    <div className="rise space-y-4" key={`${line}-${term?.term}`} dir={lang.rtl ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        {selected.page && (
          <span className="inline-flex items-center rounded-full border-2 border-ink bg-sun px-3 py-1 text-[0.88rem] font-bold shadow-[0_2px_0_var(--ink)]">{ui("pageN", { n: selected.page })}</span>
        )}
        <button type="button" onClick={onClear} aria-label={ui("close")} className="-mt-1 ms-auto grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink">
          <X size={22} />
        </button>
      </div>

      {term && (
        <div className="rounded-2xl border-2 border-ink bg-mark px-4 py-3 shadow-[0_3px_0_var(--ink)]">
          <p className="text-[0.82rem] font-bold uppercase tracking-wide text-[#7a5600]">{ui("wordOnForm")}</p>
          <p className="mt-1 font-display text-[1.25rem] font-bold">&ldquo;{tr.term(term, "term")}&rdquo;</p>
          {!isEnglish && <p className="text-[0.92rem] text-ink-2">&ldquo;{term.term}&rdquo;</p>}
          <p className="mt-1 text-[1.08rem] leading-relaxed">{tr.term(term, "plain")}</p>
        </div>
      )}

      {line && (
        <div className="rounded-2xl border-2 border-line bg-bg px-4 py-3">
          <p className="text-[0.82rem] font-bold uppercase tracking-wide text-muted">{ui("onThisLine")}</p>
          <p className="mt-1 text-[1.02rem] leading-relaxed [overflow-wrap:anywhere]">&ldquo;{line}&rdquo;</p>
        </div>
      )}

      {topic ? (
        <div>
          <p className="text-[0.82rem] font-bold uppercase tracking-wide text-muted">{ui("whatItAsks")}</p>
          <h2 className="mt-1 font-display text-[1.55rem] font-bold leading-snug text-accent-ink">{topicLabel}</h2>
          <p className="mt-2 text-[1.14rem] leading-relaxed text-ink">{t(`gf.${topic.id}.plain`)}</p>
        </div>
      ) : (
        !term && <p className="text-[1.1rem] leading-relaxed">{ui("lineUnknown")}</p>
      )}

      {(topic?.sensitive || topic?.optional) && (
        <div className="flex flex-col gap-2">
          {topic.sensitive && (
            <Badge className="border-sky bg-sky-soft" icon={<Lock size={19} className="text-accent" />}>
              {topic.id === "medical_bills" ? ui("healthBadge") : ui("privateBadge")}
            </Badge>
          )}
          {topic.optional && (
            <Badge className="border-mint bg-mint-soft" icon={<CircleHelp size={19} className="text-mint-ink" />}>
              {ui("optionalBadge")}
            </Badge>
          )}
        </div>
      )}

      {topic?.where && (
        <div className="rounded-2xl border-2 border-ink bg-white p-4">
          <p className="flex items-center gap-2 text-[0.82rem] font-bold uppercase tracking-wide text-muted">
            <FileText size={17} className="text-accent" aria-hidden /> {ui("whereToFind")}
          </p>
          <p className="mt-1 text-[1.06rem]">{t(`gf.${topic.id}.where`)}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => onAsk(question)} className="btn bg-accent px-4 py-2.5 text-[1rem] text-white hover:bg-accent-ink">
          <MessageCircleQuestion size={19} aria-hidden /> {ui("askAboutThis")}
        </button>
        <button type="button" onClick={() => speak([line && `${ui("onThisLine")}: ${line}`, speakText].filter(Boolean).join(". "), lang.code, topicLabel)} className="btn bg-sun px-4 py-2.5 text-[1rem]">
          <Volume2 size={19} aria-hidden /> {ui("listen")}
        </button>
      </div>
    </div>
  );
}

function GenericWelcome() {
  const { ui, t, lang } = useI18n();
  return (
    <div className="space-y-4" dir={lang.rtl ? "rtl" : "ltr"}>
      <div className="flex items-center gap-3">
        <Avatar size={64} />
        <div>
          <h2 className="font-display text-[1.55rem] font-bold leading-tight text-accent-ink">{ui("welcomeHi")}</h2>
          <p className="text-[1rem] text-ink-2">{ui("aboutHi")}</p>
        </div>
      </div>
      <p className="text-[1.12rem] leading-relaxed">{ui("welcomeBody")}</p>
      <p className="rounded-2xl border-2 border-ink bg-mark px-4 py-3 text-[1.02rem]">{ui("welcomeAsk")}</p>
      <div className="rounded-2xl border-2 border-ink bg-white p-4">
        <p className="text-[0.82rem] font-bold uppercase tracking-wide text-muted">{ui("haveNearby")}</p>
        <ul className="mt-2 space-y-2">
          {DOCUMENTS.map((d, i) => (
            <li key={d.name} className="flex gap-2.5">
              <FileText size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              {/* The "why" notes point to Louisiana's sections, so other states show just the document. */}
              <strong className="text-[1.02rem]">{t(`d.${i}.name`)}</strong>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
