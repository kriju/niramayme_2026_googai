// Shapes the course ops of api/admin.ts return. The course data model itself
// is shared with the server (type-only import, so no server code is bundled).
import type { CourseData, CourseText } from "../../../api/_lib/courseModel";

export type { CourseData, CourseText };

export type ReviewStatus = "draft" | "in_review" | "changes_requested" | "approved";
export type Lifecycle = "not_published" | "published" | "booking_closed" | "running" | "completed" | "archived";

export type CourseRow = {
  id: string;
  title: string;
  legacy: boolean;
  review: ReviewStatus;
  changedSincePublish: boolean;
  lifecycle: Lifecycle;
  nextSession: string | null;
  seatLimit: number | null;
  booked: number;
  paidCents: number;
  banner: boolean;
};

export type ChecklistItem = { id: string; ok: boolean; label: string; blocking: boolean };
export type Warning = { check: string; message: string; excerpt?: string };

export type CourseDetail = {
  id: string;
  data: CourseData;
  revision: number;
  version: number;
  review: {
    status: ReviewStatus;
    submittedBy: string | null;
    submittedAt: string | null;
    approvedBy: string | null;
    approvedAt: string | null;
    approvedRevision: number | null;
    note: string | null;
    noteBy: string | null;
  };
  publishedRevision: number | null;
  lifecycle: Lifecycle;
  closedManually: boolean;
  archived: boolean;
  booked: number;
  checklist: ChecklistItem[];
  warnings: Warning[];
  locked: string[];
  sessionIds: string[];
  previewToken: string;
  createdBy: string;
  updatedBy: string | null;
  rebuild?: "started" | "not_configured" | "skipped_preview" | "failed";
};

export type Roster = {
  title: string;
  pickOne: boolean;
  seatLimit: number | null;
  sessions: { id: string; start: string; end: string; label: string; meetLink: boolean }[];
  participants: {
    id: string;
    ref: string;
    name: string;
    email: string;
    whatsapp: string;
    session: string | null;
    status: "paid" | "upi_claimed" | "in_checkout" | "unpaid";
    amountCents: number;
    discount: string | null;
    lang: "EN" | "DE";
    hasNotes: boolean;
    createdAt: string | null;
  }[];
};

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  not_published: "Not published",
  published: "Booking open",
  booking_closed: "Booking closed",
  running: "Running",
  completed: "Completed",
  archived: "Archived",
};

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  draft: "Draft",
  in_review: "Waiting for approval",
  changes_requested: "Changes requested",
  approved: "Approved",
};

/** Founder name from a login email, for "sent by Riju". */
export const founderName = (email: string | null) =>
  email === "rijuk@niramay.me" ? "Riju" : email === "richak@niramay.me" ? "Richa" : email ?? "—";

/** Course id from an English title: lowercase, dashes, no accents. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
