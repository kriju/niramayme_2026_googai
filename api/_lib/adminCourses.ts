import type { VercelRequest } from "@vercel/node";
import { FieldValue, type Firestore, type Timestamp } from "firebase-admin/firestore";
import { getAdminDb, getProjectId, PRODUCTION_PROJECT_ID } from "./firebaseAdmin.js";
import { HttpError, hmac, safeEqual } from "./engagement.js";
import type { AdminUser } from "./adminAuth.js";
import { writeAuditInTx, writeAudit } from "./audit.js";
import { COURSES, type CourseInfo } from "./courses.js";
import { readJson } from "./coursePayments.js";
import {
  blockingProblems,
  compilePublic,
  courseChecklist,
  courseWarnings,
  emptyCourse,
  isCourseSlug,
  lockedChanges,
  normalizeCourse,
  sessionIds,
  type CourseData,
} from "./courseModel.js";
import { getCourse } from "./courseStore.js";

// The admin section's course operations (api/admin.ts ?op=course-…).
// Workflow: edit the draft → "Send for approval" → the other founder
// approves that exact revision → "Publish" copies it live. Meet links and
// closing/reopening booking skip approval. Every change is audited.

type ReviewStatus = "draft" | "in_review" | "changes_requested" | "approved";

type DraftDoc = {
  data: CourseData;
  revision: number;
  version: number;
  review: {
    status: ReviewStatus;
    submittedBy?: string;
    submittedAt?: Timestamp;
    approvedBy?: string;
    approvedAt?: Timestamp;
    approvedRevision?: number;
    note?: string;
    noteBy?: string;
  };
  publishedRevision?: number;
  createdBy: string;
  updatedBy?: string;
};

const drafts = (db: Firestore) => db.collection("courseDrafts");
const iso = (t: unknown) => ((t as Timestamp | undefined)?.toDate ? (t as Timestamp).toDate().toISOString() : null);

async function body(req: VercelRequest) {
  return readJson(req);
}

function idFrom(value: unknown): string {
  if (!isCourseSlug(value)) throw new HttpError(400, "invalid_id");
  return value;
}

async function loadDraft(db: Firestore, id: string): Promise<DraftDoc> {
  const snap = await drafts(db).doc(id).get();
  if (!snap.exists) throw new HttpError(404, "course_not_found");
  return snap.data() as DraftDoc;
}

/** Bookings that count as "people have booked": paid or UPI claimed. */
async function bookingCount(db: Firestore, id: string): Promise<number> {
  const snap = await db.collection("courseBookings").where("course", "==", id).get();
  return snap.docs.filter((d) => d.get("paid") === true || d.get("paymentClaimed") === true).length;
}

// ---------------------------------------------------------------- preview links

const PREVIEW_DAYS = 7;

export function previewToken(id: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + PREVIEW_DAYS * 86400;
  return `${exp}.${hmac("course-preview", `${id}:${exp}`).slice(0, 32)}`;
}

function verifyPreviewToken(id: string, token: string): boolean {
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  return safeEqual(hmac("course-preview", `${id}:${exp}`).slice(0, 32), sig);
}

/** Public: GET ?op=course-preview&id=&token= — the draft as the page will show it. */
export async function coursePreview(req: VercelRequest) {
  const id = idFrom(req.query.id);
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!verifyPreviewToken(id, token)) throw new HttpError(403, "invalid_preview_link");
  const draft = await loadDraft(getAdminDb(), id);
  return { course: compilePublic(draft.data, { closedManually: false, archived: false, revision: draft.revision }), preview: true };
}

// ---------------------------------------------------------------- rebuild

/**
 * Starts a production rebuild (Vercel Deploy Hook) so the pre-rendered
 * page, structured data and sitemap pick up the change. The live page
 * already shows it, since it reads Firestore directly.
 */
async function triggerRebuild(): Promise<"started" | "not_configured" | "skipped_preview" | "failed"> {
  if (getProjectId() !== PRODUCTION_PROJECT_ID) return "skipped_preview";
  const hook = (process.env.VERCEL_DEPLOY_HOOK_URL ?? "").trim();
  if (!hook) return "not_configured";
  try {
    const response = await fetch(hook, { method: "POST" });
    return response.ok ? "started" : "failed";
  } catch (error) {
    console.error("deploy hook failed:", error);
    return "failed";
  }
}

