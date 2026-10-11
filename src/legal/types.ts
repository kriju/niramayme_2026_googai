export type LegalDocType = "impressum" | "privacy" | "agb" | "widerruf";

/** Things a section can link to from inside a legal dialog. */
export type LegalLink = LegalDocType | "cookieSettings" | "withdraw";

export type LegalSection = {
  title: string;
  /** Plain text; newlines are kept (whitespace-pre-wrap). */
  content: string;
  /** Buttons rendered under the text. */
  links?: LegalLink[];
};

export type LegalDoc = {
  title: string;
  intro?: string;
  sections: LegalSection[];
};
