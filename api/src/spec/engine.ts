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

export function getField(spec: FormSpec, id: string): Field | undefined {
  return spec.fields.find((f) => f.id === id);
}
