import { berlinOffsetString, berlinWallTime } from "./berlinTime.js";
import { checkText, type CheckWarning } from "./claimsCheck.js";
import { HttpError } from "./engagement.js";
import type { CourseInfo, CourseSession, Lang } from "./courses.js";

// Courses created in the admin section (docs/admin-section-design.md,
// "Priority 1"). Three documents per course:
//
//   courseDrafts/{id}   the working copy + approval state       admin only
//   courses/{id}        what visitors see, written on publish     public read
//   coursePrivate/{id}  the published version incl. Meet links,   admin only
//                       read by booking, payment and reminders
//
// Editing never touches what's live: a change is saved to the draft, the
// other founder approves that exact revision, and only then "Publish" copies
// it to courses/ and coursePrivate/. Meet links and closing/reopening are
// the exceptions (no approval needed; see api/admin.ts).

export const COURSE_INSTRUCTORS = ["Riju", "Richa", "Richa & Riju"] as const;

export type CourseText = {
  // The course card on the home page.
  title: string;
  summary: string;
  /** Short schedule line on the card, e.g. "Starts 12 Jan · Tue 19:00 · 6 weeks". */
  time: string;
  location: string;
  /** Price as shown, e.g. "€69 · 6 sessions". */
  price: string;
  // The course page.
  badge: string;
  intro: string;
  schedule: string;
  duration: string;
  format: string;
  priceFact: string;
  learnTitle: string;
  learnItems: { title: string; description: string }[];
  benefitsTitle: string;
  benefits: string[];
  howSteps: string[];
  bookCta: string;
  seoTitle: string;
  seoDescription: string;
};

export type CourseBannerText = { label: string; short: string; cta: string; title: string; when: string; detail: string };

export type CourseSessionInput = { date: string; startTime: string; endTime: string; meetUrl: string };

export type CourseData = {
  id: string;
  /** series = one booking covers every session; pickOne = the booker chooses a date. */
  type: "series" | "pickOne";
  format: "online" | "inPerson" | "hybrid";
  venue: string;
  meetUrl: string;
  instructor: string;
  /** Uses the parent/guardian wording of the kids workshop in the booking form. */
  forChildren: boolean;
  sessions: CourseSessionInput[];
  priceCents: number;
  /** e.g. "₹1500"; empty = no UPI payment. */
  inrPrice: string;
  earlyBirdPercent: number;
  /** YYYY-MM-DD, last day of the early-bird price; empty = none. */
  earlyBirdUntil: string;
  alumniCodes: boolean;
  welcomeCodes: boolean;
  /** YYYY-MM-DDTHH:MM German time; empty = until the first session starts. */
  closesAt: string;
  /** Per course for a series, per date for pick-one; null = unlimited. */
  seatLimit: number | null;
  contactEmail: string;
  blogSlug: string;
  banner: { on: boolean; until: string; EN: CourseBannerText; DE: CourseBannerText };
  EN: CourseText;
  DE: CourseText;
};

const EMPTY_TEXT: CourseText = {
  title: "", summary: "", time: "", location: "", price: "",
  badge: "", intro: "", schedule: "", duration: "", format: "", priceFact: "",
  learnTitle: "", learnItems: [], benefitsTitle: "", benefits: [], howSteps: [], bookCta: "",
  seoTitle: "", seoDescription: "",
};
const EMPTY_BANNER: CourseBannerText = { label: "", short: "", cta: "", title: "", when: "", detail: "" };

export function emptyCourse(id: string): CourseData {
  return {
    id, type: "series", format: "online", venue: "", meetUrl: "", instructor: "Riju", forChildren: false,
    sessions: [], priceCents: 0, inrPrice: "", earlyBirdPercent: 10, earlyBirdUntil: "", alumniCodes: true, welcomeCodes: true,
    closesAt: "", seatLimit: null, contactEmail: "", blogSlug: "",
    banner: { on: false, until: "", EN: { ...EMPTY_BANNER }, DE: { ...EMPTY_BANNER } },
    EN: structuredClone(EMPTY_TEXT), DE: structuredClone(EMPTY_TEXT),
  };
}

