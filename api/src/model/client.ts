/**
 * One OpenAI-compatible client for every open-model host. Moving from the demo (Groq) to a
 * partner agency's own server (vLLM) is MODEL_PROVIDER=vllm + MODEL_BASE_URL. No code changes.
 */
import OpenAI from "openai";
import { config } from "../config.js";

let client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (config.provider === "mock") throw new Error("getClient() called in mock mode");
  client ??= new OpenAI({ baseURL: config.baseURL, apiKey: config.apiKey, timeout: 30_000, maxRetries: 1 });
  return client;
}

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

export async function complete(messages: Msg[], tools?: Tool[]) {
  const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & Record<string, unknown> = {
    model: config.model,
    messages,
    temperature: 0.2,
    max_tokens: 600,
    ...(tools ? { tools, tool_choice: "auto" as const } : {}),
  };
  // gpt-oss reasoning models: keep thinking short so voice replies feel instant
  if (config.model.includes("gpt-oss")) body.reasoning_effort = config.reasoningEffort;
  const res = await getClient().chat.completions.create(body);
  return res.choices[0]?.message;
}

export async function transcribe(file: File): Promise<string> {
  if (config.provider === "mock") return "What counts as income?";
  const res = await getClient().audio.transcriptions.create({ file, model: config.sttModel, language: "en" });
  return res.text;
}
