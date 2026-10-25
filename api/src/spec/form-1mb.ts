/**
 * Form spec for Louisiana's Medicare Savings Program application, BHSF Form 1-MB, Rev. 3/22.
 *
 * Source of truth for what the app asks. Code walks this in order; the model only explains
 * the field it is handed. Labels are copied from the official PDF; plain text and rules come
 * from Diego's verified research packet (Oct 23, 2026).
 *
 * TODO before demo: every aid with placeholder: true needs its real box marked
 * (form pages via pypdf or by hand; mock documents from Leigh's HTML layout).
 */
import type { Aid, Condition, Field, FormSpec, Sensitivity } from "./types.js";

const C = "BHSF Form 1-MB Rev. 3/22";
const yes = (field: string): Condition => ({ field, equals: "yes" });

// ---------- field helper ----------
type FieldInput = Omit<Field, "required" | "condition" | "sensitive" | "sourceDocs" | "aids" | "citation"> &
  Partial<Pick<Field, "required" | "condition" | "sensitive" | "sourceDocs" | "aids" | "citation">> & {
    /** extra aids beyond the auto-generated "where it goes on the form" aid */
    docAids?: string[];
  };

const formAids: Aid[] = [];

/**
 * Answer areas on the official PDF, in PDF points [x0, top, x1, bottom] on a 612 x 792 page.
 * Measured from the LDH PDF (Rev. 3/22) with pdfplumber and checked against rendered pages.
 * Repeating columns (jobs, income sources, bills) highlight the whole row.
 */
const PAGE_W = 612;
const PAGE_H = 792;
const FORM_BOXES_PT: Record<string, [number, number, number, number]> = {
  cover_language: [15, 300, 595, 326],
  s1_name: [18, 378, 594, 411],
  s1_ssn: [18, 411, 222, 444],
  s1_dob: [222, 411, 412, 444],
  s1_sex: [412, 411, 594, 444],
  s1_marital_status: [18, 444, 324, 478],
  s1_hispanic: [324, 444, 594, 478],
  s1_race: [18, 478, 594, 553],
  s2_mailing_address: [18, 583, 306, 666],
  s2_home_address: [306, 583, 594, 666],
  s2_email: [18, 666, 306, 702],
  s2_parish: [306, 666, 594, 702],
  s2_phones: [18, 702, 594, 735],
  s3_spouse_name: [18, 56, 594, 89],
  s3_spouse_ssn: [18, 89, 211, 122],
  s3_spouse_dob: [211, 89, 400, 122],
  s3_spouse_sex: [400, 89, 594, 122],
  s3_spouse_hispanic: [18, 122, 207, 171],
  s3_spouse_race: [207, 122, 594, 171],
  s4_medicare_number: [18, 238, 398, 256],
  s4_spouse_medicare_number: [398, 238, 594, 256],
  s4_other_insurance: [18, 256, 398, 305],
  s4_spouse_other_insurance: [398, 256, 594, 305],
  s5_worker_name: [18, 372, 594, 391],
  s5_employer_name: [18, 391, 594, 410],
  s5_employer_phone: [18, 410, 594, 429],
  s5_self_employed: [18, 429, 594, 448],
  s5_gross_pay: [18, 448, 594, 482],
  s5_pay_frequency: [18, 482, 594, 516],
  s6_who_receives: [18, 583, 594, 617],
  s6_source: [18, 617, 594, 650],
  s6_gross_amount: [18, 650, 594, 684],
  s6_frequency: [18, 684, 594, 718],
  s7_who_received_care: [18, 87, 594, 106],
  s7_provider: [18, 106, 594, 140],
  s7_provider_phone: [18, 140, 594, 159],
  s7_dates: [18, 159, 594, 178],
  s7_total_cost: [18, 178, 594, 197],
  s8_checking: [18, 266, 594, 303],
  s8_savings: [18, 303, 594, 341],
  s8_direct_express: [18, 341, 594, 378],
  s8_vehicle: [18, 378, 594, 425],
  s8_other_vehicles: [18, 425, 594, 461],
  s8_other_property: [18, 461, 594, 508],
  s8_cd: [18, 508, 594, 546],
  s8_investments: [18, 546, 594, 593],
  s8_life_burial_insurance: [18, 593, 594, 630],
  s8_burial_funds: [18, 630, 594, 677],
  s8_safe_deposit: [18, 677, 594, 713],
  s8_other: [18, 713, 594, 751],
  rights_read: [18, 20, 594, 760],
  sign_applicant: [18, 113, 594, 146],
  sign_spouse: [18, 146, 594, 180],
  sign_comments: [18, 192, 594, 480],
};

