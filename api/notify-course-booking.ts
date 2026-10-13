import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { sendEmail } from "./_lib/mailer.js";
import { adminSubject, escapeHtml } from "./_lib/util.js";
import { withNotice } from "./_lib/withdrawal.js";

import { COURSES, COURSE_CONTACT_EMAIL, bookedSessions, isCourseId, type CourseId, type Lang } from "./_lib/courses.js";
import { handleCheckout, handleDailyCron, handleQuote, handleStripeWebhook, refCodeFor } from "./_lib/coursePayments.js";
import { buildCourseIcs } from "./_lib/ics.js";

// Course bookings. Besides the notification emails below, this function also
// serves the Stripe payment routes (see api/_lib/coursePayments.ts), reached
// through vercel.json rewrites with ?op=… because the Hobby plan caps a
// deployment at 12 functions.
//
// The notifications are for the manual UPI (INR) payment only: card/SEPA/
// PayPal payments in EUR go through Stripe Checkout, whose webhook sends the
// confirmation. The browser calls this right after CourseIntakeModal (see
// src/App.tsx) writes a doc in the courseBookings Firestore collection and
// the visitor picks UPI — once when they choose it, and again when they claim
// to have paid. Like notify-reiki-request.ts, it re-fetches the doc
// server-side by ID rather than trusting whatever the client posts, so it
// can't be used to send made-up content to anyone.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_EMAIL = COURSE_CONTACT_EMAIL;

