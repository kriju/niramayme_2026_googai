import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin.js";
import { sendEmail } from "./mailer.js";
import { HttpError, clientKey, enforceRateLimit } from "./engagement.js";
import { adminSubject, getSiteUrl } from "./util.js";
import { withNotice } from "./withdrawal.js";
import { formatEuro, type Lang } from "./courses.js";
import { readJson, wrapHtml } from "./coursePayments.js";
import { renderInvoicePdf, reserveInvoiceNumber, type InvoiceData } from "./invoice.js";
import { hasStripe, stripeRequest, type CheckoutSession } from "./stripe.js";

// Stripe payments for the one-to-one services: Vedic Astrology, Intuitive
// Guidance & Soul Counseling, Tarot and Reiki. The browser creates the
// request doc as before (AstrologyIntakeModal / ReikiIntakeModal in
// src/App.tsx, firestore.rules); this prices it from the catalogue below and
// creates the Checkout Session, and the Stripe webhook (coursePayments.ts,
// metadata.kind = "service") calls fulfilService: mark paid, invoice,
// confirmation + admin email. No discounts, no .ics — the appointment is
// arranged afterwards (Reiki in person: the calendar slot picked before
// paying).
//
//   POST /api/service-checkout  {collection, requestId, returnPath}
//
// Payments in INR keep the manual UPI flow (notify-astrology-request.ts,
// notify-reiki-request.ts). Prices are kept in sync by hand with
// src/constants.ts (TRANSLATIONS … priceValue / packages / investment).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SERVICE_COLLECTIONS = ["astrologyRequests", "tarotRequests", "reikiRequests"] as const;
export type ServiceCollection = typeof SERVICE_COLLECTIONS[number];

type ServiceInfo = {
  id: string;
  refPrefix: string;
  amountCents: number;
  title: Record<Lang, string>;
  /** What happens after payment, for the confirmation email. */
  next: Record<Lang, string>;
  adminTo: string;
};

const ARRANGE: Record<Lang, string> = {
  EN: "Richa will get in touch with you within 24–48 hours to arrange your appointment.",
  DE: "Richa meldet sich innerhalb von 24–48 Stunden bei Ihnen, um Ihren Termin zu vereinbaren.",
};

function astrologyAdmin(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || "riju.kansal@niramay.me";
}
function reikiAdmin(): string {
  return process.env.REIKI_NOTIFY_EMAIL || "richa@niramay.me";
}

export function serviceFor(collection: ServiceCollection, request: Record<string, any>): ServiceInfo {
  if (collection === "tarotRequests") {
    return {
      id: "tarot", refPrefix: "TAR", amountCents: 1000, adminTo: astrologyAdmin(), next: ARRANGE,
      title: { EN: "Tarot Guidance & Clarity Session", DE: "Tarot-Beratung & Klarheits-Sitzung" },
    };
  }
  if (collection === "reikiRequests") {
    if (request.package === "in-person") {
      return {
        id: "reiki-in-person", refPrefix: "RKI", amountCents: 4000, adminTo: reikiAdmin(),
        title: { EN: "In-Person Reiki Immersion (45 mins)", DE: "Reiki-Immersion vor Ort (45 Min.)" },
        next: {
          EN: "Your session takes place at the time you chose in our booking calendar. If you haven't picked a time yet, just reply to this email.",
          DE: "Ihre Sitzung findet zu dem Termin statt, den Sie in unserem Buchungskalender gewählt haben. Falls Sie noch keinen Termin gewählt haben, antworten Sie einfach auf diese E-Mail.",
        },
      };
    }
    if (request.package === "distance-renewal") {
      return {
        id: "reiki-distance-renewal", refPrefix: "RKI", amountCents: 5500, adminTo: reikiAdmin(), next: ARRANGE,
        title: { EN: "Distance Reiki Renewal Package (3 × 30-min sessions)", DE: "Fern-Reiki Erneuerungspaket (3 × 30-Min.-Sitzungen)" },
      };
    }
    return {
      id: "reiki-distance-single", refPrefix: "RKI", amountCents: 2000, adminTo: reikiAdmin(), next: ARRANGE,
      title: { EN: "Distance Reiki — Single Session (30 mins)", DE: "Fern-Reiki — Einzelsitzung (30 Min.)" },
    };
  }
  if (request.service === "intuitive-guidance") {
    return request.package === "couple"
      ? {
          id: "guidance-couple", refPrefix: "IGS", amountCents: 9000, adminTo: astrologyAdmin(), next: ARRANGE,
          title: { EN: "Relationship & Couple Guidance", DE: "Beziehungs- & Paarbegleitung" },
        }
      : {
          id: "guidance-individual", refPrefix: "IGS", amountCents: 5000, adminTo: astrologyAdmin(), next: ARRANGE,
          title: { EN: "Individual Soul Counseling & Guidance", DE: "Individuelle Seelenberatung & Begleitung" },
        };
  }
  return {
    id: "astrology", refPrefix: "AST", amountCents: 2500, adminTo: astrologyAdmin(), next: ARRANGE,
    title: { EN: "Vedic Astrology Reading", DE: "Vedische Astrologie-Lesung" },
  };
}