const round1 = (n: number) => Math.round(n * 10) / 10;
function formBox(id: string) {
  const b = FORM_BOXES_PT[id];
  if (!b) return null;
  const [x0, top, x1, bottom] = b;
  return {
    x: round1((x0 / PAGE_W) * 100),
    y: round1((top / PAGE_H) * 100),
    w: round1(((x1 - x0) / PAGE_W) * 100),
    h: round1(((bottom - top) / PAGE_H) * 100),
  };
}

function f(input: FieldInput): Field {
  const { docAids = [], ...rest } = input;
  const aids: string[] = [];
  // Every non-gate field gets a "where this goes on the paper form" aid.
  if (rest.kind !== "gate") {
    const id = `form.${rest.id}`;
    const measured = formBox(rest.id);
    formAids.push({
      id,
      image: `form/page-${rest.page}.png`,
      box: measured ?? { x: 5, y: 10, w: 90, h: 4 },
      spoken: `On page ${rest.page} of the application, the box labeled "${rest.label}".`,
      caption: `Page ${rest.page}: ${rest.label}`,
      placeholder: measured === null,
    });
    aids.push(id);
  }
  aids.push(...docAids);
  return {
    required: true,
    condition: null,
    sensitive: "none" as Sensitivity,
    sourceDocs: [],
    citation: `${C}, page ${rest.page}`,
    ...rest,
    aids,
  };
}

