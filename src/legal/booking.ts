import { LEGAL_CONFIG, LEGAL_VERSION, vatPriceNote, type LegalLang } from "./config";

// Texts and data shape for the legal block in the booking forms
// (BookingLegalBlock in src/App.tsx) and the "Vertrag widerrufen" dialog.
//
// Two kinds of forms:
//  - binding:     every booking (astrology, guidance, tarot, Reiki in person
//                 and at a distance, online courses). The button is labelled
//                 "Zahlungspflichtig buchen" (§ 312j Abs. 3 BGB) and the price
//                 incl. the VAT note is shown directly above it (§ 312j Abs. 2).
//                 Payment follows via Stripe Checkout (or UPI for INR).
//  - non-binding: no longer used (distance Reiki was a free request until
//                 all payments moved to Stripe); requestNote/requestButton
//                 are kept for a future enquiry form.
//
// LEGAL-REVIEW: whether the pay-first flow (details -> payment instructions ->
// "I've paid") counts as the order button for § 312j BGB is a judgement call;
// the "binding" button is placed on the details step, where the visitor
// commits to the booking. For in-person Reiki the calendar slot is picked
// AFTER that button - have a lawyer check that the essential features (date)
// do not need to be known beforehand.
// LEGAL-REVIEW: the early-start checkbox is optional. Without it nothing may
// start before the 14 days are over (so fixed-date courses and quick
// readings inside that window would be delivered on the customer's express
// request only).

export type LegalAcks = {
  /** Version of the legal texts that were shown, see LEGAL_VERSION. */
  version: string;
  /** AGB read and accepted. */
  agb: boolean;
  /** Withdrawal information (Widerrufsbelehrung) acknowledged. */
  withdrawalInfo: boolean;
  /** Express request to begin before the withdrawal period ends (+ acknowledgement of loss / pro-rata compensation). */
  earlyStart: boolean;
};

export type BookingLegalState = { agb: boolean; withdrawalInfo: boolean; earlyStart: boolean };
export const EMPTY_LEGAL_STATE: BookingLegalState = { agb: false, withdrawalInfo: false, earlyStart: false };

/** Record stored in the booking document ("legalAcks", see firestore.rules hasValidAcks). */
export const toLegalAcks = (s: BookingLegalState): LegalAcks => ({
  version: LEGAL_VERSION,
  agb: s.agb,
  withdrawalInfo: s.withdrawalInfo,
  earlyStart: s.earlyStart,
});

export const isLegalComplete = (s: BookingLegalState) => s.agb && s.withdrawalInfo;

export const BOOKING_LEGAL_TEXT: Record<LegalLang, {
  heading: string;
  priceLabel: string;
  agbPrefix: string;
  agbLink: string;
  agbSuffix: string;
  withdrawalPrefix: string;
  withdrawalLink: string;
  withdrawalSuffix: string;
  earlyStart: string;
  earlyStartHint: string;
  bindingNote: string;
  requestNote: string;
  bindingButton: string;
  requestButton: string;
}> = {
  DE: {
    heading: "Rechtliche Hinweise zur Buchung",
    priceLabel: "Preis",
    agbPrefix: "Ich habe die",
    agbLink: "AGB",
    agbSuffix: "gelesen und akzeptiere sie.",
    withdrawalPrefix: "Ich habe die",
    withdrawalLink: "Widerrufsbelehrung",
    withdrawalSuffix: "(mit Muster-Widerrufsformular) zur Kenntnis genommen.",
    earlyStart:
      "Ich verlange ausdrücklich, dass Niramay bereits vor Ablauf der Widerrufsfrist mit der Ausführung der Dienstleistung beginnt. Mir ist bekannt, dass ich bei vollständiger Vertragserfüllung durch Niramay mein Widerrufsrecht verliere (§ 356 Abs. 4 BGB) und dass ich bei einem Widerruf nach Leistungsbeginn Wertersatz für die bis dahin erbrachten Leistungen schulde (§ 357a BGB). (Optional)",
    earlyStartHint: `Ohne dieses Kästchen beginnen wir erst nach Ablauf der Widerrufsfrist (${LEGAL_CONFIG.withdrawalDays} Tage).`,
    bindingNote: "Mit dem Klick auf „Zahlungspflichtig buchen“ geben Sie eine verbindliche Buchung ab und verpflichten sich zur Zahlung des angegebenen Preises.",
    requestNote: "Dies ist eine unverbindliche Anfrage. Ein Vertrag kommt erst zustande, wenn wir Ihre Buchung bestätigen.",
    bindingButton: "Zahlungspflichtig buchen",
    requestButton: "Anfrage senden",
  },
  EN: {
    heading: "Legal information for your booking",
    priceLabel: "Price",
    agbPrefix: "I have read and accept the",
    agbLink: "Terms and Conditions (AGB)",
    agbSuffix: ".",
    withdrawalPrefix: "I have taken note of the",
    withdrawalLink: "Withdrawal Information (Widerrufsbelehrung)",
    withdrawalSuffix: "(including the model withdrawal form).",
    earlyStart:
      "I expressly request that Niramay begins performing the service before the withdrawal period has ended. I am aware that I lose my right of withdrawal once Niramay has fully performed the service (§ 356 (4) BGB) and that, if I withdraw after performance has begun, I owe compensation for the services already provided (§ 357a BGB). (Optional)",
    earlyStartHint: `Without this box we will only begin after the withdrawal period (${LEGAL_CONFIG.withdrawalDays} days) has ended.`,
    bindingNote: "By clicking “Book with obligation to pay” you place a binding booking and commit to paying the price shown.",
    requestNote: "This is a non-binding request. A contract only comes into being once we confirm your booking.",
    bindingButton: "Book with obligation to pay",
    requestButton: "Send request",
  },
};

