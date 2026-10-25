"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, LifeBuoy, Lock, Mic, MicOff, Volume2 } from "lucide-react";
import type { Aid, Progress } from "@/contract/spec-types";
import { SUGGESTED_QUESTIONS } from "@/data/form";
import { useI18n } from "@/i18n/I18nProvider";
import { maskSensitive } from "@/lib/privacy";
import { getPrefs } from "@/lib/prefs";
import { speak } from "@/lib/speech";

type Msg = { id: number; role: "user" | "assistant" | "note" | "error"; content: string; pending?: boolean; degraded?: boolean };

// Max's backend (api/). When set, chat and voice go there; otherwise this app's own /api/chat
// and the browser's speech recognition are used.
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_RECORD_MS = 30_000;

type Action = { type: "show_aid"; aidId: string; aid: Aid } | { type: "handoff"; reason: string };
type ChatResponse = {
  reply: string;
  actions?: Action[];
  privacy?: { masked: boolean; notice: string | null };
  userMessage: string;
  degraded?: boolean;
};

type Props = {
  onPerson?: () => void;
  onAid?: (aid: Aid) => void;
  /** Already passed through stripClientOnly: clientOnly answers never leave the browser. */
  progress?: Progress;
  localFieldId?: string;
  fieldId?: string;
  pending?: { text: string; nonce: number };
};

let nextId = 1;

export default function Chat({ fieldId, localFieldId, progress, pending, onPerson, onAid }: Props) {
  const { ui, t, lang } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (pending) void send(pending.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.nonce]);

  const patch = (id: number, next: Partial<Msg>) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...next } : x)));

  async function send(raw: string, mode: "text" | "voice" = "text") {
    const trimmed = raw.trim();
    if (!trimmed || busy) return;
    // Mask first, so a typed SSN or Medicare number is never shown or sent.
    const { text, masked } = maskSensitive(trimmed);
    type Turn = { role: "user" | "assistant"; content: string };
    const past = messagesRef.current.filter((m): m is Msg & Turn => (m.role === "user" || m.role === "assistant") && !m.pending && !!m.content);
    const history: Turn[] = [...past.map(({ role, content }): Turn => ({ role, content })), { role: "user" as const, content: text }].slice(-12);
    setInput("");
    setBusy(true);
    if (API_URL) await sendToBackend(text, masked.length > 0, history, mode);
    else await sendToLocal(text, masked.length > 0, history);
    setBusy(false);
  }

  async function sendToLocal(text: string, masked: boolean, history: { role: "user" | "assistant"; content: string }[]) {
    const user: Msg = { id: nextId++, role: "user", content: text };
    const reply: Msg = { id: nextId++, role: "assistant", content: "" };
    const notes: Msg[] = masked ? [{ id: nextId++, role: "note", content: ui("privacyNote") }] : [];
    setMessages((m) => [...m, user, ...notes, reply]);
    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, fieldId, localFieldId, progress, language: lang.name }),
      });
      if (!res.ok || !res.body) throw new Error(`chat ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        patch(reply.id, { content: acc });
      }
    } catch {
      setMessages((m) => [...m.filter((x) => x.id !== reply.id), { id: nextId++, role: "error", content: ui("errorStandard") }]);
      return;
    }
    if (getPrefs().autoRead && acc) speak(acc, lang.code, ui("askFawn"));
  }

  // Backend mode: show "Sending…", then render the masked userMessage the API returns (spec 7).
  async function sendToBackend(text: string, masked: boolean, history: { role: "user" | "assistant"; content: string }[], mode: "text" | "voice") {
    const user: Msg = { id: nextId++, role: "user", content: "Sending…", pending: true };
    const reply: Msg = { id: nextId++, role: "assistant", content: "" };
    setMessages((m) => [...m, user, reply]);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId, progress, messages: history, mode, language: lang.name }),
      });
      const data = (await res.json().catch(() => null)) as ChatResponse | null;
      if (!res.ok || !data || typeof data.reply !== "string") throw new Error(`chat ${res.status}`);
      // send() masks before sending, so the API usually never sees the number; show the note for either mask.
      const notes: Msg[] = masked || data.privacy?.masked ? [{ id: nextId++, role: "note", content: data.privacy?.notice ?? ui("privacyNote") }] : [];
      setMessages((m) =>
        m.flatMap((x) =>
          x.id === user.id ? [{ ...x, content: data.userMessage ?? text, pending: false }, ...notes] : x.id === reply.id ? [{ ...x, content: data.reply, degraded: data.degraded }] : [x],
        ),
      );
      const spoken: string[] = [data.reply];
      for (const action of data.actions ?? []) {
        if (action.type === "show_aid" && action.aid) {
          onAid?.(action.aid);
          spoken.push(action.aid.spoken);
        } else if (action.type === "handoff") onPerson?.();
      }
      if (getPrefs().autoRead) speak(spoken.join(" "), lang.code, ui("askFawn"));
    } catch {
      setMessages((m) => [...m.filter((x) => x.id !== user.id && x.id !== reply.id), { id: nextId++, role: "error", content: ui("errorStandard") }]);
    }
  }

  // Backend mode voice: record up to 30 s, upload to /transcribe (4 MB limit), then send as a voice message.
  const recorderRef = useRef<MediaRecorder | null>(null);
  async function recordToBackend() {
    if (recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMessages((m) => [...m, { id: nextId++, role: "error", content: ui("errorStandard") }]);
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const timer = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORD_MS);
    rec.onstop = async () => {
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      setListening(false);
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const fail = () => setMessages((m) => [...m, { id: nextId++, role: "error", content: ui("errorStandard") }]);
      if (!blob.size || blob.size > MAX_AUDIO_BYTES) return fail();
      try {
        const form = new FormData();
        form.append("audio", blob, "voice.webm");
        form.append("language", lang.name);
        const res = await fetch(`${API_URL}/transcribe`, { method: "POST", body: form });
        // 413 from Vercel is not JSON; any unparseable body gets the standard message.
        const data = (await res.json().catch(() => null)) as { text?: string } | null;
        if (!res.ok || !data || typeof data.text !== "string") return fail();
        if (data.text.trim()) void send(data.text, "voice");
      } catch {
        fail();
      }
    };
    recorderRef.current = rec;
    setListening(true);
    rec.start();
  }

  function toggleMic() {
    if (API_URL) return void recordToBackend();
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) {
      alert(ui("voiceUnsupported"));
      return;
    }
    const rec = new Ctor();
    rec.lang = lang.code;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      // People read numbers aloud, so the filter runs on the transcript too.
      setInput(maskSensitive(transcript).text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" dir={lang.rtl ? "rtl" : "ltr"}>
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        <div className="rise max-w-[92%] rounded-2xl rounded-bl-md border-2 border-ink bg-sky-soft px-4 py-3 text-[1.05rem] leading-relaxed">
          {ui("chatIntro")}
        </div>
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={q}
                type="button"
                onClick={() => send(t(`q.${i}`))}
                className="rounded-full border-2 border-ink bg-white px-3.5 py-2 text-left text-[0.95rem] font-bold text-ink shadow-[0_2px_0_var(--ink)] hover:bg-sun-soft active:translate-y-[2px] active:shadow-none"
              >
                {t(`q.${i}`)}
              </button>
            ))}
          </div>
        )}
        {onPerson && messages.length === 0 && (
          <button type="button" onClick={onPerson} className="text-[0.95rem] font-bold text-accent underline underline-offset-2">
            {ui("preferPerson")}
          </button>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} typing={busy && m.role === "assistant" && !m.content} onPerson={onPerson} />
        ))}
      </div>

      <form
        className="border-t-2 border-ink/10 bg-white px-3 pb-3 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border-2 border-ink bg-white p-1.5 focus-within:ring-4 focus-within:ring-accent/20">
          <label htmlFor="chat-input" className="sr-only">
            {ui("typeQuestion")}
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder={listening ? (API_URL ? ui("recording") : ui("listening")) : ui("typeQuestion")}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[1.05rem] outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? ui("voiceStop") : ui("voiceStart")}
            aria-pressed={listening}
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${listening ? "reading-ring bg-coral text-white" : "bg-fawn-soft text-brown hover:bg-sun-soft"}`}
          >
            {listening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <button
            type="submit"
            aria-label={ui("send")}
            disabled={!input.trim() || busy}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-white hover:bg-accent-ink disabled:bg-line disabled:text-muted"
          >
            <ArrowUp size={22} strokeWidth={2.75} />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[0.85rem] text-muted">
          <Lock size={14} aria-hidden /> {ui("privacyHint")}
        </p>
      </form>
    </div>
  );
}