// ---------- fields ----------
const fields: Field[] = [
  // Cover
  f({ id: "cover_language", section: "cover", page: 1, kind: "write",
    label: "What is your preferred language?",
    plain: "Check the box for the language you want Medicaid to use with you." }),

  // 1 - Personal Information
  f({ id: "s1_name", section: "s1", page: 1, kind: "write",
    label: "First name / Middle initial / Last name / Suffix (Sr., Jr., etc.)",
    plain: "Write your name the way it appears on your Medicare card.",
    sourceDocs: ["medicare_card"], docAids: ["doc.medicare_card.name"] }),
  f({ id: "s1_ssn", section: "s1", page: 1, kind: "write", sensitive: "id_number",
    label: "Social Security number",
    plain: "Write your 9-digit Social Security number on the form. Do not type it or say it here.",
    tips: ["The form says giving it is voluntary, but leaving it blank can slow down or stop your application."],
    citation: `${C}, page 1; page 4 (Rights and Responsibilities)` }),
  f({ id: "s1_dob", section: "s1", page: 1, kind: "write", label: "Date of birth",
    plain: "Write the month, day and year you were born." }),
  f({ id: "s1_sex", section: "s1", page: 1, kind: "write", label: "Sex (Male / Female)",
    plain: "Check one box." }),
  f({ id: "s1_marital_status", section: "s1", page: 1, kind: "write",
    label: "Marital status (Single / Married / Widowed / Divorced/separated)",
    plain: "Check the one box that describes you today." }),
  f({ id: "s1_hispanic", section: "s1", page: 1, kind: "write", required: false,
    label: "Are you Hispanic or Latino? (optional)",
    plain: "You can answer or leave this blank. It does not change your application." }),
  f({ id: "s1_race", section: "s1", page: 1, kind: "write", required: false,
    label: "Race (optional – you may mark one or more)",
    plain: "You can check one or more boxes, or leave this blank. It does not change your application." }),

  // 2 - Contact Information
  f({ id: "s2_mailing_address", section: "s2", page: 1, kind: "write",
    label: "Mailing Address (P.O. box or street address, Apt/Lot #, City, State, Zip)",
    plain: "Where you get your mail. Letters about your application go here, so make sure it is right." }),
  f({ id: "s2_home_different", section: "s2", page: 1, kind: "gate", appOnly: true,
    label: "Is your home address different from your mailing address?",
    plain: "For example, if you get mail at a P.O. box." }),
  f({ id: "s2_home_address", section: "s2", page: 1, kind: "write", condition: yes("s2_home_different"),
    label: "Home Address (if different)",
    plain: "The street address where you live. Do not use a P.O. box here." }),
  f({ id: "s2_email", section: "s2", page: 1, kind: "write", required: false,
    label: "E-mail address (if you have one)", plain: "Leave blank if you don't use email." }),
  f({ id: "s2_parish", section: "s2", page: 1, kind: "write", label: "Home parish (where you live)",
    plain: "Louisiana's version of a county. For example, Orleans or Jefferson." }),
  f({ id: "s2_phones", section: "s2", page: 1, kind: "write", label: "Home phone / Cell phone / Other phone",
    plain: "Write any phone numbers you have so Medicaid can reach you." }),

  // 3 - Spouse's Information
  f({ id: "s3_married_living_together", section: "s3", page: 2, kind: "gate",
    label: "Are you married and living with a spouse?",
    plain: "Check Yes only if you are married and live together. If No, skip to Section 4." }),
  f({ id: "s3_spouse_name", section: "s3", page: 2, kind: "write", condition: yes("s3_married_living_together"),
    label: "Spouse: First name / Middle initial / Last name / Suffix",
    plain: "Your spouse's name as it appears on their Medicare card or ID.",
    sourceDocs: ["medicare_card"] }),
  f({ id: "s3_spouse_ssn", section: "s3", page: 2, kind: "write", sensitive: "id_number",
    condition: yes("s3_married_living_together"), label: "Spouse: Social Security number",
    plain: "Write your spouse's Social Security number on the form. Do not type it or say it here." }),
  f({ id: "s3_spouse_dob", section: "s3", page: 2, kind: "write", condition: yes("s3_married_living_together"),
    label: "Spouse: Date of birth", plain: "Your spouse's month, day and year of birth." }),
  f({ id: "s3_spouse_sex", section: "s3", page: 2, kind: "write", condition: yes("s3_married_living_together"),
    label: "Spouse: Sex (Male / Female)", plain: "Check one box." }),
  f({ id: "s3_spouse_hispanic", section: "s3", page: 2, kind: "write", required: false,
    condition: yes("s3_married_living_together"), label: "Is he/she Hispanic or Latino? (optional)",
    plain: "Optional. You can leave it blank." }),
  f({ id: "s3_spouse_race", section: "s3", page: 2, kind: "write", required: false,
    condition: yes("s3_married_living_together"), label: "Spouse: Race (optional – you may mark one or more)",
    plain: "Optional. You can leave it blank." }),
  f({ id: "s3_spouse_applying", section: "s3", page: 2, kind: "gate", condition: yes("s3_married_living_together"),
    label: "Does your spouse want to apply for the Medicare Savings Program?",
    plain: "If Yes, your spouse also signs on the last page." }),

  // 4 - Medicare Information
  f({ id: "s4_medicare_number", section: "s4", page: 2, kind: "write", sensitive: "id_number",
    label: "Medicare Claim Number (You)",
    plain: "Copy the Medicare Number from your red, white and blue Medicare card. It has 11 letters and numbers. Write it on the form; don't type it here.",
    sourceDocs: ["medicare_card"], docAids: ["doc.medicare_card.number"],
    citation: `${C}, page 2; CMS MBI format guide` }),
  f({ id: "s4_other_insurance", section: "s4", page: 2, kind: "write",
    label: "Does this person have health insurance (other than Medicare) or a Medicare supplement? (You)",
    plain: "Check Yes if you have any other health plan, like a retiree plan or a Medigap (supplement) policy.",
    sourceDocs: ["other_insurance_card"] }),
  f({ id: "s4_spouse_medicare_number", section: "s4", page: 2, kind: "write", sensitive: "id_number",
    condition: yes("s3_married_living_together"), label: "Medicare Claim Number (Your Spouse)",
    plain: "Copy the number from your spouse's Medicare card onto the form. Don't type it here.",
    sourceDocs: ["medicare_card"], docAids: ["doc.medicare_card.number"] }),
  f({ id: "s4_spouse_other_insurance", section: "s4", page: 2, kind: "write",
    condition: yes("s3_married_living_together"),
    label: "Does this person have health insurance (other than Medicare) or a Medicare supplement? (Your Spouse)",
    plain: "Same question for your spouse." }),

  // 5 - Money from Jobs
  f({ id: "s5_anyone_works", section: "s5", page: 2, kind: "gate",
    label: "Does anyone in the home work?",
    plain: "Count any paid work, including part-time jobs, cash jobs, tips and self-employment. If No, skip to Section 6." }),
  ...([
    ["s5_worker_name", "Worker's name", "Who has the job."],
    ["s5_employer_name", "Employer name", "The business they work for. It's printed at the top of a pay stub."],
    ["s5_employer_phone", "Employer phone number", "The employer's phone number, if you have it."],
    ["s5_self_employed", "Is this person self-employed?", "Check Yes if they work for themselves instead of a company."],
    ["s5_gross_pay", "How much are they paid? (gross income before taxes)",
      "The pay before taxes or anything else is taken out. On a pay stub this is usually called gross pay."],
    ["s5_pay_frequency", "How often paid? (weekly, biweekly, monthly, etc.)",
      "How often the paycheck comes. Biweekly means every two weeks."],
  ] as const).map(([id, label, plain]) =>
    f({ id, section: "s5", page: 2, kind: "write", label, plain, condition: yes("s5_anyone_works"),
      sourceDocs: ["pay_stubs"], repeatNote: "Use one column per job, up to 3 jobs.",
      docAids: id === "s5_gross_pay" ? ["doc.pay_stub.gross"] : [] })),

  // 6 - Other Money
  f({ id: "s6_other_money", section: "s6", page: 2, kind: "gate",
    label: "Does anyone in the home get money from other sources?",
    plain: "For example Social Security, a pension, or worker's comp. Most people answer Yes because of Social Security. If No, skip to Section 7." }),
  f({ id: "s6_who_receives", section: "s6", page: 2, kind: "write", condition: yes("s6_other_money"),
    label: "Who receives the money?", plain: "The person whose name is on the payment.",
    repeatNote: "Use one column per source, up to 3 sources." }),
  f({ id: "s6_source", section: "s6", page: 2, kind: "write", condition: yes("s6_other_money"),
    label: "Where does it come from?", plain: "For example: Social Security, City of New Orleans pension.",
    sourceDocs: ["ss_award_letter", "pension_statement"], repeatNote: "Use one column per source, up to 3 sources." }),
  f({ id: "s6_gross_amount", section: "s6", page: 2, kind: "write", condition: yes("s6_other_money"),
    label: "How much are they paid? (gross income before taxes)",
    plain: "The full amount before anything is taken out. For Social Security, use the amount before Medicare is taken out. That is the bigger number on your award letter, not what lands in your bank.",
    sourceDocs: ["ss_award_letter", "pension_statement"],
    docAids: ["doc.award_letter.before_deductions", "doc.pension.gross"],
    tips: ["Use the amount before the Medicare (Part B) deduction."],
    repeatNote: "Use one column per source, up to 3 sources.",
    citation: `${C}, page 2; research packet section 5` }),
  f({ id: "s6_frequency", section: "s6", page: 2, kind: "write", condition: yes("s6_other_money"),
    label: "How often paid? (weekly, biweekly, monthly, etc.)", plain: "Social Security is paid monthly.",
    repeatNote: "Use one column per source, up to 3 sources." }),

  // 7 - Medical Expenses (health information: the app explains, never asks for details)
  f({ id: "s7_medical_bills", section: "s7", page: 3, kind: "gate", sensitive: "health", clientOnly: true,
    label: "Do you or your spouse have medical bills (paid or unpaid) for medical care received in the past 3 months?",
    plain: "Answer on the paper form. Here, just tell the app whether to walk you through the rest of Section 7. If No, skip to Section 8." }),
  ...([
    ["s7_who_received_care", "Who received care?", "You or your spouse."],
    ["s7_provider", "Name of doctor, clinic, or other medical provider", "Copy it from the top of the bill."],
    ["s7_provider_phone", "Phone number", "The provider's phone number, usually printed on the bill."],
    ["s7_dates", "Dates of service", "The date of the visit or care, not the date the bill was mailed."],
    ["s7_total_cost", "Total cost", "The total charge shown on the bill."],
  ] as const).map(([id, label, plain]) =>
    f({ id, section: "s7", page: 3, kind: "write", label, plain, sensitive: "health",
      condition: yes("s7_medical_bills"), sourceDocs: ["medical_bills"],
      repeatNote: "Use one column per bill, up to 3." })),

  // 8 - Things You Own (12 rows; answer every row)
  ...([
    ["s8_checking", "Checking accounts", "account", ["bank_statement"]],
    ["s8_savings", "Savings accounts", "account", ["bank_statement"]],
    ["s8_direct_express", "Direct express accounts", "account", []],
    ["s8_vehicle", "Vehicle (cars, trucks, boats, motorcycles, RVs, ATVs, etc.)", "none", ["vehicle_title"]],
    ["s8_other_vehicles", "Other vehicles", "none", ["vehicle_title"]],
    ["s8_other_property", "Property other than where you live", "none", []],
    ["s8_cd", "Certificates of Deposit (CD)", "account", ["bank_statement"]],
    ["s8_investments", "Annuities, trusts, stocks, bonds, retirement accounts", "account", []],
    ["s8_life_burial_insurance", "Life or burial insurance", "none", ["insurance_policies"]],
    ["s8_burial_funds", "Money set aside for burial or pre-need contract", "none", ["insurance_policies"]],
    ["s8_safe_deposit", "Safe deposit box", "none", []],
    ["s8_other", "Other", "none", []],
  ] as const).map(([id, label, sens, docs]) =>
    f({ id, section: "s8", page: 3, kind: "row", label, sensitive: sens as Sensitivity, sourceDocs: [...docs],
      plain: `Check Yes or No for "${label}". If Yes, write who owns it, describe it (for example the bank's name), and about how much it is worth. Don't write account numbers.`,
      docAids: id === "s8_checking" ? ["doc.bank_statement.balance"] : [],
      tips: ["Louisiana does not count savings for these programs, but the form still asks. Answer every row yes or no."],
      citation: `${C}, page 3; LDH Medicare Savings Program page` })),

  // Rights and signature
  f({ id: "rights_read", section: "rights", page: 4, kind: "info",
    label: "Your Rights and Responsibilities",
    plain: "Read this page or have someone read it to you. It explains that Medicaid will check your information and that you must report changes within 10 days." }),
  f({ id: "sign_applicant", section: "sign", page: 5, kind: "sign", label: "Sign here: / Date:",
    plain: "Sign your name and write today's date. Your application can't be processed without it." }),
  f({ id: "sign_spouse", section: "sign", page: 5, kind: "sign", condition: yes("s3_spouse_applying"),
    label: "Spouse sign here (if applying): / Date:", plain: "Your spouse signs and dates here because they are applying too." }),
  f({ id: "sign_comments", section: "sign", page: 5, kind: "write", required: false,
    label: "Use this space for any comments or information that you could not fit on your application.",
    plain: "Extra room if you had more than 3 jobs, income sources or bills." }),
];

