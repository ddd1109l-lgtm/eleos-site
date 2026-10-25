import { z } from "zod";
import type OpenAI from "openai";
import { config } from "../config.js";
import { complete } from "../model/client.js";
import { filterText, type FindingKind } from "../privacy/filter.js";
import { getField, report, sanitizeProgress, stripClientOnly } from "../spec/engine.js";
import type { Field, FormSpec } from "../spec/types.js";
import { buildSystemPrompt } from "./prompt.js";
import { languageCode, normalizeLanguage } from "./language.js";
import { documentName, fallbackText, localizeNotice, type LangCode } from "./localize.js";
import { toolsFor, validateToolCall, type Action, type Rejected } from "./tools.js";
import { counselors } from "../data/counselors.js";

export const ChatRequest = z.object({
  /** The field on screen. Leave it out and the server uses the engine's next field (none once the form is complete). */
  fieldId: z.string().optional(),
  progress: z.object({
    answers: z.record(z.string(), z.enum(["yes", "no"])).default({}),
    done: z.array(z.string()).default([]),
  }).default({ answers: {}, done: [] }),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(30),
  mode: z.enum(["text", "voice"]).default("text"),
  /** Reply language, as the user typed it ("Spanish", "Tiếng Việt"). Cleaned before it reaches the prompt. */
  language: z.string().max(60).default("English"),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

export type ChatResponse = {
  reply: string;
  actions: Action[];
  privacy: { masked: boolean; kinds: FindingKind[]; notice: string | null };
  /** The user's latest message after masking. Replace the chat bubble with this. */
  userMessage: string;
  /** The field the reply is about: the one sent, or the engine's next field. null once the form is complete. */
  fieldId: string | null;
  /** true when the model failed and we answered from the spec alone */
  degraded: boolean;
  /** tool calls code refused (dev only; empty in production) */
  rejected: Rejected[];
  /** action types the server attached itself rather than the model (dev only; empty in production) */
  addedByCode: Action["type"][];
};

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function handleChat(spec: FormSpec, req: ChatRequest): Promise<ChatResponse> {
  // Answers to clientOnly gates (Section 7) are dropped before anything else sees the progress.
  const progress = sanitizeProgress(spec, stripClientOnly(spec, req.progress));
  const known = withClientOnlyAnswered(spec, progress);
  const field = resolveField(spec, req.fieldId, known);
  const language = normalizeLanguage(req.language);
  const lang: LangCode = languageCode(language) ?? "en";

  // 1. Privacy filter on every message (history too), before anything else touches it.
  const filtered = req.messages.map((m) => ({ role: m.role, ...filterText(m.content) }));
  const last = filtered[filtered.length - 1];
  const privacy = { masked: last.masked, kinds: last.kinds, notice: localizeNotice(last.notice, last.kinds, lang) };

  if (last.role !== "user") throw new HttpError(400, "Last message must be from the user");

  // 2. Model (or mock)
  let reply: string;
  let actions: Action[] = [];
  let rejected: Rejected[] = [];
  let degraded = false;

  const addedByCode: Action["type"][] = [];

  if (config.provider === "mock") {
    ({ reply, actions } = mockReply(spec, field, last.text, last.masked));
  } else {
    try {
      // With a field on screen the prompt sees progress as sent; with none, as the engine judged it complete.
      ({ reply, actions, rejected } = await runModel(spec, field, field ? progress : known, filtered, req.mode, language));
    } catch (err) {
      console.error("[chat] model error:", describeError(err));
      degraded = true;
      reply = [field?.plain, fallbackText(lang)].filter(Boolean).join(" ");
      actions = [{ type: "handoff", reason: "other", contacts: counselors }];
      addedByCode.push("handoff");
    }
  }

  // 3. Internal ids (document, field, aid) never reach the user.
  reply = cleanInternalIds(spec, reply, lang);

  // 4. A reply that says a picture, or free help, is on the screen must come with one.
  const fromModel = new Set(actions);
  ({ reply, actions } = reconcilePictureClaim(spec, field, reply, actions));
  actions = reconcileHelpClaim(spec, field, reply, actions);
  addedByCode.push(...actions.filter((a) => !fromModel.has(a)).map((a) => a.type));

  // 5. Filter the model's output too, and never let it echo masking tokens back as if they were data.
  reply = filterText(reply).text;

  const dev = process.env.NODE_ENV !== "production";
  return {
    reply,
    actions,
    privacy,
    userMessage: last.text,
    fieldId: field?.id ?? null,
    degraded,
    rejected: dev ? rejected : [],
    addedByCode: dev ? addedByCode : [],
  };
}

/**
 * The server never sees clientOnly answers (the frontend strips them), so it can't tell whether they
 * were given. When picking the next field, count them as answered "no"; otherwise every finished
 * form would point back at the Section 7 gate and never count as complete.
 */
function withClientOnlyAnswered(spec: FormSpec, progress: ReturnType<typeof sanitizeProgress>) {
  const answers = { ...progress.answers };
  for (const f of spec.fields) if (f.clientOnly && !(f.id in answers)) answers[f.id] = "no";
  return { ...progress, answers };
}

/** The field sent wins; without one, the engine's next field; null when the form is complete. */
function resolveField(spec: FormSpec, fieldId: string | undefined, progress: ReturnType<typeof sanitizeProgress>): Field | null {
  if (fieldId !== undefined) {
    const field = getField(spec, fieldId);
    if (!field) throw new HttpError(400, `Unknown fieldId "${fieldId}"`);
    return field;
  }
  const next = report(spec, progress).nextFieldId;
  return next ? getField(spec, next)! : null;
}

const NO_FIELD_REPLY = "Every question on the form is done. Ask me about anything on it, or how to send it in.";

async function runModel(
  spec: FormSpec,
  field: Field | null,
  progress: ReturnType<typeof sanitizeProgress>,
  history: { role: "user" | "assistant"; text: string }[],
  mode: "text" | "voice",
  language: string,
) {
  const messages: Msg[] = [
    { role: "system", content: buildSystemPrompt(spec, field, progress, mode, language) },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.text }) as Msg),
  ];
  const actions: Action[] = [];
  const rejected: Rejected[] = [];

  // At most 2 tool rounds, then force a text answer.
  for (let round = 0; round < 3; round++) {
    const msg = await complete(messages, round < 2 ? toolsFor(field) : undefined);
    if (!msg) throw new Error("empty completion");
    const calls = msg.tool_calls ?? [];
    // gpt-oss sometimes stops after reasoning with no text and no tool call (about 1 in 8 in testing).
    // Ask again rather than falling back to the English field explanation.
    if (calls.length === 0 && !(msg.content ?? "").trim() && round < 2) continue;
    if (calls.length === 0) return finish(msg.content);
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: calls });
    for (const call of calls) {
      if (call.type !== "function") continue;
      const v = validateToolCall(spec, field, call.function.name, call.function.arguments);
      if (v.ok) addAction(actions, v.action);
      else rejected.push(v.rejected);
      messages.push({ role: "tool", tool_call_id: call.id, content: v.result });
    }
    // The model already said something alongside its tool calls: use it, skip the second round trip.
    if (round === 0 && (msg.content ?? "").trim()) return finish(msg.content);
  }
  return finish(null);

  function finish(content: string | null | undefined) {
    const recovered = recoverTextToolCalls(spec, field, content ?? "");
    for (const a of recovered.actions) addAction(actions, a);
    rejected.push(...recovered.rejected);
    return { reply: recovered.text || (field?.plain ?? NO_FIELD_REPLY), actions, rejected };
  }
}

