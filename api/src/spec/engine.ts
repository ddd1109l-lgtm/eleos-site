/**
 * Deterministic progress engine. This, not the model, decides which fields exist,
 * what comes next, and when the form is complete.
 */
import type { Condition, Field, FormSpec, Progress } from "./types.js";

export function evaluate(cond: Condition | null, answers: Progress["answers"]): boolean {
  if (!cond) return true;
  if ("all" in cond) return cond.all.every((c) => evaluate(c, answers));
  if ("any" in cond) return cond.any.some((c) => evaluate(c, answers));
  return answers[cond.field] === cond.equals;
}

export function isVisible(field: Field, progress: Progress): boolean {
  return evaluate(field.condition, progress.answers);
}

export function isFieldDone(field: Field, progress: Progress): boolean {
  if (field.kind === "gate") return progress.answers[field.id] === "yes" || progress.answers[field.id] === "no";
  return progress.done.includes(field.id);
}

export type FieldStatus = "done" | "todo" | "hidden";

export type ProgressReport = {
  /** First visible field that isn't done (required or optional), in form order. null when nothing is left. */
  nextFieldId: string | null;
  /** True when every visible required field is done. Only code sets this. */
  complete: boolean;
  requiredDone: number;
  requiredTotal: number;
  statuses: Record<string, FieldStatus>;
  sections: { id: string; status: "done" | "in_progress" | "todo" | "skipped" }[];
};

export function report(spec: FormSpec, progress: Progress): ProgressReport {
  const clean = sanitizeProgress(spec, progress);
  const statuses: Record<string, FieldStatus> = {};
  let nextFieldId: string | null = null;
  let requiredDone = 0;
  let requiredTotal = 0;

  for (const field of spec.fields) {
    if (!isVisible(field, clean)) {
      statuses[field.id] = "hidden";
      continue;
    }
    const done = isFieldDone(field, clean);
    statuses[field.id] = done ? "done" : "todo";
    if (field.required) {
      requiredTotal++;
      if (done) requiredDone++;
    }
    if (!done && nextFieldId === null) nextFieldId = field.id;
  }

  const sections = spec.sections.map((s) => {
    const fs = spec.fields.filter((f) => f.section === s.id);
    const visible = fs.filter((f) => statuses[f.id] !== "hidden");
    const doneCount = visible.filter((f) => statuses[f.id] === "done").length;
    // A section whose only visible field is its answered "No" gate is skipped
    const onlyGate = visible.length === 1 && visible[0].kind === "gate" && clean.answers[visible[0].id] === "no";
    const status = onlyGate ? "skipped" : doneCount === 0 ? "todo" : doneCount === visible.length ? "done" : "in_progress";
    return { id: s.id, status } as const;
  });

  return { nextFieldId, complete: requiredDone === requiredTotal, requiredDone, requiredTotal, statuses, sections };
}

/** Drop anything the client sent that isn't a real field, or answers to fields that aren't gates. */
export function sanitizeProgress(spec: FormSpec, progress: Partial<Progress> | undefined): Progress {
  const byId = new Map(spec.fields.map((f) => [f.id, f]));
  const answers: Progress["answers"] = {};
  for (const [k, v] of Object.entries(progress?.answers ?? {})) {
    if (byId.get(k)?.kind === "gate" && (v === "yes" || v === "no")) answers[k] = v;
  }
  const done = (progress?.done ?? []).filter((id) => {
    const f = byId.get(id);
    return f !== undefined && f.kind !== "gate";
  });
  return { answers, done: [...new Set(done)] };
}

/**
 * Answers to clientOnly gates never leave the browser. Drop them, and the done ids of fields those
 * gates control, since a done Section 7 field would reveal the answer just as well.
 */
export function stripClientOnly(spec: FormSpec, progress: Partial<Progress> | undefined): Partial<Progress> {
  const clientOnly = new Set(spec.fields.filter((f) => f.clientOnly).map((f) => f.id));
  const dependsOnClientOnly = (c: Condition | null): boolean =>
    c !== null && ("all" in c ? c.all.some(dependsOnClientOnly) : "any" in c ? c.any.some(dependsOnClientOnly) : clientOnly.has(c.field));
  const controlled = new Set(spec.fields.filter((f) => dependsOnClientOnly(f.condition)).map((f) => f.id));
  return {
    answers: Object.fromEntries(Object.entries(progress?.answers ?? {}).filter(([id]) => !clientOnly.has(id))),
    done: (progress?.done ?? []).filter((id) => !controlled.has(id)),
  };
}

/**
 * The field on screen is authoritative: return progress with whatever gate answers its condition
 * needs, so it (and its section) count as visible even when the gate answer was stripped.
 */
export function assumeVisible(field: Field, progress: Progress): Progress {
  const answers = { ...progress.answers };
  const satisfy = (c: Condition) => {
    if (evaluate(c, answers)) return;
    if ("all" in c) c.all.forEach(satisfy);
    else if ("any" in c) satisfy(c.any[0]);
    else answers[c.field] = c.equals;
  };
  if (field.condition) satisfy(field.condition);
  return { ...progress, answers };
}

export function getField(spec: FormSpec, id: string): Field | undefined {
  return spec.fields.find((f) => f.id === id);
}
