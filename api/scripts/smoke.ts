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

type Result = Awaited<ReturnType<typeof handleChat>>;
type Check = [name: string, ok: (r: Result, tools: string[]) => boolean];
const calls = (tool: string): Check => [`calls ${tool}`, (_r, t) => t.includes(tool)];
const noCall = (tool: string): Check => [`does not call ${tool}`, (_r, t) => !t.includes(tool)];
const has = (...s: string[]): Check => [`reply contains ${s.map((x) => `"${x}"`).join(" or ")}`, (r) => s.some((x) => r.reply.includes(x))];
const lacks = (s: string): Check => [`reply lacks "${s}"`, (r) => !r.reply.includes(s)];

// Run on every case
const always: Check[] = [
  ["model answered (not degraded)", (r) => !r.degraded],
  lacks("6789"),
  lacks("show_aid"),
  lacks("aid_id"),
  // The app shows the counselor card; the model must not write its own (possibly wrong) numbers.
  ["no phone number in a handoff reply", (r, t) => !t.includes("handoff") || !/\d{3}[-\s.\u2011]\d{4}/.test(r.reply)],
];

const cases: { name: string; fieldId: string; text: string; mode?: "voice"; checks: Check[] }[] = [
  { name: "Award letter highlight", fieldId: "s6_gross_amount", text: "Where do I find how much Social Security I get?",
    checks: [calls("show_aid"), lacks("Apply even if")] },
  { name: "SSN typed in", fieldId: "s1_ssn", text: "ok my social is 123-45-6789",
    checks: [lacks("[")] },
  { name: "What counts as income (voice)", fieldId: "s6_gross_amount", text: "what counts as income", mode: "voice",
    checks: [noCall("handoff"), has("before", "gross"), lacks("Apply even if")] },
  { name: "Eligibility question", fieldId: "s6_gross_amount", text: "Will I qualify for this?",
    checks: [calls("handoff"), has("Apply even if")] },
];

console.log(`provider=${config.provider} model=${config.model} base=${config.baseURL}\n`);
let failures = 0;
// Groq caps tokens per minute; space the cases out so a 429 doesn't read as a model failure.
const PAUSE_MS = Number(process.env.SMOKE_PAUSE_MS ?? 2_000);
for (const [i, c] of cases.entries()) {
  if (i > 0 && PAUSE_MS > 0) await new Promise((r) => setTimeout(r, PAUSE_MS));
  const t0 = Date.now();
  const r = await handleChat(formSpec, {
    fieldId: c.fieldId, progress: dorothy, mode: c.mode ?? "text",
    messages: [{ role: "user", content: c.text }],
  });
  const ms = Date.now() - t0;
  const tools = r.actions.map((a) => a.type);
  const failed = [...always, ...c.checks].filter(([, ok]) => !ok(r, tools)).map(([name]) => name);
  if (failed.length) failures++;
  console.log(`${failed.length ? "FAIL" : "PASS"}  ${c.name}  (${ms} ms)${failed.length ? `  failed: ${failed.join("; ")}` : ""}`);
  console.log(`  user:     ${r.userMessage}`);
  console.log(`  reply:    ${r.reply}`);
  console.log(`  actions:  ${tools.join(", ") || "none"}${r.rejected.length ? `  rejected: ${JSON.stringify(r.rejected)}` : ""}`);
  if (r.privacy.masked) console.log(`  notice:   ${r.privacy.notice}`);
  console.log();
}
process.exit(failures ? 1 : 0);
