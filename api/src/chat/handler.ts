import { z } from "zod";
import type OpenAI from "openai";
import { config } from "../config.js";
import { complete } from "../model/client.js";
import { filterText, type FindingKind } from "../privacy/filter.js";
import { getField, sanitizeProgress, stripClientOnly } from "../spec/engine.js";
import type { Field, FormSpec } from "../spec/types.js";
import { buildSystemPrompt } from "./prompt.js";
import { toolDefinitions, validateToolCall, type Action, type Rejected } from "./tools.js";
import { counselors } from "../data/counselors.js";

export const ChatRequest = z.object({
  fieldId: z.string(),
  progress: z.object({
    answers: z.record(z.string(), z.enum(["yes", "no"])).default({}),
    done: z.array(z.string()).default([]),
  }).default({ answers: {}, done: [] }),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).min(1).max(30),
  mode: z.enum(["text", "voice"]).default("text"),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

export type ChatResponse = {
  reply: string;
  actions: Action[];
  privacy: { masked: boolean; kinds: FindingKind[]; notice: string | null };
  /** The user's latest message after masking. Replace the chat bubble with this. */
  userMessage: string;
  fieldId: string;
  /** true when the model failed and we answered from the spec alone */
  degraded: boolean;
  /** tool calls code refused (dev only; empty in production) */
  rejected: Rejected[];
};

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function handleChat(spec: FormSpec, req: ChatRequest): Promise<ChatResponse> {
  const field = getField(spec, req.fieldId);
  if (!field) throw new HttpError(400, `Unknown fieldId "${req.fieldId}"`);
  // Answers to clientOnly gates (Section 7) are dropped before anything else sees the progress.
  const progress = sanitizeProgress(spec, stripClientOnly(spec, req.progress));

  // 1. Privacy filter on every message (history too), before anything else touches it.
  const filtered = req.messages.map((m) => ({ role: m.role, ...filterText(m.content) }));
  const last = filtered[filtered.length - 1];
  const privacy = { masked: last.masked, kinds: last.kinds, notice: last.notice };

  if (last.role !== "user") throw new HttpError(400, "Last message must be from the user");

  // 2. Model (or mock)
  let reply: string;
  let actions: Action[] = [];
  let rejected: Rejected[] = [];
  let degraded = false;

  if (config.provider === "mock") {
    ({ reply, actions } = mockReply(spec, field, last.text, last.masked));
  } else {
    try {
      ({ reply, actions, rejected } = await runModel(spec, field, progress, filtered, req.mode));
    } catch (err) {
      console.error("[chat] model error:", describeError(err));
      degraded = true;
      reply = `${field.plain} I'm having trouble answering more right now. A free counselor can help.`;
      actions = [{ type: "handoff", reason: "other", contacts: counselors }];
    }
  }

  // 3. A reply that says a picture is on the screen must come with one.
  ({ reply, actions } = reconcilePictureClaim(spec, field, reply, actions));

  // 4. Filter the model's output too, and never let it echo masking tokens back as if they were data.
  reply = filterText(reply).text;

  return {
    reply,
    actions,
    privacy,
    userMessage: last.text,
    fieldId: field.id,
    degraded,
    rejected: process.env.NODE_ENV === "production" ? [] : rejected,
  };
}

async function runModel(
  spec: FormSpec,
  field: Field,
  progress: ReturnType<typeof sanitizeProgress>,
  history: { role: "user" | "assistant"; text: string }[],
  mode: "text" | "voice",
) {
  const messages: Msg[] = [
    { role: "system", content: buildSystemPrompt(spec, field, progress, mode) },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.text }) as Msg),
  ];
  const actions: Action[] = [];
  const rejected: Rejected[] = [];

  // At most 2 tool rounds, then force a text answer.
  for (let round = 0; round < 3; round++) {
    const msg = await complete(messages, round < 2 ? toolDefinitions : undefined);
    if (!msg) throw new Error("empty completion");
    const calls = msg.tool_calls ?? [];
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
    return { reply: recovered.text || field.plain, actions, rejected };
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
export function recoverTextToolCalls(spec: FormSpec, field: Field, text: string): { text: string; actions: Action[]; rejected: Rejected[] } {
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

const PICTURE_ON_SCREEN = /\b(picture|image|photo|highlight\w*)\b[^.!?\n]*\bscreen\b|\bscreen\b[^.!?\n]*\b(picture|image|photo|highlight\w*)\b/i;

/** What the aid viewer opens by default: the first doc.* aid, else the form.* aid. */
export function defaultAidId(field: Field): string | undefined {
  return field.aids.find((a) => a.startsWith("doc.")) ?? field.aids.find((a) => a.startsWith("form."));
}

/**
 * The model sometimes says "a picture is now on the screen" without calling show_aid. Make the
 * reply true: attach the field's default aid, or if the field has none, drop that sentence.
 */
export function reconcilePictureClaim(spec: FormSpec, field: Field, reply: string, actions: Action[]): { reply: string; actions: Action[] } {
  if (actions.some((a) => a.type === "show_aid") || !PICTURE_ON_SCREEN.test(reply)) return { reply, actions };
  const aidId = defaultAidId(field);
  if (aidId) {
    const v = validateToolCall(spec, field, "show_aid", JSON.stringify({ aid_id: aidId }));
    if (v.ok) return { reply, actions: [...actions, v.action] };
  }
  const kept = reply.replace(/[^.!?\n]+[.!?]*/g, (sentence) => (PICTURE_ON_SCREEN.test(sentence) ? "" : sentence));
  return { reply: tidy(kept) || field.plain, actions };
}

function tidy(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
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
function mockReply(spec: FormSpec, field: Field, text: string, masked: boolean): { reply: string; actions: Action[] } {
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
    reply: `[mock] ${field.plain}`,
    actions: aid ? [{ type: "show_aid", aidId: aid.id, aid }] : [],
  };
}

export class HttpError extends Error {
  constructor(public status: 400 | 404 | 409 | 413 | 502, message: string) {
    super(message);
  }
}