// ---------------------------------------------------------------- list / get

function lifecycle(course: CourseInfo | null, published: boolean, now = Date.now()): string {
  if (!published || !course) return "not_published";
  if (course.archived) return "archived";
  const starts = course.sessions.map((s) => new Date(s.start).getTime());
  const ends = course.sessions.map((s) => new Date(s.end).getTime());
  if (ends.length && Math.max(...ends) < now) return "completed";
  if (starts.length && Math.min(...starts) <= now && !course.pickOne) return "running";
  if (course.closedManually || (course.closesAt && new Date(course.closesAt).getTime() < now)) return "booking_closed";
  if (!course.sessions.some((s) => new Date(s.start).getTime() > now)) return "completed";
  return "published";
}

export async function coursesList() {
  const db = getAdminDb();
  const [draftSnap, bookingsSnap] = await Promise.all([drafts(db).get(), db.collection("courseBookings").get()]);
  const counts = new Map<string, { booked: number; paidCents: number }>();
  for (const doc of bookingsSnap.docs) {
    const d = doc.data();
    if (d.paid !== true && d.paymentClaimed !== true) continue;
    const c = counts.get(d.course) ?? { booked: 0, paidCents: 0 };
    c.booked++;
    c.paidCents += Number(d.payment?.amountCents) || 0;
    counts.set(d.course, c);
  }
  const now = Date.now();
  const rows = await Promise.all(draftSnap.docs.map(async (doc) => {
    const draft = doc.data() as DraftDoc;
    const live = draft.publishedRevision ? await getCourse(db, doc.id) : null;
    const next = (live?.sessions ?? []).find((s) => new Date(s.start).getTime() > now);
    return {
      id: doc.id,
      title: draft.data.EN.title || draft.data.DE.title || doc.id,
      legacy: false,
      review: draft.review.status,
      changedSincePublish: Boolean(draft.publishedRevision && draft.publishedRevision !== draft.revision),
      lifecycle: lifecycle(live, Boolean(draft.publishedRevision)),
      nextSession: next?.start ?? null,
      seatLimit: draft.data.seatLimit,
      ...(counts.get(doc.id) ?? { booked: 0, paidCents: 0 }),
      banner: draft.data.banner.on,
    };
  }));
  // The two courses still defined in code, read-only.
  for (const [id, course] of Object.entries(COURSES) as [string, CourseInfo][]) {
    const next = course.sessions.find((s) => new Date(s.start).getTime() > now);
    rows.push({
      id, title: course.EN.title, legacy: true, review: "approved", changedSincePublish: false,
      lifecycle: next ? "published" : "completed", nextSession: next?.start ?? null, seatLimit: null,
      ...(counts.get(id) ?? { booked: 0, paidCents: 0 }), banner: false,
    });
  }
  rows.sort((a, b) => (a.nextSession ?? "9999").localeCompare(b.nextSession ?? "9999"));
  return { courses: rows };
}

async function describe(db: Firestore, id: string, draft: DraftDoc) {
  const privateSnap = await db.collection("coursePrivate").doc(id).get();
  const live = privateSnap.exists ? await getCourse(db, id) : null;
  const booked = await bookingCount(db, id);
  const liveData = privateSnap.exists ? normalizeCourse(privateSnap.get("data"), id) : null;
  return {
    id,
    data: draft.data,
    revision: draft.revision,
    version: draft.version,
    review: {
      status: draft.review.status,
      submittedBy: draft.review.submittedBy ?? null,
      submittedAt: iso(draft.review.submittedAt),
      approvedBy: draft.review.approvedBy ?? null,
      approvedAt: iso(draft.review.approvedAt),
      approvedRevision: draft.review.approvedRevision ?? null,
      note: draft.review.note ?? null,
      noteBy: draft.review.noteBy ?? null,
    },
    publishedRevision: draft.publishedRevision ?? null,
    lifecycle: lifecycle(live, Boolean(draft.publishedRevision)),
    closedManually: privateSnap.get("closedManually") === true,
    archived: privateSnap.get("archived") === true,
    booked,
    checklist: courseChecklist(draft.data),
    warnings: courseWarnings(draft.data),
    // Changes refused once people have booked (shown before publishing).
    locked: liveData && booked > 0 ? lockedChanges(liveData, draft.data) : [],
    sessionIds: sessionIds(draft.data.sessions),
    previewToken: previewToken(id),
    createdBy: draft.createdBy,
    updatedBy: draft.updatedBy ?? null,
  };
}