// ---------------------------------------------------------------- input

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,78}[a-z0-9])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isCourseSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_RE.test(value);
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : "";
}
function strList(value: unknown, maxItems: number, maxLen: number): string[] {
  return Array.isArray(value) ? value.map((v) => str(v, maxLen)).filter(Boolean).slice(0, maxItems) : [];
}
function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
function url(value: unknown): string {
  const s = str(value, 500);
  return /^https:\/\/\S+$/.test(s) ? s : "";
}

function text(value: unknown): CourseText {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    title: str(v.title, 120),
    summary: str(v.summary, 400),
    time: str(v.time, 120),
    location: str(v.location, 120),
    price: str(v.price, 80),
    badge: str(v.badge, 80),
    intro: str(v.intro, 1500),
    schedule: str(v.schedule, 400),
    duration: str(v.duration, 200),
    format: str(v.format, 400),
    priceFact: str(v.priceFact, 200),
    learnTitle: str(v.learnTitle, 80),
    learnItems: (Array.isArray(v.learnItems) ? v.learnItems : [])
      .map((item) => ({ title: str((item as Record<string, unknown>)?.title, 100), description: str((item as Record<string, unknown>)?.description, 400) }))
      .filter((item) => item.title || item.description)
      .slice(0, 8),
    benefitsTitle: str(v.benefitsTitle, 80),
    benefits: strList(v.benefits, 10, 200),
    howSteps: strList(v.howSteps, 8, 300),
    bookCta: str(v.bookCta, 60),
    seoTitle: str(v.seoTitle, 120),
    seoDescription: str(v.seoDescription, 300),
  };
}

function banner(value: unknown): CourseBannerText {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    label: str(v.label, 120), short: str(v.short, 40), cta: str(v.cta, 30),
    title: str(v.title, 80), when: str(v.when, 80), detail: str(v.detail, 80),
  };
}

/** Cleans what the editor sends. Never throws: problems show in the checklist. */
export function normalizeCourse(input: unknown, id: string): CourseData {
  const v = (input ?? {}) as Record<string, unknown>;
  const sessions = (Array.isArray(v.sessions) ? v.sessions : [])
    .map((s) => {
      const r = (s ?? {}) as Record<string, unknown>;
      return {
        date: DATE_RE.test(String(r.date)) ? String(r.date) : "",
        startTime: TIME_RE.test(String(r.startTime)) ? String(r.startTime) : "",
        endTime: TIME_RE.test(String(r.endTime)) ? String(r.endTime) : "",
        meetUrl: url(r.meetUrl),
      };
    })
    .slice(0, 60)
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const b = (v.banner ?? {}) as Record<string, unknown>;
  const price = Math.round(Number(v.priceCents));
  const seats = v.seatLimit === null || v.seatLimit === "" || v.seatLimit === undefined ? null : Math.round(Number(v.seatLimit));
  return {
    id,
    type: v.type === "pickOne" ? "pickOne" : "series",
    format: v.format === "inPerson" || v.format === "hybrid" ? v.format : "online",
    venue: str(v.venue, 200),
    meetUrl: url(v.meetUrl),
    instructor: (COURSE_INSTRUCTORS as readonly string[]).includes(String(v.instructor)) ? String(v.instructor) : "Riju",
    forChildren: bool(v.forChildren, false),
    sessions,
    priceCents: Number.isFinite(price) ? Math.min(Math.max(price, 0), 200_000) : 0,
    inrPrice: str(v.inrPrice, 20),
    earlyBirdPercent: Math.min(Math.max(Math.round(Number(v.earlyBirdPercent)) || 0, 0), 50),
    earlyBirdUntil: DATE_RE.test(String(v.earlyBirdUntil)) ? String(v.earlyBirdUntil) : "",
    alumniCodes: bool(v.alumniCodes, true),
    welcomeCodes: bool(v.welcomeCodes, true),
    closesAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(v.closesAt)) ? String(v.closesAt) : "",
    seatLimit: seats !== null && Number.isFinite(seats) && seats > 0 ? Math.min(seats, 1000) : null,
    contactEmail: EMAIL_RE.test(str(v.contactEmail, 200)) ? str(v.contactEmail, 200) : "",
    blogSlug: /^[a-z0-9-]{1,200}$/.test(str(v.blogSlug, 200)) ? str(v.blogSlug, 200) : "",
    banner: {
      on: bool(b.on, false),
      until: DATE_RE.test(String(b.until)) ? String(b.until) : "",
      EN: banner(b.EN),
      DE: banner(b.DE),
    },
    EN: text(v.EN),
    DE: text(v.DE),
  };
}

