// Form spec for Louisiana's Medicare Savings Program application (BHSF Form 1-MB, Rev. 3/22).
// Facts come from the team's verified research packet (Diego, checked 2026-10-23).
// Boxes are in PDF points from the top-left corner of a 612 x 792 page.

export type Box = { page: number; x0: number; y0: number; x1: number; y1: number };

export type Field = {
  id: string;
  section: string;
  label: string;
  plain: string;
  where?: string;
  tip?: string;
  sensitive?: boolean;
  optional?: boolean;
  doc?: DocSpot;
  condition?: string;
  box: Box;
};

// Where the answer sits on one of the SAMPLE mock documents.
export type DocId = "medicare_card" | "award_letter" | "bank_statement" | "pay_stub" | "pension";
export type DocSpot = { id: DocId; spot: string };

export type Section = {
  id: string;
  number?: string;
  title: string;
  short: string;
  plain: string;
  skip?: string;
  box: Box;
};

export type Term = { term: string; aliases?: string[]; plain: string };

export const FORM = {
  name: "Application for Louisiana's Medicare Savings Program",
  code: "BHSF Form 1-MB, Rev. 3/22",
  pdf: "/msp-application.pdf",
  pages: 5,
};

const b = (page: number, x0: number, y0: number, x1: number, y1: number): Box => ({ page, x0, y0, x1, y1 });

export const SECTIONS: Section[] = [
  {
    id: "start",
    title: "Before you start",
    short: "Start",
    plain:
      "This form asks Louisiana to help pay your Medicare costs. Fill it out if you already have Medicare. Print in black ink. Have your Medicare card, your Social Security letter, and your latest bank statement nearby.",
    box: b(1, 14, 50, 600, 362),
  },
  {
    id: "s1",
    number: "1",
    title: "Personal Information",
    short: "About you",
    plain: "Basic facts about you: your name, birthday, and marital status. Race and ethnicity are optional.",
    box: b(1, 14, 362, 600, 562),
  },
  {
    id: "s2",
    number: "2",
    title: "Contact Information",
    short: "Contact",
    plain: "Where Medicaid can send you mail and how they can reach you by phone.",
    box: b(1, 14, 566, 600, 748),
  },
  {
    id: "s3",
    number: "3",
    title: "Spouse's Information",
    short: "Spouse",
    plain: "Facts about your husband or wife, only if you are married and live together.",
    skip: "Skip this section if you are not married, or if you do not live with your spouse.",
    box: b(2, 14, 18, 600, 200),
  },
  {
    id: "s4",
    number: "4",
    title: "Medicare Information",
    short: "Medicare",
    plain: "Your Medicare number, and whether you have any other health insurance.",
    box: b(2, 14, 203, 600, 316),
  },
  {
    id: "s5",
    number: "5",
    title: "Money from Jobs",
    short: "Jobs",
    plain: "Pay from work for anyone in your home, including part-time work and self-employment.",
    skip: "Skip this section if no one in your home works.",
    box: b(2, 14, 318, 600, 526),
  },
  {
    id: "s6",
    number: "6",
    title: "Other Money",
    short: "Other money",
    plain: "Money that does not come from a job, like Social Security, a pension, or worker's comp.",
    skip: "Skip this section if no one in your home gets money from other places.",
    box: b(2, 14, 529, 600, 726),
  },
  {
    id: "s7",
    number: "7",
    title: "Medical Expenses",
    short: "Medical bills",
    plain: "Medical bills from the last 3 months, paid or not paid.",
    skip: "Skip this section if you and your spouse have no medical bills from the last 3 months.",
    box: b(3, 14, 18, 600, 206),
  },
  {
    id: "s8",
    number: "8",
    title: "Things You Own",
    short: "Things you own",
    plain:
      "A list of things you might own, like bank accounts and cars. Louisiana does not count your savings for these programs, but the form still asks. Answer every row yes or no.",
    box: b(3, 14, 210, 600, 758),
  },
  {
    id: "rights",
    title: "Your Rights and Responsibilities",
    short: "Your rights",
    plain: "The rules you agree to when you sign. Read this page before you sign. Tap any part to see it in plain words.",
    box: b(4, 14, 18, 600, 726),
  },
  {
    id: "sign",
    title: "Read and sign",
    short: "Sign",
    plain: "Sign and date the form. Your spouse signs too, only if they are also applying.",
    box: b(5, 14, 18, 600, 760),
  },
];

