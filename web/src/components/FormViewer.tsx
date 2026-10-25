"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { FORM, fieldAt, type Box } from "@/data/form";
import { splitTerms } from "@/lib/terms";
import { useI18n } from "@/i18n/I18nProvider";

const PAGE_W = 612;
const PAGE_H = 792;

export type Pick = { page: number; x: number; y: number; term?: string; word?: string };

type Props = {
  highlight?: Box;
  activeTerm?: string;
  showTerms: boolean;
  scrollTarget?: { box: Box; nonce: number };
  onPick: (pick: Pick) => void;
  onAskSelection: (text: string) => void;
};

export default function FormViewer({ highlight, activeTerm, showTerms, scrollTarget, onPick, onAskSelection }: Props) {
  const { ui } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [error, setError] = useState(false);
  const [width, setWidth] = useState(0);
  const [selection, setSelection] = useState<{ text: string; top: number; left: number }>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loaded = await pdfjs.getDocument({ url: FORM.pdf }).promise;
        if (!cancelled) setDoc(loaded);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => setWidth(Math.min(Math.floor(el.clientWidth), 920));
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, 120);
    });
    measure();
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const scale = width / PAGE_W;

  useEffect(() => {
    if (!scrollTarget || !scale) return;
    const { box } = scrollTarget;
    const pageEl = pageRefs.current[(box.page || 1) - 1];
    const scroller = wrapRef.current?.closest("[data-scroller]") as HTMLElement | null;
    if (!pageEl || !scroller) return;
    const pageTop = pageEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const top = pageTop + box.y0 * scale - 72;
    scroller.scrollTo({ top, behavior: "smooth" });
  }, [scrollTarget, scale]);

  // Show an "Ask about this" button when the user highlights text on the form.
  const onMouseUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (!sel || sel.isCollapsed || text.length < 2 || !wrapRef.current) {
      setSelection(undefined);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const host = wrapRef.current.getBoundingClientRect();
    setSelection({ text: text.slice(0, 300), top: rect.top - host.top - 52, left: rect.left - host.left + rect.width / 2 });
  }, []);

  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-[920px]" onMouseUp={onMouseUp}>
      {error && (
        <div className="card p-6 text-lg">
          {ui("formError")} <a className="text-accent underline" href={FORM.pdf}>{ui("openPdf")}</a>
        </div>
      )}
      {!doc && !error && <PageSkeleton label={ui("loadingForm")} />}
      {doc &&
        width > 0 &&
        Array.from({ length: FORM.pages }, (_, i) => (
          <PdfPage
            key={i}
            ref={(el) => {
              pageRefs.current[i] = el;
            }}
            doc={doc}
            pageNumber={i + 1}
            scale={scale}
            highlight={highlight && (highlight.page === i + 1 || highlight.page === 0) ? highlight : undefined}
            activeTerm={activeTerm}
            showTerms={showTerms}
            onPick={onPick}
          />
        ))}
      {selection && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onAskSelection(selection.text);
            setSelection(undefined);
            window.getSelection()?.removeAllRanges();
          }}
          className="btn rise absolute z-20 -translate-x-1/2 whitespace-nowrap bg-sun px-4 py-2.5 text-base"
          style={{ top: Math.max(selection.top, 4), left: selection.left }}
        >
          {ui("explainSelection")}
        </button>
      )}
    </div>
  );
}

function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="aspect-[612/792] w-full animate-pulse rounded-xl border-2 border-ink bg-surface">
      <div className="p-10 text-lg text-muted">{label}</div>
    </div>
  );
}

type PageProps = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  highlight?: Box;
  activeTerm?: string;
  showTerms: boolean;
  onPick: (pick: Pick) => void;
  ref: (el: HTMLDivElement | null) => void;
};

function PdfPage({ doc, pageNumber, scale, highlight, activeTerm, showTerms, onPick, ref }: PageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Box>();

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | undefined;
    (async () => {
      const pdfjs = await import("pdfjs-dist");
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const canvas = canvasRef.current!;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      renderTask = page.render({
        canvas,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      await renderTask.promise.catch(() => {});
      if (cancelled) return;

      const container = textRef.current!;
      container.replaceChildren();
      const textLayer = new pdfjs.TextLayer({
        textContentSource: await page.getTextContent(),
        container,
        viewport,
      });
      await textLayer.render();
      if (cancelled) return;
      wrapWords(container);
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageNumber, scale]);

  useEffect(() => {
    textRef.current?.querySelectorAll(".t.on").forEach((el) => el.classList.remove("on"));
    if (!activeTerm) return;
    textRef.current?.querySelectorAll<HTMLElement>(".t").forEach((el) => {
      if (el.dataset.term === activeTerm) el.classList.add("on");
    });
  }, [activeTerm]);

  const toPdf = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
  };

  return (
    <div
      ref={ref}
      data-page={pageNumber}
      className={`relative mb-6 overflow-hidden rounded-xl border-2 border-ink bg-white shadow-[0_5px_0_var(--ink)] ${showTerms ? "" : "form-hidden-terms"}`}
      style={{ width: PAGE_W * scale, height: PAGE_H * scale }}
      onMouseMove={(e) => {
        const { x, y } = toPdf(e);
        const f = fieldAt(pageNumber, x, y);
        setHover(f?.box);
      }}
      onMouseLeave={() => setHover(undefined)}
      onClick={(e) => {
        if (window.getSelection()?.toString().trim()) return;
        const { x, y } = toPdf(e);
        const target = e.target as HTMLElement;
        const term = target.closest<HTMLElement>("[data-term]")?.dataset.term;
        const word = target.closest(".w, .t")?.textContent ?? undefined;
        onPick({ page: pageNumber, x, y, term, word });
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      {hover && hover !== highlight && <BoxDiv className="hoverbox" box={hover} scale={scale} />}
      {highlight && <BoxDiv className="spotlight" box={highlight} scale={scale} key={`${highlight.x0}-${highlight.y0}`} />}
      <div
        ref={textRef}
        className="textLayer"
        style={{ "--total-scale-factor": scale } as React.CSSProperties}
        aria-label={`Form page ${pageNumber}`}
      />
    </div>
  );
}

function BoxDiv({ box, scale, className }: { box: Box; scale: number; className: string }) {
  return (
    <div
      className={className}
      style={{
        left: box.x0 * scale,
        top: box.y0 * scale,
        width: (box.x1 - box.x0) * scale,
        height: (box.y1 - box.y0) * scale,
      }}
    />
  );
}

// Split each pdf.js text run into glossary terms and single words so each one is clickable.
function wrapWords(container: HTMLElement) {
  const runs = container.querySelectorAll<HTMLElement>(":scope > span, .markedContent > span");
  runs.forEach((run) => {
    const text = run.textContent ?? "";
    if (!text.trim() || run.getAttribute("role") === "img") return;
    const frag = document.createDocumentFragment();
    for (const piece of splitTerms(text)) {
      if (piece.term) {
        const s = document.createElement("span");
        s.className = "t";
        s.dataset.term = piece.term.term;
        s.textContent = piece.text;
        frag.append(s);
        continue;
      }
      for (const part of piece.text.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          frag.append(part);
        } else {
          const s = document.createElement("span");
          s.className = "w";
          s.textContent = part;
          frag.append(s);
        }
      }
    }
    run.replaceChildren(frag);
  });
}
