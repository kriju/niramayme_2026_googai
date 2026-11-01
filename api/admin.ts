import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, getProjectId, PRODUCTION_PROJECT_ID } from "./_lib/firebaseAdmin.js";
import { HttpError } from "./_lib/engagement.js";
import { requireAdmin, twoFactorRequired, type AdminUser } from "./_lib/adminAuth.js";
import { writeAudit } from "./_lib/audit.js";
import { loadDashboard } from "./_lib/adminDashboard.js";
import {
  courseApprove, courseArchive, courseClose, courseCreate, courseDeleteDraft, courseGet, courseMeetLinks,
  coursePreview, coursePublish, courseReopen, courseRequestChanges, courseRoster, courseSave, courseSubmit,
  courseUnarchive, coursesList,
} from "./_lib/adminCourses.js";

// The admin section's one server endpoint (see docs/admin-section-design.md,
// "Foundations"). Every request: verify the founder's Firebase ID token →
// check the input → read/write with the admin SDK → record changes in
// adminAudit. The browser never writes admin data itself.
//
//   GET  /api/admin?op=whoami     who is signed in, live or preview
//   POST /api/admin?op=signed-in  logs a sign-in to the audit log
//   GET  /api/admin?op=dashboard  "Needs attention" list + summary
//   GET  /api/admin?op=audit      latest audit log entries (?before=ISO)
//   …?op=courses / course-*        courses (api/_lib/adminCourses.ts)
//   GET  ?op=course-preview        PUBLIC: a draft course page, with the
//                                  signed link from the editor's Preview
//
// Later rollout steps (courses, bookings, payments, the Claude connector)
// add their ops here, so the whole admin section stays one function.

type Handler = (req: VercelRequest, res: VercelResponse, admin: AdminUser) => Promise<unknown>;

type AdminHandler = (req: VercelRequest, admin: AdminUser) => Promise<unknown>;
const op = (handler: AdminHandler): Handler => (req, _res, admin) => handler(req, admin);

const OPS: Record<string, { method: "GET" | "POST"; handler: Handler }> = {
  whoami: { method: "GET", handler: whoami },
  "signed-in": { method: "POST", handler: signedIn },
  dashboard: { method: "GET", handler: dashboard },
  audit: { method: "GET", handler: auditList },
  courses: { method: "GET", handler: op(() => coursesList()) },
  course: { method: "GET", handler: op((req) => courseGet(req)) },
  "course-roster": { method: "GET", handler: op((req) => courseRoster(req)) },
  "course-create": { method: "POST", handler: op(courseCreate) },
  "course-save": { method: "POST", handler: op(courseSave) },
  "course-submit": { method: "POST", handler: op(courseSubmit) },
  "course-approve": { method: "POST", handler: op(courseApprove) },
  "course-request-changes": { method: "POST", handler: op(courseRequestChanges) },
  "course-publish": { method: "POST", handler: op(coursePublish) },
  "course-meet-links": { method: "POST", handler: op(courseMeetLinks) },
  "course-close": { method: "POST", handler: op(courseClose) },
  "course-reopen": { method: "POST", handler: op(courseReopen) },
  "course-archive": { method: "POST", handler: op(courseArchive) },
  "course-unarchive": { method: "POST", handler: op(courseUnarchive) },
  "course-delete-draft": { method: "POST", handler: op(courseDeleteDraft) },
};

// No login: anyone with a valid signed preview link may see that draft.
const PUBLIC_OPS: Record<string, (req: VercelRequest) => Promise<unknown>> = {
  "course-preview": coursePreview,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Personal data: never cached by a browser or CDN.
  res.setHeader("Cache-Control", "no-store");
  try {
    const name = typeof req.query.op === "string" ? req.query.op : "";
    if (PUBLIC_OPS[name] && req.method === "GET") return res.status(200).json(await PUBLIC_OPS[name](req));
    const route = OPS[name];
    if (!route) throw new HttpError(404, "unknown_op");
    if (req.method !== route.method) {
      res.setHeader("Allow", route.method);
      throw new HttpError(405, "method_not_allowed");
    }
    const admin = await requireAdmin(req);
    const body = await route.handler(req, res, admin);
    return res.status(200).json(body);
  } catch (error) {
    if (error instanceof HttpError) {
      // `detail` explains validation refusals (e.g. what's missing to publish).
      return res.status(error.status).json({ error: error.code, ...(error.message !== error.code ? { detail: error.message } : {}) });
    }
    console.error("admin api failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}

function environment(): "live" | "preview" {
  return getProjectId() === PRODUCTION_PROJECT_ID ? "live" : "preview";
}

async function whoami(_req: VercelRequest, _res: VercelResponse, admin: AdminUser) {
  return {
    email: admin.email,
    name: admin.name,
    role: admin.role,
    twoFactor: admin.twoFactor,
    twoFactorRequired: twoFactorRequired(),
    environment: environment(),
  };
}

async function signedIn(_req: VercelRequest, _res: VercelResponse, admin: AdminUser) {
  await writeAudit(getAdminDb(), admin, {
    op: "sign_in",
    target: "session",
    note: admin.twoFactor ? "with 2-step code" : "password only",
  });
  return { ok: true };
}

async function dashboard(_req: VercelRequest, _res: VercelResponse, admin: AdminUser) {
  return loadDashboard(getAdminDb(), admin);
}

async function auditList(req: VercelRequest) {
  const before = typeof req.query.before === "string" ? new Date(req.query.before) : null;
  let query = getAdminDb().collection("adminAudit").orderBy("at", "desc").limit(100);
  if (before && !Number.isNaN(before.getTime())) query = query.startAfter(before);
  const snap = await query.get();
  return {
    entries: snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        at: (data.at as Timestamp | undefined)?.toDate().toISOString() ?? null,
        byName: data.byName ?? data.by,
        via: data.via ?? "admin",
        op: data.op,
        target: data.target,
        note: data.note ?? null,
        before: data.before ?? null,
        after: data.after ?? null,
      };
    }),
  };
}
