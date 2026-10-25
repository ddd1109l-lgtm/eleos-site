import { DOCUMENTS, EXTRA_SPEC_LABELS, FIELDS, FORM, MESSAGES, NEXT_STEPS, SECTIONS, SUBMIT_WAYS, SUGGESTED_QUESTIONS, TERMS, type Field, type Section, type Term } from "@/data/form";
import { PRIVACY_NOTE } from "@/lib/privacy";

// Every piece of interface text. Translations use the same keys (prefixed "ui.").
export const UI = {
  brand: "Eleos",
  tagline: "Help paying for Medicare, one plain-language step at a time",
  chooseLanguage: "Choose your language",
  otherLanguage: "Another language",
  otherPlaceholder: "Type any language, like Polish",
  useLanguage: "Use this language",
  translating: "Translating…",
  translateFail: "Sorry, I couldn't translate right now. Showing English.",
  readAloud: "Read aloud",
  readAloudOn: "Read aloud: on",
  readAloudOff: "Read aloud: off",
  readPage: "Read this page to me",
  textSize: "Text size",
  textNormal: "Normal text",
  textLarge: "Large text",
  textLargest: "Largest text",
  talkToPerson: "Talk to a person",
  liveChat: "Ask Dr. Fawn",
  chatShort: "Chat",
  online: "AI guide · answers any time",
  preferPerson: "Prefer a real person? Free counselors",
  home: "Home",

  heroKicker: "Louisiana Medicare Savings Program",
  heroTitle: "Get help paying for Medicare.",
  heroBody: "I'll walk you through Louisiana's application in plain words. Tap any word on the form to see what it means, and ask me anything along the way.",
  startForm: "Open the form steps",
  continueForm: "Continue where I left off",
  aboutTitle: "About me",
  aboutHi: "Hi! I'm Dr. Fawn.",
  aboutBody1: "I'm a gentle, caring guide who loves making paperwork less scary. Forms full of long words can feel confusing. My job is to explain each part in plain language, one step at a time.",
  aboutBody2: "I can read everything out loud, speak your language, and answer your questions. I only use the official form and checked facts, and I'll always tell you when a real person can help more.",
  promiseTitle: "My promises to you",
  promise1: "You fill out the paper form yourself. I just explain.",
  promise2: "I never ask for your Social Security or Medicare number.",
  promise3: "I never decide if you qualify. Louisiana does.",
  promise4: "I'm here 24/7, and free human counselors are one tap away.",
  howTitle: "How it works",
  how1Title: "Gather your papers",
  how1Body: "Your Medicare card, Social Security letter, and bank statement.",
  how2Title: "Tap and learn",
  how2Body: "Tap any word on the form. I'll explain it and show where to find the answer.",
  how3Title: "Ask me anything",
  how3Body: "Type or talk. I answer in plain words, in your language.",
  how4Title: "Send it in",
  how4Body: "Mail, fax, or apply online. I'll show you how.",
  gatherTitle: "What to have ready",
  gatherBody: "These are SAMPLE pictures with made-up information, so you know what to look for.",
  whatItLooks: "What it looks like",

  steps: "Form steps",
  progress: "Your progress",
  sectionsDone: "{done} of {total} required steps done",
  skipped: "Skipped",
  inProgress: "Started",
  iWroteIt: "I wrote it",
  skip: "Skip",
  iveRead: "I've read it",
  yes: "Yes",
  no: "No",
  doneTag: "Done",
  finishLocked: "Finish every step first, then this opens.",
  startOver: "Start over",
  printPage: "Print this page",
  doneTitle: "You're done filling out the form.",
  nextStepsTitle: "What happens next",
  applyAnyway: "Apply even if you're not sure you qualify.",
  errorStandard: "Something went wrong. Try again, or talk to a person.",
  degraded: "Answer from the form guide only",
  recording: "Recording… tap to stop",
  finishStep: "Send it in",
  printForm: "Print the form",
  formBy: "Louisiana Department of Health",
  loadingForm: "Loading the form…",
  formError: "The form could not load.",
  openPdf: "Open the PDF instead",
  explainSelection: "Explain what I highlighted",
  welcomeHi: "Let's get started!",
  welcomeBody: "Tap any word on the form and I'll explain it in plain words. Yellow words have a quick definition.",
  welcomeAsk: "Have a question? Tap me in the corner any time.",
  haveNearby: "Have these nearby",
  readWholeForm: "Read the whole form to me",
  whatItAsks: "What it asks",
  theQuestion: "The question",
  wordOnForm: "Word on the form",
  highlights: "Highlights",
  onPaper: "On the paper form it says",
  privateBadge: "Keep this private. Write it on the paper form only, not here.",
  healthBadge: "This part is about medical bills. I'll explain the questions, but I won't ask about your health.",
  optionalBadge: "Optional. You can leave this blank.",
  whereToFind: "Where to find it",
  askAboutThis: "Ask Dr. Fawn about this",
  listen: "Listen",
  readSection: "Read this section to me",
  close: "Close",
  section: "Section",
  tapAnything: "Tap any word on the form",
  askFawn: "Ask Dr. Fawn",
  askFawnLabel: "Ask Dr. Fawn a question",
  chatIntro: "Hi! What would you like to know about this form?",
  typeQuestion: "Type your question…",
  listening: "Listening…",
  send: "Send question",
  voiceStart: "Ask with your voice",
  voiceStop: "Stop voice input",
  voiceUnsupported: "Voice input isn't supported in this browser. Try Chrome or Safari.",
  privacyHint: "Don't type your Social Security or Medicare number. Write those on paper.",
  privacyNote: PRIVACY_NOTE,
  writing: "Writing an answer",
  nowReading: "Reading aloud",
  pause: "Pause",
  resume: "Resume",
  stop: "Stop",
  expandGuide: "Show more",
  shrinkGuide: "Show less",
  finishBody: "Sign page 5, keep a copy for yourself, and send the form one of these ways:",
  goodToKnow: "Good to know",
  helpTitle: "Talk to a real person",
  helpBody: "These calls are free. You can ask a family member to join you.",
  helpLaship: "Free, private, one-on-one help from a trained counselor. They can also check if you might get full Medicaid.",
  helpFormTitle: "Questions about this form",
  helpAnswers: "Louisiana's aging and disability resource center. You can also apply through them.",
  visitWebsite: "Visit website",
} as const;

