import { FieldValue, type DocumentReference, type Firestore, type Transaction } from "firebase-admin/firestore";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatEuro, type Lang } from "./courses.js";

// Our own invoices for online course payments: numbered NM-<year>-<0001>
// without gaps (a counter per year, advanced in the same transaction that
// marks the booking paid) and rendered as a PDF attached to the confirmation
// email. A copy goes to the admin notification email, and the invoice data is
// stored in the admin-only `invoices` collection, so any PDF can be rebuilt.
//
// Contents follow § 14 Abs. 4 UStG / § 33 UStDV (Kleinbetragsrechnung up to
// €250): issuer's full name and address, date, number, the service and when
// it is performed, the amount, and the § 19 UStG note in place of VAT.
// LEGAL-REVIEW: the tax adviser should confirm the layout. The Steuernummer
// is printed on every invoice (required over €250); INVOICE_TAX_NUMBER in
// Vercel overrides it.
//
// Kept in sync by hand with src/legal/config.ts (the api/ folder does not
// import from src/).
const ISSUER = {
  name: "Richa Kansal",
  business: "Niramay - Ganzheitliches Wohlbefinden",
  street: "Ernst Kirchner Str 13/3",
  city: "73760 Ostfildern",
  country: { DE: "Deutschland", EN: "Germany" },
  email: "richa@niramay.me",
  phone: "+49-15175315761",
  web: "www.niramay.me",
  taxNumber: "59201/25040",
};

export type InvoiceData = {
  number: string;
  /** ISO timestamp of the payment = invoice date. */
  issuedAt: string;
  lang: Lang;
  bookingId: string;
  refCode: string;
  customerName: string;
  customerEmail: string;
  item: string;
  /** Dates of the sessions, already formatted. */
  servicePeriod: string;
  baseCents: number;
  discountLabel: string | null;
  discountCents: number;
  totalCents: number;
  paymentMethod: string;
};

/**
 * Reserves the next invoice number for the year of `date`. Call inside the
 * transaction that marks the booking paid; returns the number and the write
 * to apply after all the transaction's reads are done.
 */
export async function reserveInvoiceNumber(tx: Transaction, db: Firestore, date: Date): Promise<{ number: string; commit: () => void }> {
  const year = date.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).slice(0, 4);
  const ref: DocumentReference = db.collection("counters").doc(`invoices-${year}`);
  const snap = await tx.get(ref);
  const next = (snap.exists ? Number(snap.get("next")) : 1) || 1;
  return {
    number: `NM-${year}-${String(next).padStart(4, "0")}`,
    commit: () => tx.set(ref, { next: next + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
  };
}

// Standard PDF fonts only cover WinAnsi (Latin-1 plus a few signs such as €
// and –). Anything else (e.g. a name in Devanagari) is transliterated where
// possible and otherwise replaced, rather than making the PDF fail.
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
function pdfSafe(text: string): string {
  return Array.from(text.normalize("NFC"), (ch) => {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(ch)) return ch;
    const stripped = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return /^[\x20-\x7e]+$/.test(stripped) ? stripped : "?";
  }).join("");
}

