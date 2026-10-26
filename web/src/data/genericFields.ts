// Plain-language explanations for the questions most Medicare Savings Program applications ask,
// matched against the words printed on any state's form. Used when a form has no hand-checked
// field map (every state except Louisiana). What a line asks about (income, a bank account) beats
// who it asks about (your spouse, your household): see `tier`. Checked against every line of every
// form in public/forms with scripts/audit-labels.mts.

export type GenericField = {
  id: string;
  match: RegExp;
  label: string;
  plain: string;
  where?: string;
  sensitive?: boolean;
  optional?: boolean;
  /** 1: who or where (spouse, name, address). 2: general. 3 (default): what the question is about. */
  tier?: 1 | 2 | 3;
};

export const GENERIC_FIELDS: GenericField[] = [
  {
    id: "msp",
    match: /\bmedicare savings programs?\b|\bmsps?\b|\bqmb\b|\bslmb\b|\bqualifying individual\b|\bqualified medicare beneficiary\b|\blow[- ]income medicare beneficiary\b|\bspecified low[- ]income\b/i,
    label: "Medicare Savings Programs",
    plain: "Programs that help pay your Medicare costs. QMB pays your Part A and Part B premiums, deductibles, and copays. SLMB and QI pay your Part B premium. You don't pick one; your state decides which one fits.",
  },
  {
    id: "ssn",
    match: /social security (number|no\.?|#)|\bssn\b/i,
    label: "Social Security number",
    plain: "Your 9-digit Social Security number. The state uses it to check your information with Social Security. Write it only on the paper form, never in the chat.",
    where: "Your Social Security card or a letter from Social Security",
    sensitive: true,
  },
  {
    id: "medicare_number",
    match: /\bmedicare part [a-d] claim (number|no\.?)|\bmedicare (claim |card )?(number|no\.?|#|id)|\bclaim (number|no\.?)|\bmbi\b|health insurance claim/i,
    label: "Medicare number",
    plain: "Your Medicare Number has 11 letters and numbers. Copy it exactly from your red, white, and blue Medicare card. You don't need the dashes.",
    where: "Your Medicare card",
    sensitive: true,
  },
  {
    id: "race",
    match: /\brace\b|\bethnicity\b|\bhispanic\b|\blatin[oax]\b/i,
    label: "Race or ethnicity",
    plain: "These questions are almost always optional. Answering or skipping them does not change whether you get help.",
    optional: true,
  },
  {
    id: "dob",
    match: /\bdate of birth\b|\bbirth ?date\b|\bdob\b/i,
    label: "Date of birth",
    plain: "Your birthday: month, day, and year.",
  },
  {
    id: "name",
    match: /\bfirst\b.{0,12}\blast\b|\bsuffix\b|\b(first|last|middle) name|full name|name of (applicant|person)|applicant'?s name|\bname\b/i,
    label: "Name",
    plain: "Write the name this line asks for. When it's your own name, write it the way it's printed on your Medicare card.",
    where: "Your Medicare card",
    tier: 1,
  },
  {
    id: "sex",
    match: /\bsex\b|\bgender\b/i,
    label: "Sex",
    plain: "Check the box that applies to you.",
    tier: 2,
  },
  {
    id: "marital",
    match: /\bmarital\b|\bmarried\b|\bwidow(ed|er)?\b|\bdivorced\b|\bseparated\b/i,
    label: "Marital status",
    plain: "Whether you are single, married, widowed, divorced, or separated. If you're married and live with your spouse, the form may ask about them too.",
    tier: 2,
  },
  {
    id: "spouse",
    match: /\bspouse'?s?\b|\bhusband\b|\bwife\b/i,
    label: "Your spouse",
    plain: "This part asks about your husband or wife. Most forms only need it if you are married and live together.",
    tier: 1,
  },
  {
    id: "household",
    match: /household|live with you|lives with you|members of (your )?home|people in (your )?home/i,
    label: "People in your home",
    plain: "This asks about the people who live with you. Answer for everyone the question names. Some states count a spouse's income, but not other relatives'.",
    tier: 1,
  },
  {
    id: "address",
    match: /\baddress\b|\bstreet\b|\bapt\b|\bzip\b|\bcounty\b|\bparish\b|\bp\.? ?o\.? box\b/i,
    label: "Address",
    plain: "The address this line asks for. For your own, write where you live and where you get mail. Letters about your application go to the mailing address, so make sure it's right.",
    tier: 1,
  },
  {
    id: "phone",
    match: /\b(tele)?phone( number| no\.?| #)?\b|\bfax( number)?\b|\be-?mail\b/i,
    label: "Phone and email",
    plain: "The phone number (or email) this line asks for. For your own, give at least one number where the office can reach you. Email is usually optional.",
    tier: 1,
  },
  {
    id: "citizenship",
    match: /\bcitizen(ship)?\b|\bimmigra(nt|tion)\b|\balien\b|\bqualified non-?citizen\b/i,
    label: "Citizenship or immigration status",
    plain: "Whether you are a U.S. citizen or have a lawful immigration status. Answer truthfully. A counselor can help if you're unsure what to write.",
  },
  {
    id: "other_insurance",
    match: /\bother (health )?insurance\b|\bmedigap\b|\bsupplement(al)? (insurance|plan|policy)\b|\bretiree\b|\bcobra\b|\btricare\b|\bhealth (insurance|coverage) (from|through|offered|card|policy)\b|\b(have|has|offered) (other )?health (insurance|coverage)\b|\binsurance company\b|\bpolicy ?holder\b/i,
    label: "Other health insurance",
    plain: "Any health coverage besides Medicare, like a Medigap plan, a retiree plan, or insurance through a spouse's job.",
    where: "Any other insurance card in your wallet",
  },
  {
    id: "wages",
    match: /\bemploy(ed|er|ment)\b|\bwages?\b|\bearnings\b|\bjobs?\b|\bgross pay\b|\bpay ?stubs?\b|\bself-?employ|\bhours (worked|per week)\b|\btype of work\b|\bfrom working\b/i,
    label: "Money from work",
    plain: "Pay from a job for you (and your spouse, if asked). Write the amount before taxes or anything else is taken out. That's the bigger 'gross pay' number.",
    where: "Your pay stubs",
  },
  {
    id: "income",
    match: /(?<!low[- ])\bincome\b(?! support| maintenance)|\bsocial security (benefits?|check|income|payments?)\b|\bpensions?\b|\bveteran'?s?\b|\bva benefits?\b|\bssi\b|\bunearned\b|\brailroad retirement\b|\balimony\b|\bchild support\b/i,
    label: "Other income",
    plain: "Money that doesn't come from a job, like Social Security, a pension, or veterans benefits. Write the full amount before anything is taken out. For Social Security, use the amount before your Medicare Part B premium.",
    where: "Your Social Security award letter or pension statement",
  },
  {
    id: "how_often",
    match: /\bhow often\b|\bfrequency\b|\bweekly\b|\bevery two weeks\b|\bbi-?weekly\b/i,
    label: "How often you're paid",
    plain: "How often the money comes: weekly, every two weeks, or monthly. Social Security and most pensions are monthly.",
    tier: 2,
  },
  {
    id: "bank",
    match: /\bchecking(?! this| the| box| here| a box)\b|\bsavings accounts?\b|\bbank\b|\bcredit union\b|\bcash on hand\b|\bdirect express\b/i,
    label: "Bank accounts",
    plain: "Accounts you own and about how much is in them. Write the bank's name; you usually don't need to write account numbers. Some states don't count savings at all, but still ask.",
    where: "Your latest bank statement",
  },
  {
    id: "investments",
    match: /\bstocks?\b|\bbonds?\b|\bcds?\b|\bcertificates? of deposit\b|\bira'?s?\b|\b401\(?k\)?|\bmutual funds?\b|\btrusts?\b|\bannuit(y|ies)\b|\bresources \(?assets\b|\b(liquid|countable|total) (resources|assets)\b|\bany (resources|assets)\b|\bassets\b|\bresources (must|limit)\b/i,
    label: "Investments and retirement savings",
    plain: "Things like stocks, bonds, CDs, IRAs, 401(k)s, trusts, or annuities, and about what they're worth.",
    where: "Your account statements",
  },
  {
    id: "vehicles",
    match: /\bvehicles?\b|\bcars?\b|\btrucks?\b|\bboats?\b|\bmotorcycles?\b|\brv\b/i,
    label: "Vehicles",
    plain: "Cars, trucks, boats, or other vehicles you own. Describe them by year and model.",
    where: "Your vehicle title or registration",
  },
  {
    id: "property",
    match: /\breal (estate|property)\b|\bproperty\b|\bland\b|\bhouse\b|\bhome you own\b|\bbuildings?\b|\bmineral rights\b|\broyalt(y|ies)\b/i,
    label: "Property",
    plain: "Land or buildings you own. Many forms ask separately about the home you live in and any other property.",
  },
  {
    id: "burial",
    match: /\bburial\b|\bfuneral\b|\blife insurance\b|\bcemetery\b|\bpre-?need\b/i,
    label: "Life or burial insurance",
    plain: "Life insurance, burial insurance, or money set aside for a funeral. Write the company's name and about how much it's worth.",
    where: "Your insurance policy papers",
  },
  {
    id: "medical_bills",
    match: /\bmedical (bills|expenses)\b|\bunpaid (medical )?bills\b/i,
    label: "Medical bills",
    plain: "Some forms ask about recent medical bills, because some states can help pay bills from the past few months. Dr. Fawn will explain the questions, but won't ask about your health.",
    sensitive: true,
  },
  {
    id: "long_term_care",
    match: /\bnursing (home|facility)\b|\blong[- ]term care\b|\bassisted living\b|\bintermediate care facility\b/i,
    label: "Nursing home or long-term care",
    plain: "Questions about living in a nursing home or getting long-term care. Answer for you (and your spouse, if the form asks). Dr. Fawn will explain the questions, but won't ask about your health.",
    sensitive: true,
  },
  {
    id: "authorized_rep",
    match: /\bauthorized representative\b(?! of the)|\bappoint\b.*\brepresentative\b|\bmy representative\b|\bsomeone (to help|helping) you\b|\b(applicant|your)\/?\s?representative\b/i,
    label: "Someone helping you",
    plain: "If a family member or friend is helping you apply, this is where their information goes. It's optional.",
    optional: true,
    tier: 2,
  },
  {
    id: "rights",
    match: /\brights\b|\bresponsibilit(y|ies)\b|\bpenalt(y|ies)\b|\bperjury\b|\bfraud\b|\bfair hearing\b|\bestate recovery\b|\bdiscriminat|\bnational origin\b|\bwithout regard to\b|\bon the basis of\b|\breport (any )?changes\b|\bcertif(y|ication)\b/i,
    label: "Your rights and promises",
    plain: "This part explains your rights and the rules you agree to: your answers must be true, the state can check them, you must report changes, you won't be treated unfairly, and you can ask for a fair hearing if you disagree. Read it before you sign, or ask Dr. Fawn about any part.",
  },
  {
    id: "signature",
    match: /\bsignature\b|\bsign here\b|\bsign\b(?! language)|\bsigned\b(?! with)|\bdate signed\b/i,
    label: "Signature and date",
    plain: "Where someone signs and dates the form. On your own signature line, sign your name and write today's date. The state can't process the form without your signature.",
  },
  {
    id: "medicare_parts",
    match: /\bmedicare part [abcd]\b|\bpart a\b|\bpart b\b|\bmedicare advantage\b|\bentitlement date\b/i,
    label: "Your Medicare parts",
    plain: "Part A is hospital insurance. Part B is medical insurance for things like doctor visits. Part C is a Medicare Advantage plan. Your Medicare card shows which parts you have and the date each one started.",
    where: "Your Medicare card",
    tier: 2,
  },
  {
    id: "voter",
    match: /\bregister(ing)? to vote\b|\bvoter registration\b/i,
    label: "Registering to vote",
    plain: "The form asks if you'd like to register to vote. Whether you say yes or no does not change your application.",
    optional: true,
  },
  {
    id: "privacy",
    match: /\bprivacy (statement|practices|notice|act)\b|\bconfidential(ity)?\b/i,
    label: "Privacy",
    plain: "This explains how the state keeps your information private and when it may share it, for example to check your answers. There's nothing to fill in here.",
    tier: 2,
  },
  {
    id: "language",
    match: /\b(preferred|primary|spoken|written) language\b|\binterpreter\b|\blanguage (do you|you) (speak|read)\b/i,
    label: "Your language",
    plain: "Which language you want to speak or get letters in. You can ask for a free interpreter.",
  },
  {
    id: "extra_help",
    match: /\bextra help\b|\blow[- ]income subsidy\b|\blis\b|\bpart d\b/i,
    label: "Extra Help with drug costs",
    plain: "Extra Help lowers prescription drug costs. If you get a Medicare Savings Program, you usually get Extra Help automatically.",
  },
];

/**
 * The best explanation for a line of a form: the highest tier that matches, then the longest
 * match. In long sentences only the start counts, since that is where the question is.
 */
export function genericFieldFor(text: string): GenericField | undefined {
  let best: { f: GenericField; score: number } | undefined;
  for (const f of GENERIC_FIELDS) {
    const m = f.match.exec(text);
    if (!m || (text.length > 100 && m.index > 80)) continue;
    const score = (f.tier ?? 3) * 1000 + m[0].length;
    if (!best || score > best.score) best = { f, score };
  }
  return best?.f;
}
