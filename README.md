# Eleos

Medicare Enrollment Guide, Freeman AI Innovation Challenge 2026. An AI guide that walks older adults through Louisiana's Medicare Savings Program application (BHSF Form 1-MB) one question at a time, by text or voice, without ever collecting their personal data.

| Folder | What | Owner |
| --- | --- | --- |
| `api/` | Backend: form spec, privacy filter, progress engine, open-model chat (Groq / self-hosted vLLM) | Max Jacobson |
| `web/` | Frontend (React + Vite) | Leigh |

Start with `api/README.md`. The frontend brief is `api/contract/FRONTEND_SPEC.md`; copy `api/contract/` into `web/` for mock mode.

## Local dev

```bash
cd api && npm install && cp .env.example .env   # add MODEL_API_KEY
npm run dev                                      # http://localhost:8787/api
```

Frontend: set `VITE_API_URL=http://localhost:8787/api` in `web/.env.local`.
