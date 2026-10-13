import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin.js";
import { sendEmail } from "./mailer.js";
import { HttpError, clientKey, enforceRateLimit, safeEqual } from "./engagement.js";
import { adminSubject, escapeHtml, getSiteUrl } from "./util.js";
import { withNotice } from "./withdrawal.js";
import {
  COURSES,
  COURSE_CONTACT_EMAIL,
  bookedSessions,
  formatEuro,
  formatSessionDate,
  isCourseId,
  meetUrlFor,
  type CourseId,
  type CourseInfo,
  type CourseSession,
  type Lang,
} from "./courses.js";
import { emailKey, ensureAlumniCode, normalizeCode, quote, redeemCode, type Quote } from "./discounts.js";
import { buildCourseIcs } from "./ics.js";
import { renderInvoicePdf, reserveInvoiceNumber, type InvoiceData } from "./invoice.js";
import { hasStripe, stripeRequest, verifyWebhook, WebhookSignatureError, type CheckoutSession } from "./stripe.js";

// Online course payments via Stripe Checkout (Phase 2). All routes live in
// api/notify-course-booking.ts and are reached through vercel.json rewrites,
// because the Hobby plan caps a deployment at 12 functions:
//
//   POST /api/course-quote      {course, email, code}  price incl. discount
//   POST /api/course-checkout   {requestId, code}      Stripe Checkout URL
//   POST /api/stripe-webhook    Stripe events          marks paid, invoice,
//                                                      confirmation + .ics
//   GET  /api/course-reminders  daily Vercel cron      24 h reminders and
//                                                      alumni codes
//
// The booking itself is still created by the browser in courseBookings
// (firestore.rules); everything about payment is written here with the admin
// SDK only — the client can never mark a booking paid.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const refCodeFor = (bookingId: string) => `CRS-${bookingId.slice(-6).toUpperCase()}`;

function contactFor(course: CourseInfo): string {
  return course.contactEmail ?? COURSE_CONTACT_EMAIL;
}

function adminRecipients(): string {
  return process.env.COURSE_NOTIFY_EMAIL || `${COURSE_CONTACT_EMAIL}, richa@niramay.me`;
}

function discountLabel(discount: Quote["discount"], lang: Lang): string | null {
  if (!discount) return null;
  const de = lang === "DE";
  const name = discount.kind === "early_bird"
    ? de ? "Frühbucherrabatt" : "Early-bird discount"
    : discount.kind === "alumni"
      ? de ? `Alumni-Rabatt (${discount.code})` : `Alumni discount (${discount.code})`
      : de ? `Willkommensrabatt (${discount.code})` : `Welcome discount (${discount.code})`;
  return `${name} ${discount.percent}%`;
}

function upcoming(sessions: CourseSession[], now = Date.now()): boolean {
  return sessions.some((s) => new Date(s.start).getTime() > now);
}

async function readJson(req: VercelRequest): Promise<Record<string, unknown>> {
  const body = req.body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body as Record<string, unknown>;
  try {
    return JSON.parse(Buffer.isBuffer(body) ? body.toString("utf8") : String(body ?? "{}"));
  } catch {
    throw new HttpError(400, "invalid_json");
  }
}

// ---------------------------------------------------------------- quote

