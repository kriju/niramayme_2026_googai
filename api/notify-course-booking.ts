import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { adminSubject, escapeHtml } from "./_lib/util.js";

// Called by the browser right after CourseIntakeModal (see src/App.tsx)
// writes/updates a doc in the courseBookings Firestore collection — once when
// the visitor submits their details, and again when they claim to have paid.
// Like notify-reiki-request.ts, it re-fetches the doc server-side by ID
// rather than trusting whatever the client posts, so it can't be used to
// send made-up content to anyone.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_EMAIL = "riju.kansal@niramay.me";

type NotifyKind = "submitted" | "payment_claimed";
type CourseId = "yoga-stress-immunity-sleep";
type Lang = "EN" | "DE";

// Kept in sync by hand with the bookable COURSES entries in src/constants.ts
// (duplicated rather than imported, same reasoning as api/sitemap.ts).
const COURSES: Record<CourseId, Record<Lang, { title: string; schedule: string; price: string }>> = {
  "yoga-stress-immunity-sleep": {
    EN: {
      title: "Yoga for Stress, Immunity & Sleep: 8-Session Series",
      schedule: "every Tuesday & Thursday, 8:00–9:00 pm (German time), for 4 weeks",
      price: "€79",
    },
    DE: {
      title: "Yoga für Stress, Immunität & Schlaf: Serie mit 8 Einheiten",
      schedule: "jeden Dienstag & Donnerstag, 20:00–21:00 Uhr (deutsche Zeit), 4 Wochen lang",
      price: "79 €",
    },
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
    const snap = await db.collection("courseBookings").doc(requestId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Course booking not found" });
    }
    const booking = snap.data() as Record<string, any>;
    if (!(booking.course in COURSES)) {
      return res.status(400).json({ error: "Unknown course" });
    }
    if (kind === "payment_claimed" && !booking.paymentClaimed) {
      return res.status(400).json({ error: "Payment has not been claimed" });
    }
    const course = COURSES[booking.course as CourseId];

    // Derived the same way the client derives it (src/App.tsx) — never
    // stored separately, so the two can't drift.
    const refCode = `CRS-${requestId.slice(-6).toUpperCase()}`;
    const lang: Lang = booking.lang === "DE" ? "DE" : "EN";

    const createdAt: Date = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date();
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

    const adminParams = { refCode, kind, booking, formattedDate, courseTitle: course.EN.title, price: course.EN.price };
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.COURSE_NOTIFY_EMAIL || `${CONTACT_EMAIL}, richa@niramay.me`,
      replyTo: EMAIL_RE.test(String(booking.email || "")) ? booking.email : undefined,
      subject: adminSubject(kind === "submitted"
        ? `New course booking — ${course.EN.title} — ${refCode}`
        : `Payment claimed for course — ${refCode}`),
      text: renderAdminEmailText(adminParams),
      html: renderAdminEmailHtml(adminParams),
    });

    if (EMAIL_RE.test(String(booking.email || "").trim())) {
      const customerParams = { refCode, kind, lang, name: booking.name, ...course[lang] };
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: booking.email,
        replyTo: CONTACT_EMAIL,
        subject: customerSubject(customerParams),
        text: renderCustomerEmailText(customerParams),
        html: renderCustomerEmailHtml(customerParams),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("notify-course-booking failed:", error);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}

type AdminParams = {
  refCode: string;
  kind: NotifyKind;
  booking: Record<string, any>;
  formattedDate: string;
  courseTitle: string;
  price: string;
};

function renderAdminEmailText({ refCode, kind, booking, formattedDate, courseTitle, price }: AdminParams) {
  return [
    kind === "submitted" ? "New course booking (awaiting payment)" : "Payment claimed for a course booking",
    `Submitted ${formattedDate} (Europe/Berlin) — ref ${refCode} — language: ${booking.lang}`,
    "",
    `Course: ${courseTitle} (${price})`,
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `WhatsApp: ${booking.whatsapp}`,
    `Notes: ${booking.notes || "—"}`,
    `Payment claimed: ${booking.paymentClaimed ? "Yes" : "No"}`,
    "",
    `Look for ${refCode} in the payment note (PayPal remark or bank transfer reference) to match the payment. Remember to email them the meeting link one day before the session.`,
  ].join("\n");
}