const LABELS = {
  DE: {
    title: "Rechnung",
    number: "Rechnungsnummer",
    date: "Rechnungsdatum",
    ref: "Buchungsreferenz",
    to: "Rechnungsempfänger",
    item: "Leistung",
    period: "Leistungsdatum",
    amount: "Betrag",
    subtotal: "Preis",
    total: "Gesamtbetrag",
    vat: "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.",
    paid: (date: string, method: string) => `Der Betrag wurde am ${date} per ${method} bezahlt. Vielen Dank!`,
    taxNumber: "Steuernummer",
  },
  EN: {
    title: "Invoice",
    number: "Invoice number",
    date: "Invoice date",
    ref: "Booking reference",
    to: "Billed to",
    item: "Service",
    period: "Date(s) of service",
    amount: "Amount",
    subtotal: "Price",
    total: "Total",
    vat: "No VAT is charged pursuant to § 19 UStG (German small-business rule).",
    paid: (date: string, method: string) => `Paid on ${date} via ${method}. Thank you!`,
    taxNumber: "Tax number",
  },
} as const;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  const l = LABELS[data.lang];
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${l.title} ${data.number}`);
  pdf.setAuthor(ISSUER.business);
  const page: PDFPage = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.16, 0.14, 0.13);
  const muted = rgb(0.47, 0.44, 0.42);
  const accent = rgb(0.345, 0.22, 0.38);
  const left = 56;
  const right = 595.28 - 56;
  let y = 841.89 - 64;

  const text = (value: string, x: number, size = 10, f: PDFFont = font, color = ink) =>
    page.drawText(pdfSafe(value), { x, y, size, font: f, color });
  const textRight = (value: string, size = 10, f: PDFFont = font, color = ink) => {
    const safe = pdfSafe(value);
    page.drawText(safe, { x: right - f.widthOfTextAtSize(safe, size), y, size, font: f, color });
  };

  // Header: issuer
  text("Niramay", left, 22, bold, accent);
  y -= 16;
  text(ISSUER.business, left, 9, font, muted);
  const dateFmt = (iso: string) =>
    new Intl.DateTimeFormat(data.lang === "DE" ? "de-DE" : "en-GB", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(new Date(iso));

  y = 841.89 - 64;
  const issuerLines = [
    ISSUER.name,
    ISSUER.street,
    `${ISSUER.city}, ${ISSUER.country[data.lang]}`,
    ISSUER.email,
    ISSUER.phone,
    ISSUER.web,
    `${l.taxNumber}: ${process.env.INVOICE_TAX_NUMBER?.trim() || ISSUER.taxNumber}`,
  ];
  for (const line of issuerLines) {
    textRight(line, 9, font, muted);
    y -= 12;
  }

  // Recipient
  y = 841.89 - 190;
  text(l.to, left, 8, bold, muted);
  y -= 14;
  text(data.customerName, left, 11);
  y -= 14;
  text(data.customerEmail, left, 10, font, muted);

  // Title + meta
  y -= 44;
  text(`${l.title} ${data.number}`, left, 18, bold);
  y -= 24;
  for (const [label, value] of [
    [l.number, data.number],
    [l.date, dateFmt(data.issuedAt)],
    [l.ref, data.refCode],
  ] as const) {
    text(label, left, 10, font, muted);
    text(value, left + 130, 10);
    y -= 15;
  }

  // Line items
  y -= 20;
  page.drawLine({ start: { x: left, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 0.8, color: muted });
  y -= 12;
  text(l.item, left, 9, bold, muted);
  textRight(l.amount, 9, bold, muted);
  y -= 18;
  const itemWidth = right - left - 110;
  const itemLines = wrap(pdfSafe(data.item), bold, 10.5, itemWidth);
  itemLines.forEach((line, i) => {
    text(line, left, 10.5, bold);
    if (i === 0) textRight(formatEuro(data.baseCents, data.lang));
    y -= 14;
  });
  for (const line of wrap(pdfSafe(`${l.period}: ${data.servicePeriod}`), font, 9, itemWidth)) {
    text(line, left, 9, font, muted);
    y -= 12;
  }
  if (data.discountCents > 0 && data.discountLabel) {
    y -= 6;
    text(data.discountLabel, left, 10);
    textRight(`-${formatEuro(data.discountCents, data.lang)}`);
    y -= 14;
  }
  y -= 4;
  page.drawLine({ start: { x: left, y: y + 4 }, end: { x: right, y: y + 4 }, thickness: 0.8, color: muted });
  y -= 16;
  text(l.total, left, 12, bold);
  textRight(formatEuro(data.totalCents, data.lang), 12, bold);

  // Notes
  y -= 40;
  for (const line of [l.vat, l.paid(dateFmt(data.issuedAt), data.paymentMethod)]) {
    for (const wrapped of wrap(pdfSafe(line), font, 10, right - left)) {
      text(wrapped, left, 10);
      y -= 14;
    }
    y -= 4;
  }

  // Footer
  y = 48;
  const footer = `${ISSUER.business} · ${ISSUER.name} · ${ISSUER.street}, ${ISSUER.city} · ${ISSUER.email}`;
  const safeFooter = pdfSafe(footer);
  page.drawText(safeFooter, { x: (595.28 - font.widthOfTextAtSize(safeFooter, 8)) / 2, y, size: 8, font, color: muted });

  return Buffer.from(await pdf.save());
}
