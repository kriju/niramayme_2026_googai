import type { Firestore, QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import type { AdminUser } from "./adminAuth.js";
import { COURSES, berlinToday, bookedSessions, meetUrlFor, type CourseId } from "./courses.js";
import { berlinWallTime } from "./berlinTime.js";

// The admin dashboard's "Needs attention" list and the small summary under
// it (GET /api/admin?op=dashboard). Every section is loaded on its own: if
// one query fails (e.g. an index still building), the rest still show and
// that section reports the problem instead of the whole page failing.
//
// Only what's needed to recognise an item goes to the browser: reference,
// first name, service and date. Birth details, contact details and health
// notes stay on the server.

export type AttentionItem = {
  kind: "upi_claim" | "review_pending" | "post_awaiting_you" | "comment_pending" | "meet_link_missing";
  title: string;
  detail: string;
  /** ISO date of what the item is about, for sorting oldest first. */
  at: string | null;
  /** Where in the admin to deal with it (a later step may not exist yet). */
  href: string | null;
};

export type DashboardSection = { id: string; ok: boolean; error?: string };

export type Dashboard = {
  items: AttentionItem[];
  sections: DashboardSection[];
  upcoming: { courseTitle: string; sessionLabel: string; start: string; paid: number; meetLink: boolean }[];
  monthPaidCents: number | null;
  monthLabel: string;
};

const UPI_COLLECTIONS: { collection: string; label: string; prefix: (doc: QueryDocumentSnapshot) => string }[] = [
  { collection: "courseBookings", label: "Course", prefix: () => "CRS" },
  { collection: "reikiRequests", label: "Reiki", prefix: () => "RKI" },
  { collection: "tarotRequests", label: "Tarot", prefix: () => "TAR" },
  {
    collection: "astrologyRequests",
    label: "Astrology / guidance",
    prefix: (doc) => (doc.get("service") === "intuitive-guidance" ? "IGS" : "AST"),
  },
];

function iso(value: unknown): string | null {
  const ts = value as Timestamp | undefined;
  return ts && typeof ts.toDate === "function" ? ts.toDate().toISOString() : null;
}

function firstName(value: unknown): string {
  return typeof value === "string" ? value.trim().split(/\s+/)[0]?.slice(0, 40) || "?" : "?";
}

async function section<T>(id: string, sections: DashboardSection[], load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await load();
    sections.push({ id, ok: true });
    return result;
  } catch (error) {
    console.error(`admin dashboard section ${id} failed:`, error);
    sections.push({ id, ok: false, error: (error as Error).message?.slice(0, 200) });
    return fallback;
  }
}

