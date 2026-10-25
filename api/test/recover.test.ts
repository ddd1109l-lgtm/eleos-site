import { describe, expect, it } from "vitest";
import { formSpec } from "../src/spec/form-1mb.js";
import { recoverTextToolCalls } from "../src/chat/handler.js";

const field = (id: string) => formSpec.fields.find((f) => f.id === id)!;
const ssn = field("s1_ssn");
const gross = field("s6_gross_amount");

describe("tool calls written as text", () => {
  it("recovers [show_aid aid_id=\"X\"] and strips it", () => {
    const r = recoverTextToolCalls(formSpec, ssn, 'Write it on the form.\n\n[show_aid aid_id="form.s1_ssn"]');
    expect(r.text).toBe("Write it on the form.");
    expect(r.actions).toEqual([expect.objectContaining({ type: "show_aid", aidId: "form.s1_ssn" })]);
    expect(r.rejected).toEqual([]);
  });

  it("recovers **[show_aid]** {\"aid_id\":\"X\"}", () => {
    const r = recoverTextToolCalls(formSpec, ssn, 'I can show you a picture.  \n\n**[show_aid]** {"aid_id":"form.s1_ssn"}');
    expect(r.text).toBe("I can show you a picture.");
    expect(r.actions.map((a) => a.type)).toEqual(["show_aid"]);
  });

  it("recovers show_aid(aid_id=\"X\") mid-sentence", () => {
    const r = recoverTextToolCalls(formSpec, gross, 'Look at your letter show_aid(aid_id="doc.award_letter.before_deductions") for the bigger number.');
    expect(r.text).toBe("Look at your letter for the bigger number.");
    expect(r.actions).toEqual([expect.objectContaining({ aidId: "doc.award_letter.before_deductions" })]);
  });

  it("recovers a bare {\"aid_id\":\"X\"}", () => {
    const r = recoverTextToolCalls(formSpec, ssn, 'Here is where it goes. {"aid_id":"form.s1_ssn"}');
    expect(r.text).toBe("Here is where it goes.");
    expect(r.actions).toHaveLength(1);
  });

  it("recovers handoff in each shape", () => {
    for (const t of ['[handoff reason="eligibility_question"]', 'handoff(reason="eligibility_question")', '{"reason":"eligibility_question"}']) {
      const r = recoverTextToolCalls(formSpec, gross, `Apply even if you're not sure. ${t}`);
      expect(r.text).toBe("Apply even if you're not sure.");
      expect(r.actions).toEqual([expect.objectContaining({ type: "handoff", reason: "eligibility_question" })]);
    }
  });

  it("rejects an aid that isn't allowed for the field, and still strips it", () => {
    const r = recoverTextToolCalls(formSpec, ssn, 'Write it down. [show_aid aid_id="doc.award_letter.before_deductions"]');
    expect(r.text).toBe("Write it down.");
    expect(r.actions).toEqual([]);
    expect(r.rejected).toEqual([expect.objectContaining({ tool: "show_aid" })]);
  });

  it("dedupes repeats and leaves plain text alone", () => {
    const r = recoverTextToolCalls(formSpec, ssn, '[show_aid aid_id="form.s1_ssn"] and again [show_aid aid_id="form.s1_ssn"]');
    expect(r.actions).toHaveLength(1);
    const plain = recoverTextToolCalls(formSpec, gross, "Use the bigger number (before Medicare) on your letter.");
    expect(plain.text).toBe("Use the bigger number (before Medicare) on your letter.");
    expect(plain.actions).toEqual([]);
  });
});