export const FIELDS: Field[] = [
  // Cover page
  {
    id: "phone_help",
    section: "start",
    label: "Questions? 1-888-342-6207",
    plain: "This is the Louisiana Medicaid help line. Call it if you have a question about this form. They are open Monday to Friday, 8 a.m. to 4:30 p.m.",
    tip: "TTY users can call 1-800-220-5404.",
    box: b(0, 14, 762, 320, 782),
  },
  {
    id: "who_uses",
    section: "start",
    label: "Who should use this application",
    plain:
      "Use this form if you have Medicare and want help paying for it. If you are applying for someone who does not have Medicare, you need a different form called the Application for Health Coverage.",
    tip: "Not sure if you qualify? Apply anyway. Louisiana makes the decision, not this guide.",
    box: b(1, 14, 140, 600, 214),
  },
  {
    id: "how_submit",
    section: "start",
    label: "Where to send it",
    plain:
      "When you finish, mail the form to: Medicaid Application Office, P.O. Box 91278, Baton Rouge, LA 70821-9278. Or fax it to 1-877-523-2987. You can also apply online at MyMedicaid.la.gov.",
    tip: "Keep a copy of your filled-out form for your records.",
    box: b(1, 14, 214, 600, 285),
  },
  {
    id: "preferred_language",
    section: "start",
    label: "What is your preferred language?",
    plain: "Check the language you want Medicaid to use when they write or talk to you.",
    box: b(1, 14, 302, 600, 328),
  },
  {
    id: "print_clearly",
    section: "start",
    label: "Please PRINT clearly in black ink",
    plain: "Write in capital letters with a black pen so the office can read and scan your answers.",
    box: b(1, 14, 340, 320, 362),
  },

  // Section 1
  {
    id: "name",
    section: "s1",
    label: "First name, Middle initial, Last name",
    plain: "Write your full name the way it is printed on your Medicare card.",
    where: "Your Medicare card",
    doc: { id: "medicare_card", spot: "name" },
    box: b(1, 14, 380, 498, 413),
  },
  {
    id: "suffix",
    section: "s1",
    label: "Suffix (Sr., Jr., etc.)",
    plain: "Only fill this in if your name ends with something like Jr., Sr., or III. Most people leave it blank.",
    optional: true,
    box: b(1, 498, 380, 600, 413),
  },
  {
    id: "ssn",
    section: "s1",
    label: "Social Security number",
    plain: "Your 9-digit Social Security number. Medicaid uses it to check your income with Social Security.",
    where: "Your Social Security card or your Social Security award letter",
    tip: "Giving this number is voluntary, but leaving it blank can slow down or stop your application.",
    sensitive: true,
    box: b(1, 14, 413, 222, 447),
  },
  {
    id: "dob",
    section: "s1",
    label: "Date of birth",
    plain: "Your birthday: month, day, and year. For example, 04/12/1952.",
    box: b(1, 222, 413, 414, 447),
  },
  {
    id: "sex",
    section: "s1",
    label: "Sex",
    plain: "Check one box.",
    box: b(1, 414, 413, 600, 447),
  },
  {
    id: "marital_status",
    section: "s1",
    label: "Marital status",
    plain:
      "Check one box. If your husband or wife has died, check Widowed. If you are separated or divorced, check Divorced/separated.",
    tip: "If you check Married, you will also fill out Section 3 if you live with your spouse.",
    box: b(1, 14, 447, 324, 481),
  },
  {
    id: "hispanic",
    section: "s1",
    label: "Are you Hispanic or Latino? (optional)",
    plain: "You do not have to answer this. It does not change whether you get help.",
    optional: true,
    box: b(1, 324, 447, 600, 481),
  },
  {
    id: "race",
    section: "s1",
    label: "Race (optional)",
    plain:
      "You do not have to answer this. If you want to, you can check more than one box. It does not change whether you get help.",
    optional: true,
    box: b(1, 14, 481, 600, 558),
  },

  // Section 2
  {
    id: "mailing_address",
    section: "s2",
    label: "Mailing Address",
    plain: "Where you get your mail. This can be a P.O. box. Letters about your application will go here, so make sure it is correct.",
    box: b(1, 14, 586, 306, 672),
  },
  {
    id: "home_address",
    section: "s2",
    label: "Home Address (if different)",
    plain: "The street address where you live. Only fill this in if it is different from your mailing address.",
    optional: true,
    condition: "Only if your home is different from your mailing address",
    box: b(1, 306, 586, 600, 672),
  },
  {
    id: "email",
    section: "s2",
    label: "E-mail address (if you have one)",
    plain: "Your email address, if you have one. You can leave this blank.",
    optional: true,
    box: b(1, 14, 672, 306, 705),
  },
  {
    id: "parish",
    section: "s2",
    label: "Home parish (where you live)",
    plain: "The parish is what Louisiana calls a county. Write the name of the parish you live in, like Orleans or Jefferson.",
    box: b(1, 306, 672, 600, 705),
  },
  {
    id: "phones",
    section: "s2",
    label: "Home phone, Cell phone, Other phone",
    plain: "Write at least one phone number where Medicaid can reach you. Fill in the area code inside the ( ).",
    box: b(1, 14, 705, 600, 746),
  },

  // Section 3
  {
    id: "married_living",
    section: "s3",
    label: "Are you married and living with a spouse?",
    plain: "Check Yes only if you are married AND live in the same home as your spouse. If you check No, skip to Section 4.",
    box: b(2, 14, 37, 600, 57),
  },
  {
    id: "spouse_name",
    section: "s3",
    label: "Spouse's name",
    plain: "Your spouse's full name, the way it is printed on their Medicare card.",
    where: "Your spouse's Medicare card",
    condition: "Only if married and living together",
    box: b(2, 14, 57, 600, 91),
  },
  {
    id: "spouse_ssn",
    section: "s3",
    label: "Spouse's Social Security number",
    plain: "Your spouse's 9-digit Social Security number.",
    where: "Your spouse's Social Security card or award letter",
    sensitive: true,
    condition: "Only if married and living together",
    box: b(2, 14, 91, 210, 125),
  },
  {
    id: "spouse_dob",
    section: "s3",
    label: "Spouse's date of birth",
    plain: "Your spouse's birthday: month, day, and year.",
    condition: "Only if married and living together",
    box: b(2, 210, 91, 400, 125),
  },
  {
    id: "spouse_sex",
    section: "s3",
    label: "Spouse's sex",
    plain: "Check one box for your spouse.",
    condition: "Only if married and living together",
    box: b(2, 400, 91, 600, 125),
  },
  {
    id: "spouse_hispanic",
    section: "s3",
    label: "Is he/she Hispanic or Latino? (optional)",
    plain: "Optional. You do not have to answer this for your spouse.",
    optional: true,
    box: b(2, 14, 125, 210, 172),
  },
  {
    id: "spouse_race",
    section: "s3",
    label: "Spouse's race (optional)",
    plain: "Optional. You can check more than one box, or leave it blank.",
    optional: true,
    box: b(2, 210, 125, 600, 172),
  },
  {
    id: "spouse_apply",
    section: "s3",
    label: "Does your spouse want to apply for the Medicare Savings Program?",
    plain: "Check Yes if your spouse also wants help paying for Medicare. If Yes, your spouse signs the form too.",
    condition: "Only if married and living together",
    box: b(2, 14, 172, 600, 197),
  },

  // Section 4
  {
    id: "mbi",
    section: "s4",
    label: "Medicare Claim Number",
    plain:
      "This is your Medicare Number. It has 11 letters and numbers. Copy it exactly from your red, white, and blue Medicare card. You do not need to write the dashes.",
    where: "Your Medicare card, under \"Medicare Number\"",
    tip: "Fill in the second column for your spouse only if you are married.",
    sensitive: true,
    doc: { id: "medicare_card", spot: "number" },
    box: b(2, 14, 239, 600, 261),
  },
  {
    id: "other_insurance",
    section: "s4",
    label: "Does this person have health insurance (other than Medicare) or a Medicare supplement?",
    plain:
      "Check Yes if you have any other health coverage. Examples: a Medigap (Medicare supplement) plan, a retiree plan from a past job, or insurance through a spouse's job.",
    where: "Any other insurance card in your wallet",
    box: b(2, 14, 261, 600, 312),
  },

  // Section 5
  {
    id: "anyone_work",
    section: "s5",
    label: "Does anyone in the home work?",
    plain: "Check Yes if you, your spouse, or anyone you live with earns money from a job. If No, skip to Section 6.",
    box: b(2, 14, 337, 600, 357),
  },
  {
    id: "worker_name",
    section: "s5",
    label: "Worker's name",
    plain: "The name of the person who has the job. Use one column for each job, up to 3 jobs.",
    condition: "Only if someone in the home works",
    box: b(2, 14, 357, 600, 393),
  },
  {
    id: "employer_name",
    section: "s5",
    label: "Employer name",
    plain: "The name of the company or person they work for.",
    where: "Pay stub",
    condition: "Only if someone in the home works",
    box: b(2, 14, 393, 600, 412),
  },
  {
    id: "employer_phone",
    section: "s5",
    label: "Employer phone number",
    plain: "The employer's phone number, so Medicaid can check the job if needed.",
    condition: "Only if someone in the home works",
    box: b(2, 14, 412, 600, 432),
  },
  {
    id: "self_employed",
    section: "s5",
    label: "Is this person self-employed?",
    plain: "Check Yes if they work for themselves, like running a small business or doing odd jobs for cash.",
    condition: "Only if someone in the home works",
    box: b(2, 14, 432, 600, 451),
  },
  {
    id: "job_pay",
    section: "s5",
    label: "How much are they paid? (gross income before taxes)",
    plain: "How much the job pays BEFORE taxes or anything else is taken out. This is the bigger number on the pay stub, often called \"gross pay.\"",
    where: "Pay stub, the \"gross pay\" line",
    condition: "Only if someone in the home works",
    box: b(2, 14, 451, 600, 485),
  },
  {
    id: "job_frequency",
    section: "s5",
    label: "How often paid? (weekly, biweekly, monthly, etc.)",
    plain: "How often the paycheck comes. Biweekly means every two weeks.",
    where: "Pay stub, the pay period dates",
    condition: "Only if someone in the home works",
    box: b(2, 14, 485, 600, 522),
  },

  // Section 6
  {
    id: "other_money_any",
    section: "s6",
    label: "Does anyone in the home get money from other sources?",
    plain: "Check Yes if anyone in your home gets money that is not from a job. Social Security counts. Most people on Medicare check Yes here.",
    doc: { id: "award_letter", spot: "before" },
    box: b(2, 14, 548, 600, 568),
  },
  {
    id: "receiver",
    section: "s6",
    label: "Who receives the money?",
    plain: "The name of the person who gets this money. Use one column for each kind of money, up to 3.",
    condition: "Only if someone gets other money",
    box: b(2, 14, 568, 600, 626),
  },
  {
    id: "source_from",
    section: "s6",
    label: "Where does it come from?",
    plain: "Where the money comes from. For example: Social Security, a pension from a past job, VA benefits, or worker's comp.",
    condition: "Only if someone gets other money",
    box: b(2, 14, 626, 600, 652),
  },
  {
    id: "source_amount",
    section: "s6",
    label: "How much are they paid? (gross income before taxes)",
    plain:
      "The full amount BEFORE anything is taken out. For Social Security, use the amount before your Medicare Part B premium is taken out. That number is bigger than what lands in your bank.",
    where: "Social Security award letter, the benefit amount before deductions",
    condition: "Only if someone gets other money",
    doc: { id: "award_letter", spot: "before" },
    box: b(2, 14, 652, 600, 687),
  },
  {
    id: "source_frequency",
    section: "s6",
    label: "How often paid? (weekly, biweekly, monthly, etc.)",
    plain: "How often the money comes. Social Security and most pensions are paid monthly.",
    condition: "Only if someone gets other money",
    doc: { id: "award_letter", spot: "monthly" },
    box: b(2, 14, 687, 600, 723),
  },

  // Section 7
  {
    id: "medical_any",
    section: "s7",
    label: "Medical bills in the past 3 months?",
    plain: "Check Yes if you or your spouse got medical care in the last 3 months and got a bill, even if you already paid it. If No, skip to Section 8.",
    sensitive: true,
    box: b(3, 14, 37, 600, 73),
  },
  {
    id: "care_who",
    section: "s7",
    label: "Who received care?",
    plain: "The name of the person who saw the doctor or got the care.",
    where: "The medical bill",
    sensitive: true,
    condition: "Only if there are medical bills",
    box: b(3, 14, 73, 600, 109),
  },
  {
    id: "provider",
    section: "s7",
    label: "Name of doctor, clinic, or other medical provider",
    plain: "Who gave the care: the doctor, clinic, hospital, or pharmacy. It is printed at the top of the bill.",
    where: "The top of the medical bill",
    sensitive: true,
    condition: "Only if there are medical bills",
    box: b(3, 14, 109, 600, 142),
  },
  {
    id: "provider_phone",
    section: "s7",
    label: "Phone number",
    plain: "The phone number of the doctor or clinic.",
    where: "The medical bill",
    condition: "Only if there are medical bills",
    sensitive: true,
    box: b(3, 14, 142, 600, 161),
  },
  {
    id: "service_dates",
    section: "s7",
    label: "Dates of service",
    plain: "The day or days you got the care. This is not the date the bill was mailed.",
    where: "The medical bill, often labeled \"date of service\"",
    condition: "Only if there are medical bills",
    sensitive: true,
    box: b(3, 14, 161, 600, 180),
  },
  {
    id: "total_cost",
    section: "s7",
    label: "Total cost",
    plain: "The full amount of the bill.",
    where: "The medical bill",
    condition: "Only if there are medical bills",
    sensitive: true,
    box: b(3, 14, 180, 600, 202),
  },

  // Section 8
  {
    id: "assets_how",
    section: "s8",
    label: "How to fill out this table",
    plain:
      "Go row by row. Check Yes or No for each item. If Yes, write who owns it, describe it (like the bank's name), and about how much it is worth.",
    tip: "Louisiana does not count savings for these programs. You still need to answer every row.",
    box: b(3, 14, 230, 600, 268),
  },
  {
    id: "checking",
    section: "s8",
    label: "Checking accounts",
    plain: "The bank account you use to pay bills and write checks. Write the bank's name and about how much is in it.",
    where: "Your latest bank statement, the ending balance",
    doc: { id: "bank_statement", spot: "balance" },
    tip: "Don't write account numbers. The bank's name is enough.",
    box: b(3, 14, 268, 600, 306),
  },
  {
    id: "savings",
    section: "s8",
    label: "Savings accounts",
    plain: "A bank account where you keep money you are saving.",
    where: "Your latest bank statement",
    doc: { id: "bank_statement", spot: "balance" },
    tip: "Don't write account numbers. The bank's name is enough.",
    box: b(3, 14, 306, 600, 344),
  },
  {
    id: "direct_express",
    section: "s8",
    label: "Direct Express accounts",
    plain: "A Direct Express card is a prepaid debit card some people use to get Social Security or other federal benefits instead of a bank account.",
    where: "Your Direct Express card or its balance statement",
    box: b(3, 14, 344, 600, 381),
  },
  {
    id: "vehicle",
    section: "s8",
    label: "Vehicle (cars, trucks, boats, motorcycles, RVs, ATVs, etc.)",
    plain: "Your main car or truck. Describe it by year and model, for example \"2011 Toyota Camry.\"",
    where: "Your vehicle title or registration",
    box: b(3, 14, 381, 600, 429),
  },
  {
    id: "other_vehicles",
    section: "s8",
    label: "Other vehicles",
    plain: "Any other car, boat, motorcycle, RV, or ATV you own.",
    box: b(3, 14, 429, 600, 464),
  },
  {
    id: "property",
    section: "s8",
    label: "Property other than where you live",
    plain: "Land or a building you own besides your home, like a rental house, a camp, or an empty lot.",
    box: b(3, 14, 464, 600, 512),
  },
  {
    id: "cd",
    section: "s8",
    label: "Certificates of Deposit (CD)",
    plain: "A CD is a savings account at a bank that holds your money for a set time, like 1 year, in exchange for more interest.",
    where: "Your bank statement",
    box: b(3, 14, 512, 600, 547),
  },
  {
    id: "investments",
    section: "s8",
    label: "Annuities, trusts, stocks, bonds, retirement accounts",
    plain: "Investments and retirement savings, like an IRA, a 401(k), stocks, or an annuity.",
    where: "Your account statements",
    box: b(3, 14, 547, 600, 596),
  },
  {
    id: "life_insurance",
    section: "s8",
    label: "Life or burial insurance",
    plain: "An insurance policy that pays money when you die. Write the insurance company's name.",
    where: "Your insurance policy papers",
    box: b(3, 14, 596, 600, 631),
  },
  {
    id: "burial_money",
    section: "s8",
    label: "Money set aside for burial or pre-need contract",
    plain: "Money saved for your funeral, or a plan you already paid for with a funeral home.",
    box: b(3, 14, 631, 600, 680),
  },
  {
    id: "safe_deposit",
    section: "s8",
    label: "Safe deposit box",
    plain: "A locked box you rent at a bank to keep valuables in.",
    box: b(3, 14, 680, 600, 717),
  },
  {
    id: "other_assets",
    section: "s8",
    label: "Other",
    plain: "Anything else of value that is not listed above. If you have nothing else, check No.",
    box: b(3, 14, 717, 600, 755),
  },

  // Page 4: rights
  {
    id: "r_permission",
    section: "rights",
    label: "Permission to share information",
    plain: "By signing, you promise that everyone listed on the form said it was OK to share their information with the Louisiana Department of Health.",
    box: b(4, 14, 38, 600, 70),
  },
  {
    id: "r_law",
    section: "rights",
    label: "Why LDH can ask for this",
    plain: "Federal laws allow the Louisiana Department of Health to ask for this information, including Social Security numbers.",
    box: b(4, 14, 70, 600, 112),
  },
  {
    id: "r_voluntary",
    section: "rights",
    label: "Social Security numbers are voluntary",
    plain: "You do not have to give your Social Security number. But if you leave it out, your application may be slower or may not go through.",
    box: b(4, 14, 112, 600, 142),
  },
  {
    id: "r_check",
    section: "rights",
    label: "LDH will check your answers",
    plain:
      "Medicaid will check what you write. They may contact places like Social Security, the IRS, your bank, your employer, or your doctors to confirm it.",
    box: b(4, 14, 142, 600, 262),
  },
  {
    id: "r_sources",
    section: "rights",
    label: "When this permission ends",
    plain:
      "You let those places share your information with Medicaid. This stops if your application is denied, your coverage ends, or you cancel in writing. Canceling may mean you can't get coverage.",
    box: b(4, 14, 262, 600, 304),
  },
  {
    id: "r_ssn_use",
    section: "rights",
    label: "How Social Security numbers are used",
    plain: "Social Security numbers are only used to check income and decide who can get Medicaid.",
    box: b(4, 14, 304, 600, 334),
  },
  {
    id: "r_changes",
    section: "rights",
    label: "Report changes within 10 days",
    plain:
      "If something changes, tell Medicaid within 10 days. This includes your address, income, things you own, health insurance, or someone moving in or out. Call 1-888-342-6207.",
    box: b(4, 14, 334, 600, 388),
  },
  {
    id: "r_fraud",
    section: "rights",
    label: "Your answers must be true",
    plain: "Everything you write must be true. If you lie or hide something on purpose, that is fraud, and you may have to pay money back.",
    box: b(4, 14, 388, 600, 418),
  },
  {
    id: "r_citizenship",
    section: "rights",
    label: "Citizenship and immigration status",
    plain: "You promise that what you say about citizenship or immigration status is true.",
    box: b(4, 14, 418, 600, 436),
  },
  {
    id: "r_third_party",
    section: "rights",
    label: "Money owed by others",
    plain:
      "If Medicaid pays for your care, Medicaid gets the right to money that someone else owes you for that care. For example, from another insurance company or a legal settlement.",
    box: b(4, 14, 436, 600, 466),
  },
  {
    id: "r_child_support",
    section: "rights",
    label: "Child support",
    plain: "This is about parents of children under 19 who get Medicaid. Most people applying for the Medicare Savings Program can skip this one.",
    box: b(4, 14, 466, 600, 508),
  },
  {
    id: "r_estate",
    section: "rights",
    label: "Estate Recovery",
    plain:
      "After a person who got Medicaid dies, the state may ask to be paid back for certain Medicaid costs from what they leave behind. It does not happen while a spouse is alive, or if there is a child under 21, blind, or disabled. Heirs can ask for a hardship waiver.",
    tip: "Worried about this? A free counselor at LaSHIP (1-800-259-5300) can explain how it applies to you.",
    box: b(4, 14, 508, 600, 598),
  },
  {
    id: "r_annuities",
    section: "rights",
    label: "Annuities",
    plain:
      "If you have an annuity (a type of investment that pays you over time) bought on or after Feb. 8, 2006, the state may be named to get what's left of it. Tell Medicaid about any annuity you own.",
    box: b(4, 14, 598, 600, 664),
  },
  {
    id: "r_hearing",
    section: "rights",
    label: "Fair Hearing",
    plain: "If you think a decision about your case is wrong, unfair, or too late, you can ask for a Fair Hearing. That is a formal review of the decision.",
    box: b(4, 14, 664, 600, 682),
  },
  {
    id: "r_discrimination",
    section: "rights",
    label: "No discrimination",
    plain: "Medicaid cannot treat you differently because of race, color, sex, age, disability, religion, nationality, or politics. If that happens, call 1-800-368-1019.",
    box: b(4, 14, 682, 600, 722),
  },

  // Page 5
  {
    id: "certify",
    section: "sign",
    label: "Read and sign below",
    plain:
      "By signing, you let Louisiana check your answers, and you promise they are true to the best of your knowledge. It also says you read page 4, or someone read it to you.",
    box: b(5, 14, 36, 600, 116),
  },
  {
    id: "signature",
    section: "sign",
    label: "Sign here / Date",
    plain: "Sign your name and write today's date. The form cannot be processed without your signature.",
    box: b(5, 14, 124, 600, 154),
  },
  {
    id: "spouse_signature",
    section: "sign",
    label: "Spouse sign here (if applying) / Date",
    plain: "Your spouse signs and dates here only if they are also applying.",
    condition: "Only if your spouse is applying",
    box: b(5, 14, 158, 600, 188),
  },
  {
    id: "comments",
    section: "sign",
    label: "Extra space for comments",
    plain: "Use this space if you ran out of room, like a 4th job or a 4th source of money. Write which section it belongs to.",
    optional: true,
    box: b(5, 14, 192, 600, 760),
  },
];

