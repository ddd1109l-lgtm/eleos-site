"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import specJson from "@/contract/form-spec.json";
import { report, stripClientOnly, type ProgressReport } from "@/contract/engine";
import type { Field as SpecField, FormSpec, Progress } from "@/contract/spec-types";

// Progress is decided only by Max's shared engine (src/contract/engine.ts, synced from
// api/contract with `npm run sync-contract`). This file just connects it to our page layout.

export const SPEC = specJson as unknown as FormSpec;
export type { Progress, ProgressReport, SpecField };

/** Our clickable regions (src/data/form.ts) -> the engine fields they explain, in form order. */
const LOCAL_TO_SPEC: Record<string, string[]> = {
  preferred_language: ["cover_language"],
  name: ["s1_name"],
  suffix: ["s1_name"],
  ssn: ["s1_ssn"],
  dob: ["s1_dob"],
  sex: ["s1_sex"],
  marital_status: ["s1_marital_status"],
  hispanic: ["s1_hispanic"],
  race: ["s1_race"],
  mailing_address: ["s2_mailing_address"],
  home_address: ["s2_home_different", "s2_home_address"],
  email: ["s2_email"],
  parish: ["s2_parish"],
  phones: ["s2_phones"],
  married_living: ["s3_married_living_together"],
  spouse_name: ["s3_spouse_name"],
  spouse_ssn: ["s3_spouse_ssn"],
  spouse_dob: ["s3_spouse_dob"],
  spouse_sex: ["s3_spouse_sex"],
  spouse_hispanic: ["s3_spouse_hispanic"],
  spouse_race: ["s3_spouse_race"],
  spouse_apply: ["s3_spouse_applying"],
  mbi: ["s4_medicare_number", "s4_spouse_medicare_number"],
  other_insurance: ["s4_other_insurance", "s4_spouse_other_insurance"],
  anyone_work: ["s5_anyone_works"],
  worker_name: ["s5_worker_name"],
  employer_name: ["s5_employer_name"],
  employer_phone: ["s5_employer_phone"],
  self_employed: ["s5_self_employed"],
  job_pay: ["s5_gross_pay"],
  job_frequency: ["s5_pay_frequency"],
  other_money_any: ["s6_other_money"],
  receiver: ["s6_who_receives"],
  source_from: ["s6_source"],
  source_amount: ["s6_gross_amount"],
  source_frequency: ["s6_frequency"],
  medical_any: ["s7_medical_bills"],
  care_who: ["s7_who_received_care"],
  provider: ["s7_provider"],
  provider_phone: ["s7_provider_phone"],
  service_dates: ["s7_dates"],
  total_cost: ["s7_total_cost"],
  checking: ["s8_checking"],
  savings: ["s8_savings"],
  direct_express: ["s8_direct_express"],
  vehicle: ["s8_vehicle"],
  other_vehicles: ["s8_other_vehicles"],
  property: ["s8_other_property"],
  cd: ["s8_cd"],
  investments: ["s8_investments"],
  life_insurance: ["s8_life_burial_insurance"],
  burial_money: ["s8_burial_funds"],
  safe_deposit: ["s8_safe_deposit"],
  other_assets: ["s8_other"],
  r_permission: ["rights_read"],
  r_law: ["rights_read"],
  r_voluntary: ["rights_read"],
  r_check: ["rights_read"],
  r_sources: ["rights_read"],
  r_ssn_use: ["rights_read"],
  r_changes: ["rights_read"],
  r_fraud: ["rights_read"],
  r_citizenship: ["rights_read"],
  r_third_party: ["rights_read"],
  r_child_support: ["rights_read"],
  r_estate: ["rights_read"],
  r_annuities: ["rights_read"],
  r_hearing: ["rights_read"],
  r_discrimination: ["rights_read"],
  signature: ["sign_applicant"],
  spouse_signature: ["sign_spouse"],
  comments: ["sign_comments"],
};

/** Engine field -> the region of the page that shows it. */
const SPEC_TO_LOCAL: Record<string, string> = {};
for (const [local, ids] of Object.entries(LOCAL_TO_SPEC)) for (const id of ids) SPEC_TO_LOCAL[id] ??= local;

/** Engine section ids match ours except the cover page. */
export const localSectionId = (specSection: string) => (specSection === "cover" ? "start" : specSection);

export const specFieldsFor = (localId?: string) =>
  (localId ? (LOCAL_TO_SPEC[localId] ?? []) : []).map((id) => SPEC.fields.find((f) => f.id === id)!).filter(Boolean);

export const localFieldFor = (specId: string) => SPEC_TO_LOCAL[specId];

export const specField = (id: string) => SPEC.fields.find((f) => f.id === id);

/** What may leave the browser: clientOnly answers (and the fields they unlock) are removed. */
export const shareableProgress = (p: Progress) => stripClientOnly(SPEC, p) as Progress;

const EMPTY: Progress = { answers: {}, done: [] };
const KEY = "eleos-progress-v1";

/** A finished application for the demo persona (Dorothy), used by ?demo=finish. */
export function demoFinishedProgress(): Progress {
  const answers: Progress["answers"] = {
    s2_home_different: "no",
    s3_married_living_together: "no",
    s5_anyone_works: "no",
    s6_other_money: "yes",
    s7_medical_bills: "no",
  };
  const r = report(SPEC, { answers, done: [] });
  const done = SPEC.fields.filter((f) => f.kind !== "gate" && r.statuses[f.id] !== "hidden").map((f) => f.id);
  return { answers, done };
}

export function loadProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved === "object") return { answers: saved.answers ?? {}, done: saved.done ?? [] };
  } catch {}
  return EMPTY;
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY);

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("demo") === "finish";
    // Read after mount so the server render and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(demo ? demoFinishedProgress() : loadProgress());
  }, []);

  const save = useCallback((next: Progress) => {
    setProgress(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    return report(SPEC, next);
  }, []);

  /** Gate answer (yes/no). Returns the engine report for the new progress. */
  const answer = useCallback(
    (id: string, value: "yes" | "no") => save({ ...progress, answers: { ...progress.answers, [id]: value } }),
    [progress, save],
  );

  /** "I wrote it", "Skip", "I've read it". */
  const markDone = useCallback(
    (id: string) => save({ ...progress, done: progress.done.includes(id) ? progress.done : [...progress.done, id] }),
    [progress, save],
  );

  const reset = useCallback(() => save(EMPTY), [save]);

  const engine = useMemo(() => report(SPEC, progress), [progress]);
  return { progress, engine, answer, markDone, reset };
}