export async function handleQuote(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    const body = await readJson(req);
    if (!isCourseId(body.course)) throw new HttpError(400, "unknown_course");
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const db = getAdminDb();
    // Code lookups are cheap to brute-force otherwise.
    await enforceRateLimit(db, "course_quote", clientKey(req), 30, 3600);
    const result = await quote(db, body.course, COURSES[body.course], body.code, email);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
    console.error("course quote failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------- checkout

export async function handleCheckout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    if (!hasStripe()) throw new HttpError(503, "payments_not_configured");
    const body = await readJson(req);
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId)) throw new HttpError(400, "invalid_request");

    const db = getAdminDb();
    await enforceRateLimit(db, "course_checkout", clientKey(req), 20, 3600);
    const ref = db.collection("courseBookings").doc(requestId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpError(404, "booking_not_found");
    const booking = snap.data() as Record<string, any>;
    if (!isCourseId(booking.course)) throw new HttpError(400, "unknown_course");
    if (booking.paid) throw new HttpError(409, "already_paid");
    const courseId: CourseId = booking.course;
    const course = COURSES[courseId];
    const sessions = bookedSessions(course, booking.session);
    if (sessions.length === 0 || !upcoming(sessions)) throw new HttpError(410, "course_over");

    const lang: Lang = booking.lang === "DE" ? "DE" : "EN";
    const email = String(booking.email || "").trim();
    const code = normalizeCode(body.code);
    const { quote: price, codeProblem } = await quote(db, courseId, course, code, email);
    if (code && codeProblem) throw new HttpError(400, codeProblem);

    const site = getSiteUrl(req);
    const coursePath = `${lang === "DE" ? "/de" : ""}/courses/${courseId}`;
    const refCode = refCodeFor(requestId);
    const sessionNote = course.pickOne ? sessions[0].label[lang] : course[lang].schedule;
    const metadata = {
      bookingId: requestId,
      course: courseId,
      refCode,
      discountKind: price.discount?.kind ?? "",
      discountPercent: String(price.discount?.percent ?? 0),
      discountCode: price.discount?.code ?? "",
    };
    const checkout = await stripeRequest<CheckoutSession>(
      "POST",
      "/checkout/sessions",
      {
        mode: "payment",
        locale: lang === "DE" ? "de" : "en",
        customer_email: EMAIL_RE.test(email) ? email : undefined,
        client_reference_id: requestId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: price.totalCents,
              product_data: {
                name: course[lang].title,
                description: [sessionNote, discountLabel(price.discount, lang)].filter(Boolean).join(" · ").slice(0, 500),
              },
            },
          },
        ],
        metadata,
        payment_intent_data: { description: `${refCode} ${course.EN.title}`.slice(0, 350), metadata },
        // Stripe's minimum is 30 minutes.
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        success_url: `${site}${coursePath}?booking=paid&ref=${refCode}`,
        cancel_url: `${site}${coursePath}?booking=cancelled`,
      },
      // Same booking + price → same Checkout Session within Stripe's 24 h
      // idempotency window, so a double click doesn't create two.
      `checkout-${requestId}-${price.totalCents}-${price.discount?.code ?? price.discount?.kind ?? "none"}`,
    );
    await ref.update({
      checkout: {
        sessionId: checkout.id,
        totalCents: price.totalCents,
        discount: price.discount,
        createdAt: FieldValue.serverTimestamp(),
      },
    });
    if (!checkout.url) throw new Error("Stripe returned no checkout URL");
    return res.status(200).json({ url: checkout.url });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
    console.error("course checkout failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}

// ---------------------------------------------------------------- webhook

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  // Vercel's helpers buffer the body and replay it on the stream, so the raw
  // bytes Stripe signed are still readable here (as long as req.body hasn't
  // been touched — it's a lazy parser over the same buffer).
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export async function handleStripeWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  let event: ReturnType<typeof verifyWebhook>;
  try {
    const raw = await readRawBody(req);
    const signature = req.headers["stripe-signature"];
    event = verifyWebhook(raw, Array.isArray(signature) ? signature[0] : signature);
  } catch (error) {
    console.error("stripe webhook rejected:", error instanceof WebhookSignatureError ? error.message : error);
    return res.status(400).json({ error: "invalid_signature" });
  }

  console.log(`stripe webhook: ${event.type} ${event.id}`);
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as CheckoutSession;
      if (session.payment_status === "paid") await fulfil(session);
    } else if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as CheckoutSession;
      await sendEmail({
        to: adminRecipients(),
        subject: adminSubject(`Course payment FAILED — ${session.metadata?.refCode ?? session.id}`),
        text: `A delayed payment (e.g. SEPA Direct Debit) failed for booking ${session.metadata?.bookingId}. The booking stays unpaid; contact the customer (${session.customer_details?.email ?? "unknown email"}).`,
        html: `<p>A delayed payment (e.g. SEPA Direct Debit) failed for booking <b>${escapeHtml(session.metadata?.refCode)}</b>. The booking stays unpaid; contact the customer (${escapeHtml(session.customer_details?.email ?? "unknown email")}).</p>`,
        tag: "admin-course",
      });
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    // A 500 makes Stripe retry the event (with backoff, for up to 3 days);
    // fulfil() is idempotent.
    console.error(`stripe webhook ${event.type} failed:`, error);
    return res.status(500).json({ error: "server_error" });
  }
}