export type UIKey = keyof typeof UI;

export const termKey = (t: Term) => t.term.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const FIELD_KEYS = ["label", "plain", "where", "tip", "condition"] as const;
const SECTION_KEYS = ["title", "short", "plain", "skip"] as const;

export function englishStrings(): Record<string, string> {
  const out: Record<string, string> = { "form.name": FORM.name };
  for (const [k, v] of Object.entries(UI)) out[`ui.${k}`] = v;
  for (const s of SECTIONS) for (const k of SECTION_KEYS) if (s[k]) out[`s.${s.id}.${k}`] = s[k]!;
  for (const f of FIELDS) for (const k of FIELD_KEYS) if (f[k]) out[`f.${f.id}.${k}`] = f[k]!;
  for (const t of TERMS) {
    out[`t.${termKey(t)}.term`] = t.term;
    out[`t.${termKey(t)}.plain`] = t.plain;
  }
  DOCUMENTS.forEach((d, i) => {
    out[`d.${i}.name`] = d.name;
    out[`d.${i}.why`] = d.why;
    out[`d.${i}.look`] = d.look;
  });
  SUGGESTED_QUESTIONS.forEach((q, i) => (out[`q.${i}`] = q));
  MESSAGES.forEach((m, i) => (out[`m.${i}`] = m));
  NEXT_STEPS.forEach((m, i) => (out[`n.${i}`] = m));
  for (const [id, label] of Object.entries(EXTRA_SPEC_LABELS)) out[`sf.${id}`] = label;
  SUBMIT_WAYS.forEach((w, i) => {
    out[`w.${i}.how`] = w.how;
    out[`w.${i}.detail`] = w.detail;
  });
  return out;
}

export const EN = englishStrings();

export type Translator = {
  t: (key: string) => string;
  ui: (key: UIKey, vars?: Record<string, string | number>) => string;
  field: (f: Field, k: (typeof FIELD_KEYS)[number]) => string | undefined;
  section: (s: Section, k: (typeof SECTION_KEYS)[number]) => string | undefined;
  term: (t: Term, k: "term" | "plain") => string;
};

export function makeTranslator(dict?: Record<string, string>): Translator {
  const t = (key: string) => dict?.[key] ?? EN[key] ?? key;
  return {
    t,
    ui: (key, vars) => {
      let s = t(`ui.${key}`);
      for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, String(v));
      return s;
    },
    field: (f, k) => (f[k] ? t(`f.${f.id}.${k}`) : undefined),
    section: (s, k) => (s[k] ? t(`s.${s.id}.${k}`) : undefined),
    term: (term, k) => t(`t.${termKey(term)}.${k}`),
  };
}