export async function courseGet(req: VercelRequest) {
  const db = getAdminDb();
  const id = idFrom(req.query.id);
  return describe(db, id, await loadDraft(db, id));
}

// ---------------------------------------------------------------- create / save

export async function courseCreate(req: VercelRequest, admin: AdminUser) {
  const input = await body(req);
  const id = idFrom(input.id);
  if (Object.prototype.hasOwnProperty.call(COURSES, id)) throw new HttpError(409, "id_taken");
  const db = getAdminDb();
  let data = emptyCourse(id);
  if (input.copyFrom !== undefined) {
    // "Run again": everything except dates, booking window, early-bird date and banner.
    const source = await loadDraft(db, idFrom(input.copyFrom));
    data = {
      ...normalizeCourse(source.data, id),
      sessions: [],
      closesAt: "",
      earlyBirdUntil: "",
      banner: { ...source.data.banner, on: false, until: "" },
    };
  }
  const ref = drafts(db).doc(id);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) throw new HttpError(409, "id_taken");
    tx.create(ref, {
      data, revision: 1, version: 1, review: { status: "draft" },
      createdBy: admin.email, updatedBy: admin.email,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditInTx(tx, db, admin, { op: input.copyFrom ? "course_copy" : "course_create", target: `courses/${id}`, ...(input.copyFrom ? { note: `copied from ${input.copyFrom}` } : {}) });
  });
  return describe(db, id, (await ref.get()).data() as DraftDoc);
}

export async function courseSave(req: VercelRequest, admin: AdminUser) {
  const input = await body(req);
  const id = idFrom(input.id);
  const db = getAdminDb();
  const ref = drafts(db).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "course_not_found");
    const draft = snap.data() as DraftDoc;
    if (Number(input.version) !== draft.version) throw new HttpError(409, "stale", `changed by ${draft.updatedBy ?? "someone else"}`);
    const next = normalizeCourse(input.data, id);
    const changed = JSON.stringify(next) !== JSON.stringify(draft.data);
    if (!changed) return;
    tx.update(ref, {
      data: next,
      revision: draft.revision + 1,
      version: draft.version + 1,
      // Any change voids an approval or a pending review: it was for other text.
      review: { status: "draft", ...(draft.review.note ? { note: draft.review.note, noteBy: draft.review.noteBy } : {}) },
      updatedBy: admin.email,
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeAuditInTx(tx, db, admin, { op: "course_save", target: `courses/${id}`, before: { revision: draft.revision }, after: { revision: draft.revision + 1 } });
  });
  return describe(db, id, await loadDraft(db, id));
}

// ---------------------------------------------------------------- approval

async function reviewOp(req: VercelRequest, admin: AdminUser, kind: "submit" | "approve" | "request_changes") {
  const input = await body(req);
  const id = idFrom(input.id);
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 2000) : "";
  const db = getAdminDb();
  const ref = drafts(db).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, "course_not_found");
    const draft = snap.data() as DraftDoc;
    if (input.revision !== undefined && Number(input.revision) !== draft.revision) throw new HttpError(409, "stale");
    let review: DraftDoc["review"];
    if (kind === "submit") {
      const problems = blockingProblems(draft.data);
      if (problems.length) throw new HttpError(400, "not_publishable", problems.join("; "));
      review = { status: "in_review", submittedBy: admin.email, submittedAt: FieldValue.serverTimestamp() as unknown as Timestamp };
    } else {
      if (draft.review.status !== "in_review") throw new HttpError(409, "not_in_review");
      // The other founder reviews: never the person who sent it.
      if (draft.review.submittedBy === admin.email) throw new HttpError(403, "own_submission");
      if (kind === "approve") {
        const problems = blockingProblems(draft.data);
        if (problems.length) throw new HttpError(400, "not_publishable", problems.join("; "));
        review = {
          ...draft.review, status: "approved", approvedBy: admin.email,
          approvedAt: FieldValue.serverTimestamp() as unknown as Timestamp, approvedRevision: draft.revision,
          ...(note ? { note, noteBy: admin.email } : {}),
        };
      } else {
        if (!note) throw new HttpError(400, "note_required");
        review = { ...draft.review, status: "changes_requested", note, noteBy: admin.email };
      }
    }
    tx.update(ref, { review, version: draft.version + 1, updatedAt: FieldValue.serverTimestamp() });
    writeAuditInTx(tx, db, admin, {
      op: `course_${kind}`,
      target: `courses/${id}`,
      after: kind === "approve" ? { revision: draft.revision, warnings: courseWarnings(draft.data).length } : { revision: draft.revision },
      ...(note ? { note } : {}),
    });
  });
  return describe(db, id, await loadDraft(db, id));
}