async function fulfil(session: CheckoutSession): Promise<void> {
  const bookingId = session.metadata?.bookingId;
  if (!bookingId) {
    console.warn("checkout session without bookingId, ignored:", session.id);
    return;
  }
  const db = getAdminDb();
  const ref = db.collection("courseBookings").doc(bookingId);
  const paidAt = new Date();

  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error(`booking ${bookingId} not found`);
    const booking = snap.data() as Record<string, any>;
    if (!isCourseId(booking.course)) throw new Error(`booking ${bookingId} has unknown course`);
    if (booking.paid) return { booking, invoice: booking.invoice as InvoiceData };

    // All reads before any write.
    const courseId: CourseId = booking.course;
    const code = session.metadata?.discountCode || "";
    const codeSnap = code ? await tx.get(db.collection("discountCodes").doc(code)) : null;
    const reserved = await reserveInvoiceNumber(tx, db, paidAt);

    const course = COURSES[courseId];
    const lang: Lang = booking.lang === "DE" ? "DE" : "EN";
    const totalCents = session.amount_total ?? course.amountCents;
    const percent = Number(session.metadata?.discountPercent) || 0;
    const discountKind = session.metadata?.discountKind as NonNullable<Quote["discount"]>["kind"] | "";
    const discount: Quote["discount"] = discountKind ? { kind: discountKind, percent, ...(code ? { code } : {}) } : null;
    const sessions = bookedSessions(course, booking.session);
    const invoice: InvoiceData = {
      number: reserved.number,
      issuedAt: paidAt.toISOString(),
      lang,
      bookingId,
      refCode: refCodeFor(bookingId),
      customerName: String(booking.name || session.customer_details?.name || ""),
      customerEmail: String(booking.email || session.customer_details?.email || ""),
      item: course[lang].title,
      servicePeriod: sessions
        .map((s) => new Intl.DateTimeFormat(lang === "DE" ? "de-DE" : "en-GB", { dateStyle: "medium", timeZone: "Europe/Berlin" }).format(new Date(s.start)))
        .join(", "),
      baseCents: course.amountCents,
      discountLabel: discountLabel(discount, lang),
      discountCents: Math.max(0, course.amountCents - totalCents),
      totalCents,
      paymentMethod: "Stripe",
    };

    reserved.commit();
    if (codeSnap) redeemCode(tx, codeSnap, courseId);
    tx.set(db.collection("invoices").doc(invoice.number), { ...invoice, createdAt: FieldValue.serverTimestamp() });
    tx.update(ref, {
      paid: true,
      paidAt: FieldValue.serverTimestamp(),
      payment: {
        provider: "stripe",
        checkoutSessionId: session.id,
        paymentIntent: session.payment_intent ?? null,
        amountCents: totalCents,
        currency: session.currency ?? "eur",
        discount,
      },
      invoiceNumber: invoice.number,
      invoice,
      remindersSent: [],
      alumniMailPending: true,
    });
    return { booking: { ...booking, paid: true }, invoice };
  });

  const { booking, invoice } = outcome;
  if (booking.confirmationSentAt) return;
  const course = COURSES[booking.course as CourseId];

  // Join the alumni list now; the code itself is emailed after the course.
  if (EMAIL_RE.test(String(booking.email || "").trim())) {
    await ensureAlumniCode(db, booking.email, booking.name, booking.course);
  }
  await sendPaidEmails(bookingId, booking, course, invoice);
  await ref.update({ confirmationSentAt: FieldValue.serverTimestamp() });
  console.log(`course booking paid: ${refCodeFor(bookingId)} ${booking.course} invoice ${invoice.number} (${invoice.totalCents} cents), confirmation sent`);
}

function sessionListText(course: CourseInfo, sessions: CourseSession[], lang: Lang): string[] {
  return sessions.map((s) => `• ${formatSessionDate(s.start, lang)}–${new Intl.DateTimeFormat(lang === "DE" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(s.end))} (${lang === "DE" ? "deutsche Zeit" : "German time"})${course.pickOne ? "" : ` – ${s.label[lang]}`}`);
}

