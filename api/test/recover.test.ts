import { describe, expect, it } from "vitest";
import { formSpec } from "../src/spec/form-1mb.js";
import { cleanInternalIds, describeError, reconcileHelpClaim, reconcilePictureClaim, recoverTextToolCalls } from "../src/chat/handler.js";
import { DOCUMENT_NAMES } from "../src/chat/localize.js";

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

describe("picture claims without a picture", () => {
  const claim = "Write it on the form. If you need to see where to write it, a picture is now on the screen.";

  it("attaches the form aid when the field has no doc aid", () => {
    const r = reconcilePictureClaim(formSpec, ssn, claim, []);
    expect(r.reply).toBe(claim);
    expect(r.actions).toEqual([expect.objectContaining({ type: "show_aid", aidId: "form.s1_ssn" })]);
  });

  it("prefers the first doc aid, like the aid viewer", () => {
    const r = reconcilePictureClaim(formSpec, gross, "The image on your screen shows the line.", []);
    expect(r.actions).toEqual([expect.objectContaining({ aidId: "doc.award_letter.before_deductions" })]);
  });

  it("keeps a handoff and still adds the picture", () => {
    const handoff = { type: "handoff" as const, reason: "stuck", contacts: [] };
    const r = reconcilePictureClaim(formSpec, ssn, claim, [handoff]);
    expect(r.actions.map((a) => a.type)).toEqual(["handoff", "show_aid"]);
  });

  it("catches the claim in other languages", () => {
    const r = reconcilePictureClaim(formSpec, gross, "Busque la línea más grande. La imagen está en la pantalla.", []);
    expect(r.actions).toEqual([expect.objectContaining({ aidId: "doc.award_letter.before_deductions" })]);
    const help = reconcilePictureClaim(formSpec, gross, "Trợ giúp miễn phí hiện có trên màn hình.", []);
    expect(help.actions).toEqual([]);
  });

  it("drops the sentence when the field has no aids", () => {
    const r = reconcilePictureClaim(formSpec, field("s6_other_money"), "Answer Yes or No. The picture on the screen shows the box.", []);
    expect(r.reply).toBe("Answer Yes or No.");
    expect(r.actions).toEqual([]);
  });

  it("leaves replies alone when a picture was really shown, or none was mentioned", () => {
    const shown = recoverTextToolCalls(formSpec, ssn, '[show_aid aid_id="form.s1_ssn"]').actions;
    expect(reconcilePictureClaim(formSpec, ssn, claim, shown).actions).toBe(shown);
    const help = reconcilePictureClaim(formSpec, gross, "Apply even if you're not sure. Free help is now on the screen.", []);
    expect(help.actions).toEqual([]);
    expect(help.reply).toBe("Apply even if you're not sure. Free help is now on the screen.");
  });
});

describe("error logging", () => {
  it("logs name, status and code, never the message", () => {
    const err = Object.assign(new Error('400 could not parse "my secret words"'), { name: "BadRequestError", status: 400, code: "invalid_request" });
    const line = describeError(err);
    expect(line).toBe("BadRequestError 400 invalid_request");
    expect(line).not.toContain("secret");
  });
});

describe("free-help claims without a handoff", () => {
  it.each([
    "Apply even if you're not sure. Free help is now on the screen.",
    "A counselor's number is on your screen now.",
    "Solicite aunque no esté seguro. La ayuda gratuita está ahora en la pantalla.",
    "Trợ giúp miễn phí hiện có trên màn hình.",
  ])("adds the counselor card: %s", (reply) => {
    expect(reconcileHelpClaim(formSpec, gross, reply, []).map((a) => a.type)).toEqual(["handoff"]);
  });

  it("leaves a real handoff alone, and ignores ordinary uses of help", () => {
    const real = reconcileHelpClaim(formSpec, gross, "Free help is now on the screen.", []);
    expect(reconcileHelpClaim(formSpec, gross, "Free help is now on the screen.", real)).toBe(real);
    expect(reconcileHelpClaim(formSpec, gross, "The picture on the screen will help you find it.", [])).toEqual([]);
  });
});

describe("internal ids in replies", () => {
  it("drops a parenthesised document id after the model's own name for it (Spanish)", () => {
    expect(cleanInternalIds(formSpec, "Busque en su carta de beneficio del Seguro Social (ss_award_letter) el número más grande.", "es"))
      .toBe("Busque en su carta de beneficio del Seguro Social el número más grande.");
  });

  it("turns a bare document id into its name in the reply language, or English otherwise", () => {
    expect(cleanInternalIds(formSpec, "Mire su ss_award_letter.", "es")).toBe("Mire su carta de beneficios del Seguro Social.");
    expect(cleanInternalIds(formSpec, "Gade **medicare_card** ou.", "ht")).toBe("Gade **kat Medicare** ou.");
    expect(cleanInternalIds(formSpec, "Look at your `pension_statement`.", "en")).toBe("Look at your Pension statement.");
  });

  it("removes field, aid and fact ids, with their brackets", () => {
    expect(cleanInternalIds(formSpec, "Write it in the box (s6_gross_amount). The picture (form.s1_ssn) shows where.", "en"))
      .toBe("Write it in the box. The picture shows where.");
    expect(cleanInternalIds(formSpec, "Savings don't count (savings_not_counted), see doc.award_letter.before_deductions too.", "en"))
      .toBe("Savings don't count, see too.");
  });

  it("leaves ordinary text alone, including words like gross and form", () => {
    const s = "Use the gross amount on the form. Medicare card, award letter, pension statement.";
    expect(cleanInternalIds(formSpec, s, "en")).toBe(s);
  });

  it("has a name in every built-in language for every document", () => {
    for (const d of formSpec.documents) {
      expect(Object.keys(DOCUMENT_NAMES[d.id] ?? {}).sort(), d.id).toEqual(["es", "fr", "ht", "vi"]);
    }
  });
});
