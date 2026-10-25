"use client";

import { useSyncExternalStore } from "react";

// A small read-aloud queue on top of the browser's speech engine. Text is spoken on the
// device, so nothing leaves the browser. Long text is split into sentences because some
// browsers stop speaking after about 15 seconds of a single utterance.

export type SpeakItem = { text: string; label?: string; onStart?: () => void };
type State = { speaking: boolean; paused: boolean; label?: string };

const IDLE: State = { speaking: false, paused: false };
let state: State = IDLE;
let run = 0;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

export function useSpeech() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => IDLE,
  );
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const load = () => (voices = window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

function pickVoice(lang: string) {
  const want = lang.toLowerCase();
  const base = want.split("-")[0];
  const exact = voices.filter((v) => v.lang.toLowerCase() === want);
  const near = voices.filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === base);
  const pool = exact.length ? exact : near;
  return pool.find((v) => /natural|neural|enhanced|premium|google/i.test(v.name)) ?? pool[0];
}

function sentences(text: string) {
  const clean = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  const parts = clean.match(/[^.!?。！？]+[.!?。！？]*\s*/g) ?? [clean];
  const out: string[] = [];
  for (const p of parts) {
    const last = out.at(-1);
    if (last && last.length + p.length < 180) out[out.length - 1] = last + p;
    else out.push(p);
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

export function speakItems(items: SpeakItem[], lang = "en-US", rate = 0.95) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const id = ++run;
  const voice = pickVoice(lang);
  const queue = items.flatMap((item) => sentences(item.text).map((text, i) => ({ text, item, first: i === 0 })));
  if (!queue.length) return;

  let i = 0;
  const next = () => {
    if (id !== run) return;
    if (i >= queue.length) {
      set(IDLE);
      return;
    }
    const { text, item, first } = queue[i++];
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onstart = () => {
      if (id !== run) return;
      if (first) item.onStart?.();
      set({ speaking: true, paused: false, label: item.label });
    };
    u.onend = next;
    u.onerror = next;
    synth.speak(u);
  };
  set({ speaking: true, paused: false, label: items[0]?.label });
  next();
}

export const speak = (text: string, lang?: string, label?: string) => speakItems([{ text, label }], lang);

export function stopSpeaking() {
  run++;
  if (canSpeak()) window.speechSynthesis.cancel();
  set(IDLE);
}

export function pauseSpeaking() {
  if (!canSpeak()) return;
  window.speechSynthesis.pause();
  set({ ...state, paused: true });
}

export function resumeSpeaking() {
  if (!canSpeak()) return;
  window.speechSynthesis.resume();
  set({ ...state, paused: false });
}
