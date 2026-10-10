import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { sendEmail } from "./_lib/mailer.js";
import { adminSubject, escapeHtml } from "./_lib/util.js";

// Called by the browser right after AstrologyIntakeModal (see src/App.tsx)
// writes/updates a doc in the astrologyRequests (or, for tarot readings,
// tarotRequests) Firestore collection — once when the visitor submits their
// details, again when they claim to
// have paid. Like notify-review.ts, it re-fetches the doc server-side by ID
// rather than trusting whatever the client posts, so it can't be used to
// blast the admin's inbox (or a stranger's) with made-up content.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Replies to a customer receipt go to Richa, not the no-reply sender.
const CUSTOMER_REPLY_TO = "richa@niramay.me";

type NotifyKind = "submitted" | "payment_claimed";

// Per-service wording for the emails. Requests without a `service` field are
// Vedic Astrology readings (the original, and still default, use of this
// collection); Intuitive Guidance & Soul Counseling requests also carry a
// `package`, and couple requests the partner's birth details.
// Tarot requests live in their own tarotRequests collection (they hold a
// question instead of birth details), named by the client in `collection`.
type ServiceInfo = {
  refPrefix: string; adminLabel: string; nameEN: string; nameDE: string; priceEN: string; priceDE: string;
  thanksEN: string; thanksDE: string; receivedEN: string; receivedDE: string;
};

const REQUEST_COLLECTIONS = ["astrologyRequests", "tarotRequests"] as const;
type RequestCollection = typeof REQUEST_COLLECTIONS[number];

const PACKAGE_INFO: Record<string, { adminLabel: string; nameEN: string; nameDE: string; priceEN: string; priceDE: string }> = {
  individual: {
    adminLabel: "Individual Soul Counseling & Guidance",
    nameEN: "Individual Soul Counseling & Guidance session",
    nameDE: "Sitzung „Individuelle Seelenberatung & Begleitung“",
    priceEN: "50 EUR or 5000 INR",
    priceDE: "50 EUR oder 5000 INR",
  },
  couple: {
    adminLabel: "Relationship & Couple Guidance",
    nameEN: "Relationship & Couple Guidance session",
    nameDE: "Sitzung „Beziehungs- & Paarbegleitung“",
    priceEN: "90 EUR or 9000 INR",
    priceDE: "90 EUR oder 9000 INR",
  },
};

// Customer-email wording shared by the two birth-chart services.
const birthDetailsCopy = (nameEN: string, nameDE: string) => ({
  thanksEN: `Thank you for sharing your birth details for your ${nameEN}.`,
  thanksDE: `vielen Dank für Ihre Geburtsdaten für Ihre ${nameDE}.`,
  receivedEN: "We've received your birth details",
  receivedDE: "Wir haben Ihre Geburtsdaten erhalten",
});

