// Each state's own application, saved from the state's official website (checked 2026-10-26).
// States without a downloadable application use CMS's federal model Medicare Savings Program
// application as a practice form, and the app says so. Louisiana has the hand-checked guide.

export type StateForm = {
  state: string;
  pdf: string;
  title: string;
  formId: string;
  revision?: string;
  source: string;
  /** True for the federal model form used as practice for states without a downloadable application. */
  model?: boolean;
  /** True when the form is the state's full Medicaid application, which also covers the programs. */
  general?: boolean;
};

export const CHECKED_ON = "2026-10-26";

const MODEL: Omit<StateForm, "state"> = {
  pdf: "/forms/US.pdf",
  title: "Medicare Savings Program model application",
  formId: "CMS model application",
  source: "https://www.cms.gov/files/document/mspmodelapplication.pdf",
  model: true,
};

const FORMS: Record<string, Omit<StateForm, "state">> = {
  DC: {
    pdf: "/forms/DC.pdf",
    title: "Medicare Savings Program (QMB) Application",
    formId: "DC QMB Application",
    revision: "Rev. 12/27/18",
    source: "https://dcoa.dc.gov/sites/default/files/dc/sites/dcoa/service_content/attachments/QMB%20Application.pdf",
  },
  GA: {
    pdf: "/forms/GA.pdf",
    title: "Georgia Application for Medicaid & Medicare Savings for Qualified Beneficiaries",
    formId: "Form 700",
    revision: "Rev. 04/2026",
    source: "https://pamms.dhs.ga.gov/dfcs/medicaid/_attachments/form-700-lp.pdf",
  },
  IN: {
    pdf: "/forms/IN.pdf",
    title: "Medicare Savings Program Application",
    formId: "State Form 49228",
    revision: "R5 / 8-11",
    source: "https://secure.in.gov/ship/files/MSP_Application.pdf",
  },
  KS: {
    pdf: "/forms/KS.pdf",
    title: "Application/Redetermination – Medicare Savings Plans",
    formId: "ES-3100.8",
    revision: "08-13 (KanCare may have a newer version)",
    source: "https://khap.kdhe.ks.gov/kfmam/policyDocs/ES-3100.8%20Medicare%20Savings%20Program%20application.pdf",
  },
  KY: {
    pdf: "/forms/KY.pdf",
    title: "Kentucky Medicaid and Medicare Savings Program Application",
    formId: "MAP-205",
    revision: "03/2024",
    source: "https://www.chfs.ky.gov/agencies/dms/MAPForms/Map205English.pdf",
  },
  NE: {
    pdf: "/forms/NE.pdf",
    title: "Application for Nebraska Medicaid for Aged and Disabled",
    formId: "MILTC-64",
    revision: "1/2020",
    source: "https://public-dhhs.ne.gov/Forms/DisplayPDF.aspx?item=3114",
    general: true,
  },
  NV: {
    pdf: "/forms/NV.pdf",
    title: "Application for Health Insurance",
    formId: "2960-EG",
    revision: "10/24",
    source: "https://dwss.nv.gov/uploadedFiles/dwssnvgov/content/Medical/2960-EG%20Application%20for%20Health%20Insurance%2010-24%20ADA.pdf",
    general: true,
  },
  NJ: {
    pdf: "/forms/NJ.pdf",
    title: "NJSave Application (includes QMB, SLMB and QI)",
    formId: "NJSave",
    source: "https://www.nj.gov/humanservices/doas/forms/NJSaveApp.pdf",
  },
  NM: {
    pdf: "/forms/NM.pdf",
    title: "Application for Assistance (includes the Medicare Savings Program)",
    formId: "HCA 100",
    revision: "5.1.2026",
    source: "https://www.hca.nm.gov/wp-content/uploads/HCA-100-English-Application-for-Assistance-05.01.2026.pdf",
    general: true,
  },
  NY: {
    pdf: "/forms/NY.pdf",
    title: "Medicare Savings Program Application",
    formId: "DOH-4328",
    revision: "11/23",
    source: "https://www.health.ny.gov/forms/doh-4328.pdf",
  },
  SD: {
    pdf: "/forms/SD.pdf",
    title: "Application for Medicare Savings Programs",
    formId: "DSS-EA-270",
    revision: "11-2023",
    source: "https://dss.sd.gov/formsandpubs/docs/MEDELGBLTY/270Medicaresavingsapplication.pdf",
  },
  UT: {
    pdf: "/forms/UT.pdf",
    title: "Application for SNAP, Financial Assistance, Child Care, and Medical Assistance",
    formId: "DWS-ESD 61APP",
    revision: "Rev. 01/2026",
    source: "https://medicaid.utah.gov/Documents/pdfs/61APP_English.pdf",
    general: true,
  },
  WA: {
    pdf: "/forms/WA.pdf",
    title: "Washington Apple Health Application for Aged, Blind, Disabled/Long-Term Services and Supports",
    formId: "HCA 18-005",
    revision: "1/23",
    source: "https://hca.wa.gov/assets/free-or-low-cost/18-005.pdf",
    general: true,
  },
  WI: {
    pdf: "/forms/WI.pdf",
    title: "Wisconsin Medicaid for the Elderly, Blind or Disabled Application",
    formId: "F-10101",
    revision: "05/2026",
    source: "https://www.dhs.wisconsin.gov/forms/f1/f10101.pdf",
    general: true,
  },
};

export function formForState(code: string): StateForm {
  return { state: code, ...(FORMS[code] ?? MODEL) };
}

export const hasOwnForm = (code: string) => code === "LA" || code in FORMS;
