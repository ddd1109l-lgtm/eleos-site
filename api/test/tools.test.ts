import { describe, expect, it } from "vitest";
import { formSpec } from "../src/spec/form-1mb.js";
import { validateToolCall } from "../src/chat/tools.js";
import { buildSystemPrompt } from "../src/chat/prompt.js";

const field = (id: string) => formSpec.fields.find((f) => f.id === id)!;

describe("tool validation", () => {
  it("allows an aid listed for the current field", () => {
    const v = validateToolCall(formSpec, field("s6_gross_amount"), "show_aid", JSON.stringify({ aid_id: "doc.award_letter.before_deductions" }));
    expect(v.ok).toBe(true);
  });
  it("rejects an aid from a different field", () => {
    const v = validateToolCall(formSpec, field("s1_dob"), "show_aid", JSON.stringify({ aid_id: "doc.award_letter.before_deductions" }));
    expect(v.ok).toBe(false);
  });
  it("rejects invented tools and bad JSON", () => {
    expect(validateToolCall(formSpec, field("s1_dob"), "mark_complete", "{}").ok).toBe(false);
    expect(validateToolCall(formSpec, field("s1_dob"), "show_aid", "{nope").ok).toBe(false);
  });
  it("handoff is always allowed", () => {
    expect(validateToolCall(formSpec, field("s1_dob"), "handoff", JSON.stringify({ reason: "stuck" })).ok).toBe(true);
  });
});

describe("system prompt", () => {
  it("never contains income limits", () => {
    const p = buildSystemPrompt(formSpec, field("s6_gross_amount"), { answers: { s6_other_money: "yes" }, done: [] }, "text");
    for (const n of ["1,330", "1,350", "1,596", "1,616", "1,796", "1,816"]) expect(p).not.toContain(n);
  });
  it("stays under 7,000 characters for s6_gross_amount (text mode)", () => {
    const p = buildSystemPrompt(formSpec, field("s6_gross_amount"), { answers: { s6_other_money: "yes" }, done: [] }, "text");
    expect(p.length).toBeLessThan(7000);
  });
  it("hides branches the person skipped", () => {
    const p = buildSystemPrompt(formSpec, field("s1_dob"), { answers: { s3_married_living_together: "no" }, done: [] }, "text");
    expect(p).not.toContain("s3_spouse_ssn");
  });
});