// Words and phrases printed on the form, explained in plain language.
export const TERMS: Term[] = [
  { term: "Medicare Savings Program", aliases: ["MSP"], plain: "A Louisiana program that helps pay Medicare costs for people with limited income. There are three levels: QMB, SLMB, and QI." },
  { term: "Medicare", plain: "Federal health insurance for people 65 and older and some people with disabilities." },
  { term: "Medicaid", plain: "A health program run by the state for people with limited income. In Louisiana, Medicaid runs the Medicare Savings Program." },
  { term: "Premiums", aliases: ["premium"], plain: "The amount you pay every month to have insurance. In 2026, the Medicare Part B premium is $202.90 a month." },
  { term: "Co-pays", aliases: ["co-pay", "copays", "copay"], plain: "A set amount you pay each time you see a doctor or get a service." },
  { term: "Deductibles", aliases: ["deductible"], plain: "The amount you must pay yourself before insurance starts paying." },
  { term: "Application for Health Coverage", plain: "A longer Medicaid form for people who do not have Medicare. You do not need it if you have Medicare." },
  { term: "MyMedicaid.la.gov", plain: "Louisiana's Medicaid website. You can apply online there instead of mailing this form." },
  { term: "TTY", aliases: ["TTY Text Telephone"], plain: "A phone service for people who are deaf or hard of hearing. You type instead of talk." },
  { term: "P.O. Box", aliases: ["P.O. box"], plain: "A mailbox you rent at the post office. You can use it as your mailing address." },
  { term: "Medicaid Application Office", plain: "The office in Baton Rouge that receives and reviews mailed applications." },
  { term: "Suffix", plain: "Letters after your last name, like Jr., Sr., or III. Leave it blank if you don't have one." },
  { term: "Social Security number", plain: "Your 9-digit number from Social Security. Write it only on the paper form. Never type it into this guide." },
  { term: "Marital status", plain: "Whether you are single, married, widowed, or divorced/separated." },
  { term: "Widowed", plain: "Your husband or wife has died." },
  { term: "Hispanic or Latino", plain: "A question about your ethnic background. It is optional." },
  { term: "optional", plain: "You can skip this question. Skipping it will not hurt your application." },
  { term: "Race", plain: "A question about your racial background. It is optional, and you can check more than one box." },
  { term: "Tribe", plain: "If you are American Indian or Alaska Native, you can write the name of your tribe. This is optional." },
  { term: "Mailing Address", plain: "Where you get your mail. Medicaid will send letters about your application here." },
  { term: "Home parish", aliases: ["parish"], plain: "Louisiana's word for county. For example: Orleans, Jefferson, or East Baton Rouge." },
  { term: "spouse", aliases: ["Spouse’s", "Spouse's"], plain: "Your husband or wife." },
  { term: "Medicare Claim Number", plain: "The old name for your Medicare Number. It is the 11 letters and numbers on your Medicare card." },
  { term: "Medicare supplement", plain: "Also called Medigap. Extra insurance you buy to help pay what Medicare doesn't cover." },
  { term: "health insurance", plain: "Any plan that helps pay for medical care, like a job or retiree plan." },
  { term: "self-employed", plain: "You work for yourself instead of an employer. For example, you run a small business or do odd jobs." },
  { term: "gross income before taxes", aliases: ["gross income"], plain: "The total amount of money before taxes or anything else is taken out. It is the bigger number." },
  { term: "biweekly", plain: "Every two weeks." },
  { term: "Employer", plain: "The company or person who pays someone to work." },
  { term: "Social Security", plain: "Monthly money from the government for retired or disabled people. It counts as income on this form." },
  { term: "pension", plain: "Monthly money from a past employer after you retire." },
  { term: "worker’s comp", aliases: ["worker's comp"], plain: "Money paid to someone who was hurt on the job." },
  { term: "medical provider", plain: "Anyone who gives you medical care: a doctor, clinic, hospital, or pharmacy." },
  { term: "Dates of service", plain: "The days you actually got the medical care." },
  { term: "Checking accounts", aliases: ["checking"], plain: "A bank account you use to pay bills and write checks." },
  { term: "Savings accounts", plain: "A bank account where you keep money you are saving." },
  { term: "Direct express", plain: "A prepaid debit card that some people use to get federal benefits like Social Security." },
  { term: "Certificates of Deposit", aliases: ["CD"], plain: "Money you leave at a bank for a set time to earn more interest." },
  { term: "Annuities", aliases: ["annuity", "annuities"], plain: "An investment that pays you money over time, often bought from an insurance company." },
  { term: "trusts", plain: "A legal arrangement where someone manages money or property for another person." },
  { term: "stocks", plain: "Shares of ownership in a company." },
  { term: "bonds", plain: "A loan you make to a company or government that pays you back with interest." },
  { term: "retirement accounts", plain: "Savings for retirement, like an IRA or 401(k)." },
  { term: "burial insurance", aliases: ["Life or burial insurance"], plain: "Insurance that pays for funeral costs when you die." },
  { term: "pre-need contract", plain: "A funeral plan you pay for ahead of time with a funeral home." },
  { term: "Safe deposit box", plain: "A locked box you rent at a bank for valuables." },
  { term: "Louisiana Department of Health", aliases: ["LDH"], plain: "The state agency that runs Medicaid and reviews this application." },
  { term: "eligibility", aliases: ["eligible"], plain: "Whether you qualify for a program. Louisiana decides this, not you and not this guide." },
  { term: "verify", plain: "To check that something is true." },
  { term: "penalty of perjury", aliases: ["perjury"], plain: "A legal promise that what you wrote is true. Lying on purpose is a crime." },
  { term: "fraud", plain: "Lying or hiding information on purpose to get benefits." },
  { term: "Fair Hearing", plain: "A formal review if you think Medicaid made a wrong or unfair decision." },
  { term: "Estate Recovery", aliases: ["estate"], plain: "After someone who got Medicaid dies, the state may ask to be paid back for some Medicaid costs from what they leave behind." },
  { term: "hardship waiver", plain: "A request from heirs to skip estate recovery because paying would cause hardship." },
  { term: "remainder beneficiary", plain: "The one who gets what's left of an annuity after the main people named on it." },
  { term: "irrevocable", plain: "Cannot be changed or canceled." },
  { term: "authorized representatives", aliases: ["authorized representative"], plain: "Someone you choose to act for you with Medicaid, like a trusted family member. It uses a separate form." },
  { term: "Child Support Enforcement", plain: "A state office that collects child support. It only matters for parents of children under 19 on Medicaid." },
  { term: "lawful immigrant status", plain: "Being in the U.S. legally as a non-citizen, like a green card holder." },
  { term: "citizenship", plain: "Being a U.S. citizen." },
  { term: "Rights and Responsibilities", plain: "Page 4 of the form. It lists the rules you agree to when you sign." },
  { term: "Home and Community Based Services", aliases: ["HCBS"], plain: "Medicaid care you get at home or in your community instead of a nursing home." },
  { term: "Program for All-Inclusive Care for the Elderly", aliases: ["PACE"], plain: "A Medicaid and Medicare program that helps older adults get care while living at home." },
  { term: "Patient Protection and Affordable Care Act", plain: "The federal health care law passed in 2010, often called the ACA or Obamacare." },
  { term: "consumer reporting agencies", plain: "Companies that keep credit reports, like Equifax or Experian." },
  { term: "BHSF Form 1-MB", plain: "The official form number for this application. BHSF stands for Bureau of Health Services Financing." },
];

