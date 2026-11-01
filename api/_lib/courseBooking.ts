import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin.js";
import { HttpError, clientKey, enforceRateLimit } from "./engagement.js";
import { readJson } from "./coursePayments.js";
import { assertBookable, getCourse, seatsTaken } from "./courseStore.js";

// POST /api/course-booking (vercel.json rewrite → notify-course-booking?op=book)
//
// Creates a booking for a course made in the admin section. Unlike the two
// courses defined in code (whose bookings the browser writes straight to
// Firestore, checked by firestore.rules), these are checked here, so the
// rules don't have to list every course and date: the course must be
// published and open, the chosen date upcoming, and a seat free. The stored
// document has exactly the fields the rules require of browser bookings,
// so payment, emails and the UPI "I've paid" flag work the same way.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : "";
}

function legalAcks(value: unknown) {
  const v = (value ?? {}) as Record<string, unknown>;
  const version = text(v.version, 20);
  if (!version || v.agb !== true || v.withdrawalInfo !== true || typeof v.earlyStart !== "boolean") {
    throw new HttpError(400, "legal_acks_required");
  }
  return { version, agb: true, withdrawalInfo: true, earlyStart: v.earlyStart };
}

export async function handleCourseBooking(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    const body = await readJson(req);
    const db = getAdminDb();
    await enforceRateLimit(db, "course_book", clientKey(req), 20, 3600);

    const courseId = text(body.course, 80);
    const course = await getCourse(db, courseId);
    if (!course || !course.dynamic) throw new HttpError(400, "unknown_course");

    const name = text(body.name, 100);
    const email = text(body.email, 200);
    const whatsapp = text(body.whatsapp, 40);
    const notes = text(body.notes, 2000);
    if (!name || !EMAIL_RE.test(email) || !whatsapp) throw new HttpError(400, "missing_fields");
    if (body.consentAccepted !== true) throw new HttpError(400, "consent_required");
    const acks = legalAcks(body.legalAcks);
    const lang = body.lang === "DE" ? "DE" : "EN";
    const session = course.pickOne ? text(body.session, 40) : undefined;

    assertBookable(course, session);
    // A first check, so a full course says so before the form is sent on;
    // the seat itself is held when Checkout starts (coursePayments.ts).
    if (course.seatLimit && (await seatsTaken(db, courseId, course, session)) >= course.seatLimit) {
      throw new HttpError(409, "course_full");
    }

    const ref = await db.collection("courseBookings").add({
      course: courseId,
      name,
      email,
      whatsapp,
      notes,
      ...(session ? { session } : {}),
      consentAccepted: true,
      lang,
      createdAt: FieldValue.serverTimestamp(),
      paymentClaimed: false,
      legalAcks: acks,
    });
    return res.status(200).json({ requestId: ref.id });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
    console.error("course booking failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}
