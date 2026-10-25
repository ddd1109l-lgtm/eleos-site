import { FIELDS, HELP, SECTIONS, TERMS } from "@/data/form";

// Offline answers used when the AI model is unavailable. Kept short and drawn only from the spec.
const CANNED: { match: RegExp; answer: string }[] = [
  {
    match: /\b(count|counts|counted)\b.*\bincome\b|\bincome\b.*\bcount|what is income/i,
    answer:
      "Income is money that comes in each month. On this form that includes pay from a job (Section 5) and money from other places like Social Security, a pension, or worker's comp (Section 6). Write the amount before anything is taken out. For Social Security, that is the amount before your Part B premium is taken out.",
  },
  {
    match: /saving|resource|asset|bank|things (i|you) own|section 8/i,
    answer:
      "Louisiana does not count your savings for these programs. The form still asks, so answer every row in Section 8 yes or no. If yes, write who owns it, the bank or company name, and about how much it's worth.",
  },
  {
    match: /medicare (number|claim)|mbi|claim number/i,
    answer:
      "Your Medicare Number is on your red, white, and blue Medicare card. It has 11 letters and numbers. Copy it onto the paper form in Section 4. You don't need the dashes. Please don't type it here.",
  },
  {
    match: /after|next|mail|send|submit|fax|where do i/i,
    answer:
      "Mail the form to: Medicaid Application Office, P.O. Box 91278, Baton Rouge, LA 70821-9278. Or fax it to 1-877-523-2987, or apply online at MyMedicaid.la.gov. Louisiana will check your information and send you a letter with their decision. Keep a copy of your form.",
  },
  {
    match: /qualify|eligible|eligibility|will i get|do i get/i,
    answer:
      "I can't tell you if you qualify. Only Louisiana can decide that. If you're not sure, apply anyway. It's free, and a counselor at LaSHIP (1-800-259-5300) can help you look at your situation.",
  },
  {
    match: /extra help|prescription|drug/i,
    answer:
      "If you're approved for a Medicare Savings Program, you automatically get Extra Help with prescription drug costs. You can also apply for Extra Help through Social Security, and that starts your Louisiana application too.",
  },
  {
    match: /qmb|slmb|\bqi\b|program.*(differ|kind|type)|which program/i,
    answer:
      "There are three levels. QMB pays your Part A and Part B premiums, deductibles, and copays. SLMB and QI pay your Part B premium. You don't pick one. Louisiana decides which one fits based on your income.",
  },
  {
    match: /spouse|husband|wife|married/i,
    answer:
      "Fill out Section 3 only if you are married and live with your spouse. If your spouse also wants help, check Yes at the bottom of Section 3, and they sign on page 5 too.",
  },
  {
    match: /help|counselor|person|call|phone/i,
    answer: `For free one-on-one help, call LaSHIP at ${HELP.laship.phone}. For questions about the form itself, call Louisiana Medicaid at ${HELP.medicaid.phone} (${HELP.medicaid.hours}).`,
  },
];

const FALLBACK = `I'm not sure about that one, and I don't want to guess. A free counselor at LaSHIP (${HELP.laship.phone}) can help, or call Louisiana Medicaid at ${HELP.medicaid.phone}.`;

export function localAnswer(question: string, fieldId?: string): string {
  const q = question.toLowerCase();
  const canned = CANNED.find((c) => c.match.test(q));
  if (canned) return canned.answer;

  const term = TERMS.find((t) => [t.term, ...(t.aliases ?? [])].some((k) => q.includes(k.toLowerCase())));
  if (term) return `"${term.term}" means: ${term.plain}`;

  const field = FIELDS.find((f) => f.id === fieldId);
  if (field && /this|here|mean|what do i|what should/i.test(q)) {
    return [field.plain, field.where && `You can find it on: ${field.where}.`].filter(Boolean).join(" ");
  }

  const section = SECTIONS.find((s) => q.includes(s.title.toLowerCase()) || (s.number && q.includes(`section ${s.number}`)));
  if (section) return [section.plain, section.skip].filter(Boolean).join(" ");

  return FALLBACK;
}
