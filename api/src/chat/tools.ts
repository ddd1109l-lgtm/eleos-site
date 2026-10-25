import type OpenAI from "openai";
import type { Aid, Field, FormSpec } from "../spec/types.js";
import { counselors, type Contact } from "../data/counselors.js";

export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "show_aid",
      description:
        "Show the user a picture with a highlighted box: where the answer goes on the paper form, or where to find it on their document. Only use an aid id listed for the current field.",
      parameters: {
        type: "object",
        properties: { aid_id: { type: "string", description: "One of the aid ids listed for the current field" } },
        required: ["aid_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "handoff",
      description:
        "Show free counselor contact information. Use when the user is stuck, can't read their documents, asks if they qualify, or asks something the form spec doesn't cover.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            enum: ["stuck", "cant_read_documents", "eligibility_question", "not_in_spec", "user_asked", "other"],
          },
        },
        required: ["reason"],
        additionalProperties: false,
      },
    },
  },
];

export type Action =
  | { type: "show_aid"; aidId: string; aid: Aid }
  | { type: "handoff"; reason: string; contacts: Contact[] };

export type Rejected = { tool: string; args: unknown; why: string };

/** Code validates every tool call before the frontend ever sees it. */
export function validateToolCall(
  spec: FormSpec,
  current: Field,
  name: string,
  rawArgs: string,
): { ok: true; action: Action; result: string } | { ok: false; rejected: Rejected; result: string } {
  let args: Record<string, unknown>;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { ok: false, rejected: { tool: name, args: rawArgs, why: "bad JSON" }, result: "Error: arguments were not valid JSON." };
  }

  if (name === "show_aid") {
    const aidId = String(args.aid_id ?? "");
    if (!current.aids.includes(aidId)) {
      return {
        ok: false,
        rejected: { tool: name, args, why: `aid ${aidId} not allowed for ${current.id}` },
        result: `Error: "${aidId}" is not available for this field. Allowed: ${current.aids.join(", ") || "none"}.`,
      };
    }
    const aid = spec.aids.find((a) => a.id === aidId);
    if (!aid) return { ok: false, rejected: { tool: name, args, why: "aid missing from spec" }, result: "Error: aid not found." };
    return { ok: true, action: { type: "show_aid", aidId, aid }, result: `Shown to user: ${aid.caption}.` };
  }

  if (name === "handoff") {
    const reason = typeof args.reason === "string" ? args.reason : "other";
    return { ok: true, action: { type: "handoff", reason, contacts: counselors }, result: "Counselor contact card shown to user." };
  }

  return { ok: false, rejected: { tool: name, args, why: "unknown tool" }, result: `Error: unknown tool ${name}.` };
}
