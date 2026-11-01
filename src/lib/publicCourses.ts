import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { ANNOUNCEMENTS, COURSES } from "../constants";

// Every course the site shows: the ones defined in code (COURSES in
// constants.ts) and the ones created in the admin section, which are read
// from Firestore (courses/{id}, written on publish by api/admin.ts).
// Both have the same shape, so the course cards, the course page and the
// booking form treat them alike.

export type CourseCardText = {
  title: string;
  time: string;
  location: string;
  price?: string;
  instructor: string;
  description: string;
  nameLabel?: string;
  consentPrefix?: string;
  notesPlaceholder?: string;
};

/** The course page copy of an admin-created course (static ones use TRANSLATIONS[pageKey]). */
export type CoursePageText = {
  badge: string;
  seoTitle: string;
  seoDescription: string;
  intro: string;
  schedule: string;
  duration: string;
  format: string;
  price: string;
  learnTitle?: string;
  learnItems: { title: string; description: string }[];
  benefitsTitle?: string;
  benefits: string[];
  howSteps: string[];
  bookCta: string;
};

export type CourseAnnouncement = (typeof ANNOUNCEMENTS)[number];

export type PublicCourse = {
  id: string;
  bookable?: boolean;
  pageKey?: string;
  offerPrice?: string;
  acceptsINR?: boolean;
  inrPrice?: string;
  contactEmail?: string;
  bookingClosesAt?: string;
  lastDay?: string;
  provider?: string;
  kursnr?: string;
  registrationUrl?: string;
  blogSlug?: string;
  meetings?: { start: string; end: string }[];
  sessions?: { id: string; start: string; end: string; EN: string; DE: string }[];
  EN: CourseCardText;
  DE: CourseCardText;
  // Admin-created courses only.
  dynamic?: boolean;
  page?: { EN: CoursePageText; DE: CoursePageText };
  format?: "online" | "inPerson" | "hybrid";
  venue?: string;
  forChildren?: boolean;
  seatLimit?: number;
  closedManually?: boolean;
  archived?: boolean;
  announcement?: CourseAnnouncement;
};

export const STATIC_COURSES: PublicCourse[] = COURSES;

let storedPromise: Promise<PublicCourse[]> | null = null;
let storedCache: PublicCourse[] | null = null;

/** Admin-created courses, read once per visit. Never throws: [] on failure. */
export function loadStoredCourses(): Promise<PublicCourse[]> {
  storedPromise ??= getDocs(collection(db, "courses"))
    .then(snap => snap.docs.map(d => ({ ...(d.data() as PublicCourse), id: d.id })).filter(c => !c.archived))
    .catch(err => {
      console.error("Couldn't load courses:", err);
      return [];
    })
    .then(list => {
      storedCache = list;
      return list;
    });
  return storedPromise;
}

/**
 * All courses, static ones first. `loaded` turns true once the stored ones
 * are in, so a page for a stored course waits instead of redirecting away.
 */
export function useCourses(): { courses: PublicCourse[]; loaded: boolean } {
  const [stored, setStored] = useState<PublicCourse[] | null>(storedCache);
  useEffect(() => {
    if (storedCache) return;
    let cancelled = false;
    loadStoredCourses().then(list => { if (!cancelled) setStored(list); });
    return () => { cancelled = true; };
  }, []);
  const staticIds = new Set(STATIC_COURSES.map(c => c.id));
  return {
    courses: [...STATIC_COURSES, ...(stored ?? []).filter(c => !staticIds.has(c.id))],
    loaded: stored !== null,
  };
}

/** Calendar day in German time, YYYY-MM-DD. */
export const berlinToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());

/** Over and no longer listed: the day after its last date (German time). */
export const isCoursePast = (course: PublicCourse) => Boolean(course.lastDay && berlinToday() > course.lastDay);

/** Not taking new bookings: closed by hand, past its closing time, or (admin courses) started/over. */
export function isCourseBookingClosed(course: PublicCourse, now = Date.now()): boolean {
  if (course.closedManually) return true;
  if (course.bookingClosesAt && now > new Date(course.bookingClosesAt).getTime()) return true;
  if (course.dynamic) {
    if (course.sessions) return !course.sessions.some(s => new Date(s.start).getTime() > now);
    const first = course.meetings?.[0];
    return !first || new Date(first.start).getTime() <= now;
  }
  return false;
}

/** Announcement bar items from admin-created courses with the banner switched on. */
export function storedAnnouncements(courses: PublicCourse[]): CourseAnnouncement[] {
  return courses.flatMap(c => (c.dynamic && c.announcement && !isCourseBookingClosed(c) ? [c.announcement] : []));
}

/** A draft course as its page will look, from the editor's signed preview link. */
export async function loadCoursePreview(id: string, token: string): Promise<PublicCourse | null> {
  const response = await fetch(`/api/admin?op=course-preview&id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
  if (!response.ok) return null;
  const data = (await response.json()) as { course?: PublicCourse };
  return data.course ?? null;
}

/** Labels of the course page for admin-created courses (their own copy fills the rest). */
export const GENERIC_COURSE_LABELS = {
  EN: {
    breadcrumbCourses: "Courses",
    scheduleLabel: "Schedule",
    scheduleLabelPickOne: "Choose ONE date",
    durationLabel: "Duration",
    formatLabel: "Format",
    priceLabel: "Price",
    learnTitle: "What You Will Learn",
    benefitsTitle: "Why It Helps",
    howTitle: "How Booking Works",
    blogTitle: "Read More on This Topic",
    blogDescription: "",
    blogLinkLabel: "Read the article",
    questionsNote: "Questions? Email us at",
    moreInfoBtn: "More Info",
    bookBtn: "Book & Pay",
    previewBanner: "Preview — this is how the page will look once published. Booking is disabled.",
  },
  DE: {
    breadcrumbCourses: "Kurse",
    scheduleLabel: "Termine",
    scheduleLabelPickOne: "EINEN Termin wählen",
    durationLabel: "Dauer",
    formatLabel: "Format",
    priceLabel: "Preis",
    learnTitle: "Was Sie lernen",
    benefitsTitle: "Warum es hilft",
    howTitle: "So funktioniert die Buchung",
    blogTitle: "Mehr zum Thema",
    blogDescription: "",
    blogLinkLabel: "Zum Artikel",
    questionsNote: "Fragen? Schreiben Sie uns an",
    moreInfoBtn: "Mehr Infos",
    bookBtn: "Buchen & bezahlen",
    previewBanner: "Vorschau – so sieht die Seite nach dem Veröffentlichen aus. Buchen ist deaktiviert.",
  },
} as const;