function wrapHtml(paragraphs: string[]): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524; line-height: 1.5;">
      ${paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`).join("\n      ")}
    </div>
  `;
}

async function sendPaidEmails(bookingId: string, booking: Record<string, any>, course: CourseInfo, invoice: InvoiceData) {
  const lang: Lang = booking.lang === "DE" ? "DE" : "EN";
  const de = lang === "DE";
  const sessions = bookedSessions(course, booking.session);
  const contact = contactFor(course);
  const refCode = refCodeFor(bookingId);
  const meetUrl = meetUrlFor(course, sessions[0]);
  const pdf = await renderInvoicePdf(invoice);
  const ics = buildCourseIcs({ bookingId, course, sessions, lang, contactEmail: contact });
  const invoiceFile = { filename: `${de ? "Rechnung" : "Invoice"}-${invoice.number}.pdf`, content: pdf, contentType: "application/pdf" };
  const icsFile = { filename: "niramay-course.ics", content: Buffer.from(ics, "utf8"), contentType: "text/calendar; charset=utf-8" };

  if (EMAIL_RE.test(String(booking.email || "").trim())) {
    const paragraphs = [
      de ? `Hallo ${booking.name},` : `Hi ${booking.name},`,
      de
        ? `vielen Dank für Ihre Anmeldung zu „${course.DE.title}“. Ihre Zahlung über ${formatEuro(invoice.totalCents, lang)} ist eingegangen – Ihr Platz ist bestätigt (Referenz ${refCode}).`
        : `Thank you for booking "${course.EN.title}". We've received your payment of ${formatEuro(invoice.totalCents, lang)} — your place is confirmed (reference ${refCode}).`,
      `${de ? "Termine" : "Dates"}:\n${sessionListText(course, sessions, lang).join("\n")}`,
      meetUrl
        ? de ? `Der Kurs findet online über Google Meet statt: ${meetUrl}` : `The course takes place online via Google Meet: ${meetUrl}`
        : de ? "Der Kurs findet online über Google Meet statt. Den Link senden wir Ihnen einen Tag vor der Einheit per E-Mail." : "The course takes place online via Google Meet. We'll email you the link one day before the session.",
      de
        ? "Im Anhang finden Sie Ihre Rechnung und eine Kalenderdatei (.ics) mit allen Terminen – einfach öffnen, um sie in Ihren Kalender zu übernehmen. Zusätzlich erinnern wir Sie 24 Stunden vor jeder Einheit per E-Mail."
        : "Attached are your invoice and a calendar file (.ics) with all dates — open it to add them to your calendar. We'll also remind you by email 24 hours before each session.",
      de
        ? `Bei Fragen schreiben Sie uns an ${contact} (oder antworten Sie einfach auf diese E-Mail).`
        : `If you have any questions, email us at ${contact} (or simply reply to this email).`,
      de ? "Herzliche Grüße,\nRiju & Richa" : "Warmly,\nRiju & Richa",
    ];
    // Contract confirmation incl. withdrawal information (§ 312f Abs. 2 BGB).
    const body = withNotice({ text: paragraphs.join("\n\n"), html: wrapHtml(paragraphs) }, lang, booking.legalAcks?.earlyStart === true);
    await sendEmail({
      to: booking.email,
      replyTo: contact,
      subject: de ? `Anmeldung bestätigt: ${course.DE.title} — ${refCode}` : `Booking confirmed: ${course.EN.title} — ${refCode}`,
      ...body,
      attachments: [invoiceFile, icsFile],
      tag: "customer-course-paid",
    });
  }

  const discount = invoice.discountLabel ? ` (${invoice.discountLabel}: -${formatEuro(invoice.discountCents, "EN")})` : "";
  const adminLines = [
    `Paid via Stripe: ${formatEuro(invoice.totalCents, "EN")}${discount}`,
    `Invoice: ${invoice.number} (PDF attached — keep for the books)`,
    `Course: ${course.EN.title}`,
    ...(course.pickOne ? [`Session: ${sessions[0]?.label.EN ?? "—"}`] : []),
    `Ref: ${refCode} — language: ${booking.lang}`,
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `WhatsApp: ${booking.whatsapp}`,
    `Notes: ${booking.notes || "—"}`,
    `Early start requested: ${booking.legalAcks?.earlyStart ? "yes" : "no"}`,
    ...(meetUrl ? [] : ["", "No Google Meet link is set for this course yet (api/_lib/courses.ts) — send it to the participant yourself."]),
  ];
  await sendEmail({
    to: adminRecipients(),
    replyTo: EMAIL_RE.test(String(booking.email || "")) ? booking.email : undefined,
    subject: adminSubject(`Paid course booking — ${course.EN.title} — ${refCode}`),
    text: adminLines.join("\n"),
    html: wrapHtml([adminLines.join("\n")]),
    attachments: [invoiceFile],
    tag: "admin-course",
  });
}