// Facts the chatbot may use beyond the form itself. All verified in the research packet.
export const FACTS = `
Programs (Louisiana uses the federal 2026 standards, effective March 1, 2026; LDH Eligibility Manual Z-200):
- QMB (Qualified Medicare Beneficiary): pays Part A and Part B premiums, deductibles, coinsurance, and copays.
- SLMB (Specified Low-Income Medicare Beneficiary): pays the Part B premium.
- QI (Qualifying Individual): pays the Part B premium; you must reapply every year.
Louisiana does NOT count savings or other resources for QMB, SLMB, or QI. Section 8 still asks; answer every row yes or no.
The 2026 Medicare Part B premium is $202.90 per month.
Anyone approved for a Medicare Savings Program automatically gets Extra Help with prescription drug costs.
You can also apply for Extra Help through Social Security. That starts your Louisiana application too, unless you say no.
Many people who get QMB also qualify for full Medicaid. A free counselor can check.
The form does not list required proofs. LDH checks Medicare status and income through its own systems. Applicants should still have these documents nearby to copy answers from: Medicare card, Social Security award letter (benefit before deductions), latest bank statement, pension statement, pay stubs, and any other insurance card.
The Medicare Number (called "Medicare Claim Number" on the form) has 11 characters, letters and numbers. Dashes on the card are not part of it.
How to submit: Mail to Medicaid Application Office, P.O. Box 91278, Baton Rouge, LA 70821-9278. Fax 1-877-523-2987. Online at MyMedicaid.la.gov (LDH Medicaid Self-Service Portal). Phone 1-888-342-6207, Monday to Friday, 8 a.m. to 4:30 p.m., TTY 1-800-220-5404. In person at a local Medicaid office.
Free help: LaSHIP (Louisiana's free Medicare counseling program, Louisiana Department of Insurance) 1-800-259-5300, ldi.la.gov/LaSHIP. Louisiana Answers 1-877-340-9100. Medicaid questions about the form: 1-888-342-6207.
A trusted family member can help. To let someone act for you with Medicaid, there is a separate Medicaid Authorized Representative Form.
`.trim();