export async function loadDashboard(db: Firestore, admin: AdminUser, now = new Date()): Promise<Dashboard> {
  const sections: DashboardSection[] = [];
  const items: AttentionItem[] = [];

  // UPI payments the customer reported but nobody has checked yet. Until the
  // bookings inbox (rollout step 3) adds "Verify", these are matched by hand
  // in the UPI app as before.
  const upi = section("upi_claims", sections, async () => {
    const found: AttentionItem[] = [];
    for (const source of UPI_COLLECTIONS) {
      const snap = await db.collection(source.collection).where("paymentClaimed", "==", true).limit(100).get();
      for (const doc of snap.docs) {
        if (doc.get("paid") === true || doc.get("upiVerified") === true) continue;
        found.push({
          kind: "upi_claim",
          title: `UPI payment to check · ${source.prefix(doc)}-${doc.id.slice(-6).toUpperCase()}`,
          detail: `${source.label} · ${firstName(doc.get("name"))}`,
          at: iso(doc.get("createdAt")),
          href: null,
        });
      }
    }
    return found;
  }, [] as AttentionItem[]);

  const reviews = section("reviews", sections, async () => {
    const snap = await db.collection("reviews").where("approved", "==", false).limit(50).get();
    return snap.docs.map((doc): AttentionItem => ({
      kind: "review_pending",
      title: "Review waiting for approval",
      detail: `${firstName(doc.get("name"))} · ${doc.get("rating") ?? "?"}★ · use the link in the notification email`,
      at: iso(doc.get("createdAt")),
      href: null,
    }));
  }, [] as AttentionItem[]);

  const posts = section("blog_reviews", sections, async () => {
    const snap = await db.collection("blogReviews").where("status", "==", "in_review").limit(50).get();
    const mine = snap.docs.filter((doc) => doc.get("authorEmail") !== admin.email);
    const titles = await Promise.all(mine.map((doc) => db.collection("blogs").doc(doc.id).get()));
    return mine.map((doc, i): AttentionItem => ({
      kind: "post_awaiting_you",
      title: "Blog post waiting for your approval",
      detail: String(titles[i].get("title") ?? "(untitled)").slice(0, 120),
      at: iso(doc.get("submittedAt")),
      href: "/admin/blog",
    }));
  }, [] as AttentionItem[]);

  // Collection-group query; its index is declared in firestore.indexes.json.
  const comments = section("comments", sections, async () => {
    const snap = await db.collectionGroup("comments").where("status", "==", "pending").orderBy("createdAt", "desc").limit(50).get();
    return snap.docs.map((doc): AttentionItem => ({
      kind: "comment_pending",
      title: "Comment waiting for moderation",
      detail: `${String(doc.get("name") ?? "Reader").slice(0, 40)} · approve it on the post page`,
      at: iso(doc.get("createdAt")),
      href: null,
    }));
  }, [] as AttentionItem[]);

  // Sessions in the next 7 days, from the course catalogue, with how many
  // have paid (Stripe) or reported a UPI payment.
  const upcoming = section("upcoming", sections, async () => {
    const horizon = now.getTime() + 7 * 24 * 60 * 60 * 1000;
    const rows: Dashboard["upcoming"] = [];
    const missing: AttentionItem[] = [];
    for (const [id, course] of Object.entries(COURSES) as [CourseId, (typeof COURSES)[CourseId]][]) {
      const next = course.sessions.filter((s) => {
        const start = new Date(s.start).getTime();
        return start > now.getTime() && start < horizon;
      });
      if (next.length === 0) continue;
      const [paid, claimed] = await Promise.all([
        db.collection("courseBookings").where("course", "==", id).where("paid", "==", true).get(),
        db.collection("courseBookings").where("course", "==", id).where("paymentClaimed", "==", true).get(),
      ]);
      const bookings = new Map([...paid.docs, ...claimed.docs].map((d) => [d.id, d]));
      for (const session of next) {
        const count = [...bookings.values()].filter((d) => bookedSessions(course, d.get("session")).some((s) => s.id === session.id)).length;
        const hasLink = Boolean(meetUrlFor(course, session));
        rows.push({ courseTitle: course.EN.title, sessionLabel: session.label.EN, start: session.start, paid: count, meetLink: hasLink });
        if (!hasLink) {
          missing.push({
            kind: "meet_link_missing",
            title: "Session without a Meet link",
            detail: `${course.EN.title} · ${session.label.EN}`,
            at: session.start,
            href: null,
          });
        }
      }
    }
    rows.sort((a, b) => a.start.localeCompare(b.start));
    return { rows, missing };
  }, { rows: [] as Dashboard["upcoming"], missing: [] as AttentionItem[] });

  // This month's invoiced total (German calendar month).
  const today = berlinToday(now);
  const monthStart = berlinWallTime(`${today.slice(0, 7)}-01`);
  const monthTotal = section("month_total", sections, async () => {
    const snap = await db.collection("invoices").where("createdAt", ">=", monthStart).get();
    return snap.docs.reduce((sum, doc) => sum + (Number(doc.get("totalCents")) || 0), 0);
  }, null as number | null);

  const [upiItems, reviewItems, postItems, commentItems, upcomingResult, monthPaidCents] = await Promise.all([
    upi, reviews, posts, comments, upcoming, monthTotal,
  ]);
  items.push(...upiItems, ...postItems, ...upcomingResult.missing, ...reviewItems, ...commentItems);
  // Oldest first, so nothing sits at the bottom forever.
  items.sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""));

  return {
    items,
    sections,
    upcoming: upcomingResult.rows,
    monthPaidCents,
    monthLabel: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(now),
  };
}