const refCode = (svc: ServiceInfo, requestId: string) => `${svc.refPrefix}-${requestId.slice(-6).toUpperCase()}`;

/** The customer's email: the form's, or (astrology "contact" may be a WhatsApp number) the one entered at Stripe. */
function customerEmail(request: Record<string, any>, session?: CheckoutSession): string {
  for (const candidate of [request.email, request.contact, session?.customer_details?.email]) {
    const value = String(candidate ?? "").trim();
    if (EMAIL_RE.test(value)) return value;
  }
  return "";
}

// Only same-site paths, so the success URL can't be pointed elsewhere.
function safeReturnPath(value: unknown): string {
  return typeof value === "string" && /^\/(?!\/)[\w\-/]*$/.test(value) ? value : "/";
}

export async function handleServiceCheckout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    if (!hasStripe()) throw new HttpError(503, "payments_not_configured");
    const body = await readJson(req);
    const collection = body.collection as ServiceCollection;
    if (!SERVICE_COLLECTIONS.includes(collection)) throw new HttpError(400, "invalid_request");
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) throw new HttpError(400, "invalid_request");

    const db = getAdminDb();
    await enforceRateLimit(db, "service_checkout", clientKey(req), 20, 3600);
    const ref = db.collection(collection).doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, "request_not_found");
    const request = snap.data() as Record<string, any>;
    if (request.paid) throw new HttpError(409, "already_paid");

    const svc = serviceFor(collection, request);
    const lang: Lang = request.lang === "DE" ? "DE" : "EN";
    const code = refCode(svc, requestId);
    const email = customerEmail(request);
    const returnTo = `${getSiteUrl(req)}${safeReturnPath(body.returnPath)}`;
    const metadata = { kind: "service", collection, requestId, service: svc.id, refCode: code };
    const checkout = await stripeRequest<CheckoutSession>(
      "POST",
      "/checkout/sessions",
      {
        mode: "payment",
        locale: lang === "DE" ? "de" : "en",
        // Astrology/tarot may have only a WhatsApp number: Stripe then asks
        // for an email, which receives the confirmation and invoice.
        customer_email: email || undefined,
        client_reference_id: requestId,
        line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: svc.amountCents, product_data: { name: svc.title[lang] } } }],
        metadata,
        payment_intent_data: { description: `${code} ${svc.title.EN}`.slice(0, 350), metadata },
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        success_url: `${returnTo}?booking=paid&type=service&ref=${code}`,
        cancel_url: `${returnTo}?booking=cancelled`,
      },
      `service-checkout-${collection}-${requestId}-${svc.amountCents}`,
    );
    await ref.update({ checkout: { sessionId: checkout.id, totalCents: svc.amountCents, createdAt: FieldValue.serverTimestamp() } });
    if (!checkout.url) throw new Error("Stripe returned no checkout URL");
    return res.status(200).json({ url: checkout.url });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
    console.error("service checkout failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}

/** Called by the Stripe webhook for a paid session with metadata.kind = "service". Idempotent. */
export async function fulfilService(session: CheckoutSession): Promise<void> {
  const collection = session.metadata?.collection as ServiceCollection;
  const requestId = session.metadata?.requestId;
  if (!SERVICE_COLLECTIONS.includes(collection) || !requestId) {
    console.warn("service checkout session without a valid request, ignored:", session.id);
    return;
  }
  const db = getAdminDb();
  const ref = db.collection(collection).doc(requestId);
  const paidAt = new Date();

  const { request, invoice } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error(`${collection}/${requestId} not found`);
    const request = snap.data() as Record<string, any>;
    if (request.paid) return { request, invoice: request.invoice as InvoiceData };
    const reserved = await reserveInvoiceNumber(tx, db, paidAt);

    const svc = serviceFor(collection, request);
    const lang: Lang = request.lang === "DE" ? "DE" : "EN";
    const totalCents = session.amount_total ?? svc.amountCents;
    const invoice: InvoiceData = {
      number: reserved.number,
      issuedAt: paidAt.toISOString(),
      lang,
      bookingId: requestId,
      refCode: refCode(svc, requestId),
      customerName: String(request.name || session.customer_details?.name || ""),
      customerEmail: customerEmail(request, session),
      item: svc.title[lang],
      servicePeriod: "",
      baseCents: totalCents,
      discountLabel: null,
      discountCents: 0,
      totalCents,
      paymentMethod: "Stripe",
    };
    reserved.commit();
    tx.set(db.collection("invoices").doc(invoice.number), { ...invoice, collection, createdAt: FieldValue.serverTimestamp() });
    tx.update(ref, {
      paid: true,
      paidAt: FieldValue.serverTimestamp(),
      payment: {
        provider: "stripe",
        checkoutSessionId: session.id,
        paymentIntent: session.payment_intent ?? null,
        amountCents: totalCents,
        currency: session.currency ?? "eur",
      },
      invoiceNumber: invoice.number,
      invoice,
    });
    return { request: { ...request, paid: true }, invoice };
  });

  if (request.confirmationSentAt) return;
  await sendServiceEmails(collection, requestId, request, invoice, session);
  await ref.update({ confirmationSentAt: FieldValue.serverTimestamp() });
  console.log(`service paid: ${invoice.refCode} ${collection} invoice ${invoice.number} (${invoice.totalCents} cents), confirmation sent`);
}

