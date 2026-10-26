"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Globe, Loader2, MapPin, Search } from "lucide-react";
import { STATES, searchStates, stateByCode } from "@/data/states";
import { hasOwnForm } from "@/data/stateForms";
import { useI18n } from "@/i18n/I18nProvider";
import { searchLanguages, type Language } from "@/i18n/languages";
import { setPrefs, usePrefs } from "@/lib/prefs";

const BUILT_IN = new Set(["English", "Spanish", "Vietnamese", "French", "Haitian Creole"]);

type Item = { key: string; label: string; sub?: string; lang?: string; badge?: string };

// A button that opens a search box with a list under it. Typing filters the list; Enter picks the top match.
function SearchPicker({
  icon,
  buttonLabel,
  shortLabel,
  title,
  placeholder,
  items,
  selected,
  onPick,
  onFree,
  freeLabel,
  busy,
}: {
  icon: React.ReactNode;
  buttonLabel: string;
  /** Shown instead of buttonLabel on narrow phone screens. */
  shortLabel?: string;
  title: string;
  placeholder: string;
  items: (query: string) => Item[];
  selected: string;
  onPick: (key: string) => void;
  /** Called when nothing matches and the user presses Enter, with what they typed. */
  onFree?: (text: string) => void;
  freeLabel?: (text: string) => string;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const list = useMemo(() => items(query), [items, query]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };
  const pick = (key: string) => {
    onPick(key);
    close();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="btn h-11 bg-sky-soft px-2.5 text-[0.95rem] hover:bg-sky/30 sm:px-3"
      >
        {busy ? <Loader2 size={19} className="animate-spin" aria-hidden /> : icon}
        {shortLabel && <span className="sm:hidden">{shortLabel}</span>}
        <span className={`max-w-[7.5rem] truncate ${shortLabel ? "hidden sm:inline" : ""}`}>{buttonLabel}</span>
        <span className="sr-only">{title}</span>
      </button>
      {open && (
        <div
          className="pop absolute right-0 top-14 z-50 w-[min(21rem,calc(100vw-1.5rem))] rounded-3xl border-2 border-ink bg-white p-3 shadow-[0_5px_0_var(--ink)]"
          style={{ transformOrigin: "top right" }}
        >
          <p className="px-1 pb-2 font-display text-[1.15rem] font-bold">{title}</p>
          <div className="flex items-center gap-2 rounded-xl border-2 border-ink px-3 focus-within:ring-4 focus-within:ring-accent/20">
            <Search size={18} className="shrink-0 text-muted" aria-hidden />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded
              aria-controls="picker-list"
              aria-label={title}
              value={query}
              placeholder={placeholder}
              onChange={(e) => {
                setQuery(e.target.value.slice(0, 40));
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, list.length - 1));
                if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (list[active]) pick(list[active].key);
                  else if (query.trim() && onFree) {
                    onFree(query.trim());
                    close();
                  }
                }
              }}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[1.02rem] outline-none placeholder:text-muted"
            />
          </div>
          <ul id="picker-list" role="listbox" aria-label={title} className="mt-2 max-h-[min(55vh,22rem)] space-y-0.5 overflow-y-auto">
            {list.map((item, i) => (
              <li key={item.key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected === item.key}
                  onClick={() => pick(item.key)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-[0.98rem] ${
                    selected === item.key ? "border-ink bg-sun-soft font-bold" : i === active ? "border-line bg-bg" : "border-transparent"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" lang={item.lang}>
                      {item.label}
                    </span>
                    {item.sub && <span className="block truncate text-[0.82rem] font-normal text-muted">{item.sub}</span>}
                  </span>
                  {item.badge && <span className="shrink-0 rounded-full bg-mint-soft px-2 py-0.5 text-[0.75rem] font-bold text-mint-ink">{item.badge}</span>}
                  {selected === item.key && <Check size={16} className="shrink-0" aria-hidden />}
                </button>
              </li>
            ))}
            {list.length === 0 && query.trim() && onFree && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onFree(query.trim());
                    close();
                  }}
                  className="w-full rounded-xl border-2 border-dashed border-ink px-3 py-2.5 text-left text-[0.98rem] font-bold hover:bg-bg"
                >
                  {freeLabel?.(query.trim())}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function LanguagePicker() {
  const { ui, lang, setLanguage, status, failed } = useI18n();
  const all = useRef(new Map<string, Language>());
  const items = useMemo(
    () => (q: string) =>
      searchLanguages(q).map((l) => {
        all.current.set(l.name, l);
        return { key: l.name, label: l.native, sub: l.native === l.name ? undefined : l.name, lang: l.code, badge: BUILT_IN.has(l.name) ? ui("ready") : undefined };
      }),
    [ui],
  );

  return (
    <div className="relative">
      <SearchPicker
        icon={<Globe size={19} aria-hidden />}
        buttonLabel={status === "loading" ? ui("translating") : lang.native}
        shortLabel={status === "loading" ? "…" : lang.code.split("-")[0].toUpperCase()}
        title={ui("chooseLanguage")}
        placeholder={ui("otherPlaceholder")}
        items={items}
        selected={lang.name}
        busy={status === "loading"}
        onPick={(key) => {
          const l = all.current.get(key);
          if (l) void setLanguage(l);
        }}
        onFree={(text) => void setLanguage({ name: text, native: text, code: "" })}
        freeLabel={(text) => ui("useTyped", { text })}
      />
      {status === "error" && (
        <p role="alert" className="pop absolute right-0 top-14 z-40 w-72 rounded-2xl border-2 border-ink bg-coral-soft p-3 text-[0.95rem] shadow-[0_3px_0_var(--ink)]">
          {ui("translateFail", { lang: failed ?? "" })}
        </p>
      )}
    </div>
  );
}

export function StatePicker() {
  const { ui } = useI18n();
  const { state } = usePrefs();
  const current = stateByCode(state);
  const items = useMemo(
    () => (q: string) =>
      searchStates(q).map((s) => ({ key: s.code, label: s.name, sub: s.agency, badge: s.hasForm ? ui("stepByStep") : hasOwnForm(s.code) ? ui("formBuiltIn") : undefined })),
    [ui],
  );
  return (
    <SearchPicker
      icon={<MapPin size={19} aria-hidden />}
      buttonLabel={current.name}
      shortLabel={current.code}
      title={ui("chooseState")}
      placeholder={ui("statePlaceholder")}
      items={items}
      selected={current.code}
      onPick={(code) => STATES.some((s) => s.code === code) && setPrefs({ state: code })}
    />
  );
}
