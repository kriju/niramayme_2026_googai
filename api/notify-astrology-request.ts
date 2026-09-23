import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { escapeHtml } from "./_lib/util.js";

// Called by the browser right after AstrologyIntakeModal (see src/App.tsx)
// writes/updates a doc in the astrologyRequests Firestore collection — once
// when the visitor submits their birth details, again when they claim to
// have paid. Like notify-review.ts, it re-fetches the doc server-side by ID
// rather than trusting whatever the client posts, so it can't be used to
// blast the admin's inbox (or a stranger's) with made-up content.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NotifyKind = "submitted" | "payment_claimed";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requestId = typeof req.body?.requestId === "string" ? req.body.requestId : null;
  const kind: NotifyKind = req.body?.kind === "payment_claimed" ? "payment_claimed" : "submitted";
  if (!requestId) {
    return res.status(400).json({ error: "requestId is required" });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection("astrologyRequests").doc(requestId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Astrology request not found" });
    }
    const request = snap.data() as Record<string, any>;

    // Derived the same way the client derives it (src/App.tsx) — never
    // stored separately, so the two can't drift.
    const refCode = `AST-${requestId.slice(-6).toUpperCase()}`;
    const lang: "EN" | "DE" = request.lang === "DE" ? "DE" : "EN";
    const isEmailContact = EMAIL_RE.test(String(request.contact || "").trim());

    const createdAt: Date = request.createdAt?.toDate ? request.createdAt.toDate() : new Date();
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(createdAt);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_NOTIFY_EMAIL || "riju.kansal@niramay.me",
      subject: kind === "submitted"
        ? `New astrology chart request — ${refCode}`
        : `Payment claimed for astrology request — ${refCode}`,
      text: renderAdminEmailText({ refCode, kind, request, formattedDate, isEmailContact }),
      html: renderAdminEmailHtml({ refCode, kind, request, formattedDate, isEmailContact }),
    });

    // Only send a customer receipt when the contact they gave us is an
    // email address — a WhatsApp number needs a manual reply instead, which
    // the admin email above already flags.
    if (isEmailContact) {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: request.contact,
        subject: kind === "submitted"
          ? (lang === "DE" ? `Wir haben Ihre Geburtsdaten erhalten — ${refCode}` : `We've received your birth details — ${refCode}`)
          : (lang === "DE" ? `Zahlung erhalten — ${refCode}` : `Payment received — ${refCode}`),
        text: renderCustomerEmailText({ refCode, kind, lang, name: request.name }),
        html: renderCustomerEmailHtml({ refCode, kind, lang, name: request.name }),
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
}) {
  const { refCode, kind, request, formattedDate, isEmailContact } = params;
  const lines = [
    kind === "submitted" ? "New astrology chart request" : "Payment claimed for an astrology request",
    `Submitted ${formattedDate} (Europe/Berlin) — ref ${refCode} — language: ${request.lang}`,
    "",
    `Name: ${request.name}`,
    `Place of birth: ${request.placeOfBirth}`,
    `Date of birth: ${request.dateOfBirth}`,
    `Time of birth: ${request.timeOfBirth}`,
    `Contact: ${request.contact}${isEmailContact ? "" : " (not an email — reply via WhatsApp)"}`,
    `Payment claimed: ${request.paymentClaimed ? "Yes" : "No"}`,
    "",
    `Look for ${refCode} in the payment note (PayPal/UPI remark or bank transfer reference) to match this request to the incoming payment.`,
  ];
  return lines.join("\n");
}

function renderCustomerEmailText(params: { refCode: string; kind: NotifyKind; lang: "EN" | "DE"; name: string }) {
  const { refCode, kind, lang, name } = params;
  const greeting = lang === "DE" ? `Hallo ${name},` : `Hi ${name},`;

  if (kind === "submitted") {
    return lang === "DE"
      ? [
          greeting,
          "",
          "vielen Dank für Ihre Geburtsdaten für Ihre vedische Astrologie-Lesung. Ihr Referenzcode ist:",
          "",
          refCode,
          "",
          "Bitte geben Sie diesen Code bei Ihrer Zahlung (20 EUR oder 2000 INR) als Verwendungszweck an, wie auf unserer Website beschrieben. Sobald Ihre Zahlung eingegangen ist, bestätigen wir Ihren Termin innerhalb von 24–48 Stunden.",
          "",
          "Bei Fragen antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp.",
          "",
          "Herzliche Grüße,\nRicha",
        ].join("\n")
      : [
          greeting,
          "",
          "Thank you for sharing your birth details for your Vedic Astrology reading. Your reference code is:",
          "",
          refCode,
          "",
          "Please include this code as the note/reference on your payment (20 EUR or 2000 INR), as shown on our website. Once your payment is received, we'll confirm your appointment within 24–48 hours.",
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
}) {
  const { refCode, kind, request, formattedDate, isEmailContact } = params;
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
    <h2 style="font-size: 20px; margin-bottom: 4px;">
      ${kind === "submitted" ? "New astrology chart request" : "Payment claimed for an astrology request"}
    </h2>
    <p style="color: #78716c; margin-top: 0;">Submitted ${escapeHtml(formattedDate)} (Europe/Berlin) &middot; ref ${escapeHtml(refCode)} &middot; language: ${escapeHtml(request.lang)}</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 6px 0; color: #78716c; width: 140px;">Name</td>
        <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(request.name)}</td>
      </tr>
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
      </tr>
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
      You're getting this because you're the admin contact for Niramay's astrology bookings.
      Full details are also stored in the astrologyRequests collection in Firestore.
    </p>
  </div>
  `;
}

function renderCustomerEmailHtml(params: { refCode: string; kind: NotifyKind; lang: "EN" | "DE"; name: string }) {
  const { refCode, kind, lang, name } = params;
  const greeting = lang === "DE" ? `Hallo ${escapeHtml(name)},` : `Hi ${escapeHtml(name)},`;

  if (kind === "submitted") {
    return lang === "DE" ? `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
      <p>${greeting}</p>
      <p>vielen Dank für Ihre Geburtsdaten für Ihre vedische Astrologie-Lesung. Ihr Referenzcode ist:</p>
      <p style="font-size: 22px; font-weight: 700; letter-spacing: 1px;">${escapeHtml(refCode)}</p>
      <p>Bitte geben Sie diesen Code bei Ihrer Zahlung (20 EUR oder 2000 INR) als Verwendungszweck an, wie auf unserer Website beschrieben. Sobald Ihre Zahlung eingegangen ist, bestätigen wir Ihren Termin innerhalb von 24–48 Stunden.</p>
      <p>Bei Fragen antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp.</p>
      <p>Herzliche Grüße,<br/>Richa</p>
    </div>
    ` : `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
      <p>${greeting}</p>
      <p>Thank you for sharing your birth details for your Vedic Astrology reading. Your reference code is:</p>
      <p style="font-size: 22px; font-weight: 700; letter-spacing: 1px;">${escapeHtml(refCode)}</p>
      <p>Please include this code as the note/reference on your payment (20 EUR or 2000 INR), as shown on our website. Once your payment is received, we'll confirm your appointment within 24–48 hours.</p>
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