// ---------------------------------------------------------------- daily cron

// Runs once a day (Hobby plan limit, see vercel.json "crons") in the early
// evening, German time. Each run reminds participants of every session that
// starts between 12 and 36 hours later — so each session falls into exactly
// one run, roughly a day ahead. The .ics files carry their own precise
// 24-hour alarm on top.
const WINDOW_START_MS = 12 * 60 * 60 * 1000;
const WINDOW_END_MS = 36 * 60 * 60 * 1000;

export async function handleDailyCron(req: VercelRequest, res: VercelResponse) {
  // Vercel sends "Authorization: Bearer $CRON_SECRET" with cron requests.
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(`Bearer ${secret}`, req.headers.authorization)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const db = getAdminDb();
  const report = { reminders: 0, alumniMails: 0, errors: 0 };
  const now = Date.now();

  for (const [courseId, course] of Object.entries(COURSES) as [CourseId, CourseInfo][]) {
    for (const session of course.sessions) {
      const startsIn = new Date(session.start).getTime() - now;
      if (startsIn < WINDOW_START_MS || startsIn >= WINDOW_END_MS) continue;
      // Stripe-paid bookings, plus UPI bookings whose payment was reported.
      const [paid, claimed] = await Promise.all([
        db.collection("courseBookings").where("course", "==", courseId).where("paid", "==", true).get(),
        db.collection("courseBookings").where("course", "==", courseId).where("paymentClaimed", "==", true).get(),
      ]);
      const docs = new Map([...paid.docs, ...claimed.docs].map((d) => [d.id, d]));
      for (const doc of docs.values()) {
        const booking = doc.data();
        if (course.pickOne && booking.session !== session.id) continue;
        if (Array.isArray(booking.remindersSent) && booking.remindersSent.includes(session.id)) continue;
        try {
          await sendReminder(booking, course, session);
          await doc.ref.update({ remindersSent: FieldValue.arrayUnion(session.id) });
          report.reminders++;
        } catch (error) {
          report.errors++;
          console.error(`reminder for ${doc.id} / ${session.id} failed:`, error);
        }
      }
    }
  }

  // Alumni codes, once the booked course is over.
  const pending = await db.collection("courseBookings").where("alumniMailPending", "==", true).limit(100).get();
  for (const doc of pending.docs) {
    const booking = doc.data();
    if (!isCourseId(booking.course)) continue;
    const course = COURSES[booking.course];
    const sessions = bookedSessions(course, booking.session);
    const lastEnd = Math.max(...sessions.map((s) => new Date(s.end).getTime()));
    if (!(lastEnd < now)) continue;
    try {
      const email = String(booking.email || "").trim().toLowerCase();
      // Someone who objected (§ 7 Abs. 3 UWG) is marked optedOut: true on
      // their alumni/{id} doc by hand in the Firebase console.
      const optedOut = EMAIL_RE.test(email) && (await db.collection("alumni").doc(emailKey(email)).get()).get("optedOut") === true;
      if (EMAIL_RE.test(email) && !optedOut) {
        const code = await ensureAlumniCode(db, email, booking.name, booking.course);
        await sendAlumniEmail(booking, course, code);
        report.alumniMails++;
      }
      await doc.ref.update({ alumniMailPending: false, alumniMailSentAt: FieldValue.serverTimestamp() });
    } catch (error) {
      report.errors++;
      console.error(`alumni mail for ${doc.id} failed:`, error);
    }
  }

  return res.status(200).json(report);
}