function renderAdminEmailHtml({ refCode, kind, booking, formattedDate, courseTitle, price }: AdminParams) {
  const row = (label: string, value: string) => `
      <tr>
        <td style="padding: 6px 0; color: #78716c; width: 160px; vertical-align: top;">${label}</td>
        <td style="padding: 6px 0;">${value}</td>
      </tr>`;
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
    <h2 style="font-size: 20px; margin-bottom: 4px;">
      ${kind === "submitted" ? "New course booking (awaiting payment)" : "Payment claimed for a course booking"}
    </h2>
    <p style="color: #78716c; margin-top: 0;">Submitted ${escapeHtml(formattedDate)} (Europe/Berlin) &middot; ref ${escapeHtml(refCode)} &middot; language: ${escapeHtml(booking.lang)}</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      ${row("Course", `<strong>${escapeHtml(courseTitle)}</strong> (${escapeHtml(price)})`)}
      ${row("Name", `<strong>${escapeHtml(booking.name)}</strong>`)}
      ${row("Email", escapeHtml(booking.email))}
      ${row("WhatsApp", escapeHtml(booking.whatsapp))}
      ${row("Notes", booking.notes ? escapeHtml(booking.notes).replace(/\n/g, "<br/>") : "&mdash;")}
      ${row("Payment claimed", booking.paymentClaimed ? "Yes" : "No")}
    </table>

    <div style="background: #f5f5f4; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      Look for <strong>${escapeHtml(refCode)}</strong> in the payment note (PayPal remark or bank transfer reference) to match the payment.
      Remember to email them the meeting link one day before the session.
    </div>

    <p style="color: #a8a29e; font-size: 12px; margin-top: 24px;">
      Full details are also stored in the courseBookings collection in Firestore.
    </p>
  </div>
  `;
}

type CustomerParams = {
  refCode: string;
  kind: NotifyKind;
  lang: Lang;
  name: string;
  title: string;
  schedule: string;
  price: string;
};

function customerSubject({ refCode, kind, lang, title }: CustomerParams) {
  if (kind === "payment_claimed") return lang === "DE" ? `Anmeldung bestätigt: ${title} — ${refCode}` : `Booking confirmed: ${title} — ${refCode}`;
  return lang === "DE" ? `Ihre Kursreservierung — ${refCode}` : `Your course reservation — ${refCode}`;
}

// Paragraphs shared by the text and HTML bodies; `code` marks where the
// reference code is shown on a line of its own.
function customerParagraphs({ refCode, kind, lang, title, schedule, price }: CustomerParams): (string | { code: string })[] {
  const de = lang === "DE";
  const questions = de
    ? `Bei Fragen schreiben Sie uns jederzeit an ${CONTACT_EMAIL} (oder antworten Sie einfach auf diese E-Mail).`
    : `If you have any questions, email us at ${CONTACT_EMAIL} (or simply reply to this email).`;
  if (kind === "payment_claimed") {
    return [
      de
        ? `vielen Dank für Ihre Anmeldung zu „${title}“ – wir haben Ihre Zahlungsmeldung für Referenz ${refCode} erhalten. Die Einheiten finden ${schedule} online statt.`
        : `Thank you for joining "${title}" — we've received your payment for reference ${refCode}. The sessions take place online ${schedule}.`,
      de
        ? "Sie erhalten den Online-Meeting-Link einen Tag vor der Einheit per E-Mail an diese Adresse."
        : "You will receive the online meeting link by email at this address one day before the session.",
      questions,
    ];
  }
  return [
    de ? `vielen Dank für Ihre Reservierung: ${title}. Ihr Referenzcode ist:` : `Thank you for reserving your place: ${title}. Your reference code is:`,
    { code: refCode },
    de
      ? `Bitte zahlen Sie ${price} per PayPal (richa@niramay.me) oder Überweisung (IBAN DE08 1001 1001 2721 9373 31, BIC NTSBDEB1XXX) und geben Sie diesen Code als Verwendungszweck an. Klicken Sie danach auf unserer Website auf „Ich habe bezahlt“, um Ihren Platz zu bestätigen.`
      : `Please pay ${price} via PayPal (richa@niramay.me) or bank transfer (IBAN DE08 1001 1001 2721 9373 31, BIC NTSBDEB1XXX) with this code as the payment note, then click "I've Paid" on our website to confirm your place.`,
    questions,
  ];
}

function renderCustomerEmailText(params: CustomerParams) {
  const de = params.lang === "DE";
  return [
    de ? `Hallo ${params.name},` : `Hi ${params.name},`,
    ...customerParagraphs(params).map(p => (typeof p === "string" ? p : p.code)),
    de ? "Herzliche Grüße,\nRiju & Richa" : "Warmly,\nRiju & Richa",
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
      <p>${de ? "Herzliche Grüße,<br/>Riju &amp; Richa" : "Warmly,<br/>Riju &amp; Richa"}</p>
    </div>
  `;
}
