import { beforeAll, describe, expect, it, vi } from "vitest";

let app: typeof import("../src/app.js").app;
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
