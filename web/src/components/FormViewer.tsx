"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { Box } from "@/data/form";
import { splitTerms } from "@/lib/terms";
import { useI18n } from "@/i18n/I18nProvider";

/** The line of text that was tapped: its words and its box in PDF points (top-left origin). */
export type Line = { text: string; box: Box; /** The single text run that was tapped, like one table header cell. */ run?: { text: string; box: Box } };
export type Pick = { page: number; x: number; y: number; term?: string; word?: string; line?: Line };

type Props = {
  /** Any PDF: Louisiana's built-in form, another state's form, or one the user opened. */
  pdf: string;
  /** Only show the first pages (Louisiana's packet has extra pages after the application). */
  maxPages?: number;
  highlight?: Box;
  activeTerm?: string;
  showTerms: boolean;
  scrollTarget?: { box: Box; nonce: number };
  /** Region to outline while hovering, when the form has known field regions. */
  hoverAt?: (page: number, x: number, y: number) => Box | undefined;
  onPick: (pick: Pick) => void;
  onAskSelection: (text: string) => void;
  onPageCount?: (n: number) => void;
};

type Size = { w: number; h: number };

export default function FormViewer({ pdf, maxPages, highlight, activeTerm, showTerms, scrollTarget, hoverAt, onPick, onAskSelection, onPageCount }: Props) {
  const { ui } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [sizes, setSizes] = useState<Size[]>([]);
  const [error, setError] = useState(false);
  const [width, setWidth] = useState(0);
  const [selection, setSelection] = useState<{ text: string; top: number; left: number }>();

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | undefined;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loading = pdfjs.getDocument({ url: pdf });
        task = loading;
        const loaded = await loading.promise;
        const count = Math.min(loaded.numPages, maxPages ?? loaded.numPages);
        const all: Size[] = [];
        for (let i = 1; i <= count; i++) {
          const [x0, y0, x1, y1] = (await loaded.getPage(i)).view;
          all.push({ w: x1 - x0, h: y1 - y0 });
        }
        if (cancelled) return;
        setSizes(all);
        setDoc(loaded);
        onPageCount?.(count);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, maxPages]);

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

  const scaleFor = (i: number) => (sizes[i] ? width / sizes[i].w : 1);

  useEffect(() => {
    if (!scrollTarget || !width) return;
    const { box } = scrollTarget;
    const i = (box.page || 1) - 1;
    const pageEl = pageRefs.current[i];
    const scroller = wrapRef.current?.closest("[data-scroller]") as HTMLElement | null;
    if (!pageEl || !scroller) return;
    const pageTop = pageEl.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: pageTop + box.y0 * scaleFor(i) - 72, behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTarget, width]);

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
          {ui("formError")}{" "}
          <a className="text-accent underline" href={pdf} target="_blank" rel="noreferrer">
            {ui("openPdf")}
          </a>
        </div>
      )}
      {!doc && !error && <PageSkeleton label={ui("loadingForm")} />}
      {doc &&
        width > 0 &&
        sizes.map((size, i) => (
          <PdfPage
            key={`${pdf}-${i}`}
            ref={(el) => {
              pageRefs.current[i] = el;
            }}
            doc={doc}
            pageNumber={i + 1}
            size={size}
            scale={scaleFor(i)}
            highlight={highlight && (highlight.page === i + 1 || highlight.page === 0) ? highlight : undefined}
            activeTerm={activeTerm}
            showTerms={showTerms}
            hoverAt={hoverAt}
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
  size: Size;
  scale: number;
  highlight?: Box;
  activeTerm?: string;
  showTerms: boolean;
  hoverAt?: (page: number, x: number, y: number) => Box | undefined;
  onPick: (pick: Pick) => void;
  ref: (el: HTMLDivElement | null) => void;
};

function PdfPage({ doc, pageNumber, size, scale, highlight, activeTerm, showTerms, hoverAt, onPick, ref }: PageProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Box>();
  // Long forms (some states' run 40 pages) only draw pages that are on or near the screen.
  const [visible, setVisible] = useState(pageNumber <= 2);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
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
  }, [doc, pageNumber, scale, visible]);

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
      ref={(el) => {
        boxRef.current = el;
        ref(el);
      }}
      data-page={pageNumber}
      className={`relative mb-6 overflow-hidden rounded-xl border-2 border-ink bg-white shadow-[0_5px_0_var(--ink)] ${showTerms ? "" : "form-hidden-terms"}`}
      style={{ width: size.w * scale, height: size.h * scale }}
      onMouseMove={
        hoverAt
          ? (e) => {
              const { x, y } = toPdf(e);
              setHover(hoverAt(pageNumber, x, y));
            }
          : undefined
      }
      onMouseLeave={() => setHover(undefined)}
      onClick={(e) => {
        if (window.getSelection()?.toString().trim()) return;
        const { x, y } = toPdf(e);
        const target = e.target as HTMLElement;
        const term = target.closest<HTMLElement>("[data-term]")?.dataset.term;
        const word = target.closest(".w, .t")?.textContent ?? undefined;
        const line = lineAt(textRef.current, e.currentTarget.getBoundingClientRect(), scale, target, y);
        onPick({ page: pageNumber, x, y, term, word, line });
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      {hover && hover !== highlight && <BoxDiv className="hoverbox" box={hover} scale={scale} />}
      {highlight && <BoxDiv className="spotlight" box={highlight} scale={scale} key={`${highlight.x0}-${highlight.y0}`} />}
      <div ref={textRef} className="textLayer" style={{ "--total-scale-factor": scale } as React.CSSProperties} aria-label={`Form page ${pageNumber}`} />
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

/**
 * The tapped line: every text run on the same row as the tap, joined left to right, with the box
 * around them. Works on any PDF, so forms without hand-made field regions still get a spotlight.
 */
function lineAt(layer: HTMLDivElement | null, pageRect: DOMRect, scale: number, target: HTMLElement, tapY: number): Line | undefined {
  if (!layer) return;
  const runs = [...layer.querySelectorAll<HTMLElement>(":scope > span, .markedContent > span")].filter((r) => r.textContent?.trim());
  const rects = runs.map((r) => ({ r, b: r.getBoundingClientRect() }));
  const hit = target.closest<HTMLElement>(".textLayer > span, .markedContent > span");
  const anchor = (hit && rects.find((x) => x.r === hit)) ?? rects.map((x) => ({ ...x, d: Math.abs((x.b.top + x.b.bottom) / 2 - pageRect.top - tapY * scale) })).sort((a, b) => a.d - b.d)[0];
  if (!anchor || ("d" in anchor && (anchor as { d: number }).d > 24 * scale)) return;
  const mid = (anchor.b.top + anchor.b.bottom) / 2;
  const tol = Math.max(anchor.b.height * 0.6, 3);
  const row = rects.filter((x) => Math.abs((x.b.top + x.b.bottom) / 2 - mid) < tol).sort((a, b) => a.b.left - b.b.left);
  const text = row.map((x) => x.r.textContent?.trim()).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return;
  const toPts = (v: number, o: number) => (v - o) / scale;
  const pad = 3;
  const runText = anchor.r.textContent?.replace(/\s+/g, " ").trim();
  return {
    run: runText
      ? {
          text: runText.slice(0, 400),
          box: {
            page: 0,
            x0: Math.max(0, toPts(anchor.b.left, pageRect.left) - pad),
            y0: Math.max(0, toPts(anchor.b.top, pageRect.top) - pad),
            x1: toPts(anchor.b.right, pageRect.left) + pad,
            y1: toPts(anchor.b.bottom, pageRect.top) + pad,
          },
        }
      : undefined,
    text: text.slice(0, 400),
    box: {
      page: 0,
      x0: Math.max(0, toPts(Math.min(...row.map((x) => x.b.left)), pageRect.left) - pad),
      y0: Math.max(0, toPts(Math.min(...row.map((x) => x.b.top)), pageRect.top) - pad),
      x1: toPts(Math.max(...row.map((x) => x.b.right)), pageRect.left) + pad,
      y1: toPts(Math.max(...row.map((x) => x.b.bottom)), pageRect.top) + pad,
    },
  };
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
