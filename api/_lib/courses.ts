// Server-side catalogue of the courses booked and paid for on this site
// (CourseIntakeModal in src/App.tsx, collection courseBookings). Kept in sync
// by hand with the bookable COURSES entries in src/constants.ts (duplicated
// rather than imported, same reasoning as api/sitemap.ts). The amounts here
// are what Stripe charges — the client never sends a price.
//
// `sessions` lists every dated meeting with its start/end as ISO timestamps
// incl. the German UTC offset; they drive the .ics invite, the reminder cron
// and the invoice's service period. A course whose booker picks one date
// (`pickOne`) stores the chosen session id on the booking.
//
// `meetUrl` is the Google Meet link sent with the confirmation, the .ics and
// the reminders. Leave it empty until the link exists: the emails then say
// the link follows by email.

export type Lang = "EN" | "DE";
export type CourseId = "yoga-stress-immunity-sleep" | "yoga-adventure";

export type CourseSession = {
  id: string;
  start: string;
  end: string;
  label: Record<Lang, string>;
  meetUrl?: string;
};

export type CourseInfo = Record<Lang, { title: string; schedule: string; price: string }> & {
  /** Price in euro cents, charged via Stripe. */
  amountCents: number;
  /** Last day (YYYY-MM-DD, German time) the 10% early-bird discount applies, or null. */
  earlyBirdUntil: string | null;
  inrPrice?: string;
  contactEmail?: string;
  meetUrl: string;
  sessions: CourseSession[];
  /** true = the booker picks one of `sessions`; false = the booking covers all of them. */
  pickOne: boolean;
};

export const COURSE_CONTACT_EMAIL = "riju.kansal@niramay.me";

// Tuesdays and Thursdays 3–26 Nov 2026, 20:00–21:00 CET.
const SERIES_DAYS = ["03", "05", "10", "12", "17", "19", "24", "26"];

export const COURSES: Record<CourseId, CourseInfo> = {
  "yoga-stress-immunity-sleep": {
    EN: {
      title: "Yoga for Stress, Immunity & Sleep: 8-Session Series",
      schedule: "every Tuesday & Thursday, 8:00–9:00 pm (German time), for 4 weeks starting Tuesday, 3 November 2026",
      price: "€79",
    },
    DE: {
      title: "Yoga für Stress, Immunität & Schlaf: Serie mit 8 Einheiten",
      schedule: "jeden Dienstag & Donnerstag, 20:00–21:00 Uhr (deutsche Zeit), 4 Wochen lang ab Dienstag, 3. November 2026",
      price: "79 €",
    },
    amountCents: 7900,
    earlyBirdUntil: "2026-10-20",
    meetUrl: "",
    pickOne: false,
    sessions: SERIES_DAYS.map((day, i) => ({
      id: `2026-11-${day}`,
      start: `2026-11-${day}T20:00:00+01:00`,
      end: `2026-11-${day}T21:00:00+01:00`,
      label: {
        EN: `Session ${i + 1} of 8`,
        DE: `Einheit ${i + 1} von 8`,
      },
    })),
  },
  "yoga-adventure": {
    EN: {
      title: "Yoga Adventure – Move • Breathe • Play • Discover! (kids 9–14)",
      schedule: "on the date you chose",
      price: "€15",
    },
    DE: {
      title: "Yoga-Abenteuer – Bewegen • Atmen • Spielen • Entdecken! (Kinder 9–14)",
      schedule: "am gewählten Termin",
      price: "15 €",
    },
    amountCents: 1500,
    // Booking closes on 20 Oct, too soon for an early-bird window.
    earlyBirdUntil: null,
    inrPrice: "₹1500",
    contactEmail: "richa@niramay.me",
    meetUrl: "",
    pickOne: true,
    sessions: [
      {
        id: "2026-10-24",
        start: "2026-10-24T12:30:00+02:00",
        end: "2026-10-24T14:00:00+02:00",
        label: {
          EN: "on Saturday, 24 October, 12:30–2:00 pm European time (4:00–5:30 pm IST)",
          DE: "am Samstag, 24. Oktober, 12:30–14:00 Uhr europäische Zeit (16:00–17:30 Uhr IST)",
        },
      },
      {
        id: "2026-10-29",
        start: "2026-10-29T11:30:00+01:00",
        end: "2026-10-29T13:00:00+01:00",
        label: {
          EN: "on Thursday, 29 October, 11:30 am–1:00 pm European time (4:00–5:30 pm IST)",
          DE: "am Donnerstag, 29. Oktober, 11:30–13:00 Uhr europäische Zeit (16:00–17:30 Uhr IST)",
        },
      },
    ],
  },
};

export function isCourseId(value: unknown): value is CourseId {
  return typeof value === "string" && value in COURSES;
}

/** The sessions a booking covers: the chosen one, or all of them. */
export function bookedSessions(course: CourseInfo, sessionId: unknown): CourseSession[] {
  if (!course.pickOne) return course.sessions;
  const chosen = course.sessions.find((s) => s.id === sessionId);
  return chosen ? [chosen] : [];
}

export function meetUrlFor(course: CourseInfo, session?: CourseSession): string {
  return session?.meetUrl || course.meetUrl;
}

/** Today's date in Germany as YYYY-MM-DD. */
export function berlinToday(now = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
}

export function formatEuro(cents: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === "DE" ? "de-DE" : "en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function formatSessionDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "DE" ? "de-DE" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}
