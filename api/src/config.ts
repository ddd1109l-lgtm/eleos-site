import "dotenv/config";

export type Provider = "groq" | "together" | "openrouter" | "vllm" | "ollama" | "mock";

const PRESETS: Record<Exclude<Provider, "mock">, { baseURL: string; model: string; needsKey: boolean }> = {
  groq: { baseURL: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b", needsKey: true },
  together: { baseURL: "https://api.together.xyz/v1", model: "openai/gpt-oss-120b", needsKey: true },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", model: "openai/gpt-oss-120b", needsKey: true },
  vllm: { baseURL: "http://localhost:8000/v1", model: "openai/gpt-oss-20b", needsKey: false },
  ollama: { baseURL: "http://localhost:11434/v1", model: "gpt-oss:20b", needsKey: false },
};

function resolveProvider(): Provider {
  const raw = (process.env.MODEL_PROVIDER || "groq").toLowerCase() as Provider;
  if (raw === "mock") return "mock";
  if (!(raw in PRESETS)) throw new Error(`Unknown MODEL_PROVIDER "${raw}"`);
  // A hosted provider with no key falls back to mock so the frontend can still develop against us.
  if (PRESETS[raw as Exclude<Provider, "mock">].needsKey && !process.env.MODEL_API_KEY) {
    console.warn(`[config] MODEL_PROVIDER=${raw} but MODEL_API_KEY is empty -> using mock mode`);
    return "mock";
  }
  return raw;
}

const provider = resolveProvider();
const preset = provider === "mock" ? null : PRESETS[provider];

export const config = {
  provider,
  baseURL: process.env.MODEL_BASE_URL || preset?.baseURL || "",
  apiKey: process.env.MODEL_API_KEY || "not-needed",
  model: process.env.MODEL_NAME || preset?.model || "mock",
  sttModel: process.env.STT_MODEL || "whisper-large-v3-turbo",
  // gpt-oss models accept a reasoning effort; low keeps replies fast for a voice demo
  reasoningEffort: "low" as const,
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173").split(",").map((s) => s.trim()),
  port: Number(process.env.PORT || 8787),
};