/** One card per kind is enough (one per aid for show_aid). */
function addAction(actions: Action[], action: Action) {
  if (!actions.some((a) => a.type === action.type && (a.type !== "show_aid" || a.aidId === (action as any).aidId))) {
    actions.push(action);
  }
}

const TOOL_NAMES = "show_aid|handoff";
const TEXT_TOOL_PATTERNS: RegExp[] = [
  // [show_aid aid_id="X"]  **[show_aid]** {"aid_id":"X"}  [handoff reason="stuck"]
  new RegExp(String.raw`\*{0,2}\[\s*(${TOOL_NAMES})\b([^\]]*)\]\*{0,2}(?:\s*(\{[^{}]*\}))?`, "g"),
  // show_aid(aid_id="X")  handoff({"reason":"stuck"})
  new RegExp(String.raw`\b(${TOOL_NAMES})\s*\(([^()]*)\)`, "g"),
  // bare {"aid_id":"X"} or {"reason":"stuck"}
  /(\{\s*"(aid_id|reason)"\s*:\s*"[^"]*"\s*\})/g,
];

/**
 * Models sometimes write a tool call into the reply instead of calling it. Pull those out of the
 * text and validate them exactly like real calls, so the user never sees raw markup.
 */
export function recoverTextToolCalls(spec: FormSpec, field: Field | null, text: string): { text: string; actions: Action[]; rejected: Rejected[] } {
  const actions: Action[] = [];
  const rejected: Rejected[] = [];
  const take = (name: string, rawArgs: string) => {
    const v = validateToolCall(spec, field, name, JSON.stringify(parseLooseArgs(rawArgs)));
    if (v.ok) addAction(actions, v.action);
    else rejected.push(v.rejected);
    return " ";
  };

  let out = text.replace(TEXT_TOOL_PATTERNS[0], (_m, name: string, inner: string, json?: string) => take(name, `${inner} ${json ?? ""}`));
  out = out.replace(TEXT_TOOL_PATTERNS[1], (_m, name: string, inner: string) => take(name, inner));
  out = out.replace(TEXT_TOOL_PATTERNS[2], (_m, json: string, key: string) => take(key === "aid_id" ? "show_aid" : "handoff", json));

  return { text: tidy(out), actions, rejected };
}

// "Picture" and "screen" in the same sentence, in any of the app's languages (en, es, fr, ht, vi).
const PICTURE_WORDS = String.raw`picture|image|photo|highlight\p{L}*|imagen|foto|resaltad\p{L}*|imaj|hình ảnh|ảnh`;
const SCREEN_WORDS = String.raw`screen|pantalla|écran|ekran|màn hình`;
const word = (alts: string) => String.raw`(?<!\p{L})(?:${alts})(?!\p{L})`;
const PICTURE_ON_SCREEN = new RegExp(
  `${word(PICTURE_WORDS)}[^.!?\\n]*${word(SCREEN_WORDS)}|${word(SCREEN_WORDS)}[^.!?\\n]*${word(PICTURE_WORDS)}`,
  "iu",
);

/** What the aid viewer opens by default: the first doc.* aid, else the form.* aid. */
export function defaultAidId(field: Field | null): string | undefined {
  return field?.aids.find((a) => a.startsWith("doc.")) ?? field?.aids.find((a) => a.startsWith("form."));
}

/**
 * The model sometimes says "a picture is now on the screen" without calling show_aid. Make the
 * reply true: attach the field's default aid, or if the field has none, drop that sentence.
 */
export function reconcilePictureClaim(spec: FormSpec, field: Field | null, reply: string, actions: Action[]): { reply: string; actions: Action[] } {
  if (actions.some((a) => a.type === "show_aid") || !PICTURE_ON_SCREEN.test(reply)) return { reply, actions };
  const aidId = defaultAidId(field);
  if (aidId) {
    const v = validateToolCall(spec, field, "show_aid", JSON.stringify({ aid_id: aidId }));
    if (v.ok) return { reply, actions: [...actions, v.action] };
  }
  const kept = reply.replace(/[^.!?\n]+[.!?]*/g, (sentence) => (PICTURE_ON_SCREEN.test(sentence) ? "" : sentence));
  return { reply: tidy(kept) || (field?.plain ?? NO_FIELD_REPLY), actions };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const QUOTES = "[`*\"“”']*";
/** "(id)", "(`id`)", "(**id**)", with the space before it. */
const inParens = (id: string) => new RegExp(String.raw`\s*\(\s*${QUOTES}${escapeRe(id)}${QUOTES}\s*\)`, "gu");
/** id on its own, not part of a longer id ("medicare_card" inside "doc.medicare_card.name" doesn't count). */
const bare = (id: string) => new RegExp(String.raw`\x60?(?<![\p{L}\p{N}_.])${escapeRe(id)}(?![\p{L}\p{N}_])\x60?`, "gu");
const GENERIC_AID = /(?<![\p{L}\p{N}_.])(?:doc|form)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*/gu;

/**
 * The prompt shows the model internal ids and it sometimes repeats them. Document ids become the
 * document's name in the reply language; "(ss_award_letter)" right after the model's own wording for
 * the document is just dropped, so the name isn't said twice. Field ids, aid ids and fact ids with
 * an underscore are removed.
 */
export function cleanInternalIds(spec: FormSpec, reply: string, lang: LangCode): string {
  const byLength = (a: string, b: string) => b.length - a.length;
  const strip = [
    ...spec.aids.map((a) => a.id),
    ...spec.fields.map((f) => f.id),
    ...spec.knowledge.map((k) => k.id).filter((id) => id.includes("_")),
  ].sort(byLength);
  let out = reply;
  for (const id of strip) out = out.replace(inParens(id), "").replace(bare(id), "");
  out = out.replace(GENERIC_AID, "");
  for (const doc of [...spec.documents].sort((a, b) => byLength(a.id, b.id))) {
    out = out.replace(inParens(doc.id), "").replace(bare(doc.id), documentName(spec, doc.id, lang) ?? doc.name);
  }
  if (out === reply) return reply;
  return tidy(
    out
      .replace(/\(\s*\)|`\s*`|\*\*\s*\*\*/g, "")
      .replace(/[ \t]+([,.;:!?)])/g, "$1"),
  );
}

function tidy(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

// "Free help" / "counselor" and "screen" in the same sentence. Narrow on purpose: "this will help you" doesn't count.
const HELP_WORDS = String.raw`free help|counsel(?:or|ing)\p{L}*|ayuda gratuita|ayuda gratis|consejer\p{L}*|aide gratuite|conseiller\p{L}*|èd gratis|konseye|trợ giúp miễn phí|tư vấn`;
const HELP_ON_SCREEN = new RegExp(
  `${word(HELP_WORDS)}[^.!?\\n]*${word(SCREEN_WORDS)}|${word(SCREEN_WORDS)}[^.!?\\n]*${word(HELP_WORDS)}`,
  "iu",
);

/** "Free help is now on the screen" without a handoff call would leave the user waiting for a card that never opens. */
export function reconcileHelpClaim(spec: FormSpec, field: Field | null, reply: string, actions: Action[]): Action[] {
  if (actions.some((a) => a.type === "handoff") || !HELP_ON_SCREEN.test(reply)) return actions;
  const v = validateToolCall(spec, field, "handoff", JSON.stringify({ reason: "other" }));
  return v.ok ? [...actions, v.action] : actions;
}

/**
 * Safe to log: name, HTTP status and error code only. Provider error messages can quote the
 * request (and so the user's words), so the message itself is never logged.
 */
export function describeError(err: unknown): string {
  const e = err as { name?: string; status?: number; code?: string | null; type?: string | null };
  return [e?.name ?? "Error", e?.status, e?.code, e?.type].filter((x) => x !== undefined && x !== null && x !== "").join(" ");
}

/** Accepts aid_id="X", aid_id: 'X', {"aid_id":"X"} and mixes of them. */
function parseLooseArgs(raw: string): Record<string, string> {
  const args: Record<string, string> = {};
  for (const m of raw.matchAll(/"?(aid_id|reason)"?\s*[:=]\s*["']([^"']*)["']/g)) args[m[1]] = m[2];
  return args;
}

/** Offline stand-in so the frontend can integrate before anyone has an API key. */
function mockReply(spec: FormSpec, field: Field | null, text: string, masked: boolean): { reply: string; actions: Action[] } {
  const lower = text.toLowerCase();
  if (masked) {
    return { reply: "Please write that number on the paper form. You never need to share it with me.", actions: [] };
  }
  if (/\b(qualify|eligible|eligibility|will i get|how much will)\b/.test(lower)) {
    return {
      reply: "Medicaid decides who qualifies, not me. Apply even if you're not sure. A free counselor can talk it through with you.",
      actions: [{ type: "handoff", reason: "eligibility_question", contacts: counselors }],
    };
  }
  if (/\b(counselor|person|human|help me|stuck)\b/.test(lower)) {
    return { reply: "Here are free people who can help you with this form.", actions: [{ type: "handoff", reason: "user_asked", contacts: counselors }] };
  }
  const aidId = defaultAidId(field);
  const aid = spec.aids.find((a) => a.id === aidId);
  return {
    reply: `[mock] ${field?.plain ?? NO_FIELD_REPLY}`,
    actions: aid ? [{ type: "show_aid", aidId: aid.id, aid }] : [],
  };
}

export class HttpError extends Error {
  constructor(public status: 400 | 404 | 409 | 413 | 502, message: string) {
    super(message);
  }
}
