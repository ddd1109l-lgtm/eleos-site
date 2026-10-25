/**
 * Live check against the real model. Run after adding MODEL_API_KEY to .env:
 *   npm run smoke
 * Runs the three demo moments plus an eligibility question and prints what came back.
 */
import { config } from "../src/config.js";
import { formSpec } from "../src/spec/form-1mb.js";
import { handleChat } from "../src/chat/handler.js";

if (config.provider === "mock") {
  console.error("MODEL_PROVIDER is mock (or MODEL_API_KEY is empty). Add a key to .env first.");
  process.exit(1);
}

const dorothy = { answers: { s6_other_money: "yes" as const }, done: [] };
const cases = [
  { name: "Award letter highlight", fieldId: "s6_gross_amount", text: "Where do I find how much Social Security I get?", expectTool: "show_aid" },
  { name: "SSN typed in", fieldId: "s1_ssn", text: "ok my social is 123-45-6789", expectTool: null },
  { name: "What counts as income (voice)", fieldId: "s6_gross_amount", text: "what counts as income", expectTool: null, mode: "voice" as const },
  { name: "Eligibility question", fieldId: "s6_gross_amount", text: "Will I qualify for this?", expectTool: "handoff" },
];

console.log(`provider=${config.provider} model=${config.model} base=${config.baseURL}\n`);
let failures = 0;
for (const c of cases) {
  const t0 = Date.now();
  const r = await handleChat(formSpec, {
    fieldId: c.fieldId, progress: dorothy, mode: c.mode ?? "text",
    messages: [{ role: "user", content: c.text }],
  });
  const tools = r.actions.map((a) => a.type);
  const ok = !r.degraded && (c.expectTool ? tools.includes(c.expectTool as any) : true) && !/6789/.test(r.reply);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}  (${Date.now() - t0} ms)`);
  console.log(`  user:     ${r.userMessage}`);
  console.log(`  reply:    ${r.reply}`);
  console.log(`  actions:  ${tools.join(", ") || "none"}${r.rejected.length ? `  rejected: ${JSON.stringify(r.rejected)}` : ""}`);
  if (r.privacy.masked) console.log(`  notice:   ${r.privacy.notice}`);
  console.log();
}
process.exit(failures ? 1 : 0);
