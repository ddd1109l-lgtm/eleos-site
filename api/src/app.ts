import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { config } from "./config.js";
import { formSpec } from "./spec/form-1mb.js";
import { report, sanitizeProgress } from "./spec/engine.js";
import { filterText } from "./privacy/filter.js";
import { ChatRequest, handleChat, HttpError } from "./chat/handler.js";
import { transcribe } from "./model/client.js";
import { counselors } from "./data/counselors.js";

export const app = new Hono().basePath("/api");

app.use("*", cors({ origin: (origin) => (config.corsOrigins.includes("*") || config.corsOrigins.includes(origin) ? origin : null) }));

// No request logging of bodies anywhere: chat text never hits our logs.
app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status);
  if (err instanceof z.ZodError) return c.json({ error: "Invalid request", issues: err.issues }, 400);
  console.error("[api]", err.message);
  return c.json({ error: "Server error" }, 500);
});

app.get("/health", (c) =>
  c.json({ ok: true, provider: config.provider, model: config.model, stt: config.sttModel, mock: config.provider === "mock" }),
);

app.get("/spec", (c) => c.json(formSpec));

app.get("/counselors", (c) => c.json(counselors));

app.post("/progress", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const progress = sanitizeProgress(formSpec, body?.progress);
  return c.json({ progress, ...report(formSpec, progress) });
});

app.post("/filter", async (c) => {
  const { text } = z.object({ text: z.string().max(4000) }).parse(await c.req.json());
  return c.json(filterText(text));
});

app.post("/chat", async (c) => {
  const req = ChatRequest.parse(await c.req.json());
  return c.json(await handleChat(formSpec, req));
});

app.post("/transcribe", async (c) => {
  const body = await c.req.parseBody();
  const audio = body["audio"];
  if (!(audio instanceof File)) throw new HttpError(400, 'Send multipart/form-data with an "audio" file');
  if (audio.size > 10 * 1024 * 1024) throw new HttpError(413, "Audio over 10 MB");
  const raw = await transcribe(audio);
  // The filter runs on the transcript, because people read numbers aloud.
  const f = filterText(raw);
  return c.json({ text: f.text, privacy: { masked: f.masked, kinds: f.kinds, notice: f.notice } });
});

export default app;
