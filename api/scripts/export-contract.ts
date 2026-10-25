/**
 * Writes the frontend contract: the form spec and real example responses from the API (mock mode).
 *   npm run contract
 * Leigh copies contract/ into her app so it runs with no backend.
 */
process.env.MODEL_PROVIDER = "mock";
import { mkdirSync, writeFileSync } from "node:fs";

const { app } = await import("../src/app.js");
const { formSpec } = await import("../src/spec/form-1mb.js");

const out = "contract";
mkdirSync(`${out}/fixtures`, { recursive: true });
const write = (p: string, d: unknown) => writeFileSync(`${out}/${p}`, JSON.stringify(d, null, 2) + "\n");
const post = async (path: string, body: unknown) =>
  (await app.request(`/api${path}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } })).json();

write("form-spec.json", formSpec);
write("fixtures/health.json", await (await app.request("/api/health")).json());
write("fixtures/counselors.json", await (await app.request("/api/counselors")).json());
write("fixtures/progress-start.json", await post("/progress", { progress: { answers: {}, done: [] } }));
write("fixtures/progress-dorothy-midway.json", await post("/progress", {
  progress: { answers: { s2_home_different: "no", s3_married_living_together: "no", s5_anyone_works: "no", s6_other_money: "yes" },
    done: ["cover_language", "s1_name", "s1_ssn", "s1_dob", "s1_sex", "s1_marital_status", "s2_mailing_address", "s2_parish", "s2_phones", "s4_medicare_number", "s4_other_insurance", "s6_who_receives", "s6_source"] },
}));
const dorothy = { answers: { s6_other_money: "yes" }, done: [] };
write("fixtures/chat-show-aid.json", await post("/chat", { fieldId: "s6_gross_amount", progress: dorothy, messages: [{ role: "user", content: "Where do I find this?" }] }));
write("fixtures/chat-ssn-masked.json", await post("/chat", { fieldId: "s1_ssn", progress: dorothy, messages: [{ role: "user", content: "it's 123-45-6789" }] }));
write("fixtures/chat-handoff.json", await post("/chat", { fieldId: "s6_gross_amount", progress: dorothy, messages: [{ role: "user", content: "Do I qualify?" }] }));
write("fixtures/filter.json", await post("/filter", { text: "my medicare number is 1EG4-TE5-MK73" }));
console.log(`Wrote ${out}/form-spec.json and ${out}/fixtures/*.json`);
