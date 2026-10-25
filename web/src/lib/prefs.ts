"use client";

import { useEffect, useSyncExternalStore } from "react";

// Per-device preferences (read-aloud mode and text size), kept in localStorage.
type Prefs = { autoRead: boolean; scale: number };

const DEFAULTS: Prefs = { autoRead: false, scale: 0 };
let prefs: Prefs = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

export const SCALES = [1, 1.125, 1.25];

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem("eleos-prefs") ?? "{}") };
  } catch {}
}

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  try {
    localStorage.setItem("eleos-prefs", JSON.stringify(prefs));
  } catch {}
  listeners.forEach((l) => l());
}

export function getPrefs() {
  load();
  return prefs;
}

export function usePrefs() {
  const value = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getPrefs,
    () => DEFAULTS,
  );
  useEffect(() => {
    document.documentElement.style.setProperty("--ui-scale", String(SCALES[value.scale] ?? 1));
  }, [value.scale]);
  return value;
}