export const courseSubmit = (req: VercelRequest, admin: AdminUser) => reviewOp(req, admin, "submit");
export const courseApprove = (req: VercelRequest, admin: AdminUser) => reviewOp(req, admin, "approve");
export const courseRequestChanges = (req: VercelRequest, admin: AdminUser) => reviewOp(req, admin, "request_changes");

// ---------------------------------------------------------------- publish

export async function coursePublish(req: VercelRequest, admin: AdminUser) {
  const input = await body(req);
  const id = idFrom(input.id);
  const db = getAdminDb();
  const draftRef = drafts(db).doc(id);
  const privateRef = db.collection("coursePrivate").doc(id);
  const publicRef = db.collection("courses").doc(id);
  const booked = await bookingCount(db, id);
  await db.runTransaction(async (tx) => {
    const [snap, privateSnap] = await Promise.all([tx.get(draftRef), tx.get(privateRef)]);
    if (!snap.exists) throw new HttpError(404, "course_not_found");
    const draft = snap.data() as DraftDoc;
    if (draft.review.status !== "approved" || draft.review.approvedRevision !== draft.revision) {
      throw new HttpError(409, "not_approved");
    }
    const problems = blockingProblems(draft.data);
    if (problems.length) throw new HttpError(400, "not_publishable", problems.join("; "));
    if (privateSnap.exists && booked > 0) {
      const locked = lockedChanges(normalizeCourse(privateSnap.get("data"), id), draft.data);
      if (locked.length) throw new HttpError(409, "locked_after_booking", locked.join(", "));
    }
    const state = { closedManually: privateSnap.get("closedManually") === true, archived: false };
    tx.set(publicRef, { ...compilePublic(draft.data, { ...state, revision: draft.revision }), publishedAt: FieldValue.serverTimestamp() });
    tx.set(privateRef, { data: draft.data, publishedRevision: draft.revision, ...state, publishedBy: admin.email, publishedAt: FieldValue.serverTimestamp() });
    tx.update(draftRef, { publishedRevision: draft.revision, version: draft.version + 1, updatedAt: FieldValue.serverTimestamp() });
    writeAuditInTx(tx, db, admin, { op: "course_publish", target: `courses/${id}`, after: { revision: draft.revision }, note: `approved by ${draft.review.approvedBy}` });
  });
  const rebuild = await triggerRebuild();
  return { ...(await describe(db, id, await loadDraft(db, id))), rebuild };
}

// ---------------------------------------------------------------- no-approval changes

/** Meet links: no approval needed; applied to the draft and, if live, at once. */
export async function courseMeetLinks(req: VercelRequest, admin: AdminUser) {
  const input = await body(req);
  const id = idFrom(input.id);
  const db = getAdminDb();
  const draftRef = drafts(db).doc(id);
  const privateRef = db.collection("coursePrivate").doc(id);
  const clean = (v: unknown) => (typeof v === "string" && /^https:\/\/\S+$/.test(v.trim()) ? v.trim().slice(0, 500) : "");
  const perSession = (input.sessions ?? {}) as Record<string, unknown>;
  const apply = (data: CourseData): CourseData => {
    const ids = sessionIds(data.sessions);
    return {
      ...data,
      meetUrl: clean(input.meetUrl),
      sessions: data.sessions.map((s, i) => ({ ...s, meetUrl: clean(perSession[ids[i]]) })),
    };
  };
  await db.runTransaction(async (tx) => {
    const [snap, privateSnap] = await Promise.all([tx.get(draftRef), tx.get(privateRef)]);
    if (!snap.exists) throw new HttpError(404, "course_not_found");
    const draft = snap.data() as DraftDoc;
    // Meet links don't change the revision, so an approval stays valid.
    tx.update(draftRef, { data: apply(draft.data), version: draft.version + 1, updatedAt: FieldValue.serverTimestamp() });
    if (privateSnap.exists) tx.update(privateRef, { data: apply(normalizeCourse(privateSnap.get("data"), id)) });
    writeAuditInTx(tx, db, admin, { op: "course_meet_links", target: `courses/${id}` });
  });
  return describe(db, id, await loadDraft(db, id));
}

