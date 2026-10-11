import { ADDRESS, LEGAL_CONFIG, ownersLine, vatImpressumLine } from "./config";
import type { LegalDoc } from "./types";

// Impressum (§ 5 DDG). German = authoritative text, English = translation.
//
// Changes against the previous version (see PR description):
//  - § 5 TMG -> § 5 DDG (Digitale-Dienste-Gesetz replaced the TMG on 14 May 2024).
//  - EU ODR platform paragraph removed: the platform was switched off on
//    20 July 2025 (Regulation (EU) 2024/3228), the link duty no longer exists.
//  - "Professional designation: Therapist/Coach / State where the title was
//    awarded" removed. That block only belongs in an Impressum for REGULATED
//    professions (Kammer/Aufsichtsbehörde, Berufsrecht). The site shows no
//    Heilpraktiker licence, so no professional-title claim is made. Owners
//    confirmed (2026-10-11): no Heilpraktiker licence; Richa's certificates
//    (yoga trainer, Reiki Master, past life regression therapist, NLP coach,
//    tarot, astrology) and Riju's (yoga trainer) are not regulated titles.
//    TODO(owner)/LEGAL-REVIEW: re-add such a block ONLY IF a regulated title
//    applies (e.g. Heilpraktiker/Heilpraktikerin: Berufsbezeichnung, Staat der
//    Verleihung, zuständige Behörde/Gesundheitsamt, berufsrechtliche Regeln
//    with a link, § 5 Abs. 1 Nr. 5 DDG).
//  - VAT ID / Kleinunternehmer line added, driven by src/legal/config.ts.
//  - Owner names / legal form come from src/legal/config.ts.
//  - § 36 VSBG statement kept.
//
// LEGAL-REVIEW: the blog contains editorial content. Check whether a
// "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV" line (name + address)
// is needed; not added because it requires a statement the owners must make.

const providerBlock = (lang: "DE" | "EN") =>
  [
    LEGAL_CONFIG.businessName[lang],
    ownersLine(lang),
    ADDRESS.street,
    `${ADDRESS.postalCode} ${ADDRESS.city}`,
    ADDRESS.country[lang],
  ].join("\n");

export const impressum: { DE: LegalDoc; EN: LegalDoc } = {
  DE: {
    title: "Impressum",
    sections: [
      {
        title: "Angaben gemäß § 5 DDG",
        content: providerBlock("DE"),
      },
      {
        title: "Kontakt",
        content: `Telefon: ${LEGAL_CONFIG.phone}\nE-Mail: ${LEGAL_CONFIG.email}`,
      },
      {
        title: "Umsatzsteuer",
        content: vatImpressumLine("DE"),
      },
      {
        title: "Verbraucherstreitbeilegung",
        content:
          "Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).",
      },
    ],
  },
  EN: {
    title: "Legal Notice (Impressum)",
    intro: "This English text is a translation for convenience. In case of doubt, the German version applies.",
    sections: [
      {
        title: "Information pursuant to § 5 DDG (Digitale-Dienste-Gesetz, German Digital Services Act)",
        content: providerBlock("EN"),
      },
      {
        title: "Contact",
        content: `Phone: ${LEGAL_CONFIG.phone}\nEmail: ${LEGAL_CONFIG.email}`,
      },
      {
        title: "Value-added tax",
        content: vatImpressumLine("EN"),
      },
      {
        title: "Consumer dispute resolution",
        content:
          "We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration board (§ 36 VSBG, German Consumer Dispute Resolution Act).",
      },
    ],
  },
};