export const HELP = {
  laship: { name: "LaSHIP free Medicare counseling", phone: "1-800-259-5300", url: "https://ldi.la.gov/LaSHIP" },
  medicaid: { name: "Louisiana Medicaid", phone: "1-888-342-6207", hours: "Mon–Fri, 8 a.m.–4:30 p.m.", tty: "1-800-220-5404" },
  answers: { name: "Louisiana Answers", phone: "1-877-340-9100" },
};

// Messages from the research packet (section 8), shown to everyone so the app never judges eligibility.
export const MESSAGES = [
  "Not sure if you qualify? Apply anyway. Louisiana makes the decision, and it's free.",
  "Louisiana does not count your savings for these programs.",
  "You can also apply for Extra Help through Social Security. That starts your Louisiana application too.",
  "Many people who get QMB also qualify for full Medicaid. A counselor can check for free.",
];

// Ways to apply and next steps, matching the finish block of Max's form-spec.json.
export const SUBMIT_WAYS = [
  { how: "Mail", detail: "Medicaid Application Office, P.O. Box 91278, Baton Rouge, LA 70821-9278" },
  { how: "Fax", detail: "1-877-523-2987" },
  { how: "Online", detail: "LDH Medicaid Self-Service Portal: sspweb.lameds.ldh.la.gov/selfservice" },
  { how: "Phone", detail: "1-888-342-6207, Monday to Friday, 8 a.m. to 4:30 p.m. (TTY 1-800-220-5404)" },
  { how: "In person", detail: "Any local Medicaid office, Monday to Friday, 8 a.m. to 4:30 p.m." },
];

