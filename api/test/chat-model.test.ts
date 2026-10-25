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

const text = (content: string) => ({ role: "assistant", content, tool_calls: [] });
const toolCall = (name: string, args: object, content = "") =>
  ({ role: "assistant", content, tool_calls: [{ id: "c1", type: "function", function: { name, arguments: JSON.stringify(args) } }] });
const finishedDorothy = async () => {
  const { formSpec } = await import("../src/spec/form-1mb.js");
  const { report } = await import("../src/spec/engine.js");
  let p = { answers: {} as Record<string, "yes" | "no">, done: [] as string[] };
  for (let next = report(formSpec, p).nextFieldId; next; next = report(formSpec, p).nextFieldId) {
    const f = formSpec.fields.find((x) => x.id === next)!;
    p = f.kind === "gate" ? { ...p, answers: { ...p.answers, [f.id]: f.id === "s6_other_money" ? "yes" : "no" } } : { ...p, done: [...p.done, f.id] };
  }
  return p;
};

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

  it("without fieldId, the prompt is about the engine's next field", async () => {
    const r = await (await chat({ progress: { answers: {}, done: ["cover_language"] }, messages: [{ role: "user", content: "what now?" }] })).json();
    expect(r.fieldId).toBe("s1_name");
    expect(complete.mock.calls[0][0][0].content).toContain("CURRENT FIELD\nid: s1_name");
  });

  it("without fieldId on a finished form: no current-field block, and show_aid is not offered or accepted", async () => {
    complete.mockResolvedValueOnce(toolCall("show_aid", { aid_id: "form.s1_ssn" }, "Look at the picture."));
    const r = await (await chat({ progress: await finishedDorothy(), messages: [{ role: "user", content: "where does my SSN go?" }] })).json();
    const [messages, tools] = complete.mock.calls[0];
    expect(messages[0].content).not.toContain("CURRENT FIELD");
    expect(messages[0].content).toContain("FORM STATUS\nEvery required item is done.");
    expect(tools.map((t: { function: { name: string } }) => t.function.name)).toEqual(["handoff"]);
    expect(r.fieldId).toBeNull();
    expect(r.actions).toEqual([]);
    expect(r.rejected).toEqual([expect.objectContaining({ tool: "show_aid", why: "no field on screen" })]);
  });

  it("addedByCode says when the server, not the model, attached an action", async () => {
    complete.mockResolvedValueOnce(text("Apply even if you're not sure. Free help is now on the screen."));
    const byCode = await (await chat({ fieldId: "s6_gross_amount", messages: [{ role: "user", content: "Will I qualify?" }] })).json();
    expect(byCode.actions.map((a: { type: string }) => a.type)).toEqual(["handoff"]);
    expect(byCode.addedByCode).toEqual(["handoff"]);

    complete.mockResolvedValueOnce(toolCall("handoff", { reason: "eligibility_question" }, "Apply even if you're not sure. Free help is now on the screen."));
    const byModel = await (await chat({ fieldId: "s6_gross_amount", messages: [{ role: "user", content: "Will I qualify?" }] })).json();
    expect(byModel.actions.map((a: { type: string }) => a.type)).toEqual(["handoff"]);
    expect(byModel.addedByCode).toEqual([]);
  });

  it("replaces leaked document ids in a Spanish reply", async () => {
    complete.mockResolvedValueOnce(text("Mire su carta de beneficio del Seguro Social (ss_award_letter) o, si tiene pensión, su pension_statement."));
    const r = await (await chat({ fieldId: "s6_gross_amount", language: "Spanish", messages: [{ role: "user", content: "¿Dónde encuentro esto?" }] })).json();
    expect(r.reply).toBe("Mire su carta de beneficio del Seguro Social o, si tiene pensión, su estado de cuenta de la pensión.");
  });

  it("the degraded fallback's fixed sentence follows the reply language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    complete.mockRejectedValueOnce(Object.assign(new Error("boom"), { status: 503 }));
    const r = await (await chat({ fieldId: "s1_dob", language: "Vietnamese", messages: [{ role: "user", content: "?" }] })).json();
    expect(r.degraded).toBe(true);
    expect(r.reply.endsWith("Một chuyên viên tư vấn miễn phí có thể giúp quý vị.")).toBe(true);
    expect(r.addedByCode).toEqual(["handoff"]);
  });

  it("/transcribe's privacy notice follows its language field", async () => {
    const { transcribe } = await import("../src/model/client.js");
    (transcribe as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce("mi número es 123-45-6789");
    const fd = new FormData();
    fd.append("audio", new File([new Uint8Array(10)], "clip.webm", { type: "audio/webm" }));
    fd.append("language", "fr");
    const r = await (await app.request("/api/transcribe", { method: "POST", body: fd })).json();
    expect(r.text).toBe("mi número es [SSN removed]");
    expect(r.privacy.notice).toMatch(/^Vous n'avez pas besoin de me donner votre numéro de Sécurité sociale/);
  });

  it("asks again when the model stops with no text and no tool call", async () => {
    complete.mockResolvedValueOnce(text("")).mockResolvedValueOnce(text("Busque la cifra más alta en su carta."));
    const r = await (await chat({ fieldId: "s6_gross_amount", language: "Spanish", messages: [{ role: "user", content: "¿Dónde?" }] })).json();
    expect(complete).toHaveBeenCalledTimes(2);
    expect(r.reply).toBe("Busque la cifra más alta en su carta.");
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
