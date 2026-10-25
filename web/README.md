# Medicare Savings Guide

Plain-language help for Louisiana's Medicare Savings Program application (BHSF Form 1-MB, Rev. 3/22). Built for the Freeman AI Innovation Challenge.

- **Tap any word on the form** to see what that question means, where to find the answer on your own papers, and whether it's optional or private.
- **Yellow words** are terms with a short definition (premiums, gross income, Estate Recovery, and more).
- **Highlight any text** on the form and press "Explain what I highlighted" to ask about it.
- **Ask a question** in the chat, by typing or by voice. Answers come only from the form spec and verified facts.
- **Privacy:** Social Security and Medicare numbers are masked in the browser and again on the server before any text reaches the model. Progress stays in the browser.

## How it works

| Piece | Where |
| --- | --- |
| Form spec: every field, its box on the page, plain-language text, source document | `src/data/form.ts` |
| Glossary matching for words on the form | `src/lib/terms.ts` |
| Clickable form (pdf.js canvas + word-level text layer) | `src/components/FormViewer.tsx` |
| Chat API (AI Gateway, open-weight model, offline fallback) | `src/app/api/chat/route.ts` |
| Privacy filter (SSN + MBI patterns) | `src/lib/privacy.ts` |

The chat uses `openai/gpt-oss-120b` through Vercel AI Gateway by default (set `CHAT_MODEL` to change it). If the model can't be reached, the API answers from a small set of built-in answers so the demo never breaks.

## Run locally

```bash
npm install
npm run dev
```

Add `AI_GATEWAY_API_KEY` to `.env.local` to use the live model locally. Without it, the chat uses the built-in answers.

## Sources

Facts come from the team's verified research packet (checked October 23, 2026): LDH Medicaid Eligibility Manual sections H-1100, H-1300, H-2000 and Z-200; the LDH Medicare Savings Program page; CMS; SSA POMS HI 00815.024; and LDI (LaSHIP). The application PDF is the official LDH form, pages 1 to 5.

This guide never decides eligibility. Louisiana does.
