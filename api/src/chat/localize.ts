/**
 * Fixed text the server writes itself, in the app's built-in languages. English comes from the spec.
 * Translations are plain-language drafts; have a native speaker check them before launch.
 */
import type { FormSpec } from "../spec/types.js";

export type LangCode = "en" | "es" | "vi" | "fr" | "ht";
type Translated = Record<Exclude<LangCode, "en">, string>;

/** Display names for spec.documents, so a leaked id ("ss_award_letter") reads as the document's name. */
export const DOCUMENT_NAMES: Record<string, Translated> = {
  medicare_card: { es: "tarjeta de Medicare", vi: "thẻ Medicare", fr: "carte Medicare", ht: "kat Medicare" },
  ss_award_letter: {
    es: "carta de beneficios del Seguro Social",
    vi: "thư quyết định trợ cấp An Sinh Xã Hội",
    fr: "lettre d'attribution de la Sécurité sociale",
    ht: "lèt benefis Sekirite Sosyal",
  },
  bank_statement: { es: "estado de cuenta bancario más reciente", vi: "bảng sao kê ngân hàng gần nhất", fr: "relevé bancaire le plus récent", ht: "dènye relve bank" },
  pension_statement: { es: "estado de cuenta de la pensión", vi: "bảng kê lương hưu", fr: "relevé de pension", ht: "relve pansyon" },
  pay_stubs: { es: "talones de pago recientes", vi: "phiếu lương gần đây", fr: "bulletins de paie récents", ht: "souch peman resan" },
  other_insurance_card: { es: "tarjeta de otro seguro", vi: "thẻ bảo hiểm khác", fr: "carte d'une autre assurance", ht: "kat lòt asirans" },
  medical_bills: {
    es: "facturas médicas de los últimos 3 meses",
    vi: "hóa đơn y tế trong 3 tháng qua",
    fr: "factures médicales des 3 derniers mois",
    ht: "bòdwo medikal 3 dènye mwa yo",
  },
  vehicle_title: { es: "título o registro del vehículo", vi: "giấy chủ quyền hoặc đăng ký xe", fr: "titre ou carte grise du véhicule", ht: "tit oswa anrejistreman machin nan" },
  insurance_policies: {
    es: "pólizas de seguro de vida o de entierro",
    vi: "hợp đồng bảo hiểm nhân thọ hoặc mai táng",
    fr: "contrats d'assurance vie ou obsèques",
    ht: "kontra asirans lavi oswa lantèman",
  },
};

export function documentName(spec: FormSpec, id: string, lang: LangCode): string | undefined {
  const doc = spec.documents.find((d) => d.id === id);
  if (!doc) return undefined;
  return lang === "en" ? doc.name : (DOCUMENT_NAMES[id]?.[lang] ?? doc.name);
}

type NoticeKind = "ssn" | "mbi" | "both";

/** Same three notices filterText writes in English. */
const PRIVACY_NOTICE: Record<Exclude<LangCode, "en">, Record<NoticeKind, string>> = {
  es: {
    ssn: "No necesita decirme su número de Seguro Social. Escríbalo directamente en el formulario de papel. Lo borré de este chat.",
    mbi: "No necesita decirme su número de Medicare. Escríbalo directamente en el formulario de papel. Lo borré de este chat.",
    both: "No necesita decirme sus números de Seguro Social o de Medicare. Escríbalos directamente en el formulario de papel. Los borré de este chat.",
  },
  vi: {
    ssn: "Quý vị không cần cho tôi biết số An Sinh Xã Hội. Hãy viết thẳng vào mẫu đơn giấy. Tôi đã xóa số đó khỏi cuộc trò chuyện này.",
    mbi: "Quý vị không cần cho tôi biết số Medicare. Hãy viết thẳng vào mẫu đơn giấy. Tôi đã xóa số đó khỏi cuộc trò chuyện này.",
    both: "Quý vị không cần cho tôi biết số An Sinh Xã Hội hoặc số Medicare. Hãy viết thẳng vào mẫu đơn giấy. Tôi đã xóa các số đó khỏi cuộc trò chuyện này.",
  },
  fr: {
    ssn: "Vous n'avez pas besoin de me donner votre numéro de Sécurité sociale. Écrivez-le directement sur le formulaire papier. Je l'ai retiré de cette conversation.",
    mbi: "Vous n'avez pas besoin de me donner votre numéro Medicare. Écrivez-le directement sur le formulaire papier. Je l'ai retiré de cette conversation.",
    both: "Vous n'avez pas besoin de me donner vos numéros de Sécurité sociale ou Medicare. Écrivez-les directement sur le formulaire papier. Je les ai retirés de cette conversation.",
  },
  ht: {
    ssn: "Ou pa bezwen ban mwen nimewo Sekirite Sosyal ou. Ekri l dirèkteman sou fòm papye a. Mwen retire l nan chat sa a.",
    mbi: "Ou pa bezwen ban mwen nimewo Medicare ou. Ekri l dirèkteman sou fòm papye a. Mwen retire l nan chat sa a.",
    both: "Ou pa bezwen ban mwen nimewo Sekirite Sosyal oswa Medicare ou. Ekri yo dirèkteman sou fòm papye a. Mwen retire yo nan chat sa a.",
  },
};

/** The privacy notice in the reply language; for English (or nothing masked) keep what filterText wrote. */
export function localizeNotice(notice: string | null, kinds: ("ssn" | "mbi")[], lang: LangCode): string | null {
  if (notice === null || lang === "en" || kinds.length === 0) return notice;
  const kind: NoticeKind = kinds.length === 2 ? "both" : kinds[0];
  return PRIVACY_NOTICE[lang][kind];
}

/** The fixed sentence after the field's plain explanation when the model is unavailable. */
const FALLBACK: Record<LangCode, string> = {
  en: "I'm having trouble answering more right now. A free counselor can help.",
  es: "Ahora mismo tengo problemas para responder más. Un consejero gratuito puede ayudarle.",
  vi: "Hiện tôi đang gặp trục trặc nên chưa thể trả lời thêm. Một chuyên viên tư vấn miễn phí có thể giúp quý vị.",
  fr: "J'ai du mal à répondre pour le moment. Un conseiller gratuit peut vous aider.",
  ht: "Mwen gen pwoblèm pou m reponn plis kounye a. Yon konseye gratis ka ede w.",
};

export function fallbackText(lang: LangCode): string {
  return FALLBACK[lang];
}
