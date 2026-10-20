import crypto from "node:crypto";
import { FieldValue, Timestamp, type DocumentSnapshot, type Firestore, type Transaction } from "firebase-admin/firestore";
import { berlinToday, type CourseId, type CourseInfo } from "./courses.js";

// Course discounts. One discount per booking, never combined: when a code and
// the early-bird discount both apply, the larger one wins (early bird on a
// tie, so the code stays unused).
//
//  - Early bird: automatic, 10% until the course's `earlyBirdUntil` date.
//  - Alumni: a personal code (ALUMNI-XXXXXX), created for everyone who paid
//    for a course and emailed after the course ends (see the reminder cron
//    in coursePayments.ts). Bound to that person's email; usable once per
//    course, for every course.
//  - Newsletter welcome: a single-use code (WELCOME-XXXXXX) emailed once
//    when someone confirms the newsletter (api/newsletter.ts).
//
// Codes live in the admin-only discountCodes collection (doc id = the code);
// the alumni list in alumni/{email}. Neither is client-readable
// (firestore.rules default deny).
//
// TODO(owner): the alumni and newsletter percentages and the welcome code's
// validity were not specified — change them here.
export const EARLY_BIRD_PERCENT = 10;
export const ALUMNI_PERCENT = 10;
export const NEWSLETTER_PERCENT = 10;
export const NEWSLETTER_CODE_VALID_DAYS = 180;

export type DiscountKind = "early_bird" | "alumni" | "newsletter";

export type Quote = {
  baseCents: number;
  discountCents: number;
  totalCents: number;
  discount: { kind: DiscountKind; percent: number; code?: string } | null;
};

export type CodeProblem = "code_not_found" | "code_expired" | "code_used" | "code_wrong_email";

type CodeDoc = {
  kind: "alumni" | "newsletter";
  percent: number;
  email?: string;
  expiresAt?: Timestamp;
  usedAt?: Timestamp;
  usedForCourses?: string[];
};

export function normalizeCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/\s+/g, "").slice(0, 40) : "";
}

// Unambiguous alphabet (no 0/O, 1/I) — codes are typed in by hand.
function randomSuffix(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function earlyBirdActive(course: CourseInfo, now: Date): boolean {
  return course.earlyBirdUntil !== null && berlinToday(now) <= course.earlyBirdUntil;
}

/** Checks a code for this course and email without using it up. */
export async function lookupCode(
  db: Firestore,
  code: string,
  courseId: CourseId,
  email: string,
  now = new Date(),
): Promise<{ ok: true; percent: number; kind: "alumni" | "newsletter" } | { ok: false; problem: CodeProblem }> {
  const snap = await db.collection("discountCodes").doc(code).get();
  return checkCode(snap.exists ? (snap.data() as CodeDoc) : null, courseId, email, now);
}

function checkCode(data: CodeDoc | null, courseId: CourseId, email: string, now: Date) {
  if (!data) return { ok: false as const, problem: "code_not_found" as const };
  if (data.expiresAt && data.expiresAt.toMillis() < now.getTime()) return { ok: false as const, problem: "code_expired" as const };
  if (data.email && data.email !== email.trim().toLowerCase()) return { ok: false as const, problem: "code_wrong_email" as const };
  if (data.kind === "newsletter" && data.usedAt) return { ok: false as const, problem: "code_used" as const };
  if (data.kind === "alumni" && data.usedForCourses?.includes(courseId)) return { ok: false as const, problem: "code_used" as const };
  return { ok: true as const, percent: data.percent, kind: data.kind };
}

/**
 * Price for a booking. An invalid code is reported (so the form can say why)
 * but never blocks the early-bird price.
 */
export async function quote(
  db: Firestore,
  courseId: CourseId,
  course: CourseInfo,
  rawCode: unknown,
  email: string,
  now = new Date(),
): Promise<{ quote: Quote; codeProblem: CodeProblem | null }> {
  const code = normalizeCode(rawCode);
  const candidates: NonNullable<Quote["discount"]>[] = [];
  if (earlyBirdActive(course, now)) candidates.push({ kind: "early_bird", percent: EARLY_BIRD_PERCENT });
  let codeProblem: CodeProblem | null = null;
  if (code) {
    const result = await lookupCode(db, code, courseId, email, now);
    if (result.ok) candidates.push({ kind: result.kind, percent: result.percent, code });
    else codeProblem = result.problem;
  }
  const best = candidates.reduce<Quote["discount"]>((a, b) => (!a || b.percent > a.percent ? b : a), null);
  const discountCents = best ? Math.round((course.amountCents * best.percent) / 100) : 0;
  return {
    quote: {
      baseCents: course.amountCents,
      discountCents,
      totalCents: course.amountCents - discountCents,
      discount: best,
    },
    codeProblem,
  };
}

/**
 * Marks a code as used for this booking, inside the payment transaction.
 * `snap` must have been read in the same transaction (reads come before
 * writes in a Firestore transaction).
 */
export function redeemCode(tx: Transaction, snap: DocumentSnapshot, courseId: CourseId): void {
  if (!snap.exists) return;
  if (snap.get("kind") === "newsletter") tx.update(snap.ref, { usedAt: FieldValue.serverTimestamp() });
  else tx.update(snap.ref, { usedForCourses: FieldValue.arrayUnion(courseId) });
}

export function emailKey(email: string): string {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 40);
}

/**
 * Adds a paying customer to the alumni list and returns their personal code
 * (created on first payment, reused afterwards).
 */
export async function ensureAlumniCode(db: Firestore, email: string, name: string, courseId: CourseId): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const ref = db.collection("alumni").doc(emailKey(normalized));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    let code = snap.exists ? (snap.get("code") as string | undefined) : undefined;
    if (!code) {
      code = `ALUMNI-${randomSuffix()}`;
      tx.set(db.collection("discountCodes").doc(code), {
        kind: "alumni",
        percent: ALUMNI_PERCENT,
        email: normalized,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    tx.set(
      ref,
      {
        email: normalized,
        name,
        code,
        courses: FieldValue.arrayUnion(courseId),
        ...(snap.exists ? {} : { firstPaidAt: FieldValue.serverTimestamp() }),
        lastPaidAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return code;
  });
}

/** Creates the newsletter welcome code for a newly confirmed subscriber. */
export async function createWelcomeCode(db: Firestore): Promise<{ code: string; expiresAt: Date }> {
  const code = `WELCOME-${randomSuffix()}`;
  const expiresAt = new Date(Date.now() + NEWSLETTER_CODE_VALID_DAYS * 24 * 60 * 60 * 1000);
  await db.collection("discountCodes").doc(code).set({
    kind: "newsletter",
    percent: NEWSLETTER_PERCENT,
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: FieldValue.serverTimestamp(),
  });
  return { code, expiresAt };
}