// ---------- document aids (mock documents Leigh builds; boxes come from her layout) ----------
const docAids: Aid[] = [
  { id: "doc.medicare_card.name", image: "docs/sample_medicare_card.png", box: { x: 8, y: 40, w: 60, h: 10 },
    caption: "Your name on the Medicare card", spoken: "Your name is printed in the middle of your Medicare card.", placeholder: true },
  { id: "doc.medicare_card.number", image: "docs/sample_medicare_card.png", box: { x: 8, y: 55, w: 55, h: 10 },
    caption: "Medicare Number", spoken: "Your Medicare Number is the line of 11 letters and numbers under your name.", placeholder: true },
  { id: "doc.award_letter.before_deductions", image: "docs/sample_award_letter.png", box: { x: 10, y: 38, w: 80, h: 6 },
    caption: "Benefit before deductions", spoken: "On your award letter, the line for your full monthly benefit before deductions, about a third of the way down.", placeholder: true },
  { id: "doc.pension.gross", image: "docs/sample_pension_statement.png", box: { x: 10, y: 35, w: 80, h: 6 },
    caption: "Gross monthly pension", spoken: "On your pension statement, the gross monthly amount.", placeholder: true },
  { id: "doc.pay_stub.gross", image: "docs/sample_pay_stub.png", box: { x: 55, y: 30, w: 35, h: 6 },
    caption: "Gross pay", spoken: "On your pay stub, the gross pay for this period, before taxes.", placeholder: true },
  { id: "doc.bank_statement.balance", image: "docs/sample_bank_statement.png", box: { x: 55, y: 25, w: 35, h: 6 },
    caption: "Ending balance", spoken: "On your bank statement, the ending balance near the top right.", placeholder: true },
];