async function sendReminder(booking: Record<string, any>, course: CourseInfo, session: CourseSession) {
  const email = String(booking.email || "").trim();
  if (!EMAIL_RE.test(email)) return;
  const lang: Lang = booking.lang === "DE" ? "DE" : "EN";
  const de = lang === "DE";
  const contact = contactFor(course);
  const meetUrl = meetUrlFor(course, session);
  const when = sessionListText(course, [session], lang)[0].replace(/^• /, "");
  const paragraphs = [
    de ? `Hallo ${booking.name},` : `Hi ${booking.name},`,
    de ? `eine kurze Erinnerung: „${course.DE.title}“ findet morgen statt.` : `A quick reminder: "${course.EN.title}" is on tomorrow.`,
    `${de ? "Wann" : "When"}: ${when}`,
    meetUrl
      ? `${de ? "Google-Meet-Link" : "Google Meet link"}: ${meetUrl}`
      : de ? `Den Google-Meet-Link senden wir Ihnen in Kürze. Falls er nicht ankommt, schreiben Sie uns an ${contact}.` : `We'll send you the Google Meet link shortly. If it doesn't arrive, email us at ${contact}.`,
    de
      ? "Bitte halten Sie eine Matte, bequeme Kleidung und etwas Wasser bereit und wählen Sie sich ein paar Minuten früher ein."
      : "Please have a mat, comfortable clothes and some water ready, and join a few minutes early.",
    de ? "Bis morgen!\nRiju & Richa" : "See you tomorrow!\nRiju & Richa",
  ];
  await sendEmail({
    to: email,
    replyTo: contact,
    subject: de ? `Morgen: ${course.DE.title}` : `Tomorrow: ${course.EN.title}`,
    text: paragraphs.join("\n\n"),
    html: wrapHtml(paragraphs),
    tag: "customer-course-reminder",
  });
}

async function sendAlumniEmail(booking: Record<string, any>, course: CourseInfo, code: string) {
  const lang: Lang = booking.lang === "DE" ? "DE" : "EN";
  const de = lang === "DE";
  const contact = contactFor(course);
  const paragraphs = [
    de ? `Hallo ${booking.name},` : `Hi ${booking.name},`,
    de
      ? `vielen Dank, dass Sie bei „${course.DE.title}“ dabei waren! Als Teil unserer Niramay-Alumni erhalten Sie Ihren persönlichen Code:`
      : `Thank you for joining "${course.EN.title}"! As one of our Niramay alumni, here is your personal code:`,
    code,
    de
      ? "Damit erhalten Sie Rabatt auf jeden weiteren Kurs, den Sie auf www.niramay.me buchen (einmal pro Kurs, mit dieser E-Mail-Adresse; nicht mit anderen Rabatten kombinierbar)."
      : "It gives you a discount on every further course you book on www.niramay.me (once per course, with this email address; not combinable with other discounts).",
    de ? `Wir freuen uns über Ihre Rückmeldung – antworten Sie einfach auf diese E-Mail (${contact}).` : `We'd love to hear how it went — just reply to this email (${contact}).`,
    // § 7 Abs. 3 UWG: the right to object, with every such email.
    de
      ? "Sie möchten keine solchen E-Mails mehr erhalten? Antworten Sie einfach mit „Abmelden“ – wir nehmen Sie dann von der Alumni-Liste. Es entstehen dabei nur Übermittlungskosten nach den Basistarifen."
      : "Don't want emails like this? Just reply \"unsubscribe\" and we'll take you off the alumni list. This costs nothing beyond the transmission costs at the basic rates.",
    de ? "Herzliche Grüße,\nRiju & Richa" : "Warmly,\nRiju & Richa",
  ];
  await sendEmail({
    to: booking.email,
    replyTo: contact,
    subject: de ? "Danke! Ihr persönlicher Niramay-Alumni-Code" : "Thank you! Your personal Niramay alumni code",
    text: paragraphs.join("\n\n"),
    html: wrapHtml(paragraphs),
    tag: "customer-alumni",
  });
}