async function setLiveFlag(req: VercelRequest, admin: AdminUser, field: "closedManually" | "archived", value: boolean) {
  const input = await body(req);
  const id = idFrom(input.id);
  const db = getAdminDb();
  const privateRef = db.collection("coursePrivate").doc(id);
  const publicRef = db.collection("courses").doc(id);
  await db.runTransaction(async (tx) => {
    const privateSnap = await tx.get(privateRef);
    if (!privateSnap.exists) throw new HttpError(409, "not_published");
    tx.update(privateRef, { [field]: value });
    tx.update(publicRef, { [field]: value });
    writeAuditInTx(tx, db, admin, { op: `course_${field === "archived" ? (value ? "archive" : "unarchive") : value ? "close" : "reopen"}`, target: `courses/${id}` });
  });
  const rebuild = field === "archived" ? await triggerRebuild() : undefined;
  return { ...(await describe(db, id, await loadDraft(db, id))), ...(rebuild ? { rebuild } : {}) };
}

export const courseClose = (req: VercelRequest, admin: AdminUser) => setLiveFlag(req, admin, "closedManually", true);
export const courseReopen = (req: VercelRequest, admin: AdminUser) => setLiveFlag(req, admin, "closedManually", false);
export const courseArchive = (req: VercelRequest, admin: AdminUser) => setLiveFlag(req, admin, "archived", true);
export const courseUnarchive = (req: VercelRequest, admin: AdminUser) => setLiveFlag(req, admin, "archived", false);

/** A draft that was never published (and has no bookings) can be deleted. */
export async function courseDeleteDraft(req: VercelRequest, admin: AdminUser) {
  const input = await body(req);
  const id = idFrom(input.id);
  const db = getAdminDb();
  const draft = await loadDraft(db, id);
  if (draft.publishedRevision) throw new HttpError(409, "published_courses_are_archived");
  if ((await db.collection("courseBookings").where("course", "==", id).limit(1).get()).size) throw new HttpError(409, "has_bookings");
  await drafts(db).doc(id).delete();
  await writeAudit(db, admin, { op: "course_delete_draft", target: `courses/${id}` });
  return { ok: true };
}

// ---------------------------------------------------------------- roster

/**
 * Participants of a course. Contact details for organising the course; the
 * free-text notes (which can hold health information) are not included —
 * they stay in the booking itself.
 */
export async function courseRoster(req: VercelRequest) {
  const db = getAdminDb();
  const id = typeof req.query.id === "string" ? req.query.id : "";
  const course = await getCourse(db, id);
  if (!course) throw new HttpError(404, "course_not_found");
  const snap = await db.collection("courseBookings").where("course", "==", id).get();
  const now = Date.now();
  const participants = snap.docs
    .map((doc) => {
      const d = doc.data();
      const status = d.paid === true ? "paid" : d.paymentClaimed === true ? "upi_claimed" : (d.seatHeldUntil?.toMillis?.() ?? 0) > now ? "in_checkout" : "unpaid";
      return {
        id: doc.id,
        ref: `CRS-${doc.id.slice(-6).toUpperCase()}`,
        name: String(d.name ?? ""),
        email: String(d.email ?? ""),
        whatsapp: String(d.whatsapp ?? ""),
        session: typeof d.session === "string" ? d.session : null,
        status,
        amountCents: Number(d.payment?.amountCents) || 0,
        discount: d.payment?.discount?.kind ?? null,
        lang: d.lang === "DE" ? "DE" : "EN",
        hasNotes: Boolean(String(d.notes ?? "").trim()),
        createdAt: iso(d.createdAt),
      };
    })
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  return {
    title: course.EN.title,
    pickOne: course.pickOne,
    seatLimit: course.seatLimit ?? null,
    sessions: course.sessions.map((s) => ({ id: s.id, start: s.start, end: s.end, label: s.label.EN, meetLink: Boolean(s.meetUrl || course.meetUrl) })),
    participants,
  };
}
