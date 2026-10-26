import { FIELDS, HELP, SECTIONS, TERMS } from "@/data/form";
import { genericFieldFor } from "@/data/genericFields";
import { NATIONAL, stateByCode, type UsState } from "@/data/states";

// Offline answers used when the AI model is unavailable. Kept short and drawn only from the spec.
// Louisiana keeps its verified local details; every other state gets its own Medicaid office.
function canned(st: UsState): { match: RegExp; answer: string }[] {
  const la = !!st.hasForm;
  const decides = la ? "Louisiana" : `${st.name}'s Medicaid office`;
  const counselor = la
    ? `a counselor at LaSHIP (${HELP.laship.phone})`
    : `a free Medicare counselor (find yours at shiphelp.org, or call 1-800-MEDICARE at ${NATIONAL.medicare.phone})`;
  return [
    {
      match: /passed away|died|widow/i,
      answer: la
        ? "I'm sorry for your loss. In Section 1, check Widowed for marital status. Skip Section 3, because it's only for people who are married and live with their spouse."
        : "I'm sorry for your loss. Where the form asks your marital status, check Widowed. You can usually skip questions about a spouse.",
    },
    {
      match: /\b(count|counts|counted)\b.*\bincome\b|\bincome\b.*\bcount|what is income/i,
      answer:
        "Income is money that comes in each month: pay from a job, and money from other places like Social Security, a pension, or worker's comp. Write the amount before anything is taken out. For Social Security, that is the amount before your Part B premium is taken out.",
    },
    {
      match: /saving|resource|asset|bank|things (i|you) own|section 8/i,
      answer: la
        ? "Louisiana does not count your savings for these programs. The form still asks, so answer every row in Section 8 yes or no. If yes, write who owns it, the bank or company name, and about how much it's worth."
        : `Answer every question about savings and things you own that ${st.name}'s form asks. Some states don't count certain savings, and ${decides} will check for you. Don't write account numbers here.`,
    },
    {
      match: /medicare (number|claim)|mbi|claim number/i,
      answer:
        "Your Medicare Number is on your red, white, and blue Medicare card. It has 11 letters and numbers. Copy it onto the paper form. You don't need the dashes. Please don't type it here.",
    },
    {
      match: /qualify|eligible|eligibility|will i get|do i get/i,
      answer: `I can't tell you if you qualify. Only ${decides} can decide that. If you're not sure, apply anyway. It's free, and ${counselor} can help you look at your situation.`,
    },
    {
      match: /website|this site|online|after|next|mail|send|submit|fax|where do i|apply/i,
      answer: la
        ? "This website teaches you the form; it can't send it. Mail the paper form to: Medicaid Application Office, P.O. Box 91278, Baton Rouge, LA 70821-9278. Or fax it to 1-877-523-2987. Louisiana will send you a letter with their decision. Keep a copy of your form."
        : `This website teaches you the form; it can't send it. ${st.name} has its own application. Get it from ${st.agency} (call ${st.phone}), fill it out on paper, and send it the way they tell you. Keep a copy.`,
    },
    {
      match: /extra help|prescription|drug/i,
      answer: `If you're approved for a Medicare Savings Program, you automatically get Extra Help with prescription drug costs. You can also apply for Extra Help through Social Security (${NATIONAL.ssa.phone}), and that starts your ${st.name} application too.`,
    },
    {
      match: /qmb|slmb|\bqi\b|program.*(differ|kind|type)|which program/i,
      answer: `There are three main levels. QMB pays your Part A and Part B premiums, deductibles, and copays. SLMB and QI pay your Part B premium. You don't pick one. ${decides} decides which one fits.`,
    },
    {
      match: /spouse|husband|wife|married/i,
      answer: la
        ? "Fill out Section 3 only if you are married and live with your spouse. If your spouse also wants help, check Yes at the bottom of Section 3, and they sign on page 5 too."
        : "Most forms ask about your spouse only if you are married and live together. If your spouse also wants help, ask your state's office whether they need their own application.",
    },
    {
      match: /help|counselor|person|call|phone/i,
      answer: la
        ? `For free one-on-one help, call LaSHIP at ${HELP.laship.phone}. For questions about the form itself, call Louisiana Medicaid at ${HELP.medicaid.phone} (${HELP.medicaid.hours}).`
        : `For free one-on-one help, find your state's Medicare counselors at shiphelp.org, or call 1-800-MEDICARE (${NATIONAL.medicare.phone}). For ${st.name}'s application, call ${st.agency} at ${st.phone}.`,
    },
  ];
}

export function localAnswer(question: string, fieldId?: string, stateCode?: string, tappedLine?: string): string {
  const st = stateByCode(stateCode);
  const q = question.toLowerCase();
  // "Ask about this line" quotes the line: explain what it asks before any general answer.
  const quoted = question.match(/"([^"]{3,})"/)?.[1];
  const quotedTopic = !st.hasForm && quoted ? genericFieldFor(quoted) : undefined;
  if (quotedTopic) return [quotedTopic.plain, quotedTopic.where && `You can find it on: ${quotedTopic.where}.`].filter(Boolean).join(" ");
  const hit = canned(st).find((c) => c.match.test(q));
  if (hit) return hit.answer;

  const term = TERMS.find((t) => [t.term, ...(t.aliases ?? [])].some((k) => q.includes(k.toLowerCase())));
  if (term) return `"${term.term}" means: ${term.plain}`;

  const field = FIELDS.find((f) => f.id === fieldId);
  if (field && /this|here|mean|what do i|what should/i.test(q)) {
    return [field.plain, field.where && `You can find it on: ${field.where}.`].filter(Boolean).join(" ");
  }

  // Another state's form: explain the tapped line (or quoted text) from the words printed on it.
  const topic = genericFieldFor(question) ?? (tappedLine && /this|here|mean|what do i|what should/i.test(q) ? genericFieldFor(tappedLine) : undefined);
  if (topic && !st.hasForm) return [topic.plain, topic.where && `You can find it on: ${topic.where}.`].filter(Boolean).join(" ");

  const section = !st.hasForm ? undefined : SECTIONS.find((s) => q.includes(s.title.toLowerCase()) || (s.number && q.includes(`section ${s.number}`)));
  if (section) return [section.plain, section.skip].filter(Boolean).join(" ");

  return st.hasForm
    ? `I'm not sure about that one, and I don't want to guess. A free counselor at LaSHIP (${HELP.laship.phone}) can help, or call Louisiana Medicaid at ${HELP.medicaid.phone}.`
    : `I'm not sure about that one, and I don't want to guess. Call ${st.agency} at ${st.phone}, or find free Medicare counseling at shiphelp.org.`;
}
