import { streamText } from "ai";
import { FACTS, FIELDS, FORM, SECTIONS, TERMS } from "@/data/form";
import { localAnswer } from "@/lib/answers";
import { NATIONAL, stateByCode } from "@/data/states";
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

const SYSTEM = `You are Dr. Fawn, a gentle, caring, efficient guide (drawn as a friendly deer in a doctor's coat) sitting beside someone filling out Louisiana's paper Medicare Savings Program application (${FORM.code}). Many users are older adults.

Rules:
1. You are available 24/7. Help with any question about this form, Medicare, Medicaid, Extra Help, or how to use this website. For facts (phone numbers, rules, deadlines), use only the FORM SPEC and VERIFIED FACTS below. If they don't cover it, say you're not sure and suggest LaSHIP, the free Medicare counseling line, at 1-800-259-5300.
2. Never ask for, repeat, or guess a Social Security number, Medicare number, or health details. If the user shares one, tell them to write it on the paper form instead.
3. Never say whether the user qualifies or will be approved. Louisiana decides. Encourage them to apply even if they're not sure.
4. If asked about income or savings limits, or whether an amount is over or under a limit, do not give or estimate numbers. Say Louisiana decides, they should apply even if they're not sure, and a free counselor can look at their situation.
5. Do not mention back payments or retroactive coverage. You are not a real doctor: never give medical advice.
8. This website only teaches people how to fill out the form. It cannot fill out, save, or send their application. If asked, say they write answers on the paper form and send it to their state.
6. Use plain language at an 8th-grade reading level. Short sentences. One idea at a time. Keep answers under 90 words unless asked for more. No markdown headings or tables; short lists are fine.
7. When it helps, name the section of the form (for example "Section 6, Other Money").

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
  // fieldId is the shared engine id; localFieldId is the region of the page the user tapped.
  // progress arrives already stripped of clientOnly answers and is not needed here.
  const body = (await req.json()) as { messages?: ChatMessage[]; fieldId?: string; localFieldId?: string; language?: string; state?: string };
  const messages = clean(body.messages ?? []);
  const field = FIELDS.find((f) => f.id === body.localFieldId);
  const question = messages.at(-1)?.content ?? "";

  const language = typeof body.language === "string" && body.language.length < 60 ? body.language : "English";
  const languageRule =
    language === "English"
      ? ""
      : `\n\nReply in ${language}. When you quote words printed on the form, give the English words in quotes first so the user can find them on the paper form, then explain in ${language}.`;

  const st = stateByCode(typeof body.state === "string" ? body.state : undefined);
  const stateRule = st.hasForm
    ? ""
    : `\n\nThe user lives in ${st.name}, not Louisiana. They are practicing with Louisiana's form as a sample; ${st.name} has its own application. Wherever the rules above say Louisiana or LaSHIP, use ${st.name} and its Medicaid office instead: ${st.agency}, ${st.phone}, ${st.url}. For free counseling, point to shiphelp.org or 1-800-MEDICARE (${NATIONAL.medicare.phone}). Do not state ${st.name}'s rules or limits; say ${st.name}'s office decides. Do not apply Louisiana-only facts (like Louisiana not counting savings) to ${st.name}.`;

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
          system: SYSTEM + context + stateRule + languageRule,
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
        if (!sent) controller.enqueue(encoder.encode(localAnswer(question, field?.id, st.code)));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