export const formSpec: FormSpec = {
  id: "la-bhsf-1mb",
  title: "Application for Louisiana's Medicare Savings Program",
  form: "BHSF Form 1-MB",
  revision: "Rev. 3/22",
  jurisdiction: "Louisiana",
  checkedOn: "2026-10-25",
  sourceUrl: "https://ldh.la.gov/assets/medicaid/MedicaidEligibilityForms/MedicareSavingsProgram.pdf",
  pages: [
    { number: 1, image: "form/page-1.png", contents: "Cover, language, Section 1 Personal Information, Section 2 Contact Information" },
    { number: 2, image: "form/page-2.png", contents: "Section 3 Spouse, Section 4 Medicare, Section 5 Jobs, Section 6 Other Money" },
    { number: 3, image: "form/page-3.png", contents: "Section 7 Medical Expenses, Section 8 Things You Own" },
    { number: 4, image: "form/page-4.png", contents: "Your Rights and Responsibilities" },
    { number: 5, image: "form/page-5.png", contents: "Signatures and extra space" },
  ],
  documents: [
    { id: "medicare_card", name: "Medicare card", whatItLooksLike: "Red, white and blue card with your name, Medicare Number, and Part A and Part B start dates.",
      answers: ["s1_name", "s4_medicare_number"], sampleImage: "docs/sample_medicare_card.png", whoNeedsIt: "Everyone (and your spouse's card if married)" },
    { id: "ss_award_letter", name: "Social Security benefit (award) letter", whatItLooksLike: "Letter from Social Security showing your monthly benefit before deductions, the Medicare deduction, and what you're paid after.",
      answers: ["s6_source", "s6_gross_amount"], sampleImage: "docs/sample_award_letter.png", whoNeedsIt: "Anyone who gets Social Security" },
    { id: "bank_statement", name: "Most recent bank statement", whatItLooksLike: "Statement with the bank's name, your name, the statement dates and the ending balance.",
      answers: ["s8_checking", "s8_savings", "s8_cd"], sampleImage: "docs/sample_bank_statement.png", whoNeedsIt: "Anyone with a bank account" },
    { id: "pension_statement", name: "Pension statement", whatItLooksLike: "Statement from your former employer or pension fund showing the gross monthly payment.",
      answers: ["s6_source", "s6_gross_amount"], sampleImage: "docs/sample_pension_statement.png", whoNeedsIt: "Only if you get a pension" },
    { id: "pay_stubs", name: "Recent pay stubs", whatItLooksLike: "Pay stub showing the employer, the pay period and gross pay.",
      answers: ["s5_employer_name", "s5_gross_pay", "s5_pay_frequency"], sampleImage: "docs/sample_pay_stub.png", whoNeedsIt: "Only if someone in the home works" },
    { id: "other_insurance_card", name: "Other insurance card", whatItLooksLike: "Card for a Medigap or retiree health plan.",
      answers: ["s4_other_insurance"], sampleImage: null, whoNeedsIt: "Only if you have other health insurance" },
    { id: "medical_bills", name: "Medical bills from the past 3 months", whatItLooksLike: "Bills from a doctor, clinic or hospital.",
      answers: ["s7_provider", "s7_dates", "s7_total_cost"], sampleImage: null, whoNeedsIt: "Only if you had medical care in the past 3 months" },
    { id: "vehicle_title", name: "Vehicle title or registration", whatItLooksLike: "Title or registration for a car, truck or boat.",
      answers: ["s8_vehicle", "s8_other_vehicles"], sampleImage: null, whoNeedsIt: "Only if you own a vehicle" },
    { id: "insurance_policies", name: "Life or burial insurance policies", whatItLooksLike: "Policy papers or a pre-need funeral contract.",
      answers: ["s8_life_burial_insurance", "s8_burial_funds"], sampleImage: null, whoNeedsIt: "Only if you have them" },
  ],
  sections: [
    { id: "cover", number: "", title: "Before you start", page: 1 },
    { id: "s1", number: "1", title: "Personal Information", page: 1 },
    { id: "s2", number: "2", title: "Contact Information", page: 1 },
    { id: "s3", number: "3", title: "Spouse's Information", page: 2 },
    { id: "s4", number: "4", title: "Medicare Information", page: 2 },
    { id: "s5", number: "5", title: "Money from Jobs", page: 2 },
    { id: "s6", number: "6", title: "Other Money", page: 2 },
    { id: "s7", number: "7", title: "Medical Expenses", page: 3, sensitive: "health" },
    { id: "s8", number: "8", title: "Things You Own", page: 3 },
    { id: "rights", number: "", title: "Your Rights and Responsibilities", page: 4 },
    { id: "sign", number: "", title: "Sign and date", page: 5 },
  ],
  fields,
  aids: [...formAids, ...docAids],
  knowledge: [
    { id: "gross", text: "Gross means the full amount before anything is taken out. For Social Security, use the benefit before the Medicare (Part B) deduction, which is the larger number on the award letter.", citation: `${C}, page 2; research packet section 5` },
    { id: "savings_not_counted", text: "Louisiana does not count savings or things you own for QMB, SLMB or QI, but the form still asks. Answer every row in Section 8 yes or no.", citation: "LDH Medicare Savings Program page" },
    { id: "medicare_number", text: "\"Medicare Claim Number\" on the form means the Medicare Number on the red, white and blue card: 11 letters and numbers. The dashes on the card are not part of the number.", citation: "CMS MBI format guide" },
    { id: "optional_race", text: "Race and Hispanic/Latino questions are optional and do not affect the application.", citation: `${C}, pages 1-2` },
    { id: "ssn_voluntary", text: "The form says giving a Social Security number is voluntary, but leaving it out may delay or prevent coverage.", citation: `${C}, page 4` },
    { id: "extra_space", text: "If you need more room (more than 3 jobs, sources or bills), use the comment box on page 5 or a separate sheet of paper.", citation: `${C}, page 1` },
    { id: "who_decides", text: "Medicaid decides who qualifies. The app never decides. If you're not sure you qualify, apply anyway.", citation: "Team rule; LDH MSP page says 'Not sure if you qualify? Apply to find out.'" },
    { id: "extra_help", text: "Applying for Extra Help through Social Security also starts a Louisiana Medicare Savings Program application, unless you say you don't want that.", citation: "SSA POMS HI 00815.024" },
    { id: "full_medicaid", text: "Many people who get QMB also qualify for full Medicaid. A free counselor can check.", citation: "Research packet section 8" },
    { id: "verification", text: "Medicaid checks the information with its own systems and outside sources. The form does not list documents you must mail in.", citation: `${C}, page 4; LDH H-1300` },
    { id: "report_changes", text: "After applying, you must tell Medicaid within 10 days if your address, income, things you own, insurance or household changes. Call 1-888-342-6207.", citation: `${C}, page 4` },
    { id: "authorized_rep", text: "A trusted person can be named to help with your application using the Medicaid Authorized Representative Form, which comes in the same PDF.", citation: "LDH MSP application packet" },
    { id: "help_line", text: "Medicaid help line: 1-888-342-6207, Monday to Friday, 8 a.m. to 4:30 p.m. TTY: 1-800-220-5404.", citation: "LDH Medicare Savings Program page" },
  ],
  finish: {
    waysToApply: [
      { method: "Mail", detail: "Medicaid Application Office, P.O. Box 91278, Baton Rouge, LA 70821-9278" },
      { method: "Fax", detail: "1-877-523-2987" },
      { method: "Online", detail: "LDH Medicaid Self-Service Portal: sspweb.lameds.ldh.la.gov/selfservice" },
      { method: "Phone", detail: "1-888-342-6207, Monday to Friday, 8 a.m. to 4:30 p.m. (TTY 1-800-220-5404)" },
      { method: "In person", detail: "Any local Medicaid office, Monday to Friday, 8 a.m. to 4:30 p.m." },
    ],
    nextSteps: [
      "Keep a copy of your signed application.",
      "Medicaid will mail you a decision. Watch your mailbox.",
      "If anything changes, call 1-888-342-6207 within 10 days.",
      "Many people who get QMB also qualify for full Medicaid. A free counselor can check.",
    ],
  },
};