export const NEXT_STEPS = [
  "Keep a copy of your signed application.",
  "Medicaid will mail you a decision. Watch your mailbox.",
  "If anything changes, call 1-888-342-6207 within 10 days.",
  "Many people who get QMB also qualify for full Medicaid. A free counselor can check.",
];

// For every state other than Louisiana. Based on Medicare.gov "Medicare Savings Programs" (checked 2026-10-26).
export const GENERIC_MESSAGES = [
  "Not sure if you qualify? Apply anyway. Your state makes the decision, and it's free.",
  "Some states don't count certain income or savings, and some have higher limits. Your state will check for you.",
  "You can also apply for Extra Help through Social Security (1-800-772-1213). That starts your state's application too.",
  "People who get a Medicare Savings Program may also qualify for full Medicaid. A free counselor can check.",
];

export const GENERIC_NEXT_STEPS = [
  "Get your state's application from the office listed here, or ask them to mail you one.",
  "Use what you learned here to fill it out on paper, then sign it.",
  "Send it the way your state's office tells you, and keep a copy for yourself.",
  "Your state will mail you a decision. Watch your mailbox.",
];

// Engine fields that share a spot on the page with another question, so they need their own label.
export const EXTRA_SPEC_LABELS: Record<string, string> = {
  s2_home_different: "Is your home address different from your mailing address?",
  s2_home_address: "Home Address (if different)",
  s4_spouse_medicare_number: "Medicare Claim Number (Your Spouse)",
  s4_spouse_other_insurance: "Other health insurance (Your Spouse)",
  s4_medicare_number: "Medicare Claim Number (You)",
  s4_other_insurance: "Other health insurance (You)",
  rights_read: "Your Rights and Responsibilities",
};

