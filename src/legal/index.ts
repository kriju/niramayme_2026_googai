// Legal documents shown in the footer dialogs. The German text is the
// authoritative one (about 95% of clients are German speakers); the English
// text is a translation for convenience and says so in its intro.
//
// All texts are DRAFTS for review by a German lawyer. Places that need a
// lawyer's decision carry a "LEGAL-REVIEW:" comment.

import { impressum } from "./impressum";
import { privacy } from "./privacy";
import type { LegalLang } from "./config";
import type { LegalDoc, LegalDocType, LegalLink } from "./types";

export type { LegalDocType, LegalLink, LegalSection, LegalDoc } from "./types";

export const LEGAL_DOCS: Record<LegalLang, Record<LegalDocType, LegalDoc>> = {
  DE: { impressum: impressum.DE, privacy: privacy.DE },
  EN: { impressum: impressum.EN, privacy: privacy.EN },
};

export const LEGAL_LINK_LABELS: Record<LegalLang, Record<LegalLink, string>> = {
  DE: {
    impressum: "Impressum",
    privacy: "Datenschutzerklärung",
    cookieSettings: "Cookie-Einstellungen öffnen",
  },
  EN: {
    impressum: "Legal Notice (Impressum)",
    privacy: "Privacy Policy",
    cookieSettings: "Open cookie settings",
  },
};

/** Intro line of every English text. */
export const TRANSLATION_NOTICE =
  "This English text is a translation for convenience. In case of doubt, the German version applies.";
