// Where to apply for a Medicare Savings Program in each state. Every state runs its own program
// and its own application. Agency names, websites and phone numbers come from Medicaid.gov,
// "Where Can People Get Help With Medicaid & CHIP?" (checked 2026-10-26). National numbers from
// Medicare.gov "Talk to someone" (checked 2026-10-26).

export type UsState = {
  code: string;
  name: string;
  agency: string;
  url: string;
  phone: string;
  tty?: string;
  /** True when this app has the state's own application built in. */
  hasForm?: boolean;
};

export const NATIONAL = {
  medicare: { phone: "1-800-633-4227", label: "1-800-MEDICARE", tty: "1-877-486-2048" },
  ship: { url: "https://www.shiphelp.org/" },
  ssa: { phone: "1-800-772-1213" },
  medicaidGov: "https://www.medicaid.gov/about-us/where-can-people-get-help-medicaid-chip",
};

export const STATES: UsState[] = [
  { code: "AL", name: "Alabama", agency: "Alabama Medicaid", url: "https://medicaid.alabama.gov/", phone: "334-242-5000" },
  { code: "AK", name: "Alaska", agency: "Alaska Medicaid", url: "https://health.alaska.gov/en/services/division-of-public-assistance-services/apply-for-medicaid/", phone: "800-478-7778", tty: "711" },
  { code: "AZ", name: "Arizona", agency: "Arizona Health Care Cost Containment System (AHCCCS)", url: "https://azahcccs.gov/", phone: "800-654-8713" },
  { code: "AR", name: "Arkansas", agency: "Arkansas Medicaid", url: "https://humanservices.arkansas.gov/", phone: "800-482-8988" },
  { code: "CA", name: "California", agency: "Department of Health Care Services (Medi-Cal)", url: "https://www.dhcs.ca.gov/", phone: "800-541-5555" },
  { code: "CO", name: "Colorado", agency: "Health First Colorado", url: "https://www.healthfirstcolorado.com/", phone: "800-221-3943" },
  { code: "CT", name: "Connecticut", agency: "Connecticut Medicaid (HUSKY Health)", url: "https://portal.ct.gov/Services/Health-and-Human-Services", phone: "855-626-6632" },
  { code: "DE", name: "Delaware", agency: "Delaware Medicaid & Medical Assistance", url: "https://dhss.delaware.gov/dmma/", phone: "866-843-7212", tty: "1-855-889-4325" },
  { code: "DC", name: "District of Columbia", agency: "DC Medicaid", url: "https://districtdirect.dc.gov/ua/", phone: "855-532-5465", tty: "711" },
  { code: "FL", name: "Florida", agency: "Florida Agency for Health Care Administration", url: "https://ahca.myflorida.com/", phone: "888-419-3456", tty: "800-955-8771" },
  { code: "GA", name: "Georgia", agency: "Georgia Medicaid", url: "https://dch.georgia.gov/", phone: "877-423-4746" },
  { code: "HI", name: "Hawaii", agency: "Hawaii Med-QUEST Division", url: "https://medquest.hawaii.gov/", phone: "800-316-8005", tty: "711" },
  { code: "ID", name: "Idaho", agency: "Idaho Department of Health & Welfare", url: "https://healthandwelfare.idaho.gov/", phone: "877-456-1233" },
  { code: "IL", name: "Illinois", agency: "Illinois Department of Healthcare and Family Services", url: "https://hfs.illinois.gov/medicalclients.html", phone: "800-843-6154", tty: "1-866-324-5553" },
  { code: "IN", name: "Indiana", agency: "Indiana Family and Social Services Administration", url: "https://www.in.gov/fssa/dfr/", phone: "800-403-0864" },
  { code: "IA", name: "Iowa", agency: "Iowa Department of Health and Human Services", url: "https://hhs.iowa.gov/", phone: "800-338-8366" },
  { code: "KS", name: "Kansas", agency: "KanCare", url: "https://kancare.ks.gov/", phone: "800-792-4884" },
  { code: "KY", name: "Kentucky", agency: "Kentucky Cabinet for Health and Family Services", url: "https://chfs.ky.gov/", phone: "855-306-8959" },
  { code: "LA", name: "Louisiana", agency: "Louisiana Department of Health (Healthy Louisiana)", url: "https://ldh.la.gov/subhome/48", phone: "888-342-6207", tty: "800-220-5404", hasForm: true },
  { code: "ME", name: "Maine", agency: "Maine Department of Health and Human Services (MaineCare)", url: "https://www.maine.gov/dhhs/", phone: "855-797-4357" },
  { code: "MD", name: "Maryland", agency: "Maryland Department of Health", url: "https://health.maryland.gov/Pages/Home.aspx", phone: "855-642-8572", tty: "711" },
  { code: "MA", name: "Massachusetts", agency: "MassHealth", url: "https://www.mass.gov/topics/masshealth", phone: "800-841-2900", tty: "711" },
  { code: "MI", name: "Michigan", agency: "Michigan Department of Health & Human Services", url: "https://www.michigan.gov/mdhhs/", phone: "833-599-6444", tty: "866-501-5656" },
  { code: "MN", name: "Minnesota", agency: "Minnesota Department of Human Services", url: "https://mn.gov/dhs/", phone: "800-657-3672" },
  { code: "MS", name: "Mississippi", agency: "Mississippi Division of Medicaid", url: "https://medicaid.ms.gov/medicaid-coverage/", phone: "800-421-2408" },
  { code: "MO", name: "Missouri", agency: "Missouri Department of Social Services", url: "https://dss.mo.gov/", phone: "573-751-3425" },
  { code: "MT", name: "Montana", agency: "Montana Department of Public Health and Human Services", url: "https://dphhs.mt.gov/", phone: "800-362-8312" },
  { code: "NE", name: "Nebraska", agency: "Nebraska Department of Health and Human Services", url: "https://dhhs.ne.gov/Pages/default.aspx", phone: "855-632-7633" },
  { code: "NV", name: "Nevada", agency: "Nevada Department of Health and Human Services", url: "https://dhhs.nv.gov/", phone: "877-638-3472" },
  { code: "NH", name: "New Hampshire", agency: "New Hampshire Department of Health and Human Services", url: "https://www.dhhs.nh.gov/", phone: "844-275-3447", tty: "1-800-735-2964" },
  { code: "NJ", name: "New Jersey", agency: "New Jersey Department of Human Services", url: "https://www.state.nj.us/humanservices/", phone: "800-701-0710" },
  { code: "NM", name: "New Mexico", agency: "New Mexico Human Services Department", url: "https://www.hsd.state.nm.us/", phone: "800-283-4465" },
  { code: "NY", name: "New York", agency: "New York State Department of Health", url: "https://www.health.ny.gov/health_care/medicaid/", phone: "855-355-5777" },
  { code: "NC", name: "North Carolina", agency: "North Carolina Medicaid", url: "https://medicaid.ncdhhs.gov/", phone: "888-245-0179" },
  { code: "ND", name: "North Dakota", agency: "North Dakota Health and Human Services", url: "https://www.applyforhelp.nd.gov/", phone: "800-755-2604" },
  { code: "OH", name: "Ohio", agency: "Ohio Department of Medicaid", url: "https://medicaid.ohio.gov/", phone: "800-324-8680" },
  { code: "OK", name: "Oklahoma", agency: "Oklahoma Health Care Authority", url: "https://oklahoma.gov/ohca.html", phone: "800-987-7767" },
  { code: "OR", name: "Oregon", agency: "ONE Oregon (Oregon Health Plan)", url: "https://one.oregon.gov/", phone: "800-699-9075" },
  { code: "PA", name: "Pennsylvania", agency: "Pennsylvania Department of Human Services", url: "https://www.dhs.pa.gov/", phone: "800-692-7462", tty: "800-451-5886" },
  { code: "RI", name: "Rhode Island", agency: "Rhode Island Executive Office of Health and Human Services", url: "https://eohhs.ri.gov/", phone: "855-840-4774" },
  { code: "SC", name: "South Carolina", agency: "South Carolina Healthy Connections Medicaid", url: "https://www.scdhhs.gov/", phone: "888-549-0820" },
  { code: "SD", name: "South Dakota", agency: "South Dakota Department of Social Services", url: "https://dss.sd.gov/", phone: "800-597-1603" },
  { code: "TN", name: "Tennessee", agency: "TennCare", url: "https://www.tn.gov/tenncare/contact-us.html", phone: "855-259-0701" },
  { code: "TX", name: "Texas", agency: "Texas Health and Human Services", url: "https://hhs.texas.gov/", phone: "800-335-8957" },
  { code: "UT", name: "Utah", agency: "Utah Medicaid", url: "https://medicaid.utah.gov/", phone: "866-435-7414" },
  { code: "VT", name: "Vermont", agency: "Vermont Health Connect", url: "https://portal.healthconnect.vermont.gov/VTHBELand/welcome.action", phone: "855-899-9600", tty: "888-834-7898" },
  { code: "VA", name: "Virginia", agency: "Virginia Department of Medical Assistance Services (Cover Virginia)", url: "https://www.dmas.virginia.gov/", phone: "833-522-5582" },
  { code: "WA", name: "Washington", agency: "Washington State Health Care Authority", url: "https://www.hca.wa.gov/", phone: "800-562-3022" },
  { code: "WV", name: "West Virginia", agency: "West Virginia Department of Human Services", url: "https://dhhr.wv.gov/", phone: "877-716-1212" },
  { code: "WI", name: "Wisconsin", agency: "Wisconsin Department of Health Services", url: "https://www.dhs.wisconsin.gov/", phone: "800-362-3002" },
  { code: "WY", name: "Wyoming", agency: "Wyoming Department of Health", url: "https://health.wyo.gov/", phone: "855-294-2127" },
];

export const DEFAULT_STATE = "LA";

export const stateByCode = (code?: string) => STATES.find((s) => s.code === code) ?? STATES.find((s) => s.code === DEFAULT_STATE)!;

const norm = (s: string) => s.toLowerCase().trim();

export function searchStates(query: string): UsState[] {
  const q = norm(query);
  if (!q) return STATES;
  return STATES.map((s) => ({ s, score: norm(s.name) === q || norm(s.code) === q ? 0 : norm(s.name).startsWith(q) ? 1 : norm(s.name).includes(q) ? 2 : 9 }))
    .filter((x) => x.score < 9)
    .sort((a, b) => a.score - b.score)
    .map((x) => x.s);
}

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return digits.length === 10 ? `tel:+1${digits}` : `tel:${digits}`;
}
