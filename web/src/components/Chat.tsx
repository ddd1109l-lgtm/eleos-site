"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Lock, Mic, MicOff, Volume2 } from "lucide-react";
import { SUGGESTED_QUESTIONS } from "@/data/form";
import { maskSensitive, PRIVACY_NOTE } from "@/lib/privacy";
import { speak } from "@/lib/speech";

type Msg = { id: number; role: "user" | "assistant" | "note"; content: string };

type Props = {
  fieldId?: string;
  pending?: { text: string; nonce: number };
};

let nextId = 1;

export default function Chat({ fieldId, pending }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (pending) void send(pending.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.nonce]);

  async function send(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || busy) return;
    const { text, masked } = maskSensitive(trimmed);
    const user: Msg = { id: nextId++, role: "user", content: text };
    const reply: Msg = { id: nextId++, role: "assistant", content: "" };
    const notes: Msg[] = masked.length ? [{ id: nextId++, role: "note", content: PRIVACY_NOTE }] : [];
    const history = [...messagesRef.current, user]
      .filter((m) => m.role !== "note")
      .map(({ role, content }) => ({ role, content }));

    setMessages((m) => [...m, user, ...notes, reply]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, fieldId }),
      });
      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === reply.id ? { ...x, content: acc } : x)));
      }
    } catch {
      setMessages((m) =>
        m.map((x) =>
          x.id === reply.id
            ? { ...x, content: "Sorry, I couldn't connect just now. Please try again, or call LaSHIP for free help at 1-800-259-5300." }
            : x,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) {
      alert("Voice input isn't supported in this browser. Try Chrome or Safari.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setInput(maskSensitive(transcript).text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-[1.05rem] leading-relaxed text-ink-2">
              Ask anything about this form. I&apos;ll answer in plain words.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-line bg-surface px-3.5 py-2 text-left text-[0.95rem] text-ink hover:border-accent hover:bg-accent-soft"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} typing={busy && m.role === "assistant" && !m.content} />
        ))}
      </div>

      <form
        className="border-t border-line bg-surface px-4 pb-4 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-white p-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          <label htmlFor="chat-input" className="sr-only">
            Your question
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
            placeholder={listening ? "Listening…" : "Type your question…"}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[1.05rem] outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop voice input" : "Ask with your voice"}
            aria-pressed={listening}
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${listening ? "bg-private text-white" : "text-ink-2 hover:bg-bg"}`}
          >
            {listening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <button
            type="submit"
            aria-label="Send question"
            disabled={!input.trim() || busy}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-white hover:bg-accent-ink disabled:bg-line disabled:text-muted"
          >
            <ArrowUp size={22} strokeWidth={2.5} />
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[0.85rem] text-muted">
          <Lock size={14} aria-hidden /> Don&apos;t type your Social Security or Medicare number here. Write those on paper.
        </p>
      </form>
    </div>
  );
}

function Bubble({ msg, typing }: { msg: Msg; typing: boolean }) {
  if (msg.role === "note") {
    return (
      <div className="rise flex gap-2.5 rounded-xl border border-private/20 bg-private-soft px-4 py-3 text-[0.98rem] text-private">
        <Lock size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span>{msg.content}</span>
      </div>
    );
  }
  if (msg.role === "user") {
    return (
      <div className="rise flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[1.05rem] leading-relaxed text-white">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="rise group flex flex-col items-start gap-1">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-bg px-4 py-3 text-[1.05rem] leading-relaxed text-ink">
        {typing ? (
          <span className="flex gap-1 py-1.5" aria-label="Writing an answer">
            <span className="dot size-2 rounded-full bg-muted" />
            <span className="dot size-2 rounded-full bg-muted [animation-delay:150ms]" />
            <span className="dot size-2 rounded-full bg-muted [animation-delay:300ms]" />
          </span>
        ) : (
          <Formatted text={msg.content} />
        )}
      </div>
      {!typing && msg.content && (
        <button
          type="button"
          onClick={() => speak(msg.content)}
          className="ml-1 flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.85rem] text-muted hover:bg-bg hover:text-ink"
        >
          <Volume2 size={15} aria-hidden /> Read aloud
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
            <ul key={i} className="list-disc space-y-1 pl-5">
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
