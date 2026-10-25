"use client";

import { ArrowRightLeft, CircleHelp, FileText, Lock, MessageCircleQuestion, MousePointerClick, Volume2, X } from "lucide-react";
import { DOCUMENTS, type Field, type Section, type Term } from "@/data/form";
import { speak } from "@/lib/speech";

type Props = {
  field?: Field;
  section?: Section;
  term?: Term;
  onAsk: (question: string) => void;
  onClear: () => void;
};

export default function ExplainCard({ field, section, term: clickedTerm, onAsk, onClear }: Props) {
  if (!field && !section && !clickedTerm) return <Welcome />;

  // Skip the word card when the word is the question itself (e.g. "Marital status").
  const same = (a: string, b: string) => a.toLowerCase().replace(/\(.*?\)|[^a-z ]/g, "").trim() === b.toLowerCase().replace(/\(.*?\)|[^a-z ]/g, "").trim();
  const term = clickedTerm && field && same(clickedTerm.term, field.label) ? undefined : clickedTerm;

  const title = field?.label ?? section?.title ?? term?.term ?? "";
  const body = field?.plain ?? section?.plain ?? "";
  const sectionLabel = section ? (section.number ? `Section ${section.number} · ${section.title}` : section.title) : undefined;
  const spoken = [term && `${term.term}: ${term.plain}`, title, body, field?.where && `Where to find it: ${field.where}.`]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="rise space-y-4" key={`${field?.id}-${term?.term}-${section?.id}`}>
      <div className="flex items-start justify-between gap-3">
        {sectionLabel && (
          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-[0.85rem] font-bold text-accent-ink">
            {sectionLabel}
          </span>
        )}
        <button
          type="button"
          onClick={onClear}
          aria-label="Close explanation"
          className="-mr-1 -mt-1 ml-auto grid size-9 place-items-center rounded-lg text-muted hover:bg-bg hover:text-ink"
        >
          <X size={20} />
        </button>
      </div>

      {term && (
        <div className="rounded-xl border border-mark-line/40 bg-mark px-4 py-3">
          <p className="text-[0.85rem] font-bold uppercase tracking-wide text-[#7a5600]">Word on the form</p>
          <p className="mt-1 text-[1.15rem] font-bold">&ldquo;{term.term}&rdquo;</p>
          <p className="mt-1 text-[1.05rem] leading-relaxed text-ink">{term.plain}</p>
        </div>
      )}

      {(field || (section && !term)) && (
        <div>
          {field && <p className="text-[0.85rem] font-bold uppercase tracking-wide text-muted">{term ? "The question" : "What it asks"}</p>}
          <h2 className="mt-1 text-[1.4rem] font-bold leading-snug">{title}</h2>
          <p className="mt-2 text-[1.1rem] leading-relaxed text-ink-2">{body}</p>
        </div>
      )}

      {(field?.sensitive || field?.optional || field?.condition || (!field && section?.skip)) && (
        <div className="flex flex-col gap-2">
          {field?.sensitive && (
            <Badge tone="private" icon={<Lock size={18} />}>
              Private. Write this on the paper form only. Don&apos;t type it here.
            </Badge>
          )}
          {field?.optional && (
            <Badge tone="ok" icon={<CircleHelp size={18} />}>
              Optional. You can leave this blank.
            </Badge>
          )}
          {(field?.condition || (!field && section?.skip)) && (
            <Badge tone="neutral" icon={<ArrowRightLeft size={18} />}>
              {field?.condition ?? section?.skip}
            </Badge>
          )}
        </div>
      )}

      {field?.where && (
        <div className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <FileText size={22} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          <div>
            <p className="text-[0.85rem] font-bold uppercase tracking-wide text-muted">Where to find it</p>
            <p className="mt-0.5 text-[1.05rem] text-ink">{field.where}</p>
          </div>
        </div>
      )}

      {field?.tip && <p className="rounded-xl bg-bg px-4 py-3 text-[1.02rem] leading-relaxed text-ink-2">{field.tip}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onAsk(term ? `What does "${term.term}" mean on this form?` : `Can you explain "${title}" in more detail?`)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-[1rem] font-bold text-white hover:bg-accent-ink"
        >
          <MessageCircleQuestion size={19} aria-hidden /> Ask about this
        </button>
        <button
          type="button"
          onClick={() => speak(spoken)}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[1rem] font-bold text-ink hover:bg-bg"
        >
          <Volume2 size={19} aria-hidden /> Read aloud
        </button>
      </div>
    </div>
  );
}

function Badge({ tone, icon, children }: { tone: "private" | "ok" | "neutral"; icon: React.ReactNode; children: React.ReactNode }) {
  const styles = {
    private: "bg-private-soft text-private border-private/20",
    ok: "bg-ok-soft text-ok border-ok/20",
    neutral: "bg-bg text-ink-2 border-line",
  }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[1rem] font-bold ${styles}`}>
      <span className="mt-0.5 shrink-0" aria-hidden>
        {icon}
      </span>
      <span>{children}</span>
    </div>
  );
}

function Welcome() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-mark text-[#7a5600]">
          <MousePointerClick size={24} aria-hidden />
        </span>
        <h2 className="text-[1.4rem] font-bold leading-snug">Tap anything on the form</h2>
      </div>
      <p className="text-[1.1rem] leading-relaxed text-ink-2">
        We&apos;ll explain it in plain words. <mark className="rounded bg-mark px-1 text-ink">Yellow words</mark> have a
        short definition. You can also highlight any text to ask about it.
      </p>
      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-[0.85rem] font-bold uppercase tracking-wide text-muted">Have these nearby</p>
        <ul className="mt-2 space-y-2">
          {DOCUMENTS.map((d) => (
            <li key={d.name} className="flex gap-2.5">
              <FileText size={20} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span className="text-[1.02rem]">
                <strong>{d.name}</strong>
                <span className="text-ink-2"> · {d.why}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