function serviceInfo(request: Record<string, any>, collectionName: RequestCollection): ServiceInfo {
  if (collectionName === "tarotRequests") {
    return {
      refPrefix: "TAR",
      adminLabel: "Tarot Guidance & Clarity Session",
      nameEN: "Tarot Guidance & Clarity Session",
      nameDE: "Tarot-Beratung & Klarheits-Sitzung",
      priceEN: "10 EUR or 1000 INR",
      priceDE: "10 EUR oder 1000 INR",
      thanksEN: "Thank you for booking your Tarot Guidance & Clarity Session.",
      thanksDE: "vielen Dank für Ihre Buchung der Tarot-Beratung & Klarheits-Sitzung.",
      receivedEN: "We've received your tarot reading request",
      receivedDE: "Wir haben Ihre Tarot-Anfrage erhalten",
    };
  }
  if (request.service === "intuitive-guidance") {
    const pkg = PACKAGE_INFO[request.package] ?? PACKAGE_INFO.individual;
    return { refPrefix: "IGS", ...pkg, ...birthDetailsCopy(pkg.nameEN, pkg.nameDE), adminLabel: `Intuitive Guidance & Soul Counseling — ${pkg.adminLabel}` };
  }
  return {
    refPrefix: "AST",
    adminLabel: "Vedic Astrology reading",
    nameEN: "Vedic Astrology reading",
    nameDE: "vedische Astrologie-Lesung",
    priceEN: "25 EUR or 2500 INR",
    priceDE: "25 EUR oder 2500 INR",
    ...birthDetailsCopy("Vedic Astrology reading", "vedische Astrologie-Lesung"),
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requestId = typeof req.body?.requestId === "string" ? req.body.requestId : null;
  // Allowlisted, so the client can only point this at a request collection.
  const collectionName: RequestCollection = REQUEST_COLLECTIONS.includes(req.body?.collection) ? req.body.collection : "astrologyRequests";
  const kind: NotifyKind = req.body?.kind === "payment_claimed" ? "payment_claimed" : "submitted";
  if (!requestId) {
    return res.status(400).json({ error: "requestId is required" });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection(collectionName).doc(requestId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Astrology request not found" });
    }
    const request = snap.data() as Record<string, any>;

    // Derived the same way the client derives it (src/App.tsx) — never
    // stored separately, so the two can't drift.
    const svc = serviceInfo(request, collectionName);
    const refCode = `${svc.refPrefix}-${requestId.slice(-6).toUpperCase()}`;
    const lang: "EN" | "DE" = request.lang === "DE" ? "DE" : "EN";
    const isEmailContact = EMAIL_RE.test(String(request.contact || "").trim());

    const createdAt: Date = request.createdAt?.toDate ? request.createdAt.toDate() : new Date();
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(createdAt);

    await sendEmail({
      to: process.env.ADMIN_NOTIFY_EMAIL || "riju.kansal@niramay.me",
      replyTo: isEmailContact ? String(request.contact).trim() : undefined,
      subject: adminSubject(kind === "submitted"
        ? `New ${svc.adminLabel} request — ${refCode}`
        : `Payment claimed for ${svc.adminLabel} request — ${refCode}`),
      text: renderAdminEmailText({ refCode, kind, request, formattedDate, isEmailContact, svc }),
      html: renderAdminEmailHtml({ refCode, kind, request, formattedDate, isEmailContact, svc }),
      tag: "admin-astrology",
    });

    // Only send a customer receipt when the contact they gave us is an
    // email address — a WhatsApp number needs a manual reply instead, which
    // the admin email above already flags.
    if (isEmailContact) {
      await sendEmail({
        to: request.contact,
        replyTo: CUSTOMER_REPLY_TO,
        subject: kind === "submitted"
          ? `${lang === "DE" ? svc.receivedDE : svc.receivedEN} — ${refCode}`
          : (lang === "DE" ? `Zahlung erhalten — ${refCode}` : `Payment received — ${refCode}`),
        text: renderCustomerEmailText({ refCode, kind, lang, name: request.name, svc }),
        html: renderCustomerEmailHtml({ refCode, kind, lang, name: request.name, svc }),
        tag: "customer-astrology",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("notify-astrology-request failed:", error);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}

// A plain-text alternative alongside the HTML body — sending HTML-only mail
// is itself a common spam-filter signal, on top of the payment/money
// content these emails naturally contain.
function renderAdminEmailText(params: {
  refCode: string;
  kind: NotifyKind;
  request: Record<string, any>;
  formattedDate: string;
  isEmailContact: boolean;
  svc: ServiceInfo;
}) {
  const { refCode, kind, request, formattedDate, isEmailContact, svc } = params;
  const lines = [
    kind === "submitted" ? `New request: ${svc.adminLabel}` : `Payment claimed: ${svc.adminLabel}`,
    `Submitted ${formattedDate} (Europe/Berlin) — ref ${refCode} — language: ${request.lang}`,
    `Price: ${svc.priceEN}`,
    "",
    `Name: ${request.name}`,
    ...(request.question ? [`Question: ${request.question}`] : [
      `Place of birth: ${request.placeOfBirth}`,
      `Date of birth: ${request.dateOfBirth}`,
      `Time of birth: ${request.timeOfBirth}`,
    ]),
    ...(request.partnerName ? [
      `Partner's name: ${request.partnerName}`,
      `Partner's place of birth: ${request.partnerPlaceOfBirth}`,
      `Partner's date of birth: ${request.partnerDateOfBirth}`,
      `Partner's time of birth: ${request.partnerTimeOfBirth}`,
    ] : []),
    `Contact: ${request.contact}${isEmailContact ? "" : " (not an email — reply via WhatsApp)"}`,
    `Payment claimed: ${request.paymentClaimed ? "Yes" : "No"}`,
    "",
    `Look for ${refCode} in the payment note (PayPal/UPI remark or bank transfer reference) to match this request to the incoming payment.`,
  ];
  return lines.join("\n");
}

function renderCustomerEmailText(params: { refCode: string; kind: NotifyKind; lang: "EN" | "DE"; name: string; svc: ServiceInfo }) {
  const { refCode, kind, lang, name, svc } = params;
  const greeting = lang === "DE" ? `Hallo ${name},` : `Hi ${name},`;

  if (kind === "submitted") {
    return lang === "DE"
      ? [
          greeting,
          "",
          `${svc.thanksDE} Ihr Referenzcode ist:`,
          "",
          refCode,
          "",
          `Bitte geben Sie diesen Code bei Ihrer Zahlung (${svc.priceDE}) als Verwendungszweck an, wie auf unserer Website beschrieben. Sobald Ihre Zahlung eingegangen ist, bestätigen wir Ihren Termin innerhalb von 24–48 Stunden.`,
          "",
          "Bei Fragen antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp.",
          "",
          "Herzliche Grüße,\nRicha",
        ].join("\n")
      : [
          greeting,
          "",
          `${svc.thanksEN} Your reference code is:`,
          "",
          refCode,
          "",
          `Please include this code as the note/reference on your payment (${svc.priceEN}), as shown on our website. Once your payment is received, we'll confirm your appointment within 24–48 hours.`,
          "",
          "If you have any questions, just reply to this email or message us on WhatsApp.",
          "",
          "Warmly,\nRicha",
        ].join("\n");
  }

  return lang === "DE"
    ? [
        greeting,
        "",
        `vielen Dank, wir haben Ihre Zahlungsmeldung für Referenz ${refCode} erhalten. Wir bestätigen Ihren Termin innerhalb von 24–48 Stunden, sobald die Zahlung auf unserer Seite verifiziert ist.`,
        "",
        "Herzliche Grüße,\nRicha",
      ].join("\n")
    : [
        greeting,
        "",
        `Thank you, we've received your payment claim for reference ${refCode}. We'll confirm your appointment within 24–48 hours once the payment is verified on our end.`,
        "",
        "Warmly,\nRicha",
      ].join("\n");
}

function renderAdminEmailHtml(params: {
  refCode: string;
  kind: NotifyKind;
  request: Record<string, any>;
  formattedDate: string;
  isEmailContact: boolean;
  svc: ServiceInfo;
}) {
  const { refCode, kind, request, formattedDate, isEmailContact, svc } = params;
  const partnerRows = request.partnerName ? `
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Partner's name</td>
        <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(request.partnerName)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Partner's place of birth</td>
        <td style="padding: 6px 0;">${escapeHtml(request.partnerPlaceOfBirth)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Partner's date of birth</td>
        <td style="padding: 6px 0;">${escapeHtml(request.partnerDateOfBirth)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Partner's time of birth</td>
        <td style="padding: 6px 0;">${escapeHtml(request.partnerTimeOfBirth)}</td>
      </tr>` : "";
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
    <h2 style="font-size: 20px; margin-bottom: 4px;">
      ${kind === "submitted" ? "New request" : "Payment claimed"}: ${escapeHtml(svc.adminLabel)}
    </h2>
    <p style="color: #78716c; margin-top: 0;">Submitted ${escapeHtml(formattedDate)} (Europe/Berlin) &middot; ref ${escapeHtml(refCode)} &middot; language: ${escapeHtml(request.lang)} &middot; price: ${escapeHtml(svc.priceEN)}</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 6px 0; color: #78716c; width: 140px;">Name</td>
        <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(request.name)}</td>
      </tr>
${request.question ? `
      <tr>
        <td style="padding: 6px 0; color: #78716c; vertical-align: top;">Question</td>
        <td style="padding: 6px 0; white-space: pre-wrap;">${escapeHtml(request.question)}</td>
      </tr>` : `
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Place of birth</td>
        <td style="padding: 6px 0;">${escapeHtml(request.placeOfBirth)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Date of birth</td>
        <td style="padding: 6px 0;">${escapeHtml(request.dateOfBirth)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Time of birth</td>
        <td style="padding: 6px 0;">${escapeHtml(request.timeOfBirth)}</td>
      </tr>`}${partnerRows}
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Contact</td>
        <td style="padding: 6px 0;">${escapeHtml(request.contact)}${isEmailContact ? "" : " (not an email — reply via WhatsApp)"}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Payment claimed</td>
        <td style="padding: 6px 0;">${request.paymentClaimed ? "Yes" : "No"}</td>
      </tr>
    </table>

    <div style="background: #f5f5f4; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      Look for <strong>${escapeHtml(refCode)}</strong> in the payment note (PayPal/UPI remark or bank transfer reference) to match this request to the incoming payment.
    </div>

    <p style="color: #a8a29e; font-size: 12px; margin-top: 24px;">
      You're getting this because you're the admin contact for Niramay's pay-first bookings.
      Full details are also stored in the ${request.question ? "tarotRequests" : "astrologyRequests"} collection in Firestore.
    </p>
  </div>
  `;
}

function renderCustomerEmailHtml(params: { refCode: string; kind: NotifyKind; lang: "EN" | "DE"; name: string; svc: ServiceInfo }) {
  const { refCode, kind, lang, name, svc } = params;
  const greeting = lang === "DE" ? `Hallo ${escapeHtml(name)},` : `Hi ${escapeHtml(name)},`;

  if (kind === "submitted") {
    return lang === "DE" ? `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
      <p>${greeting}</p>
      <p>${escapeHtml(svc.thanksDE)} Ihr Referenzcode ist:</p>
      <p style="font-size: 22px; font-weight: 700; letter-spacing: 1px;">${escapeHtml(refCode)}</p>
      <p>Bitte geben Sie diesen Code bei Ihrer Zahlung (${svc.priceDE}) als Verwendungszweck an, wie auf unserer Website beschrieben. Sobald Ihre Zahlung eingegangen ist, bestätigen wir Ihren Termin innerhalb von 24–48 Stunden.</p>
      <p>Bei Fragen antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp.</p>
      <p>Herzliche Grüße,<br/>Richa</p>
    </div>
    ` : `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
      <p>${greeting}</p>
      <p>${escapeHtml(svc.thanksEN)} Your reference code is:</p>
      <p style="font-size: 22px; font-weight: 700; letter-spacing: 1px;">${escapeHtml(refCode)}</p>
      <p>Please include this code as the note/reference on your payment (${svc.priceEN}), as shown on our website. Once your payment is received, we'll confirm your appointment within 24–48 hours.</p>
      <p>If you have any questions, just reply to this email or message us on WhatsApp.</p>
      <p>Warmly,<br/>Richa</p>
    </div>
    `;
  }

  return lang === "DE" ? `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
      <p>${greeting}</p>
      <p>vielen Dank, wir haben Ihre Zahlungsmeldung für Referenz <strong>${escapeHtml(refCode)}</strong> erhalten. Wir bestätigen Ihren Termin innerhalb von 24–48 Stunden, sobald die Zahlung auf unserer Seite verifiziert ist.</p>
      <p>Herzliche Grüße,<br/>Richa</p>
    </div>
  ` : `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
      <p>${greeting}</p>
      <p>Thank you, we've received your payment claim for reference <strong>${escapeHtml(refCode)}</strong>. We'll confirm your appointment within 24–48 hours once the payment is verified on our end.</p>
      <p>Warmly,<br/>Richa</p>
    </div>
  `;
}
