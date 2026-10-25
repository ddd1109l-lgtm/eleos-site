/**
 * /chat through the real prompt builder, with the model client stubbed (no network). Mock mode
 * skips the prompt entirely, so these run as a keyless provider (vllm) instead.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../src/model/client.js", () => ({
  complete: vi.fn(async () => ({ role: "assistant", content: "Copy the name from the top of the bill.", tool_calls: [] })),
  transcribe: vi.fn(async () => ""),
}));
vi.mock("../src/chat/prompt.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/chat/prompt.js")>();
  return { ...real, buildSystemPrompt: vi.fn(real.buildSystemPrompt) };
});

let app: typeof import("../src/app.js").app;
let complete: ReturnType<typeof vi.fn>;
let buildSystemPrompt: ReturnType<typeof vi.fn>;
beforeAll(async () => {
  process.env.MODEL_PROVIDER = "vllm";
  ({ app } = await import("../src/app.js"));
  complete = (await import("../src/model/client.js")).complete as unknown as ReturnType<typeof vi.fn>;
  buildSystemPrompt = (await import("../src/chat/prompt.js")).buildSystemPrompt as unknown as ReturnType<typeof vi.fn>;
});
afterEach(() => {
  complete.mockClear();
  buildSystemPrompt.mockClear();
  vi.restoreAllMocks();
});

const chat = (body: unknown) =>
  app.request("/api/chat", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("/chat with the model path (stubbed client)", () => {
  it("answers normally for a Section 7 field when the gate answer is absent", async () => {
    const r = await (await chat({
      fieldId: "s7_provider",
      progress: { answers: { s6_other_money: "yes" }, done: [] },
      messages: [{ role: "user", content: "what goes here?" }],
    })).json();
    expect(r).toMatchObject({ degraded: false, fieldId: "s7_provider", reply: "Copy the name from the top of the bill." });
    const system = complete.mock.calls[0][0][0].content as string;
    // The field on screen is in the prompt's field list even though its gate was never sent.
    expect(system).toContain("- s7_provider [todo, sensitive:health]");
    expect(system).toContain("Medical Expenses (in_progress)");
  });

  it("never passes a clientOnly answer (or the done ids it controls) to the prompt builder", async () => {
    await chat({
      fieldId: "s7_dates",
      progress: { answers: { s6_other_money: "yes", s7_medical_bills: "yes" }, done: ["s6_gross_amount", "s7_provider"] },
      messages: [{ role: "user", content: "which date?" }],
    });
    expect(buildSystemPrompt).toHaveBeenCalledTimes(1);
    const progress = buildSystemPrompt.mock.calls[0][2];
    expect(progress.answers).toEqual({ s6_other_money: "yes" });
    expect(progress.done).toEqual(["s6_gross_amount"]);
  });

  it("passes the reply language into the system prompt", async () => {
    await chat({ fieldId: "s6_gross_amount", language: "Spanish", messages: [{ role: "user", content: "¿Dónde encuentro esto?" }] });
    expect(complete.mock.calls[0][0][0].content).toContain("Reply in Spanish.");
  });

  it("sends Whisper a language hint only for en, es, vi, fr, ht", async () => {
    const { transcribe } = await import("../src/model/client.js");
    const hint = async (language?: string) => {
      const fd = new FormData();
      fd.append("audio", new File([new Uint8Array(10)], "clip.webm", { type: "audio/webm" }));
      if (language !== undefined) fd.append("language", language);
      (transcribe as unknown as ReturnType<typeof vi.fn>).mockClear();
      await app.request("/api/transcribe", { method: "POST", body: fd });
      return (transcribe as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    };
    expect(await hint()).toBe("en");
    expect(await hint("es")).toBe("es");
    expect(await hint("Spanish")).toBe("es");
    expect(await hint("Kreyòl")).toBe("ht");
    expect(await hint("Tagalog")).toBeUndefined();
  });

  it("logs a model failure without the user's words", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    complete.mockRejectedValueOnce(Object.assign(new Error('400 bad request near "my secret words"'), { name: "BadRequestError", status: 400 }));
    const r = await (await chat({ fieldId: "s1_dob", messages: [{ role: "user", content: "my secret words" }] })).json();
    expect(r.degraded).toBe(true);
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  });
});
