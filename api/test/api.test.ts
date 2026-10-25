import { beforeAll, describe, expect, it, vi } from "vitest";

let app: typeof import("../src/app.js").app;

/** Answer every gate (yes for the ones listed), mark everything else done: a finished form. */
async function finished(yes: string[]) {
  const { formSpec } = await import("../src/spec/form-1mb.js");
  const { report } = await import("../src/spec/engine.js");
  let p = { answers: {} as Record<string, "yes" | "no">, done: [] as string[] };
  for (let next = report(formSpec, p).nextFieldId; next; next = report(formSpec, p).nextFieldId) {
    const f = formSpec.fields.find((x) => x.id === next)!;
    p = f.kind === "gate" ? { ...p, answers: { ...p.answers, [f.id]: yes.includes(f.id) ? "yes" : "no" } } : { ...p, done: [...p.done, f.id] };
  }
  return p;
}
beforeAll(async () => {
  process.env.MODEL_PROVIDER = "mock";
  ({ app } = await import("../src/app.js"));
});

const post = (path: string, body: unknown) =>
  app.request(`/api${path}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("API (mock model)", () => {
  it("health", async () => {
    const r = await app.request("/api/health");
    expect(await r.json()).toMatchObject({ ok: true, mock: true });
  });

  it("spec", async () => {
    const s = await (await app.request("/api/spec")).json();
    expect(s.form).toBe("BHSF Form 1-MB");
    expect(s.fields.length).toBeGreaterThan(40);
  });

  it("progress starts at the cover", async () => {
    const r = await (await post("/progress", { progress: { answers: {}, done: [] } })).json();
    expect(r.nextFieldId).toBe("cover_language");
    expect(r.complete).toBe(false);
  });

  it("chat shows the award-letter highlight for the income field", async () => {
    const r = await (await post("/chat", {
      fieldId: "s6_gross_amount",
      progress: { answers: { s6_other_money: "yes" }, done: [] },
      messages: [{ role: "user", content: "where do I find this?" }],
    })).json();
    expect(r.actions[0]).toMatchObject({ type: "show_aid", aidId: "doc.award_letter.before_deductions" });
    expect(r.privacy.masked).toBe(false);
  });

  it("chat masks an SSN and never echoes it", async () => {
    const res = await post("/chat", {
      fieldId: "s1_ssn",
      messages: [{ role: "user", content: "it's 123-45-6789" }],
    });
    const raw = await res.text();
    expect(raw).not.toContain("6789");
    const r = JSON.parse(raw);
    expect(r.privacy).toMatchObject({ masked: true, kinds: ["ssn"] });
    expect(r.userMessage).toBe("it's [SSN removed]");
    expect(r.privacy.notice).toMatch(/Write it straight onto the paper form/);
  });

  it("eligibility questions hand off", async () => {
    const r = await (await post("/chat", {
      fieldId: "s6_gross_amount",
      messages: [{ role: "user", content: "do I qualify?" }],
    })).json();
    expect(r.actions[0].type).toBe("handoff");
    expect(r.actions[0].contacts[0].phone).toBe("1-800-259-5300");
  });

  it("chat answers for a Section 7 field with no gate answer", async () => {
    const res = await post("/chat", {
      fieldId: "s7_total_cost",
      progress: { answers: { s6_other_money: "yes" }, done: [] },
      messages: [{ role: "user", content: "what do I write here?" }],
    });
    expect(res.status).toBe(200);
    const r = await res.json();
    expect(r).toMatchObject({ fieldId: "s7_total_cost", degraded: false });
    expect(r.reply.length).toBeGreaterThan(0);
  });

  it("progress drops clientOnly answers and the done ids they control", async () => {
    const r = await (await post("/progress", {
      progress: { answers: { s6_other_money: "yes", s7_medical_bills: "yes" }, done: ["s6_gross_amount", "s7_provider"] },
    })).json();
    expect(r.progress).toEqual({ answers: { s6_other_money: "yes" }, done: ["s6_gross_amount"] });
  });

  it("bad JSON is a 400, and the body never reaches the logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await app.request("/api/chat", { method: "POST", body: "my ssn is 123-45-6789 {", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain("6789");
    expect(JSON.stringify(log.mock.calls)).not.toContain("6789");
    log.mockRestore();
  });

  it("chat accepts a language, and rejects one over 60 characters", async () => {
    const ok = await post("/chat", { fieldId: "s6_gross_amount", language: "Spanish", messages: [{ role: "user", content: "¿Dónde encuentro esto?" }] });
    expect(ok.status).toBe(200);
    const long = await post("/chat", { fieldId: "s6_gross_amount", language: "x".repeat(61), messages: [{ role: "user", content: "hi" }] });
    expect(long.status).toBe(400);
  });

  it("chat without fieldId uses the engine's next field", async () => {
    const r = await (await post("/chat", { messages: [{ role: "user", content: "what do I do first?" }] })).json();
    expect(r.fieldId).toBe("cover_language");
    expect(r.degraded).toBe(false);
  });

  it("chat without fieldId on a finished form: no field, no picture", async () => {
    // Ray answered the Section 7 gate on the device; it is stripped before the server sees it.
    const res = await post("/chat", { progress: await finished(["s6_other_money", "s7_medical_bills"]), messages: [{ role: "user", content: "where do I find this?" }] });
    expect(res.status).toBe(200);
    const r = await res.json();
    expect(r.fieldId).toBeNull();
    expect(r.actions.filter((a: { type: string }) => a.type === "show_aid")).toEqual([]);
    expect(r.reply.length).toBeGreaterThan(0);
  });

  it("the privacy notice follows the reply language", async () => {
    const es = await (await post("/chat", { fieldId: "s1_ssn", language: "Español", messages: [{ role: "user", content: "es 123-45-6789" }] })).json();
    expect(es.privacy.notice).toBe("No necesita decirme su número de Seguro Social. Escríbalo directamente en el formulario de papel. Lo borré de este chat.");
    const other = await (await post("/chat", { fieldId: "s1_ssn", language: "Tagalog", messages: [{ role: "user", content: "123-45-6789" }] })).json();
    expect(other.privacy.notice).toMatch(/^You don't need to tell me your Social Security number/);
  });

  it("rejects unknown fields", async () => {
    const r = await post("/chat", { fieldId: "nope", messages: [{ role: "user", content: "hi" }] });
    expect(r.status).toBe(400);
  });

  it("filter endpoint", async () => {
    const r = await (await post("/filter", { text: "1EG4-TE5-MK73" })).json();
    expect(r).toMatchObject({ masked: true, kinds: ["mbi"] });
  });

  it("transcribe runs the filter on the transcript", async () => {
    const fd = new FormData();
    fd.append("audio", new File([new Uint8Array(10)], "clip.webm", { type: "audio/webm" }));
    const r = await (await app.request("/api/transcribe", { method: "POST", body: fd })).json();
    expect(r).toHaveProperty("text");
    expect(r.privacy.masked).toBe(false);
  });
});
