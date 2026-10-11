// Single source of truth for the facts the legal documents (Impressum,
// privacy policy, AGB, Widerrufsbelehrung) and the booking price notes depend
// on. Pure data + helpers, no React, so it can be imported from anywhere.
//
// Anything marked TODO(owner) is something the developer could NOT verify
// from the repository and must be filled in by the business owners before the
// texts go live. The legal texts show a visible "[TODO: ...]" marker until
// then (see todo() below). Every open item is also listed in the pull
// request description.
//
// All legal texts are DRAFTS and must be reviewed by a German lawyer.

export type LegalLang = "EN" | "DE";

/** Bumped whenever any legal text changes; stored with every booking record. */
export const LEGAL_VERSION = "2026-10-11";

/** Month shown as "Stand" / "Last updated" in the documents. */
export const LEGAL_UPDATED = { DE: "Oktober 2026", EN: "October 2026" } as const;

export const LEGAL_CONFIG = {
  /** Trade name as shown in the Impressum. */
  businessName: { DE: "Niramay - Ganzheitliches Wohlbefinden", EN: "Niramay - Holistic Wellbeing" },

  /**
   * Natural persons named as business owner(s) in Impressum, AGB and privacy
   * policy. TODO(owner): Riju Kansal also teaches and receives course-booking
   * data. If the business is run by both partners (e.g. as a GbR), add
   * "Riju Kansal" here and set legalForm below. Default: Richa Kansal only.
   */
  owners: ["Richa Kansal"] as string[],

  /**
   * Legal form, e.g. "GbR". TODO(owner): only set if the business really is
   * such a company. null = sole trader (Einzelunternehmen), no legal form shown.
   */
  legalForm: null as string | null,

  phone: "+49-15175315761",
  email: "richa@niramay.me",
  /** Contact for online-course bookings (see privacy policy, CourseIntakeModal). */
  courseEmail: "riju.kansal@niramay.me",

  /**
   * Umsatzsteuer-Identifikationsnummer (§ 27a UStG), e.g. "DE123456789".
   * TODO(owner): enter it if you have one. null = not set.
   */
  vatId: null as string | null,

  /**
   * Kleinunternehmer under § 19 UStG? true = yes (no VAT charged), false = no
   * (prices include VAT), null = UNKNOWN (a visible TODO is shown).
   * Only consulted when vatId is null.
   */
  smallBusinessSection19: null as boolean | null,

  /**
   * PROPOSED retention periods used in the privacy policy. TODO(owner): confirm
   * that these match what you will actually do. NOTE: the code does not delete
   * booking records automatically (firestore.rules: delete is denied for
   * clients, no TTL on the booking collections) - deletion is a manual step
   * until someone automates it.
   */
  retention: {
    /** Requests that never turned into a contract. */
    unansweredInquiryMonths: 6,
    /** Contract data (booking record, correspondence): limitation period, §§ 195, 199 BGB. */
    limitationYears: 3,
    /** Invoices / accounting vouchers (§ 147 AO, § 257 HGB; 8 years since 1 Jan 2025). */
    accountingVoucherYears: 8,
    /** Business letters (§ 147 AO, § 257 HGB). */
    businessLetterYears: 6,
  },

  /**
   * Cancellation rule from the FAQ ("Please give at least 24 hours' notice to
   * reschedule or cancel"). TODO(owner): confirm / add fees if wanted (a fee
   * would need to be reasonable, see § 309 Nr. 5 BGB).
   */
  cancellationNoticeHours: 24,

  /**
   * Withdrawal period for consumers, § 355 BGB. Do not change.
   */
  withdrawalDays: 14,
};

/** Visible placeholder for facts that are not known yet. */
export const todo = (lang: LegalLang, de: string, en: string) => `[TODO: ${lang === "DE" ? de : en}]`;

const joinNames = (names: string[], lang: LegalLang) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} ${lang === "DE" ? "und" : "and"} ${names[names.length - 1]}`;

/** "Richa Kansal" or "Richa Kansal und Riju Kansal" (+ legal form if set). */
export const ownersLine = (lang: LegalLang) => {
  const names = joinNames(LEGAL_CONFIG.owners, lang);
  return LEGAL_CONFIG.legalForm ? `${LEGAL_CONFIG.businessName[lang]} ${LEGAL_CONFIG.legalForm}, ${lang === "DE" ? "vertreten durch" : "represented by"} ${names}` : names;
};

/** Short provider name for running text ("Niramay"). */
export const PROVIDER_SHORT = "Niramay";

export const isMultiOwner = () => LEGAL_CONFIG.owners.length > 1;

/** Postal address as separate lines (street/postcode/city come from constants.ts via the caller). */
export const ADDRESS = { street: "Ernst Kirchner Str 13/3", postalCode: "73760", city: "Ostfildern", country: { DE: "Deutschland", EN: "Germany" } };

/**
 * VAT status line for the Impressum:
 *  - USt-IdNr. set      -> "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ..."
 *  - Kleinunternehmer   -> "Gemäß § 19 UStG wird keine Umsatzsteuer erhoben."
 *  - unknown            -> visible TODO
 */
export function vatImpressumLine(lang: LegalLang): string {
  if (LEGAL_CONFIG.vatId) {
    return lang === "DE"
      ? `Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${LEGAL_CONFIG.vatId}`
      : `VAT identification number pursuant to § 27a UStG: ${LEGAL_CONFIG.vatId}`;
  }
  if (LEGAL_CONFIG.smallBusinessSection19 === true) {
    return lang === "DE" ? "Gemäß § 19 UStG wird keine Umsatzsteuer erhoben." : "Pursuant to § 19 UStG (small-business rule), no value-added tax is charged.";
  }
  return todo(
    lang,
    "Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG ODER Kleinunternehmerhinweis gemäß § 19 UStG eintragen (src/legal/config.ts)",
    "enter the VAT ID pursuant to § 27a UStG OR the small-business note pursuant to § 19 UStG (src/legal/config.ts)",
  );
}

/**
 * Short VAT note shown next to prices in the booking flow and used in the AGB.
 * LEGAL-REVIEW: § 1 Abs. 2 PAngV requires gross prices incl. VAT or, for
 * Kleinunternehmer, a statement that no VAT is charged.
 */
export function vatPriceNote(lang: LegalLang): string {
  if (LEGAL_CONFIG.vatId || LEGAL_CONFIG.smallBusinessSection19 === false) {
    return lang === "DE" ? "Alle Preise sind Endpreise inkl. gesetzlicher Umsatzsteuer." : "All prices are final prices including statutory VAT.";
  }
  if (LEGAL_CONFIG.smallBusinessSection19 === true) {
    return lang === "DE" ? "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen." : "Pursuant to § 19 UStG, no VAT is charged or shown.";
  }
  return todo(lang, "MwSt.-/Kleinunternehmerhinweis (src/legal/config.ts)", "VAT / small-business note (src/legal/config.ts)");
}