// ---------------------------------------------------------------- sessions

const sessionKey = (s: CourseSessionInput) => `${s.date}T${s.startTime}`;

export function startOf(s: CourseSessionInput): Date {
  return berlinWallTime(s.date, s.startTime);
}
export function endOf(s: CourseSessionInput): Date {
  return berlinWallTime(s.date, s.endTime);
}

/** "2026-11-03T20:00:00+01:00": German local time with its own offset. */
function localIso(date: string, time: string): string {
  return `${date}T${time}:00${berlinOffsetString(berlinWallTime(date, time))}`;
}

/** Stable id per session: the date, or date-HHMM when a day has two. */
export function sessionIds(sessions: CourseSessionInput[]): string[] {
  return sessions.map((s, _i, all) => (all.filter((o) => o.date === s.date).length > 1 ? `${s.date}-${s.startTime.replace(":", "")}` : s.date));
}

function istRange(start: Date, end: Date): string {
  const f = (d: Date) => new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(d);
  return `${f(start)}–${f(end)} IST`;
}

/** Session labels for the booking form, e.g. "Sat 24 Jan · 12:30–14:00 (German time)". */
export function sessionLabel(s: CourseSessionInput, lang: Lang, withIst: boolean): string {
  const start = startOf(s);
  const end = endOf(s);
  const day = new Intl.DateTimeFormat(lang === "DE" ? "de-DE" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Berlin" }).format(start);
  const times = `${s.startTime}–${s.endTime}`;
  const zone = lang === "DE" ? "deutsche Zeit" : "German time";
  return `${day} · ${times} (${zone})${withIst ? ` · ${istRange(start, end)}` : ""}`;
}

// ---------------------------------------------------------------- checks

export type ChecklistItem = { id: string; ok: boolean; label: string; blocking: boolean };

const REQUIRED_TEXT: (keyof CourseText)[] = [
  "title", "summary", "time", "location", "price", "intro", "schedule", "duration", "format", "priceFact", "bookCta", "seoTitle", "seoDescription",
];

/** The publish checklist shown in the editor; blocking items stop "Send for approval" and "Publish". */
export function courseChecklist(data: CourseData, now = new Date()): ChecklistItem[] {
  const missing = (lang: Lang) => REQUIRED_TEXT.filter((k) => !String(data[lang][k]).trim());
  const complete = data.sessions.every((s) => s.date && s.startTime && s.endTime && endOf(s) > startOf(s));
  const future = data.sessions.filter((s) => s.date && s.startTime && startOf(s).getTime() > now.getTime());
  const firstStart = data.sessions.length ? startOf(data.sessions[0]) : null;
  const closes = data.closesAt ? berlinWallTime(data.closesAt.slice(0, 10), data.closesAt.slice(11, 16)) : null;
  const hasLink = Boolean(data.meetUrl) || (data.sessions.length > 0 && data.sessions.every((s) => s.meetUrl));
  const duplicates = new Set(data.sessions.map(sessionKey)).size !== data.sessions.length;
  return [
    { id: "en", ok: missing("EN").length === 0, blocking: true, label: missing("EN").length ? `English text missing: ${missing("EN").join(", ")}` : "English text complete" },
    { id: "de", ok: missing("DE").length === 0, blocking: true, label: missing("DE").length ? `German text missing: ${missing("DE").join(", ")}` : "German text complete" },
    { id: "sessions", ok: data.sessions.length > 0 && complete && !duplicates, blocking: true, label: data.sessions.length === 0 ? "Add at least one session" : !complete ? "Every session needs a date, start and end time (end after start)" : duplicates ? "Two sessions have the same date and time" : "Sessions complete" },
    { id: "future", ok: future.length > 0, blocking: true, label: future.length ? `${future.length} upcoming session${future.length === 1 ? "" : "s"}` : "No session in the future" },
    { id: "price", ok: data.priceCents >= 100, blocking: true, label: data.priceCents >= 100 ? "Price set" : "Set a price of at least €1 (free courses come in a later step)" },
    { id: "venue", ok: data.format === "online" || Boolean(data.venue), blocking: true, label: data.format === "online" ? "Online course" : data.venue ? "Venue set" : "In-person courses need a venue" },
    { id: "closes", ok: !closes || !firstStart || closes <= firstStart || data.type === "pickOne", blocking: true, label: closes && firstStart && closes > firstStart && data.type === "series" ? "Booking must close before the first session" : "Booking closing time OK" },
    { id: "early", ok: !data.earlyBirdUntil || data.earlyBirdPercent > 0, blocking: true, label: data.earlyBirdUntil && !data.earlyBirdPercent ? "Early bird has a date but no percentage" : "Early bird OK" },
    { id: "meet", ok: data.format === "inPerson" || hasLink, blocking: false, label: data.format === "inPerson" || hasLink ? "Meet link set" : "No Meet link yet (needed before the first session; can be added after publishing)" },
  ];
}

/** Health-claims warnings (advisory, shown to the approver), as for blog posts. */
export function courseWarnings(data: CourseData): CheckWarning[] {
  const all: string[] = [];
  for (const lang of ["EN", "DE"] as const) {
    const t = data[lang];
    all.push(t.title, t.summary, t.intro, t.seoDescription, ...t.benefits, ...t.learnItems.map((i) => `${i.title}. ${i.description}`));
  }
  return checkText(all.filter(Boolean).join("\n"));
}

export function blockingProblems(data: CourseData, now = new Date()): string[] {
  return courseChecklist(data, now).filter((c) => c.blocking && !c.ok).map((c) => c.label);
}

/**
 * Changes that are refused once people have booked (use the dedicated
 * actions instead): price, type, and removing or moving a session.
 */
export function lockedChanges(live: CourseData, next: CourseData): string[] {
  const problems: string[] = [];
  if (live.priceCents !== next.priceCents) problems.push("price");
  if (live.type !== next.type) problems.push("course type");
  const nextKeys = new Set(next.sessions.map((s) => `${sessionKey(s)}-${s.endTime}`));
  if (live.sessions.some((s) => !nextKeys.has(`${sessionKey(s)}-${s.endTime}`))) problems.push("removing or moving a session");
  return problems;
}

// ---------------------------------------------------------------- compile

/** What visitors read from courses/{id}. No Meet links: those are only for paying participants. */
export function compilePublic(data: CourseData, state: { closedManually: boolean; archived: boolean; revision: number }) {
  const ids = sessionIds(data.sessions);
  const withIst = Boolean(data.inrPrice);
  const last = data.sessions[data.sessions.length - 1];
  const euros = data.priceCents % 100 === 0 ? String(data.priceCents / 100) : (data.priceCents / 100).toFixed(2);
  const card = (lang: Lang) => ({
    title: data[lang].title,
    time: data[lang].time,
    location: data[lang].location,
    price: data[lang].price,
    instructor: data.instructor,
    description: data[lang].summary,
  });
  const page = (lang: Lang) => {
    const t = data[lang];
    return {
      badge: t.badge,
      seoTitle: t.seoTitle,
      seoDescription: t.seoDescription,
      intro: t.intro,
      schedule: t.schedule,
      duration: t.duration,
      format: t.format,
      price: t.priceFact,
      ...(t.learnTitle ? { learnTitle: t.learnTitle } : {}),
      learnItems: t.learnItems,
      ...(t.benefitsTitle ? { benefitsTitle: t.benefitsTitle } : {}),
      benefits: t.benefits,
      howSteps: t.howSteps,
      bookCta: t.bookCta,
    };
  };
  const timed = data.sessions.map((s, i) => ({
    id: ids[i],
    start: localIso(s.date, s.startTime),
    end: localIso(s.date, s.endTime),
    EN: sessionLabel(s, "EN", withIst),
    DE: sessionLabel(s, "DE", withIst),
  }));
  return {
    id: data.id,
    dynamic: true,
    bookable: true,
    format: data.format,
    ...(data.format !== "online" && data.venue ? { venue: data.venue } : {}),
    forChildren: data.forChildren,
    offerPrice: euros,
    priceCents: data.priceCents,
    ...(data.inrPrice ? { acceptsINR: true, inrPrice: data.inrPrice } : {}),
    ...(data.contactEmail ? { contactEmail: data.contactEmail } : {}),
    ...(data.blogSlug ? { blogSlug: data.blogSlug } : {}),
    ...(data.closesAt ? { bookingClosesAt: localIso(data.closesAt.slice(0, 10), data.closesAt.slice(11, 16)) } : {}),
    ...(data.seatLimit ? { seatLimit: data.seatLimit } : {}),
    lastDay: last?.date ?? "",
    ...(data.type === "pickOne"
      ? { sessions: timed }
      : { meetings: timed.map(({ start, end }) => ({ start, end })) }),
    EN: card("EN"),
    DE: card("DE"),
    page: { EN: page("EN"), DE: page("DE") },
    ...(data.banner.on && data.banner.until
      ? {
          announcement: {
            id: `${data.id}-${state.revision}`,
            href: `/courses/${data.id}`,
            until: data.banner.until,
            EN: data.banner.EN,
            DE: data.banner.DE,
          },
        }
      : {}),
    closedManually: state.closedManually,
    archived: state.archived,
    revision: state.revision,
  };
}

/** The server-side shape the booking, payment, reminder and invoice code uses. */
export function toCourseInfo(data: CourseData, state: { closedManually: boolean; archived: boolean }): CourseInfo {
  const ids = sessionIds(data.sessions);
  const sessions: CourseSession[] = data.sessions.map((s, i) => {
    const label: Record<Lang, string> = data.type === "series"
      ? { EN: `Session ${i + 1} of ${data.sessions.length}`, DE: `Einheit ${i + 1} von ${data.sessions.length}` }
      : {
          EN: `on ${new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" }).format(startOf(s))}, ${s.startTime}–${s.endTime} German time`,
          DE: `am ${new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" }).format(startOf(s))}, ${s.startTime}–${s.endTime} Uhr deutsche Zeit`,
        };
    return { id: ids[i], start: localIso(s.date, s.startTime), end: localIso(s.date, s.endTime), label, ...(s.meetUrl ? { meetUrl: s.meetUrl } : {}) };
  });
  const price = (lang: Lang) => new Intl.NumberFormat(lang === "DE" ? "de-DE" : "en-IE", { style: "currency", currency: "EUR" }).format(data.priceCents / 100);
  return {
    EN: { title: data.EN.title, schedule: data.EN.schedule, price: price("EN") },
    DE: { title: data.DE.title, schedule: data.DE.schedule, price: price("DE") },
    amountCents: data.priceCents,
    earlyBirdUntil: data.earlyBirdUntil && data.earlyBirdPercent > 0 ? data.earlyBirdUntil : null,
    earlyBirdPercent: data.earlyBirdPercent,
    alumniCodes: data.alumniCodes,
    welcomeCodes: data.welcomeCodes,
    ...(data.inrPrice ? { inrPrice: data.inrPrice } : {}),
    ...(data.contactEmail ? { contactEmail: data.contactEmail } : {}),
    meetUrl: data.meetUrl,
    sessions,
    pickOne: data.type === "pickOne",
    format: data.format,
    venue: data.venue,
    seatLimit: data.seatLimit,
    closesAt: data.closesAt ? berlinWallTime(data.closesAt.slice(0, 10), data.closesAt.slice(11, 16)).toISOString() : null,
    closedManually: state.closedManually,
    archived: state.archived,
    dynamic: true,
  };
}

/** Throws 400 with the first blocking problem, for publish/approval ops. */
export function assertPublishable(data: CourseData, now = new Date()): void {
  const problems = blockingProblems(data, now);
  if (problems.length) throw new HttpError(400, "not_publishable", problems.join("; "));
}
