# Eleos web

The frontend for Louisiana's Medicare Savings Program application (BHSF Form 1-MB, Rev. 3/22), with Dr. Fawn as the guide.

- **Opening page** (`/`): what the app does, an "About me" from Dr. Fawn, how it works, SAMPLE documents to gather, and a button that opens the form steps.
- **Form steps** (`/form`): the real form, pages 1 to 5. Tap any word for a plain-language explanation; yellow words have a definition; highlight text to ask about it. Each question has the spec's buttons (Yes/No, I wrote it, Skip, I've read it).
- **Ask Dr. Fawn**: the avatar in the corner and the "Live chat 24/7" button open the chat. Type or talk. Free human counselors are one tap away inside it.
- **Read aloud**: a header toggle reads every explanation and answer; "Read this section" and "Read the whole form" step through the form and move the highlight as they go.
- **Languages**: English, Spanish, Vietnamese, French and Haitian Creole are built in (`src/i18n/`). Any other language, including one typed in, is translated through `/api/translate` and cached on the device.

## Progress engine

Progress comes only from Max's shared engine (`src/contract/engine.ts`, synced from `api/contract`). The app runs `report()` locally after every button press and uses its `nextFieldId`, `complete`, `statuses` and `sections`. Finish appears only when `complete` is true. Answers to `clientOnly` fields (the medical bills question) stay in localStorage and are removed with `stripClientOnly()` before anything is sent.

`src/lib/progress.ts` maps the engine's field ids to the clickable regions of the page.

```bash
npm run sync-contract   # copy the latest api/contract into src/contract and public/aids
```

`?demo=finish` loads a finished application for the demo persona and opens Finish.

## Chat backends

- Default: this app's `/api/chat` (Vercel AI Gateway, `openai/gpt-oss-120b`, with offline answers if the model is unreachable).
- Set `NEXT_PUBLIC_API_URL` to Max's backend (ending in `/api`) to use its `/chat` (actions `show_aid` and `handoff` are handled) and `/transcribe` (30-second, 4 MB voice uploads).

## Run locally

```bash
npm install
npm run dev
```

`npx tsx scripts/check-translations.ts` lists any strings missing from the built-in languages.
