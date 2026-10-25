import { streamText } from "ai";
import { FACTS, FIELDS, FORM, SECTIONS, TERMS } from "@/data/form";
import { localAnswer } from "@/lib/answers";
import { maskSensitive } from "@/lib/privacy";

export const maxDuration = 30;

// Open-weight model through Vercel AI Gateway, per the white paper. Override with CHAT_MODEL.
const MODEL = process.env.CHAT_MODEL ?? "openai/gpt-oss-120b";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SPEC = JSON.stringify({
  form: FORM,
  sections: SECTIONS.map(({ box, ...s }) => (void box, s)),
  fields: FIELDS.map(({ box, ...f }) => (void box, f)),
  glossary: TERMS,
});

const SYSTEM = `You are a friendly helper sitting beside someone filling out Louisiana's paper Medicare Savings Program application (${FORM.code}). Many users are older adults.

Rules:
1. Answer only from the FORM SPEC and VERIFIED FACTS below. If they don't cover the question, say you're not sure and suggest LaSHIP, the free Medicare counseling line, at 1-800-259-5300.
2. Never ask for, repeat, or guess a Social Security number, Medicare number, or health details. If the user shares one, tell them to write it on the paper form instead.
3. Never say whether the user qualifies or will be approved. Louisiana decides. Encourage them to apply even if they're not sure.
4. Do not mention back payments or retroactive coverage.
5. Use plain language at an 8th-grade reading level. Short sentences. One idea at a time. Keep answers under 90 words unless asked for more. No markdown headings or tables; short lists are fine.
6. When it helps, name the section of the form (for example "Section 6, Other Money").

VERIFIED FACTS:
${FACTS}

FORM SPEC (JSON):
${SPEC}`;

function clean(messages: ChatMessage[]) {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: maskSensitive(m.content).text.slice(0, 2000) }));
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: ChatMessage[]; fieldId?: string };
  const messages = clean(body.messages ?? []);
  const field = FIELDS.find((f) => f.id === body.fieldId);
  const question = messages.at(-1)?.content ?? "";

  const context = field
    ? `\n\nThe user is currently looking at the field "${field.label}" (id ${field.id}) in section "${SECTIONS.find((s) => s.id === field.section)?.title}".`
    : "";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sent = false;
      try {
        const result = streamText({
          model: MODEL,
          system: SYSTEM + context,
          messages,
          temperature: 0.2,
        });
        for await (const delta of result.textStream) {
          if (!delta) continue;
          sent = true;
          controller.enqueue(encoder.encode(delta));
        }
        if (!sent) throw new Error("empty response");
      } catch (error) {
        console.error("chat model error", error);
        if (!sent) controller.enqueue(encoder.encode(localAnswer(question, field?.id)));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