// Request fields worth showing Richa, in a stable order.
const ADMIN_FIELDS: [string, string][] = [
  ["name", "Name"], ["email", "Email"], ["contact", "Contact"], ["whatsapp", "WhatsApp"],
  ["package", "Package"], ["placeOfBirth", "Place of birth"], ["dateOfBirth", "Date of birth"], ["timeOfBirth", "Time of birth"],
  ["partnerName", "Partner"], ["partnerPlaceOfBirth", "Partner place of birth"], ["partnerDateOfBirth", "Partner date of birth"], ["partnerTimeOfBirth", "Partner time of birth"],
  ["question", "Question"], ["reason", "Reason"], ["lang", "Language"],
];

async function sendServiceEmails(collection: ServiceCollection, requestId: string, request: Record<string, any>, invoice: InvoiceData, session: CheckoutSession) {
  const svc = serviceFor(collection, request);
  const lang: Lang = request.lang === "DE" ? "DE" : "EN";
  const de = lang === "DE";
  const pdf = await renderInvoicePdf(invoice);
  const invoiceFile = { filename: `${de ? "Rechnung" : "Invoice"}-${invoice.number}.pdf`, content: pdf, contentType: "application/pdf" };
  const to = customerEmail(request, session);

  if (to) {
    const paragraphs = [
      de ? `Hallo ${request.name},` : `Hi ${request.name},`,
      de
        ? `vielen Dank für Ihre Buchung „${svc.title.DE}“. Ihre Zahlung über ${formatEuro(invoice.totalCents, lang)} ist eingegangen (Referenz ${invoice.refCode}).`
        : `Thank you for booking "${svc.title.EN}". We've received your payment of ${formatEuro(invoice.totalCents, lang)} (reference ${invoice.refCode}).`,
      svc.next[lang],
      de ? "Ihre Rechnung finden Sie im Anhang." : "Your invoice is attached.",
      de
        ? "Bei Fragen antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp."
        : "If you have any questions, just reply to this email or message us on WhatsApp.",
      de ? "Herzliche Grüße,\nRicha" : "Warmly,\nRicha",
    ];
    // Contract confirmation incl. withdrawal information (§ 312f Abs. 2 BGB).
    const body = withNotice({ text: paragraphs.join("\n\n"), html: wrapHtml(paragraphs) }, lang, request.legalAcks?.earlyStart === true);
    await sendEmail({
      to,
      replyTo: "richa@niramay.me",
      subject: de ? `Buchung bestätigt: ${svc.title.DE} — ${invoice.refCode}` : `Booking confirmed: ${svc.title.EN} — ${invoice.refCode}`,
      ...body,
      attachments: [invoiceFile],
      tag: collection === "reikiRequests" ? "customer-reiki" : "customer-astrology",
    });
  }

  const adminLines = [
    `Paid via Stripe: ${formatEuro(invoice.totalCents, "EN")} — ${svc.title.EN}`,
    `Invoice: ${invoice.number} (PDF attached — keep for the books)`,
    `Ref: ${invoice.refCode} (${collection}/${requestId})`,
    ...ADMIN_FIELDS.filter(([key]) => request[key]).map(([key, label]) => `${label}: ${request[key]}`),
    ...(to && to !== request.email && to !== request.contact ? [`Email given at Stripe: ${to}`] : []),
    `Early start requested: ${request.legalAcks?.earlyStart ? "yes" : "no"}`,
    ...(to ? [] : ["", "No email address — contact them via WhatsApp."]),
  ];
  await sendEmail({
    to: svc.adminTo,
    replyTo: to || undefined,
    subject: adminSubject(`Paid: ${svc.title.EN} — ${invoice.refCode}`),
    text: adminLines.join("\n"),
    html: wrapHtml([adminLines.join("\n")]),
    attachments: [invoiceFile],
    tag: collection === "reikiRequests" ? "admin-reiki" : "admin-astrology",
  });
}
