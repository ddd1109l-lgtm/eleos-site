"use client";

import { ArrowRightLeft, Check, CircleHelp, FileText, HeartPulse, LifeBuoy, Lightbulb, Lock, MessageCircleQuestion, PartyPopper, Phone, Printer, RotateCcw, Volume2, X } from "lucide-react";
import { DOCUMENTS, EXTRA_SPEC_LABELS, FIELDS, GENERIC_NEXT_STEPS, NEXT_STEPS, SUBMIT_WAYS, type Field, type Section, type Term } from "@/data/form";
import type { Aid } from "@/contract/spec-types";
import type { SpecField } from "@/lib/progress";
import { localFieldFor } from "@/lib/progress";
import AidViewer from "./AidViewer";
import StateHelp, { useUsState } from "./StateHelp";
import { useI18n } from "@/i18n/I18nProvider";
import { speak } from "@/lib/speech";
import Avatar from "./Avatar";
import MockDoc from "./MockDocs";

export type Step = { field: SpecField; status: "done" | "todo" | "hidden"; answer?: "yes" | "no" };

type Props = {
  steps: Step[];
  onAnswer: (id: string, value: "yes" | "no") => void;
  onDone: (id: string) => void;
  aid?: Aid;
  onCloseAid: () => void;
  onStartOver: () => void;
  onPerson: () => void;
  field?: Field;
  section?: Section;
  term?: Term;
  finish?: boolean;
  onAsk: (question: string) => void;
  onClear: () => void;
  onReadSection: (sectionId: string) => void;
  onReadForm: () => void;
};

const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)|[^a-z ]/g, "").trim();

