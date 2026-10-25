# Medicare Enrollment Guide: Frontend Spec

**For Leigh's AI builder.** Paste this whole file into your AI tool as the build brief. The repo is `github.com/mjacobsongoodacc/eleos`: build the frontend in `web/`. Copy `api/contract/` into the frontend project: `form-spec.json` is the real form data and `fixtures/` holds real example API responses so the app works before the backend is deployed.

Backend owner: Max Jacobson. Backend runs at `VITE_API_URL` (for example `http://localhost:8787/api`). If `VITE_API_URL` is empty, the app runs in mock mode from `contract/`.

---

## 1. What we're building

A web app that sits next to a **paper** application (Louisiana's Medicare Savings Program application, BHSF Form 1-MB) and coaches an older adult through it one question at a time, by text or voice. For each question it explains what the form is asking in plain language and shows a picture with a highlighted box: where the answer goes on the form, and where to find it on their own paperwork (Medicare card, Social Security award letter, bank statement).

The person writes every answer on the paper form themselves. The app never collects their answers.

Users are mostly 65+, many with low vision, low digital literacy or both. Design for a nervous first-time user on a phone or a library computer.

## 2. Rules the UI must follow (non-negotiable)

1. **No input fields for personal data.** No text box for name, SSN, Medicare number, address, income, or anything else from the form. The only inputs are: Yes/No buttons for branching questions, Done/Skip buttons, the chat box, and the mic button.
2. **Never display a raw chat message the user typed.** Send it, show a "Sending…" placeholder, then render the masked `userMessage` the API returns. This is how a typed SSN never appears on screen.
3. **When `privacy.masked` is true**, show `privacy.notice` as a clearly visible, friendly banner (not red, not scary) under the user's bubble.
4. **Never say whether someone qualifies.** No eligibility calculator, no income-limit tables, no "You qualify!" Copy on Finish says "Apply even if you're not sure."
5. **Never mark the form complete yourself.** Show the Finish screen only when the API (or the local engine in mock mode) returns `complete: true`.
6. **Storage:** progress (gate answers + list of done field ids) in `localStorage` only. Chat history in memory only; it disappears on reload. Nothing else is stored.
7. Every mock document image is stamped **SAMPLE** and uses made-up data. Mock Medicare Numbers must break the real format by using one of the letters S, L, O, I, B or Z (example: `1EG4-SO5-MK73`), so a real number is never shown.

## 3. Tech

- React + Vite + TypeScript + Tailwind (if your tool uses something else, keep the API contract and component behavior identical).
- `VITE_API_URL` env var. Empty means mock mode.
- Types: copy `contract/spec-types.ts` into `src/types/`. The API types are in section 9 below.
- Browser text-to-speech (`window.speechSynthesis`) for reading replies aloud. It runs on the device, which is also better for privacy.
- Mic recording with `MediaRecorder` (webm/opus is fine), sent to `/transcribe`.

## 4. Screens

### 4.1 Welcome
- Title: "Get help paying for Medicare." Subtitle: one sentence on what the app does.
- Three short trust lines: "You fill out the paper form yourself." "We never ask for your Social Security or Medicare number." "Free counselors are one tap away."
- Text size control (Normal / Large / Extra large) and a "Read aloud" toggle, both visible here and in a settings menu later.
- Buttons: **Start**, **Talk to a person** (opens counselor card).
- If saved progress exists: **Continue where I left off** and **Start over**.

### 4.2 Gather your documents
- Render `spec.documents` as cards: name, `whatItLooksLike`, `whoNeedsIt`, and `sampleImage` if not null.
- Checkbox-style "I have it" per card (local UI only, not saved to the API). Button: **I'm ready**.
- Note at the bottom: "Missing something? You can still start."

### 4.3 Guide (main screen)
Desktop: three columns. Mobile: field card on top, then aid viewer, then chat; checklist in a slide-out drawer.

**Checklist (left / drawer)**
- One row per `spec.sections` entry with its `title` and status from `/progress` `sections[]`: done (check), in_progress (half circle), todo (empty), skipped (gray "Skipped").
- Expand a section to see its visible fields with `statuses[fieldId]`. Hidden fields are not shown.
- Tapping a done field reopens it (user can review). The engine still decides what is "next."
- Progress bar: `requiredDone / requiredTotal`.

**Field card (center)**
- Section name + "Page N of the form."
- `label` (the exact printed wording) in a quoted, muted style, then `plain` in large type. Then `tips[]` and `repeatNote` if present.
- If `required` is false, show an "Optional" tag.
- Buttons depend on `kind`:
  - `gate`: **Yes** / **No** (big). Saves to `progress.answers[field.id]`.
  - `write`, `row`, `sign`: **I wrote it** (adds id to `progress.done`). If optional, also **Skip** (also adds to `done`).
  - `info`: **I've read it**.
- `sensitive === "id_number"`: show a lock callout: "Write this on the paper form. Don't type or say it here."
- `sensitive === "health"`: callout: "This part is about medical bills. The guide will explain the questions but won't ask about your health."
- `sensitive === "account"`: callout: "Don't write or type account numbers. A short description like the bank's name is enough."
- **Back** button to the previous field. After every button press, call `/progress` and move to `nextFieldId`.

**Aid viewer (right)**
- When the field has aids, show the first `doc.*` aid if any, else the `form.*` aid. Thumbnails/tabs for the others ("On the form" / "On your document").
- Also opens when chat returns a `show_aid` action (switch to that aid).
- See section 6 for behavior.

**Chat panel (bottom or right)**
- See section 7. Always scoped to the current field: send `fieldId` with every message.

### 4.4 Counselor card
- Modal or side sheet triggered by: a `handoff` action from chat, the "Talk to a person" button (always visible in the header), or the Welcome screen.
- Renders `contacts[]`: name, `why`, a big tap-to-call `tel:` link for `phone`, plus `tty`, `hours`, `web` if present.
- Header line: "Free help from real people."

### 4.5 Finish (only when `complete: true`)
- "You're done filling out the form." then `finish.waysToApply[]` as cards (Mail shows the full address in large type; Phone and Fax are tap-to-call).
- `finish.nextSteps[]` as a short list.
- "Apply even if you're not sure you qualify."
- Buttons: **Print this page**, **Talk to a person**, **Start over**.

### 4.6 Settings (gear in header)
- Text size, high-contrast mode, read-aloud on/off, voice speed (slow/normal).
- **Clear my progress** (wipes localStorage and chat).

## 5. Field order and branching

Never hardcode the order or the branches. The spec drives everything:
- `fields[]` is in form order.
- A field shows only if its `condition` passes (`{field, equals}`, `{all:[]}`, `{any:[]}` against `progress.answers`).
- Online: call `POST /progress` after every change and trust its `nextFieldId`, `complete`, `statuses`, `sections`.
- Mock mode: implement the same logic locally (it's ~40 lines: visible if condition passes; gate is done when answered; others done when in `done`; next = first visible not-done field; complete = all visible required done).

Optional fields still come up in order; the user taps Skip to move past them.

## 6. Aid viewer behavior

Aid shape: `{ id, image, box: {x, y, w, h}, spoken, caption, placeholder }`. Box numbers are **percent** of the image's width and height.

- Images live at `public/aids/` + `image` (e.g. `public/aids/docs/sample_award_letter.png`, `public/aids/form/page-2.png`).
- Render the image at full container width. Overlay a box at `left:x% top:y% width:w% height:h%`.
- Dim everything outside the box (four dark overlays or a big box-shadow), and pulse the box outline (2s ease, respects `prefers-reduced-motion`).
- Show `caption` under the image. `alt` text and the read-aloud line are `spoken`.
- Tap to zoom (fullscreen, pinch zoom on mobile).
- If `placeholder` is true and the app is in dev mode, draw a small "box not final" tag so we know to fix the coordinates.

## 7. Chat and voice

- Text box + **Send** + a large **mic** button. Suggested chips above the box: "What does this mean?", "Where do I find this?", "I'm stuck".
- On send: push a pending user bubble ("Sending…"), `POST /chat`, then replace it with `userMessage` from the response. Then add the assistant bubble with `reply`.
- Handle `actions[]` in order: `show_aid` switches the aid viewer to `aid`; `handoff` opens the counselor card.
- If `privacy.masked`, show `privacy.notice` banner under the user bubble.
- If `degraded` is true, add a small note "Answer from the form guide only" (model was unavailable).
- Read aloud: if on, speak `reply` with `speechSynthesis`. When an aid is shown, also speak its `spoken` line.
- **Mic:** hold-to-talk or tap-to-start/tap-to-stop with a visible recording state and timer (max 30s). Upload as `multipart/form-data` field `audio` to `/transcribe`. Put the returned `text` (already masked) into the chat as the user message and send it with `mode: "voice"`. If its `privacy.masked` is true, show the notice.
- Keep one chat history across fields (don't reset when the field changes), send at most the last 12 messages, and always send the current `fieldId`.
- Loading state on the assistant bubble ("Thinking…"). Typical reply is 1–3 seconds.
- Errors: show "Something went wrong. Try again, or talk to a person." with the counselor button.

## 8. Accessibility (required, judges will try it)

- Base font 18px; Large 22px; Extra large 26px. Buttons at least 48px tall. Line length under 70 characters.
- Contrast at least WCAG AA in normal mode, AAA in high-contrast mode.
- Every control has a visible label; icon buttons have `aria-label`.
- Chat log is an `aria-live="polite"` region.
- Full keyboard navigation with visible focus rings. Enter sends; Space toggles mic when focused.
- Plain words only in UI copy. "Done" not "Submit"; "Talk to a person" not "Escalate."

## 9. API contract

Base: `${VITE_API_URL}` (ends in `/api`). All JSON unless noted. CORS is open for `http://localhost:5173` and the deployed site.

```ts
// Shared
type Progress = { answers: Record<string, "yes" | "no">; done: string[] };

// GET /health
type Health = { ok: true; provider: string; model: string; stt: string; mock: boolean };

// GET /spec  -> FormSpec (see contract/spec-types.ts; same as contract/form-spec.json)

// GET /counselors -> Contact[]
type Contact = { id: string; name: string; phone: string; tty?: string; hours?: string; web?: string; why: string };

// POST /progress   body: { progress: Progress }
type ProgressReport = {
  progress: Progress;                 // cleaned version; save this back to localStorage
  nextFieldId: string | null;
  complete: boolean;                  // only true when every visible required field is done
  requiredDone: number;
  requiredTotal: number;
  statuses: Record<string, "done" | "todo" | "hidden">;
  sections: { id: string; status: "done" | "in_progress" | "todo" | "skipped" }[];
};

// POST /chat
type ChatRequest = {
  fieldId: string;                    // the field on screen
  progress: Progress;
  messages: { role: "user" | "assistant"; content: string }[];  // last item must be the user's; max 30
  mode?: "text" | "voice";            // voice = shorter, speakable replies
};
type Aid = { id: string; image: string; box: { x: number; y: number; w: number; h: number };
             spoken: string; caption: string; placeholder: boolean };
type Action =
  | { type: "show_aid"; aidId: string; aid: Aid }
  | { type: "handoff"; reason: string; contacts: Contact[] };
type ChatResponse = {
  reply: string;
  actions: Action[];
  privacy: { masked: boolean; kinds: ("ssn" | "mbi")[]; notice: string | null };
  userMessage: string;                // the user's text after masking; render THIS, not what they typed
  fieldId: string;
  degraded: boolean;
  rejected: unknown[];                // debug only, ignore
};

// POST /transcribe   multipart/form-data, field "audio" (<= 10 MB)
type TranscribeResponse = { text: string; privacy: { masked: boolean; kinds: string[]; notice: string | null } };

// POST /filter   body: { text: string }  -> { text, masked, kinds, notice }
// Optional helper if you want to pre-check text client-side. Not required.

// Errors: { error: string } with status 400 / 413 / 500
```

Real examples of every response are in `contract/fixtures/`. In mock mode, return those (pick `chat-ssn-masked.json` if the message contains 9 digits, `chat-handoff.json` if it contains "qualify", else `chat-show-aid.json`).

## 10. Assets you need to make

Put them in `public/aids/`. All made-up data, stamped SAMPLE diagonally, built in HTML/CSS then screenshotted to PNG at **850 × 1100** (letter) or **1000 × 630** (cards).

| File | What it shows (demo persona: Dorothy Sample, 74, Orleans Parish) |
| --- | --- |
| `docs/sample_medicare_card.png` | Red, white and blue card. Name DOROTHY SAMPLE, Medicare Number `1EG4-SO5-MK73` (intentionally invalid), Part A and Part B start dates. No gender, no signature. |
| `docs/sample_award_letter.png` | Social Security benefit letter. Three lines in this order: full monthly benefit before deductions **$1,180.00**, Medical insurance (Part B) deduction **$202.90**, payment after deductions **$977.10**. The first line is the demo's key highlight. |
| `docs/sample_bank_statement.png` | Bank name, Dorothy's name, statement period, ending balance about $2,400. |
| `docs/sample_pension_statement.png` | Payer (City of New Orleans) and gross monthly amount $500 (for persona Ray). |
| `docs/sample_pay_stub.png` | Employer, pay period, gross pay $600 biweekly (for persona Gloria). |
| `form/page-1.png` … `form/page-5.png` | **Already done.** Copy `contract/aids/form/` to `public/aids/form/`. These are pages 1–5 of the official PDF at 1275 × 1650, and every form highlight box in the spec is measured against them. |

**When you finish a mock document, send Max the pixel position of each highlighted line** (top-left x, y and width, height). He converts them to the percent boxes in the spec. Only the 6 document aids (`doc.*`) are still `placeholder: true`; all form-page boxes are final.

## 11. Demo flow (3 minutes, must work perfectly)

1. Welcome → Start → Gather documents → I'm ready.
2. Click through Section 1 quickly. On "Social Security number," type `123-45-6789` in chat. The bubble shows `[SSN removed]` and the friendly notice appears.
3. Skip ahead via the checklist to Section 6 "How much are they paid?". Ask "Where do I find this?". Aid viewer shows the award letter with the $1,180 line pulsing.
4. Tap the mic and say "What counts as income?" Reply is read aloud.
5. Ask "Do I qualify?" → counselor card opens with LaSHIP 1-800-259-5300.
6. Fast-forward to Finish (use a hidden dev shortcut: `?demo=finish` loads a completed Dorothy progress object) → ways to apply.

## 12. Done when

- [ ] Whole flow clicks through in mock mode with no backend.
- [ ] Switching `VITE_API_URL` to the real backend needs no code changes.
- [ ] No input field for personal data anywhere.
- [ ] A typed SSN or Medicare number never appears on screen.
- [ ] Gate answers change what fields appear (test: married → spouse fields appear; not married → Section 3 shows "Skipped").
- [ ] Finish only appears when `complete: true`.
- [ ] Text size, high contrast, read aloud and keyboard navigation all work.
- [ ] Counselor card reachable from every screen in one tap.
- [ ] Works at 375px wide (phone) and on a laptop.
