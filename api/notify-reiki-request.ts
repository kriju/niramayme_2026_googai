import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { sendEmail } from "./_lib/mailer.js";
import { adminSubject, escapeHtml } from "./_lib/util.js";

// Called by the browser right after ReikiIntakeModal (see src/App.tsx)
// writes/updates a doc in the reikiRequests Firestore collection — once when
// the visitor submits their details, and (in-person bookings only) again
// when they claim to have paid. Like notify-astrology-request.ts, it
// re-fetches the doc server-side by ID rather than trusting whatever the
// client posts, so it can't be used to send made-up content to anyone.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CUSTOMER_REPLY_TO = "richa@niramay.me";

type NotifyKind = "submitted" | "payment_claimed";
type PackageId = "in-person" | "distance-single" | "distance-renewal";
type Lang = "EN" | "DE";

const PACKAGES: Record<PackageId, Record<Lang, { title: string; price: string }>> = {
  "in-person": {
    EN: { title: "In-Person Reiki Immersion (45 mins)", price: "€40" },
    DE: { title: "Reiki-Immersion vor Ort (45 Min.)", price: "40 €" },
  },
  "distance-single": {
    EN: { title: "Distance Reiki — Single Session (30 mins)", price: "€20 / ₹2,000" },
    DE: { title: "Fern-Reiki — Einzelsitzung (30 Min.)", price: "20 € / 2.000 ₹" },
  },
  "distance-renewal": {
    EN: { title: "Distance Reiki Renewal Package (3 × 30-min sessions)", price: "€55 / ₹5,900" },
    DE: { title: "Fern-Reiki Erneuerungspaket (3 × 30-Min.-Sitzungen)", price: "55 € / 5.900 ₹" },
  },
};

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
    const snap = await db.collection("reikiRequests").doc(requestId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Reiki request not found" });
    }
    const request = snap.data() as Record<string, any>;
    const pkgId: PackageId = request.package in PACKAGES ? request.package : "distance-single";
    const isInPerson = pkgId === "in-person";
    // Distance requests have no payment step, so there's nothing to claim.
    if (kind === "payment_claimed" && !isInPerson) {
      return res.status(400).json({ error: "This request has no payment step" });
    }

    // Derived the same way the client derives it (src/App.tsx) — never
    // stored separately, so the two can't drift.
    const refCode = `RKI-${requestId.slice(-6).toUpperCase()}`;
    const lang: Lang = request.lang === "DE" ? "DE" : "EN";
    const pkg = PACKAGES[pkgId];

    const createdAt: Date = request.createdAt?.toDate ? request.createdAt.toDate() : new Date();
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(createdAt);

    const adminParams = { refCode, kind, request, formattedDate, pkgTitle: pkg.EN.title, price: pkg.EN.price, isInPerson };
    await sendEmail({
      to: process.env.REIKI_NOTIFY_EMAIL || "richa@niramay.me",
      replyTo: EMAIL_RE.test(String(request.email || "")) ? request.email : undefined,
      subject: adminSubject(kind === "submitted"
        ? `New Reiki ${isInPerson ? "booking" : "request"} — ${pkg.EN.title} — ${refCode}`
        : `Payment claimed for in-person Reiki — ${refCode}`),
      text: renderAdminEmailText(adminParams),
      html: renderAdminEmailHtml(adminParams),
      tag: "admin-reiki",
    });

    if (EMAIL_RE.test(String(request.email || "").trim())) {
      const customerParams = { refCode, kind, lang, name: request.name, pkgTitle: pkg[lang].title, price: pkg[lang].price, isInPerson };
      await sendEmail({
        to: request.email,
        // The email invites them to "just reply" — that should reach Richa,
        // not the no-reply notifications sender.
        replyTo: CUSTOMER_REPLY_TO,
        subject: customerSubject(customerParams),
        text: renderCustomerEmailText(customerParams),
        html: renderCustomerEmailHtml(customerParams),
        tag: "customer-reiki",
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("notify-reiki-request failed:", error);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}

type AdminParams = {
  refCode: string;
  kind: NotifyKind;
  request: Record<string, any>;
  formattedDate: string;
  pkgTitle: string;
  price: string;
  isInPerson: boolean;
};

function renderAdminEmailText({ refCode, kind, request, formattedDate, pkgTitle, price, isInPerson }: AdminParams) {
  const lines = [
    kind === "submitted" ? `New Reiki ${isInPerson ? "booking" : "request"}` : "Payment claimed for an in-person Reiki booking",
    `Submitted ${formattedDate} (Europe/Berlin) — ref ${refCode} — language: ${request.lang}`,
    "",
    `Package: ${pkgTitle} (${price})`,
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `WhatsApp: ${request.whatsapp}`,
    `What they need Reiki for: ${request.reason}`,
  ];
  if (isInPerson) {
    lines.push(
      `Payment claimed: ${request.paymentClaimed ? "Yes" : "No"}`,
      "",
      `They were sent to the booking calendar to pick a slot. Look for ${refCode} in the payment note (PayPal remark or bank transfer reference) to match the payment.`,
    );
  } else {
    lines.push("", "They've been told you'll get in touch with them for the next steps.");
  }
  return lines.join("\n");
}

function renderAdminEmailHtml({ refCode, kind, request, formattedDate, pkgTitle, price, isInPerson }: AdminParams) {
  const row = (label: string, value: string) => `
      <tr>
        <td style="padding: 6px 0; color: #78716c; width: 160px; vertical-align: top;">${label}</td>
        <td style="padding: 6px 0;">${value}</td>
      </tr>`;
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
    <h2 style="font-size: 20px; margin-bottom: 4px;">
      ${kind === "submitted" ? `New Reiki ${isInPerson ? "booking" : "request"}` : "Payment claimed for an in-person Reiki booking"}
    </h2>
    <p style="color: #78716c; margin-top: 0;">Submitted ${escapeHtml(formattedDate)} (Europe/Berlin) &middot; ref ${escapeHtml(refCode)} &middot; language: ${escapeHtml(request.lang)}</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      ${row("Package", `<strong>${escapeHtml(pkgTitle)}</strong> (${escapeHtml(price)})`)}
      ${row("Name", `<strong>${escapeHtml(request.name)}</strong>`)}
      ${row("Email", escapeHtml(request.email))}
      ${row("WhatsApp", escapeHtml(request.whatsapp))}
      ${row("Needs Reiki for", escapeHtml(request.reason).replace(/\n/g, "<br/>"))}
      ${isInPerson ? row("Payment claimed", request.paymentClaimed ? "Yes" : "No") : ""}
    </table>

    <div style="background: #f5f5f4; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      ${isInPerson
        ? `They were sent to the booking calendar to pick a slot. Look for <strong>${escapeHtml(refCode)}</strong> in the payment note (PayPal remark or bank transfer reference) to match the payment.`
        : "They've been told you'll get in touch with them for the next steps."}
    </div>

    <p style="color: #a8a29e; font-size: 12px; margin-top: 24px;">
      Full details are also stored in the reikiRequests collection in Firestore.
    </p>
  </div>
  `;
}

type CustomerParams = {
  refCode: string;
  kind: NotifyKind;
  lang: Lang;
  name: string;
  pkgTitle: string;
  price: string;
  isInPerson: boolean;
};

function customerSubject({ refCode, kind, lang, isInPerson }: CustomerParams) {
  if (kind === "payment_claimed") return lang === "DE" ? `Zahlung erhalten — ${refCode}` : `Payment received — ${refCode}`;
  if (isInPerson) return lang === "DE" ? `Ihre Reiki-Buchung — ${refCode}` : `Your Reiki booking — ${refCode}`;
  return lang === "DE" ? "Wir haben Ihre Reiki-Anfrage erhalten" : "We've received your Reiki request";
}

// Paragraphs shared by the text and HTML bodies; `code` marks where the
// reference code is shown on a line of its own.
function customerParagraphs({ refCode, kind, lang, pkgTitle, price, isInPerson }: CustomerParams): (string | { code: string })[] {
  const de = lang === "DE";
  if (kind === "payment_claimed") {
    return [de
      ? `vielen Dank, wir haben Ihre Zahlungsmeldung für Referenz ${refCode} erhalten. Wir bestätigen Ihre Reiki-Sitzung vor Ort innerhalb von 24–48 Stunden, sobald die Zahlung auf unserer Seite verifiziert ist.`
      : `Thank you, we've received your payment claim for reference ${refCode}. We'll confirm your in-person Reiki session within 24–48 hours once the payment is verified on our end.`];
  }
  if (isInPerson) {
    return [
      de ? `vielen Dank für Ihre Buchung: ${pkgTitle}. Ihr Referenzcode ist:` : `Thank you for booking: ${pkgTitle}. Your reference code is:`,
      { code: refCode },
      de
        ? `Bitte geben Sie diesen Code bei Ihrer Zahlung (${price}) als Verwendungszweck an, wie auf unserer Website beschrieben. Sobald Ihre Zahlung eingegangen ist, bestätigen wir Ihren Termin innerhalb von 24–48 Stunden.`
        : `Please include this code as the note/reference on your payment (${price}), as shown on our website. Once your payment is received, we'll confirm your session within 24–48 hours.`,
      de ? "Bei Fragen antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp." : "If you have any questions, just reply to this email or message us on WhatsApp.",
    ];
  }
  return [
    de
      ? `vielen Dank für Ihre Anfrage: ${pkgTitle} (${price}). Richa meldet sich in Kürze bei Ihnen, um die nächsten Schritte zu besprechen.`
      : `Thank you for your request: ${pkgTitle} (${price}). Richa will get in touch with you shortly for the next steps.`,
    de ? "Bei Fragen antworten Sie einfach auf diese E-Mail oder schreiben Sie uns über WhatsApp." : "If you have any questions, just reply to this email or message us on WhatsApp.",
  ];
}

function renderCustomerEmailText(params: CustomerParams) {
  const de = params.lang === "DE";
  return [
    de ? `Hallo ${params.name},` : `Hi ${params.name},`,
    ...customerParagraphs(params).map(p => (typeof p === "string" ? p : p.code)),
    de ? "Herzliche Grüße,\nRicha" : "Warmly,\nRicha",
  ].join("\n\n");
}

function renderCustomerEmailHtml(params: CustomerParams) {
  const de = params.lang === "DE";
  const body = customerParagraphs(params)
    .map(p => typeof p === "string"
      ? `<p>${escapeHtml(p)}</p>`
      : `<p style="font-size: 22px; font-weight: 700; letter-spacing: 1px;">${escapeHtml(p.code)}</p>`)
    .join("\n      ");
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
      <p>${de ? `Hallo ${escapeHtml(params.name)},` : `Hi ${escapeHtml(params.name)},`}</p>
      ${body}
      <p>${de ? "Herzliche Grüße,<br/>Richa" : "Warmly,<br/>Richa"}</p>
    </div>
  `;
}