export default function ExplainCard({ steps, onAnswer, onDone, aid, onCloseAid, onStartOver, onPerson, field, section, term: clickedTerm, finish, onAsk, onClear, onReadSection, onReadForm }: Props) {
  const tr = useI18n();
  const { ui, lang } = tr;

  const aidView = aid && <AidViewer aid={aid} onClose={onCloseAid} closeLabel={ui("close")} />;
  if (finish) return <Finish onClear={onClear} onStartOver={onStartOver} onPerson={onPerson} />;
  if (!field && !section && !clickedTerm)
    return (
      <div className="space-y-4">
        {aidView}
        <Welcome onReadForm={onReadForm} />
      </div>
    );

  // Skip the word card when the word is the question itself (e.g. "Marital status").
  const term = clickedTerm && field && norm(clickedTerm.term) === norm(field.label) ? undefined : clickedTerm;
  const isEnglish = lang.name === "English";

  const title = field ? tr.field(field, "label")! : section ? tr.section(section, "title")! : "";
  const body = field ? tr.field(field, "plain")! : section ? tr.section(section, "plain")! : "";
  const where = field && tr.field(field, "where");
  const tip = field && tr.field(field, "tip");
  const condition = field ? tr.field(field, "condition") : section && tr.section(section, "skip");
  const sectionLabel = section ? (section.number ? `${ui("section")} ${section.number} · ${tr.section(section, "title")}` : tr.section(section, "title")) : undefined;
  const health = section?.id === "s7";
  const spoken = [term && `${tr.term(term, "term")}. ${tr.term(term, "plain")}`, title, body, condition, where && `${ui("whereToFind")}: ${where}.`, tip]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="rise space-y-4" key={`${field?.id}-${term?.term}-${section?.id}`} dir={lang.rtl ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        {sectionLabel && (
          <span className="inline-flex items-center rounded-full border-2 border-ink bg-sun px-3 py-1 text-[0.88rem] font-bold shadow-[0_2px_0_var(--ink)]">
            {sectionLabel}
          </span>
        )}
        <button
          type="button"
          onClick={onClear}
          aria-label={ui("close")}
          className="-mt-1 ms-auto grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink"
        >
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

      {(field || (section && !term)) && (
        <div>
          {field && <p className="text-[0.82rem] font-bold uppercase tracking-wide text-muted">{term ? ui("theQuestion") : ui("whatItAsks")}</p>}
          <h2 className="mt-1 font-display text-[1.55rem] font-bold leading-snug text-accent-ink">{title}</h2>
          {field && !isEnglish && (
            <p className="mt-1 text-[0.95rem] text-muted">
              {ui("onPaper")}: &ldquo;{field.label}&rdquo;
            </p>
          )}
          <p className="mt-2 text-[1.14rem] leading-relaxed text-ink">{body}</p>
        </div>
      )}

      {steps.length > 0 && <StepActions steps={steps} onAnswer={onAnswer} onDone={onDone} />}

      {aidView}

      {(field?.sensitive || field?.optional || condition || health) && (
        <div className="flex flex-col gap-2">
          {field?.sensitive && !health && (
            <Badge className="border-sky bg-sky-soft" icon={<Lock size={19} className="text-accent" />}>
              {ui("privateBadge")}
            </Badge>
          )}
          {health && (
            <Badge className="border-sky bg-sky-soft" icon={<HeartPulse size={19} className="text-accent" />}>
              {ui("healthBadge")}
            </Badge>
          )}
          {field?.optional && (
            <Badge className="border-mint bg-mint-soft" icon={<CircleHelp size={19} className="text-mint-ink" />}>
              {ui("optionalBadge")}
            </Badge>
          )}
          {condition && (
            <Badge className="border-line bg-bg" icon={<ArrowRightLeft size={19} />}>
              {condition}
            </Badge>
          )}
        </div>
      )}

      {where && (
        <div className="rounded-2xl border-2 border-ink bg-white p-4">
          <p className="flex items-center gap-2 text-[0.82rem] font-bold uppercase tracking-wide text-muted">
            <FileText size={17} className="text-accent" aria-hidden /> {ui("whereToFind")}
          </p>
          <p className="mt-1 text-[1.06rem]">{where}</p>
          {field?.doc && (
            <div className="mt-3" aria-hidden>
              <MockDoc id={field.doc.id} spot={field.doc.spot} compact />
            </div>
          )}
        </div>
      )}

      {tip && (
        <p className="flex gap-2.5 rounded-2xl bg-fawn-soft px-4 py-3 text-[1.04rem] leading-relaxed">
          <Lightbulb size={20} className="mt-0.5 shrink-0 text-brown" aria-hidden />
          <span>{tip}</span>
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onAsk(term ? `What does "${term.term}" mean on this form?` : `Can you explain "${field?.label ?? section?.title}" in more detail?`)}
          className="btn bg-accent px-4 py-2.5 text-[1rem] text-white hover:bg-accent-ink"
        >
          <MessageCircleQuestion size={19} aria-hidden /> {ui("askAboutThis")}
        </button>
        <button type="button" onClick={() => speak(spoken, lang.code, title)} className="btn bg-sun px-4 py-2.5 text-[1rem]">
          <Volume2 size={19} aria-hidden /> {ui("listen")}
        </button>
        {section && !field && !term && (
          <button type="button" onClick={() => onReadSection(section.id)} className="btn bg-white px-4 py-2.5 text-[1rem] hover:bg-sun-soft">
            <Volume2 size={19} aria-hidden /> {ui("readSection")}
          </button>
        )}
      </div>
    </div>
  );
}

export function Badge({ className, icon, children }: { className: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 text-[1rem] font-bold ${className}`}>
      <span className="mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}

function Welcome({ onReadForm }: { onReadForm: () => void }) {
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
      <p className="text-[1.12rem] leading-relaxed">
        {ui("welcomeBody")}{" "}
      </p>
      <p className="rounded-2xl border-2 border-ink bg-mark px-4 py-3 text-[1.02rem]">{ui("welcomeAsk")}</p>
      <button type="button" onClick={onReadForm} className="btn w-full bg-sun px-4 py-3 text-[1.05rem]">
        <Volume2 size={20} aria-hidden /> {ui("readWholeForm")}
      </button>
      <div className="rounded-2xl border-2 border-ink bg-white p-4">
        <p className="text-[0.82rem] font-bold uppercase tracking-wide text-muted">{ui("haveNearby")}</p>
        <ul className="mt-2 space-y-2">
          {DOCUMENTS.map((d, i) => (
            <li key={d.name} className="flex gap-2.5">
              <FileText size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span className="text-[1.02rem]">
                <strong>{t(`d.${i}.name`)}</strong>
                <span className="text-ink-2"> · {t(`d.${i}.why`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StepActions({ steps, onAnswer, onDone }: { steps: Step[]; onAnswer: (id: string, v: "yes" | "no") => void; onDone: (id: string) => void }) {
  const tr = useI18n();
  const { ui } = tr;
  const label = (f: SpecField) => {
    if (EXTRA_SPEC_LABELS[f.id]) return tr.t(`sf.${f.id}`);
    const local = FIELDS.find((x) => x.id === localFieldFor(f.id));
    return local ? tr.field(local, "label")! : f.label;
  };
  return (
    <div className="space-y-2.5">
      {steps.map(({ field: f, status, answer }) => (
        <div key={f.id} className={`rounded-2xl border-2 border-ink p-3.5 ${status === "done" ? "bg-mint-soft" : "bg-white"}`}>
          {(steps.length > 1 || f.kind === "gate") && <p className="mb-2.5 font-display text-[1.08rem] font-bold leading-snug">{label(f)}</p>}
          {f.kind === "gate" ? (
            <div className="grid grid-cols-2 gap-2.5" role="group" aria-label={label(f)}>
              {(["yes", "no"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={answer === v}
                  onClick={() => onAnswer(f.id, v)}
                  className={`btn min-h-14 text-[1.2rem] ${answer === v ? "bg-ink text-white" : "bg-white hover:bg-sun-soft"}`}
                >
                  {answer === v && <Check size={20} strokeWidth={3} aria-hidden />}
                  {ui(v)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onDone(f.id)}
                className={`btn min-h-12 flex-1 px-4 text-[1.08rem] ${status === "done" ? "bg-mint text-white" : "bg-mint-soft hover:bg-mint/30"}`}
              >
                <Check size={20} strokeWidth={3} aria-hidden />
                {status === "done" ? ui("doneTag") : f.kind === "info" ? ui("iveRead") : ui("iWroteIt")}
              </button>
              {!f.required && status !== "done" && (
                <button type="button" onClick={() => onDone(f.id)} className="btn min-h-12 bg-white px-4 text-[1.05rem] hover:bg-bg">
                  {ui("skip")}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Shown only when the shared engine reports complete: true.
export function Finish({ onClear, onStartOver, onPerson }: { onClear: () => void; onStartOver: () => void; onPerson: () => void }) {
  const { ui, t, lang } = useI18n();
  const st = useUsState();
  // Louisiana's ways to apply are on its form; every other state applies through its own office.
  const stepKeys = st.hasForm ? NEXT_STEPS.map((_, i) => `n.${i}`) : GENERIC_NEXT_STEPS.map((_, i) => `gn.${i}`);
  const ways = st.hasForm ? SUBMIT_WAYS.map((_, i) => `${t(`w.${i}.how`)}: ${t(`w.${i}.detail`)}`) : [`${st.agency}: ${st.phone}`];
  const text = [ui("doneTitle"), ...ways, ui("nextStepsTitle"), ...stepKeys.map((k) => t(k)), ui("applyAnyway")].join(". ");
  return (
    <div className="rise space-y-4" dir={lang.rtl ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-14 place-items-center rounded-2xl border-2 border-ink bg-mint shadow-[0_3px_0_var(--ink)]">
          <PartyPopper size={28} aria-hidden />
        </span>
        <button type="button" onClick={onClear} aria-label={ui("close")} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-bg">
          <X size={22} />
        </button>
      </div>
      <h2 className="font-display text-[1.6rem] font-bold leading-snug text-accent-ink">{ui("doneTitle")}</h2>
      {st.hasForm ? <p className="text-[1.1rem] leading-relaxed">{ui("finishBody")}</p> : <StateHelp compact />}
      <ul className={`space-y-2 ${st.hasForm ? "" : "hidden"}`}>
        {SUBMIT_WAYS.map((w, i) => {
          const phone = (w.how === "Phone" || w.how === "Fax") && w.detail.match(/1-\d{3}-\d{3}-\d{4}/)?.[0];
          return (
            <li key={w.how} className="rounded-2xl border-2 border-ink bg-white px-4 py-3">
              <p className="font-display text-[1.1rem] font-bold">{t(`w.${i}.how`)}</p>
              {w.how === "Mail" ? (
                <p className="mt-1 text-[1.25rem] font-bold leading-snug">{t(`w.${i}.detail`)}</p>
              ) : (
                <p className="text-[1.02rem] text-ink-2">{t(`w.${i}.detail`)}</p>
              )}
              {phone && w.how === "Phone" && (
                <a href={`tel:${phone.replace(/\D/g, "")}`} className="btn mt-2 bg-accent px-4 py-2 text-white">
                  <Phone size={17} aria-hidden /> {phone}
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <div className="rounded-2xl bg-mint-soft p-4">
        <p className="font-display text-[1.1rem] font-bold">{ui("nextStepsTitle")}</p>
        <ul className="mt-1.5 list-disc space-y-1.5 ps-5">
          {stepKeys.map((k) => (
            <li key={k} className="text-[1.02rem] leading-relaxed">
              {t(k)}
            </li>
          ))}
        </ul>
      </div>
      <p className="rounded-2xl border-2 border-ink bg-mark px-4 py-3 font-display text-[1.15rem] font-bold">{ui("applyAnyway")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className="btn bg-white px-4 py-2.5">
          <Printer size={19} aria-hidden /> {ui("printPage")}
        </button>
        <button type="button" onClick={onPerson} className="btn bg-coral px-4 py-2.5 text-white">
          <LifeBuoy size={19} aria-hidden /> {ui("talkToPerson")}
        </button>
        <button type="button" onClick={() => speak(text, lang.code, ui("finishStep"))} className="btn bg-sun px-4 py-2.5">
          <Volume2 size={19} aria-hidden /> {ui("listen")}
        </button>
        <button type="button" onClick={onStartOver} className="btn bg-white px-4 py-2.5">
          <RotateCcw size={19} aria-hidden /> {ui("startOver")}
        </button>
      </div>
    </div>
  );
}

export function fieldsIn(sectionId: string) {
  return FIELDS.filter((f) => f.section === sectionId);
}
