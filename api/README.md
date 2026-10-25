# Medicare Enrollment Guide API

Backend for the Freeman AI Innovation Challenge entry. Guides a person through Louisiana's Medicare Savings Program application (BHSF Form 1-MB, Rev. 3/22) with an open-weight model, while code (not the model) controls which fields exist and when the form is complete.

## Run it

```bash
npm install
cp .env.example .env      # add MODEL_API_KEY (Groq: console.groq.com/keys)
npm run dev               # http://localhost:8787/api
npm test                  # 50 tests: privacy filter, branching for all 3 personas, tool guardrails, API
npm run smoke             # live check against the real model (needs the key)
bash scripts/voice-smoke.sh   # live /transcribe check (macOS; start npm run dev first)
npm run contract          # regenerate contract/ for the frontend after editing the spec
```

No key? It runs in **mock mode** automatically, so the frontend can integrate right away.

## Swapping the model

Everything goes through one OpenAI-compatible client (`src/model/client.ts`). Change `.env` only:

| Setup | `.env` |
| --- | --- |
| Demo (default) | `MODEL_PROVIDER=groq`, key, model `openai/gpt-oss-120b` |
| Cheaper/faster | `MODEL_NAME=openai/gpt-oss-20b` or `qwen/qwen3-32b` |
| Self-hosted (the pitch) | `MODEL_PROVIDER=vllm`, `MODEL_BASE_URL=http://<server>:8000/v1`, `MODEL_NAME=openai/gpt-oss-20b` |
| Laptop, offline | `MODEL_PROVIDER=ollama` after `ollama pull gpt-oss:20b` |

gpt-oss is Apache 2.0; the 20B version runs on a single 16 GB GPU, which is the "a partner agency can run this on its own hardware" line in the white paper. Voice uses Whisper Large v3 Turbo (MIT) on the same provider.

## How a chat turn works

1. **Privacy filter** (`src/privacy/filter.ts`) masks SSNs and Medicare numbers in every message, history included, before anything else sees it. Handles dashes, spaces, lowercase, spelled-out digits from voice, and old SSN-based claim numbers. Leaves phone numbers, dollar amounts, dates and ZIP+4 alone.
2. **Prompt** (`src/chat/prompt.ts`) = the four rules + current field + only the fields that apply to this person + documents + facts. No income limits are ever sent, so the model can't judge eligibility.
3. **Model** may call `show_aid` or `handoff`. **Code validates every call** (`src/chat/tools.ts`): `show_aid` only for aid ids listed on the current field; unknown tools rejected.
4. **Output filter** runs on the reply too.
5. If the model is down, the API answers from the spec's plain text and offers a counselor (`degraded: true`).

The progress engine (`src/spec/engine.ts`) is pure code: next field, branching, completion. The model can't skip, invent or complete fields.

## Files

```
src/spec/form-1mb.ts   the form spec: every field, condition, sensitivity, citation, aid
src/spec/engine.ts     branching + completion
src/privacy/filter.ts  SSN / MBI masking
src/chat/              prompt, tools, handler
src/model/client.ts    OpenAI-compatible client (Groq / vLLM / Ollama / ...)
contract/              what Leigh needs: FRONTEND_SPEC.md, form-spec.json, spec-types.ts, fixtures/
```

## Deploy

Vercel's Hono preset finds `src/app.ts` first (it default-exports the app; `src/index.ts` is a fallback). Root Directory = `api`, everything else default, no `vercel.json`. `tsconfig.json` sets `typeRoots` because Vercel compiles through a temp tsconfig that extends ours and can't otherwise find `@types/node`. Set the same env vars in the Vercel project, and add the frontend's URL to `CORS_ORIGINS`. Vercel caps request bodies at 4.5 MB, so audio uploads over that get Vercel's own 413 before our 10 MB check runs. Railway/Render work too with `npm start`.

## Still to do

- Document highlight boxes: the 6 `doc.*` aids are still `placeholder: true` until Leigh's mock documents exist. Form-page boxes are measured (`FORM_BOXES_PT` in `src/spec/form-1mb.ts`) and the page images are in `contract/aids/form/` (rendered from `assets/MedicareSavingsProgram.pdf` at 150 dpi).
- Counselor review of the spec (LaSHIP call Monday).
