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
// Outside quotes (English form wording is quoted on purpose), Spanish function words must outnumber English ones.
const count = (text: string, words: string[]) => (text.toLowerCase().match(new RegExp(`(?<![\\p{L}])(${words.join("|")})(?![\\p{L}])`, "gu")) ?? []).length;
const inSpanish: Check = ["reply is in Spanish", (r) => {
  const unquoted = r.reply.replace(/[“"«][^”"»]*[”"»]/g, " ");
  const es = count(unquoted, ["el", "la", "los", "las", "de", "del", "que", "en", "su", "sus", "una", "un", "para", "es", "y", "con", "por", "lo"]);
  const en = count(unquoted, ["the", "of", "and", "your", "you", "is", "to", "for", "with", "that"]);
  return es >= 4 && es > en * 2;
}];

// Run on every case
const always: Check[] = [
  ["model answered (not degraded)", (r) => !r.degraded],
  lacks("6789"),
  lacks("show_aid"),
  lacks("aid_id"),
  // The app shows the counselor card; the model must not write its own (possibly wrong) numbers.
  ...["icon", "menu", "click here", "tap the"].map((s) => [`reply lacks "${s}" (case-insensitive)`, (r: Result) => !r.reply.toLowerCase().includes(s)] as Check),
  ['"on the screen" only with a show_aid or handoff', (r, t) => !/on the screen/i.test(r.reply) || t.includes("show_aid") || t.includes("handoff")],
  ["no phone number in a handoff reply", (r, t) => !t.includes("handoff") || !/\d{3}[-\s.\u2011]\d{4}/.test(r.reply)],
];

const cases: { name: string; fieldId: string; text: string; mode?: "voice"; language?: string; checks: Check[]; reportHandoff?: boolean }[] = [
  { name: "Award letter highlight", fieldId: "s6_gross_amount", text: "Where do I find how much Social Security I get?",
    checks: [calls("show_aid"), lacks("Apply even if")] },
  { name: "SSN typed in", fieldId: "s1_ssn", text: "ok my social is 123-45-6789",
    checks: [lacks("[")] },
  { name: "What counts as income (voice)", fieldId: "s6_gross_amount", text: "what counts as income", mode: "voice",
    checks: [noCall("handoff"), has("before", "gross"), lacks("Apply even if")] },
  { name: "Eligibility question", fieldId: "s6_gross_amount", text: "Will I qualify for this?",
    checks: [calls("handoff"), has("Apply even if"), has("screen")], reportHandoff: true },
  { name: "Spanish: where do I find this", fieldId: "s6_gross_amount", text: "¿Dónde encuentro esto?", language: "Spanish",
    checks: [calls("show_aid"), inSpanish] },
];

console.log(`provider=${config.provider} model=${config.model} base=${config.baseURL}\n`);
let failures = 0;
// Groq caps tokens per minute; space the cases out so a 429 doesn't read as a model failure.
const PAUSE_MS = Number(process.env.SMOKE_PAUSE_MS ?? 2_000);
for (const [i, c] of cases.entries()) {
  if (i > 0 && PAUSE_MS > 0) await new Promise((r) => setTimeout(r, PAUSE_MS));
  const t0 = Date.now();
  const r = await handleChat(formSpec, {
    fieldId: c.fieldId, progress: dorothy, mode: c.mode ?? "text", language: c.language ?? "English",
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
  console.log(`  addedByCode: ${r.addedByCode.join(", ") || "none"}`);
  if (c.reportHandoff) {
    console.log(`  handoff:  ${r.addedByCode.includes("handoff") ? "code-added" : tools.includes("handoff") ? "model-called" : "missing"}`);
  }
  if (r.privacy.masked) console.log(`  notice:   ${r.privacy.notice}`);
  console.log();
}
process.exit(failures ? 1 : 0);