export { vatPriceNote };

// "Vertrag widerrufen" dialog (electronic withdrawal function, § 356a BGB).
// LEGAL-REVIEW: § 356a Abs. 1 BGB: the function must be labelled
// "Vertrag widerrufen" (or an equally unambiguous wording), be permanently
// available and easy to find, and lead to a confirmation step labelled
// "Jetzt widerrufen". The sender must get an acknowledgement of receipt on a
// durable medium without delay (done by email in api/_lib/withdrawal.ts).
export const WITHDRAW_TEXT: Record<LegalLang, {
  title: string; intro: string; name: string; email: string; contract: string; contractPlaceholder: string;
  address: string; reviewBtn: string; reviewTitle: string; reviewIntro: string; back: string; confirmBtn: string;
  sending: string; doneTitle: string; doneBody: string; error: string; close: string; infoLink: string;
}> = {
  DE: {
    title: "Vertrag widerrufen",
    intro: "Hier können Sie als Verbraucher einen online geschlossenen Vertrag innerhalb der Widerrufsfrist widerrufen. Sie erhalten danach unverzüglich eine Eingangsbestätigung per E-Mail.",
    name: "Name",
    email: "E-Mail-Adresse (für die Eingangsbestätigung)",
    contract: "Welchen Vertrag widerrufen Sie? (Leistung, Buchungsdatum, Referenzcode)",
    contractPlaceholder: "z. B. Reiki-Sitzung vor Ort, gebucht am 12.10.2026, Referenz RKI-AB12CD",
    address: "Anschrift (optional)",
    reviewBtn: "Weiter zur Bestätigung",
    reviewTitle: "Widerruf bestätigen",
    reviewIntro: "Bitte prüfen Sie Ihre Angaben. Mit Klick auf „Jetzt widerrufen“ erklären Sie den Widerruf des unten genannten Vertrags:",
    back: "Zurück",
    confirmBtn: "Jetzt widerrufen",
    sending: "Wird gesendet …",
    doneTitle: "Widerruf eingegangen",
    doneBody: "Wir haben Ihren Widerruf erhalten und senden Ihnen unverzüglich eine Eingangsbestätigung mit Datum und Uhrzeit per E-Mail. Falls nichts ankommt, prüfen Sie bitte Ihren Spam-Ordner oder schreiben Sie uns an",
    error: "Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder widerrufen Sie per E-Mail.",
    close: "Schließen",
    infoLink: "Widerrufsbelehrung ansehen",
  },
  EN: {
    title: "Withdraw from contract",
    intro: "As a consumer you can use this form to withdraw from a contract concluded online within the withdrawal period. You will then receive an acknowledgement of receipt by email without delay.",
    name: "Name",
    email: "Email address (for the acknowledgement)",
    contract: "Which contract are you withdrawing from? (service, booking date, reference code)",
    contractPlaceholder: "e.g. In-person Reiki session, booked on 12 Oct 2026, reference RKI-AB12CD",
    address: "Address (optional)",
    reviewBtn: "Continue to confirmation",
    reviewTitle: "Confirm withdrawal",
    reviewIntro: "Please check your details. By clicking “Withdraw now” (German: “Jetzt widerrufen”) you declare the withdrawal from the contract named below:",
    back: "Back",
    confirmBtn: "Withdraw now",
    sending: "Sending …",
    doneTitle: "Withdrawal received",
    doneBody: "We have received your withdrawal and will email you an acknowledgement with date and time without delay. If nothing arrives, please check your spam folder or write to us at",
    error: "Sorry, that did not work. Please try again or withdraw by email.",
    close: "Close",
    infoLink: "View withdrawal information",
  },
};
