"use client";

import { useSyncExternalStore } from "react";
import GenericFormApp from "./GenericFormApp";
import GuideApp from "./GuideApp";
import { useUsState } from "./StateHelp";

const noop = () => () => {};

// Louisiana has the hand-checked step-by-step guide; every other state opens its own form.
export default function FormRouter() {
  const st = useUsState();
  // The chosen state lives in this device's storage, so wait for the browser before picking a form.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return <div className="h-dvh" />;
  return st.code === "LA" ? <GuideApp /> : <GenericFormApp key={st.code} />;
}