export const DOCUMENTS: { name: string; why: string; look: string; doc?: DocId }[] = [
  {
    name: "Medicare card",
    why: "Your name and Medicare Number (Sections 1 and 4)",
    look: "A red, white, and blue card with your name, your Medicare Number, and when Part A and Part B started.",
    doc: "medicare_card",
  },
  {
    name: "Social Security award letter",
    why: "Your monthly benefit before deductions (Section 6)",
    look: "A letter from Social Security. It shows your full monthly benefit, the Medicare Part B amount taken out, and what you get after that.",
    doc: "award_letter",
  },
  {
    name: "Latest bank statement",
    why: "Bank name and balance (Section 8)",
    look: "Shows the bank's name, whose account it is, the dates it covers, and the ending balance.",
    doc: "bank_statement",
  },
  {
    name: "Pension statement or pay stubs",
    why: "If you have them (Sections 5 and 6)",
    look: "Shows who pays you and how much before taxes.",
  },
  {
    name: "Other insurance card",
    why: "If you have Medigap or a retiree plan (Section 4)",
    look: "Any health insurance card besides Medicare.",
  },
];

export const SUGGESTED_QUESTIONS = [
  "What counts as income?",
  "Do I need to list my savings?",
  "Where do I find my Medicare number?",
  "What happens after I mail this?",
  "Can I fill out the form on this website?",
];

export function sectionById(id: string) {
  return SECTIONS.find((s) => s.id === id);
}

function inBox(box: Box, page: number, x: number, y: number) {
  return (box.page === page || box.page === 0) && x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
}

export function fieldAt(page: number, x: number, y: number) {
  const hits = FIELDS.filter((f) => inBox(f.box, page, x, y));
  hits.sort((a, c) => area(a.box) - area(c.box));
  return hits[0];
}

export function sectionAt(page: number, x: number, y: number) {
  return SECTIONS.find((s) => inBox(s.box, page, x, y));
}

function area(box: Box) {
  return (box.x1 - box.x0) * (box.y1 - box.y0);
}
