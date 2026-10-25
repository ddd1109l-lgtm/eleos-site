/** Box on an image, in percent of image width/height (0-100), so it scales on any screen. */
export type Box = { x: number; y: number; w: number; h: number };

export type Aid = {
  id: string;
  /** Path under the frontend's /aids folder, e.g. "form/page-2.png" or "docs/sample_award_letter.png" */
  image: string;
  box: Box;
  /** One sentence for voice mode and screen readers */
  spoken: string;
  /** Short label shown under the image */
  caption: string;
  /** true = coordinates are a rough guess; someone must mark the real box */
  placeholder: boolean;
};

export type Condition =
  | { field: string; equals: "yes" | "no" }
  | { all: Condition[] }
  | { any: Condition[] };

/**
 * gate   - yes/no the user taps in the app; controls which fields show. Never sensitive identifiers.
 * write  - the user writes the answer on the paper form, then taps "Done"
 * row    - one row of the Section 8 asset table (yes/no, who owns, describe, worth), written on paper
 * info   - read-only step (Rights and Responsibilities)
 * sign   - signature + date on paper
 */
export type FieldKind = "gate" | "write" | "row" | "info" | "sign";

/**
 * none      - normal
 * id_number - SSN or Medicare number: app tells the user to write it on paper and never type or say it
 * health    - Section 7: the model never asks for or discusses details
 * account   - Section 8 money rows: don't type account numbers or balances
 */
export type Sensitivity = "none" | "id_number" | "health" | "account";

export type Field = {
  id: string;
  section: string;
  /** Wording as printed on BHSF Form 1-MB Rev. 3/22 */
  label: string;
  /** Plain-language explanation, about an 8th-grade reading level */
  plain: string;
  kind: FieldKind;
  /** Visible + required -> must be done before the app shows Finish */
  required: boolean;
  condition: Condition | null;
  sensitive: Sensitivity;
  /** Document ids (see FormSpec.documents) where the answer can be found */
  sourceDocs: string[];
  /** Aid ids the model may show for this field (show_aid is rejected for anything else) */
  aids: string[];
  page: number;
  citation: string;
  /** Extra one-line hints, e.g. "Use the amount before Medicare is taken out" */
  tips?: string[];
  /** Field exists only in the app (e.g. a branching question the paper form implies) */
  appOnly?: boolean;
  /** For job / income / expense columns: "Use one column per job, up to 3" */
  repeatNote?: string;
};

export type Section = { id: string; number: string; title: string; page: number; sensitive?: Sensitivity };

export type DocumentRef = {
  id: string;
  name: string;
  whatItLooksLike: string;
  answers: string[];
  /** Mock image for the gather screen, stamped SAMPLE. null = no mock (e.g. medical bills) */
  sampleImage: string | null;
  whoNeedsIt: string;
};

export type Knowledge = { id: string; text: string; citation: string };

export type Finish = {
  waysToApply: { method: string; detail: string }[];
  nextSteps: string[];
};

export type FormSpec = {
  id: string;
  title: string;
  form: string;
  revision: string;
  jurisdiction: string;
  checkedOn: string;
  sourceUrl: string;
  pages: { number: number; image: string; contents: string }[];
  documents: DocumentRef[];
  sections: Section[];
  fields: Field[];
  aids: Aid[];
  knowledge: Knowledge[];
  finish: Finish;
};

/** What the browser keeps in localStorage and sends with each request. No personal data. */
export type Progress = {
  /** gate answers only */
  answers: Record<string, "yes" | "no">;
  /** ids of write/row/info/sign fields the user marked done */
  done: string[];
};