type NotifyKind = "submitted" | "payment_claimed";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  switch (req.query.op) {
    case "quote": return handleQuote(req, res);
    case "checkout": return handleCheckout(req, res);
    case "webhook": return handleStripeWebhook(req, res);
    case "cron": return handleDailyCron(req, res);
  }
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
    if (!isCourseId(booking.course)) {
      return res.status(400).json({ error: "Unknown course" });
    }
    if (kind === "payment_claimed" && !booking.paymentClaimed) {
      return res.status(400).json({ error: "Payment has not been claimed" });
    }
    const course = COURSES[booking.course as CourseId];
    // Only UPI (INR) payments are reported by hand; EUR goes through Stripe.
    if (!course.inrPrice) {
      return res.status(400).json({ error: "This course is paid via Stripe" });
    }

    // Derived the same way the client derives it (src/App.tsx) — never
    // stored separately, so the two can't drift.
    const refCode = refCodeFor(requestId);
    const lang: Lang = booking.lang === "DE" ? "DE" : "EN";
    const session = course.pickOne ? bookedSessions(course, booking.session)[0]?.label : undefined;

    const createdAt: Date = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date();
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(createdAt);

    const adminParams = {
      refCode, kind, booking, formattedDate,
      courseTitle: course.EN.title,
      price: `${course.inrPrice} via UPI`,
      session: session?.EN,
    };
    await sendEmail({
      to: process.env.COURSE_NOTIFY_EMAIL || `${CONTACT_EMAIL}, richa@niramay.me`,
      replyTo: EMAIL_RE.test(String(booking.email || "")) ? booking.email : undefined,
      subject: adminSubject(kind === "submitted"
        ? `New course booking — ${course.EN.title} — ${refCode}`
        : `Payment claimed for course — ${refCode}`),
      text: renderAdminEmailText(adminParams),
      html: renderAdminEmailHtml(adminParams),
      tag: "admin-course",
    });

    if (EMAIL_RE.test(String(booking.email || "").trim())) {
      const customerParams = {
        refCode, kind, lang, name: booking.name, ...course[lang],
        schedule: session?.[lang] ?? course[lang].schedule,
        inrPrice: course.inrPrice,
        contactEmail: course.contactEmail ?? CONTACT_EMAIL,
      };
      await sendEmail({
        to: booking.email,
        replyTo: course.contactEmail ?? CONTACT_EMAIL,
        subject: customerSubject(customerParams),
        // Contract confirmation incl. withdrawal information (§ 312f Abs. 2 BGB).
        // The UPI flow only sends "payment_claimed" now, so both kinds carry it.
        ...withNotice({ text: renderCustomerEmailText(customerParams), html: renderCustomerEmailHtml(customerParams) }, lang, booking.legalAcks?.earlyStart === true),
        // The UPI payment is checked by hand, so this is the participant's
        // confirmation: add the calendar file.
        ...(kind === "payment_claimed"
          ? {
              attachments: [{
                filename: "niramay-course.ics",
                content: Buffer.from(buildCourseIcs({
                  bookingId: requestId,
                  course,
                  sessions: bookedSessions(course, booking.session),
                  lang,
                  contactEmail: course.contactEmail ?? CONTACT_EMAIL,
                }), "utf8"),
                contentType: "text/calendar; charset=utf-8",
              }],
            }
          : {}),
        tag: "customer-course",
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
  session?: string;
};

function renderAdminEmailText({ refCode, kind, booking, formattedDate, courseTitle, price, session }: AdminParams) {
  return [
    kind === "submitted" ? "New course booking (awaiting payment)" : "Payment claimed for a course booking",
    `Submitted ${formattedDate} (Europe/Berlin) — ref ${refCode} — language: ${booking.lang}`,
    "",
    `Course: ${courseTitle} (${price})`,
    ...(session ? [`Session: ${session}`] : []),
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `WhatsApp: ${booking.whatsapp}`,
    `Notes: ${booking.notes || "—"}`,
    `Payment claimed: ${booking.paymentClaimed ? "Yes" : "No"}`,
    "",
    `Look for ${refCode} in the UPI remark to match the payment. They get the automatic 24-hour reminder like Stripe bookings once they've clicked "I've paid".`,
  ].join("\n");
}

function renderAdminEmailHtml({ refCode, kind, booking, formattedDate, courseTitle, price, session }: AdminParams) {
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
      ${session ? row("Session", escapeHtml(session)) : ""}
      ${row("Name", `<strong>${escapeHtml(booking.name)}</strong>`)}
      ${row("Email", escapeHtml(booking.email))}
      ${row("WhatsApp", escapeHtml(booking.whatsapp))}
      ${row("Notes", booking.notes ? escapeHtml(booking.notes).replace(/\n/g, "<br/>") : "&mdash;")}
      ${row("Payment claimed", booking.paymentClaimed ? "Yes" : "No")}
    </table>

    <div style="background: #f5f5f4; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      Look for <strong>${escapeHtml(refCode)}</strong> in the UPI remark to match the payment.
      They get the automatic 24-hour reminder like Stripe bookings once they've clicked "I've paid".
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
  inrPrice?: string;
  contactEmail: string;
};

function customerSubject({ refCode, kind, lang, title }: CustomerParams) {
  if (kind === "payment_claimed") return lang === "DE" ? `Anmeldung bestätigt: ${title} — ${refCode}` : `Booking confirmed: ${title} — ${refCode}`;
  return lang === "DE" ? `Ihre Kursreservierung — ${refCode}` : `Your course reservation — ${refCode}`;
}

// Paragraphs shared by the text and HTML bodies; `code` marks where the
// reference code is shown on a line of its own.
function customerParagraphs({ refCode, kind, lang, title, schedule, price, inrPrice, contactEmail }: CustomerParams): (string | { code: string })[] {
  const de = lang === "DE";
  const questions = de
    ? `Bei Fragen schreiben Sie uns jederzeit an ${contactEmail} (oder antworten Sie einfach auf diese E-Mail).`
    : `If you have any questions, email us at ${contactEmail} (or simply reply to this email).`;
  if (kind === "payment_claimed") {
    return [
      de
        ? `vielen Dank für Ihre Anmeldung zu „${title}“ – wir haben Ihre Zahlungsmeldung für Referenz ${refCode} erhalten. Der Kurs findet ${schedule} online statt.`
        : `Thank you for joining "${title}" — we've received your payment for reference ${refCode}. It takes place online ${schedule}.`,
      de
        ? "Im Anhang finden Sie eine Kalenderdatei (.ics). Den Google-Meet-Link erhalten Sie mit der Erinnerung einen Tag vor der Einheit per E-Mail an diese Adresse."
        : "A calendar file (.ics) is attached. You'll receive the Google Meet link with the reminder one day before the session, by email at this address.",
      questions,
    ];
  }
  return [
    de ? `vielen Dank für Ihre Reservierung: ${title}. Ihr Referenzcode ist:` : `Thank you for reserving your place: ${title}. Your reference code is:`,
    { code: refCode },
    de
      ? `Bitte zahlen Sie ${inrPrice} per UPI (richa944@icici) und geben Sie diesen Code als Verwendungszweck an. Klicken Sie danach auf unserer Website auf „Ich habe bezahlt“, um Ihren Platz zu bestätigen.`
      : `Please pay ${inrPrice} via UPI (richa944@icici) with this code as the payment note, then click "I've Paid" on our website to confirm your place.`,
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
