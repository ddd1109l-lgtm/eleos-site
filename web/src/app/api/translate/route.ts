import { generateText } from "ai";

export const maxDuration = 60;

const MODEL = process.env.TRANSLATE_MODEL ?? process.env.CHAT_MODEL ?? "openai/gpt-oss-120b";

const SYSTEM = `You translate the interface and help text of a website that helps older adults fill out Louisiana's Medicare Savings Program application.

Return ONLY a JSON object with three keys:
- "code": the BCP 47 language code for the target language (for example "pl-PL"), used for text-to-speech.
- "rtl": true if the language is written right to left, otherwise false.
- "strings": an object with exactly the same keys as the input, each value translated.

Rules:
- Use plain, warm, simple words at an 8th-grade level, like talking to a grandparent.
- Keep phone numbers, website addresses, dollar amounts, dates, and program names (Medicare, Medicaid, QMB, SLMB, QI, LaSHIP, LDH, Extra Help, Dr. Fawn, Eleos) unchanged.
- Keep placeholders like {done} and {total} exactly as they are.
- Do not add or remove keys. Do not add explanations.`;

export async function POST(req: Request) {
  const { language, strings } = (await req.json()) as { language?: string; strings?: Record<string, string> };
  if (!language || !strings || typeof strings !== "object" || language.length > 60) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const keys = Object.keys(strings).slice(0, 120);
  const input = Object.fromEntries(keys.map((k) => [k, String(strings[k]).slice(0, 1200)]));

  try {
    const { text } = await generateText({
      model: MODEL,
      system: SYSTEM,
      prompt: `Target language: ${language}\n\nInput JSON:\n${JSON.stringify(input)}`,
      temperature: 0.1,
    });
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as {
      code?: string;
      rtl?: boolean;
      strings?: Record<string, unknown>;
    };
    const out: Record<string, string> = {};
    for (const k of keys) {
      const v = json.strings?.[k];
      if (typeof v === "string" && v.trim()) out[k] = v;
    }
    return Response.json({ strings: out, code: typeof json.code === "string" ? json.code : undefined, rtl: json.rtl === true });
  } catch (error) {
    console.error("translate error", error);
    return Response.json({ error: "translation unavailable" }, { status: 502 });
  }
}
