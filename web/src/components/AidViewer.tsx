"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import type { Aid } from "@/contract/spec-types";
import type { DocId } from "@/data/form";
import MockDoc from "./MockDocs";

// Shows a picture aid from the backend's show_aid action: a form page (public/aids/form/…)
// with its highlight box, or one of our SAMPLE documents with the matching line pulsing.

const DOC_AIDS: Record<string, { id: DocId; spot: string }> = {
  "doc.medicare_card.name": { id: "medicare_card", spot: "name" },
  "doc.medicare_card.number": { id: "medicare_card", spot: "number" },
  "doc.award_letter.before_deductions": { id: "award_letter", spot: "before" },
  "doc.bank_statement.balance": { id: "bank_statement", spot: "balance" },
};

export default function AidViewer({ aid, onClose, closeLabel }: { aid: Aid; onClose: () => void; closeLabel: string }) {
  const [zoom, setZoom] = useState(false);
  const doc = DOC_AIDS[aid.id];
  const showTag = aid.placeholder && process.env.NODE_ENV === "development" && !doc;

  const picture = doc ? (
    <MockDoc id={doc.id} spot={doc.spot} />
  ) : (
    <div className="relative overflow-hidden rounded-xl border-2 border-ink bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/aids/${aid.image}`} alt={aid.spoken} className="block w-full" />
      <div
        className="aid-box pointer-events-none absolute rounded-md"
        style={{ left: `${aid.box.x}%`, top: `${aid.box.y}%`, width: `${aid.box.w}%`, height: `${aid.box.h}%` }}
      />
      {showTag && <span className="absolute left-2 top-2 rounded bg-coral px-2 py-0.5 text-xs font-bold text-white">box not final</span>}
    </div>
  );

  return (
    <figure className="rise rounded-2xl border-2 border-ink bg-sky-soft p-3 shadow-[0_3px_0_var(--ink)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <figcaption className="font-display text-[1.05rem] font-bold">{aid.caption}</figcaption>
        <button type="button" onClick={onClose} aria-label={closeLabel} className="grid size-9 place-items-center rounded-lg hover:bg-white">
          <X size={20} />
        </button>
      </div>
      <button type="button" onClick={() => setZoom(true)} className="relative block w-full text-left" aria-label={aid.spoken}>
        {picture}
        <span className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full border-2 border-ink bg-white" aria-hidden>
          <ZoomIn size={18} />
        </span>
      </button>
      {zoom && (
        <div className="fixed inset-0 z-[70] overflow-auto bg-ink/80 p-4" onClick={() => setZoom(false)} role="dialog" aria-modal="true" aria-label={aid.caption}>
          <button type="button" className="fixed right-4 top-4 grid size-12 place-items-center rounded-full bg-white" aria-label={closeLabel}>
            <X size={24} />
          </button>
          <div className="mx-auto mt-14 w-full max-w-3xl touch-pinch-zoom" onClick={(e) => e.stopPropagation()}>
            {picture}
          </div>
        </div>
      )}
    </figure>
  );
}
