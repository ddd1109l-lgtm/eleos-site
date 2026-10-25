import { describe, expect, it } from "vitest";
import { formSpec } from "../src/spec/form-1mb.js";
import { report, sanitizeProgress } from "../src/spec/engine.js";
import type { Progress } from "../src/spec/types.js";

const ids = new Set(formSpec.fields.map((f) => f.id));
const aidIds = new Set(formSpec.aids.map((a) => a.id));

describe("spec integrity", () => {
  it("has unique field ids", () => expect(ids.size).toBe(formSpec.fields.length));
  it("every condition points at a gate", () => {
    for (const f of formSpec.fields) {
      if (f.condition && "field" in f.condition) {
        const target = formSpec.fields.find((x) => x.id === (f.condition as { field: string }).field);
        expect(target?.kind, f.id).toBe("gate");
      }
    }
  });
  it("every aid id exists", () => {
    for (const f of formSpec.fields) for (const a of f.aids) expect(aidIds.has(a), `${f.id} -> ${a}`).toBe(true);
  });
  it("every sourceDoc exists", () => {
    const docs = new Set(formSpec.documents.map((d) => d.id));
    for (const f of formSpec.fields) for (const d of f.sourceDocs) expect(docs.has(d), `${f.id} -> ${d}`).toBe(true);
  });
  it("has all 12 Section 8 rows", () => expect(formSpec.fields.filter((f) => f.section === "s8")).toHaveLength(12));
  it("marks SSNs and Medicare numbers as id_number", () => {
    for (const id of ["s1_ssn", "s3_spouse_ssn", "s4_medicare_number", "s4_spouse_medicare_number"])
      expect(formSpec.fields.find((f) => f.id === id)?.sensitive).toBe("id_number");
  });
  it("marks all of Section 7 as health", () => {
    for (const f of formSpec.fields.filter((f) => f.section === "s7")) expect(f.sensitive).toBe("health");
  });
});

/** Walk the form the way the app would: answer gates, mark everything else done. */
function walk(gates: Record<string, "yes" | "no">) {
  let p: Progress = { answers: {}, done: [] };
  const visited: string[] = [];
  for (let i = 0; i < 200; i++) {
    const r = report(formSpec, p);
    if (!r.nextFieldId) return { visited, final: r, progress: p };
    const f = formSpec.fields.find((x) => x.id === r.nextFieldId)!;
    visited.push(f.id);
    p = f.kind === "gate"
      ? { ...p, answers: { ...p.answers, [f.id]: gates[f.id] ?? "no" } }
      : { ...p, done: [...p.done, f.id] };
  }
  throw new Error("did not terminate");
}

describe("personas from the research packet", () => {
  it("Dorothy: single, Social Security only -> skips sections 3, 5, 7", () => {
    const { visited, final } = walk({ s6_other_money: "yes" });
    expect(final.complete).toBe(true);
    expect(visited).not.toContain("s3_spouse_name");
    expect(visited).not.toContain("s5_gross_pay");
    expect(visited).not.toContain("s7_provider");
    expect(visited).toContain("s6_gross_amount");
    expect(visited).not.toContain("sign_spouse");
    const s = Object.fromEntries(final.sections.map((x) => [x.id, x.status]));
    expect(s).toMatchObject({ s3: "skipped", s5: "skipped", s7: "skipped", s6: "done" });
  });

  it("Harold and Gloria: married, both applying, a job -> spouse branch, job branch, spouse signature", () => {
    const { visited, final } = walk({
      s3_married_living_together: "yes", s3_spouse_applying: "yes", s5_anyone_works: "yes", s6_other_money: "yes",
    });
    expect(final.complete).toBe(true);
    for (const id of ["s3_spouse_ssn", "s4_spouse_medicare_number", "s5_gross_pay", "sign_spouse"]) expect(visited).toContain(id);
    expect(visited).not.toContain("s7_provider");
  });

  it("Ray: pension + medical bill -> Section 7 branch", () => {
    const { visited, final } = walk({ s6_other_money: "yes", s7_medical_bills: "yes" });
    expect(final.complete).toBe(true);
    expect(visited).toContain("s7_total_cost");
  });

  it("is not complete until signed", () => {
    const { progress } = walk({ s6_other_money: "yes" });
    const unsigned = { ...progress, done: progress.done.filter((d) => d !== "sign_applicant") };
    const r = report(formSpec, unsigned);
    expect(r.complete).toBe(false);
    expect(r.nextFieldId).toBe("sign_applicant");
  });

  it("required count changes with branches", () => {
    const single = report(formSpec, { answers: { s6_other_money: "no" }, done: [] }).requiredTotal;
    const married = report(formSpec, { answers: { s3_married_living_together: "yes", s6_other_money: "no" }, done: [] }).requiredTotal;
    expect(married).toBeGreaterThan(single);
  });
});

describe("sanitizeProgress", () => {
  it("drops junk ids and non-gate answers", () => {
    const p = sanitizeProgress(formSpec, {
      answers: { s1_ssn: "yes", fake: "yes", s5_anyone_works: "no" } as any,
      done: ["s1_name", "nope", "s5_anyone_works"],
    });
    expect(p).toEqual({ answers: { s5_anyone_works: "no" }, done: ["s1_name"] });
  });
});

describe("form highlight boxes", () => {
  it("every form aid has a measured box inside the page", () => {
    for (const a of formSpec.aids.filter((a) => a.id.startsWith("form."))) {
      expect(a.placeholder, a.id).toBe(false);
      expect(a.box.x + a.box.w, a.id).toBeLessThanOrEqual(100);
      expect(a.box.y + a.box.h, a.id).toBeLessThanOrEqual(100);
    }
  });
});
