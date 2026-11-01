import type { Firestore, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { COURSES, isLegacyCourseId, bookedSessions, type CourseInfo } from "./courses.js";
import { normalizeCourse, toCourseInfo, isCourseSlug } from "./courseModel.js";
import { HttpError } from "./engagement.js";

// One way to look up a course for booking, payment, reminders and invoices,
// whichever kind it is: one of the two defined in code (courses.ts) or one
// created in the admin section (published version in coursePrivate/{id}).

export async function getCourse(db: Firestore, id: unknown): Promise<CourseInfo | null> {
  if (isLegacyCourseId(id)) return COURSES[id];
  if (!isCourseSlug(id)) return null;
  const snap = await db.collection("coursePrivate").doc(id).get();
  if (!snap.exists) return null;
  return fromPrivate(id, snap.data() as Record<string, unknown>);
}

function fromPrivate(id: string, data: Record<string, unknown>): CourseInfo {
  return toCourseInfo(normalizeCourse(data.data, id), {
    closedManually: data.closedManually === true,
    archived: data.archived === true,
  });
}

/** Every course that may still have sessions to remind or alumni to email. */
export async function listCourses(db: Firestore): Promise<[string, CourseInfo][]> {
  const stored = await db.collection("coursePrivate").get();
  return [
    ...(Object.entries(COURSES) as [string, CourseInfo][]),
    ...stored.docs.map((doc): [string, CourseInfo] => [doc.id, fromPrivate(doc.id, doc.data())]),
  ];
}

/** How long a seat stays reserved for someone in Stripe Checkout (= its expiry). */
export const SEAT_HOLD_MS = 60 * 60 * 1000;

function takesSeat(doc: QueryDocumentSnapshot, now: number): boolean {
  const d = doc.data();
  if (d.cancelled === true || d.refunded === true) return false;
  if (d.paid === true || d.paymentClaimed === true) return true;
  const held = d.seatHeldUntil?.toMillis?.() ?? 0;
  return held > now;
}

/**
 * Seats taken on a course (series) or on one date (pick one): paid, UPI
 * claimed, or held for an open Checkout. Read inside a transaction when a
 * seat is being taken, so two people can't get the last one.
 */
export async function seatsTaken(
  db: Firestore,
  courseId: string,
  course: CourseInfo,
  sessionId: string | undefined,
  options: { tx?: Transaction; excludeBookingId?: string; now?: number } = {},
): Promise<number> {
  const now = options.now ?? Date.now();
  const query = db.collection("courseBookings").where("course", "==", courseId);
  const snap = options.tx ? await options.tx.get(query) : await query.get();
  return snap.docs.filter((doc) => {
    if (doc.id === options.excludeBookingId) return false;
    if (course.pickOne && doc.get("session") !== sessionId) return false;
    return takesSeat(doc, now);
  }).length;
}

/** Why a new booking or checkout isn't possible right now, or null. */
export function bookingProblem(course: CourseInfo, sessionId: unknown, now = Date.now()): string | null {
  if (course.archived) return "course_closed";
  if (course.closedManually) return "course_closed";
  if (course.closesAt && now > new Date(course.closesAt).getTime()) return "course_closed";
  const sessions = bookedSessions(course, sessionId);
  if (sessions.length === 0) return course.pickOne ? "session_required" : "course_closed";
  // The two courses defined in code keep their old rule unchanged: bookable
  // while any of their sessions is still ahead.
  if (!course.dynamic) return sessions.some((s) => new Date(s.start).getTime() > now) ? null : "course_over";
  // A series closes when it starts; a pick-one date when that date starts.
  if (new Date(sessions[0].start).getTime() <= now) return "course_closed";
  return null;
}

export function assertBookable(course: CourseInfo, sessionId: unknown, now = Date.now()): void {
  const problem = bookingProblem(course, sessionId, now);
  if (problem) throw new HttpError(problem === "session_required" ? 400 : 410, problem);
}