function Bubble({ msg, typing, onPerson }: { msg: Msg; typing: boolean; onPerson?: () => void }) {
  const { ui, lang } = useI18n();
  if (msg.role === "error") {
    return (
      <div role="alert" className="rise space-y-2 rounded-2xl border-2 border-ink bg-coral-soft px-4 py-3 text-[1rem]">
        <p>{msg.content}</p>
        {onPerson && (
          <button type="button" onClick={onPerson} className="btn bg-coral px-3 py-2 text-[0.95rem] text-white">
            <LifeBuoy size={17} aria-hidden /> {ui("talkToPerson")}
          </button>
        )}
      </div>
    );
  }
  if (msg.role === "note") {
    return (
      <div className="rise flex gap-2.5 rounded-2xl border-2 border-sky bg-sky-soft px-4 py-3 text-[0.98rem] text-ink">
        <Lock size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <span>{msg.content}</span>
      </div>
    );
  }
  if (msg.role === "user") {
    return (
      <div className="rise flex justify-end">
        <div className={`max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[1.05rem] leading-relaxed text-white ${msg.pending ? "opacity-70" : ""}`}>
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="rise flex flex-col items-start gap-1">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border-2 border-ink bg-white px-4 py-3 text-[1.05rem] leading-relaxed text-ink">
        {typing ? (
          <span className="flex gap-1 py-1.5" aria-label={ui("writing")}>
            <span className="dot size-2.5 rounded-full bg-coral" />
            <span className="dot size-2.5 rounded-full bg-sun [animation-delay:150ms]" />
            <span className="dot size-2.5 rounded-full bg-mint [animation-delay:300ms]" />
          </span>
        ) : (
          <Formatted text={msg.content} />
        )}
        {msg.degraded && <p className="mt-2 text-[0.85rem] text-muted">{ui("degraded")}</p>}
      </div>
      {!typing && msg.content && (
        <button
          type="button"
          onClick={() => speak(msg.content, lang.code, ui("askFawn"))}
          className="ml-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.88rem] font-bold text-accent hover:bg-accent-soft"
        >
          <Volume2 size={16} aria-hidden /> {ui("readAloud")}
        </button>
      )}
    </div>
  );
}

// Minimal formatting: paragraphs, "- " bullets, and **bold**.
function Formatted({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 ps-5">
              {lines.map((l, j) => (
                <li key={j}>{bold(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{bold(block)}</p>;
      })}
    </div>
  );
}

function bold(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
};

function getRecognition(): (new () => SpeechRecognitionLike) | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => SpeechRecognitionLike) | undefined;
}
