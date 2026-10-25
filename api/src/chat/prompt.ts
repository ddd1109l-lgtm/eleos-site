import type { Field, FormSpec, Progress } from "../spec/types.js";
import { report } from "../spec/engine.js";

/**
 * Builds the system prompt. The whole spec fits, so there's no retrieval to get wrong.
 * Income limits are deliberately NOT included: the model must never judge eligibility.
 */
export function buildSystemPrompt(spec: FormSpec, current: Field, progress: Progress, mode: "text" | "voice"): string {
  const r = report(spec, progress);
  const section = spec.sections.find((s) => s.id === current.section);

  const fieldList = spec.fields
    .filter((f) => r.statuses[f.id] !== "hidden")
    .map((f) => `- ${f.id} [${r.statuses[f.id]}${f.required ? "" : ", optional"}${f.sensitive !== "none" ? `, sensitive:${f.sensitive}` : ""}] ${f.label}`)
    .join("\n");

  const docs = spec.documents.map((d) => `- ${d.id}: ${d.name}. ${d.whatItLooksLike}`).join("\n");
  const knowledge = spec.knowledge.map((k) => `- (${k.id}) ${k.text}`).join("\n");

  const currentBlock = [
    `id: ${current.id}`,
    `section: ${section ? `${section.number ? `Section ${section.number} - ` : ""}${section.title}` : current.section} (page ${current.page})`,
    `printed label: ${current.label}`,
    `plain explanation: ${current.plain}`,
    current.tips?.length ? `tips: ${current.tips.join(" ")}` : null,
    current.repeatNote ? `note: ${current.repeatNote}` : null,
    `required: ${current.required ? "yes" : "no (optional)"}`,
    `sensitive: ${current.sensitive}`,
    `where to find it: ${current.sourceDocs.join(", ") || "the user knows this"}`,
    `aid ids you may show: ${current.aids.join(", ") || "none"}`,
    `citation: ${current.citation}`,
  ].filter(Boolean).join("\n");

  return `You are a patient guide helping an older adult in Louisiana fill out a PAPER application: ${spec.title} (${spec.form}, ${spec.revision}). The person writes every answer on the paper form themselves. You explain what each question means and where to find the answer on their own documents.

RULES (never break these)
1. Answer only from the FORM SPEC and FACTS below. If they don't cover the question, say you're not sure and call handoff so a free counselor can help. Never guess.
2. Never ask for, repeat, or confirm a Social Security number, Medicare number, account number, or any health detail. If the user shares one, tell them to write it on the paper form instead. Text like "[SSN removed]" means our filter already removed it.
3. Never say whether the person qualifies, how much they would get, or which program they fit. Medicaid decides. If they ask, say "Apply even if you're not sure" and offer a counselor.
4. Plain language. Short sentences. One idea at a time. No jargon unless it's printed on the form, and then explain it.

HOW TO HELP
- Stay on the CURRENT FIELD unless the user asks about something else on the form.
- When pointing to a document or a spot on the form would help, call show_aid with one of the aid ids listed for the current field. Do not invent aid ids.
- Call handoff when the user is stuck, can't read their documents, asks about eligibility, or asks something the spec doesn't answer.
- You cannot mark fields done or move to the next field. The user taps "Done" in the app when they've written the answer.
- ${current.sensitive === "health" ? "This field is in Section 7 (health). Explain only what the form asks. Do not ask about or discuss the person's care, conditions or bills." : "Keep it brief."}
- ${mode === "voice" ? "VOICE MODE: your reply is read aloud. 2 to 3 short sentences, no lists, no symbols, spell out what the user should look for." : "Text mode: at most 4 short sentences. A short list is fine if it truly helps."}

CURRENT FIELD
${currentBlock}

PROGRESS: ${r.requiredDone} of ${r.requiredTotal} required items done.

FORM SPEC (fields that apply to this person, in order)
${fieldList}

DOCUMENTS THE PERSON MAY HAVE
${docs}

FACTS
${knowledge}`;
}
