// Site-wide JSON-LD (the business, its founder and the website itself),
// built in one place so the React app (App.tsx's Layout, via useJsonLd)
// and the build-time prerender (scripts/prerender-routes.ts, which writes
// the same data into each page's static <head>) can't drift apart. The
// static copy is what lets Google tie "Niramay Wellbeing" / "Richa Kansal"
// brand queries to this site without first having to render the JS.
//
// Imports only plain data — no React — so the Node build script can use it.

import { SERVICES, TRANSLATIONS, BUSINESS_STREET_ADDRESS, BUSINESS_POSTAL_CODE, BUSINESS_CITY, GOOGLE_MAPS_URL } from "../constants";

type Lang = "EN" | "DE";

export const SITE_URL = "https://www.niramay.me";
// Shared across the LocalBusiness JSON-LD and the review/aggregateRating
// JSON-LD (TestimonialsSection) so structured-data consumers resolve every
// script tag to the same entity.
export const BUSINESS_JSONLD_ID = `${SITE_URL}/#business`;
export const WEBSITE_JSONLD_ID = `${SITE_URL}/#website`;
export const RICHA_JSONLD_ID = `${SITE_URL}/#richa-kansal`;

const SOCIAL_PROFILES = [
  "https://www.instagram.com/niramay.me/",
  "https://www.facebook.com/niramayme/",
  "https://www.youtube.com/@richaniramayme",
];

const WORLDWIDE = { "@type": "Place", name: "Worldwide" };

// areaServed (plus, for sessions that can happen by video call, an online
// availableChannel) for a service, by its `delivery` (see SERVICES), so
// distance Reiki or a tarot reading isn't marked as Ostfildern-only.
export function serviceReach(delivery: string | undefined, url: string) {
  if (delivery !== "online" && delivery !== "hybrid") return { areaServed: "Ostfildern, Germany" };
  return {
    areaServed: delivery === "online" ? WORLDWIDE : [{ "@type": "City", name: BUSINESS_CITY }, WORLDWIDE],
    availableChannel: { "@type": "ServiceChannel", name: "Live online session (video call)", serviceUrl: url },
  };
}

export function businessJsonLd(lang: Lang) {
  const t = TRANSLATIONS[lang];
  return {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": BUSINESS_JSONLD_ID,
    name: "Niramay Wellbeing",
    alternateName: ["Niramay Wohlbefinden", "Niramay", "niramay.me"],
    // Google's logo/knowledge-panel guidelines want a raster image of at
    // least 112x112; the SVG stays as the general image.
    logo: `${SITE_URL}/apple-touch-icon.png`,
    image: [`${SITE_URL}/og-default.jpg`, `${SITE_URL}/logo.svg`],
    url: `${SITE_URL}${lang === "DE" ? "/de" : "/"}`,
    telephone: "+49 151 75315761",
    email: "richa@niramay.me",
    description: t.footer.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_STREET_ADDRESS,
      postalCode: BUSINESS_POSTAL_CODE,
      addressLocality: BUSINESS_CITY,
      addressRegion: "Baden-Württemberg",
      addressCountry: "DE",
    },
    areaServed: [
      { "@type": "City", name: BUSINESS_CITY },
      { "@type": "City", name: "Stuttgart" },
      { "@type": "Country", name: "Germany" },
      // Many sessions and courses are live online.
      WORLDWIDE,
    ],
    hasMap: GOOGLE_MAPS_URL,
    founder: [
      { "@id": RICHA_JSONLD_ID },
      { "@type": "Person", name: "Riju Kansal", jobTitle: t.about.riju.title },
    ],
    employee: { "@id": RICHA_JSONLD_ID },
    sameAs: [...SOCIAL_PROFILES, GOOGLE_MAPS_URL],
    // Only the sessions Niramay delivers directly — the "openInModal"
    // entries just link out to standalone third-party tools, not a service
    // Niramay itself provides, so they don't belong in this list.
    makesOffer: SERVICES.filter(s => !s.openInModal).map(s => {
      const url = `${SITE_URL}${lang === "DE" ? "/de" : ""}/services/${s.id}`;
      return {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s[lang].title,
          description: s[lang].description,
          ...serviceReach(s.delivery, url),
          url,
        },
      };
    }),
    inLanguage: lang === "EN" ? "en" : "de",
  };
}

// Richa is who people search for by name ("Richa Kansal Reiki"), so she
// gets her own entity rather than only a nested founder stub.
export function richaJsonLd(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": RICHA_JSONLD_ID,
    name: "Richa Kansal",
    jobTitle: TRANSLATIONS[lang].about.richa.title,
    worksFor: { "@id": BUSINESS_JSONLD_ID },
    url: `${SITE_URL}${lang === "DE" ? "/de" : "/"}`,
    knowsAbout: ["Reiki", "Yoga", "NLP", "Hypnotherapy", "Vedic astrology", "Tarot"],
    address: { "@type": "PostalAddress", addressLocality: BUSINESS_CITY, addressCountry: "DE" },
    sameAs: SOCIAL_PROFILES,
  };
}

// Tells Google which name to show for the site in results ("site name"),
// instead of it guessing from the domain.
export function websiteJsonLd(_lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_JSONLD_ID,
    name: "Niramay Wellbeing",
    alternateName: ["Niramay Wohlbefinden", "Niramay", "niramay.me"],
    url: `${SITE_URL}/`,
    publisher: { "@id": BUSINESS_JSONLD_ID },
    inLanguage: ["en", "de"],
  };
}

// Type-only import: this file is also used by the build scripts, which must
// not load the Firebase client that publicCourses.ts uses.
type Course = import("./publicCourses").PublicCourse;
type Meeting = { start: string; end: string };

// Each run of a course as its list of meetings: a course with `sessions`
// is one workshop offered on alternative dates (one meeting each); a
// series has a single run of several `meetings`.
function courseRuns(course: Course): Meeting[][] {
  if (course.sessions) return course.sessions.flatMap(s => (s.start && s.end ? [[{ start: s.start, end: s.end }]] : []));
  return course.meetings ? [course.meetings] : [];
}

const INSTRUCTORS: Record<string, object> = {
  Richa: { "@type": "Person", "@id": RICHA_JSONLD_ID, name: "Richa Kansal" },
  Riju: { "@type": "Person", name: "Riju Kansal" },
};

const ORGANIZER = { "@type": "Organization", "@id": BUSINESS_JSONLD_ID, name: "Niramay Wellbeing", url: `${SITE_URL}/` };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => `https://schema.org/${d}`);

// ISO 8601 duration ("PT1H30M") from milliseconds.
function isoDuration(ms: number) {
  const minutes = Math.round(ms / 60000);
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `PT${h ? `${h}H` : ""}${m || !h ? `${m}M` : ""}`;
}

function courseOffers(course: Course, url: string, available: boolean) {
  const availability = available ? { availability: "https://schema.org/InStock" } : {};
  const offers = [{ "@type": "Offer", price: course.offerPrice, priceCurrency: "EUR", category: "Paid", url, ...availability }];
  if (course.acceptsINR && course.inrPrice) {
    offers.push({ "@type": "Offer", price: course.inrPrice.replace(/\D/g, ""), priceCurrency: "INR", category: "Paid", url, ...availability });
  }
  return offers;
}

// Course JSON-LD for a /courses/:id page: every upcoming run becomes an
// online CourseInstance with its schedule, which Google needs before it
// can show a course in its course results. Runs that have already started
// are left out. `bookable` is false once registration has closed.
export function courseJsonLd(course: Course, lang: Lang, url: string, bookable: boolean, now = Date.now()) {
  const content = course[lang];
  const instructor = INSTRUCTORS[content.instructor];
  const runs = courseRuns(course).filter(run => new Date(run[0].start).getTime() > now);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: content.title,
    description: course.page?.[lang].seoDescription ?? TRANSLATIONS[lang][course.pageKey as "yogaSeries"].seoDescription,
    url,
    inLanguage: lang === "EN" ? "en" : "de",
    provider: ORGANIZER,
    offers: courseOffers(course, url, bookable),
    ...(runs.length > 0 && {
      hasCourseInstance: runs.map(run => {
        const first = run[0], last = run[run.length - 1];
        const total = run.reduce((sum, m) => sum + (new Date(m.end).getTime() - new Date(m.start).getTime()), 0);
        return {
          "@type": "CourseInstance",
          courseMode: course.format === "inPerson" ? "Onsite" : course.format === "hybrid" ? "Blended" : "Online",
          ...(instructor && { instructor }),
          courseWorkload: isoDuration(total),
          courseSchedule: {
            "@type": "Schedule",
            startDate: first.start.slice(0, 10),
            endDate: last.end.slice(0, 10),
            startTime: first.start.slice(11, 19),
            endTime: first.end.slice(11, 19),
            // Meeting dates are written in local (Berlin) time, so their
            // date part is the local weekday.
            byDay: [...new Set(run.map(m => WEEKDAYS[new Date(`${m.start.slice(0, 10)}T12:00:00Z`).getUTCDay()]))],
            duration: isoDuration(new Date(first.end).getTime() - new Date(first.start).getTime()),
            scheduleTimezone: "Europe/Berlin",
          },
        };
      }),
    }),
  };
}

// One online Event per upcoming run of a course (first meeting to last),
// for Google's event results; null when there's none to list.
export function courseEventsJsonLd(course: Course, lang: Lang, url: string, bookable: boolean, now = Date.now()) {
  const content = course[lang];
  const instructor = INSTRUCTORS[content.instructor];
  const events = courseRuns(course)
    .filter(run => new Date(run[0].start).getTime() > now)
    .map(run => ({
      "@type": "Event",
      name: content.title,
      description: content.description,
      url,
      startDate: run[0].start,
      endDate: run[run.length - 1].end,
      eventStatus: "https://schema.org/EventScheduled",
      ...(course.format === "inPerson" && course.venue
        ? { eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", location: { "@type": "Place", name: course.venue, address: course.venue } }
        : { eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode", location: { "@type": "VirtualLocation", url } }),
      image: [`${SITE_URL}/og-default.jpg`],
      organizer: ORGANIZER,
      ...(instructor && { performer: instructor }),
      ...(bookable && { offers: courseOffers(course, url, true) }),
    }));
  return events.length ? { "@context": "https://schema.org", "@graph": events } : null;
}

// Script-tag ids, shared with useJsonLd so the client updates the static
// copies in place instead of adding duplicates.
export const SITE_JSONLD = [
  { id: "ld-json-business", build: businessJsonLd },
  { id: "ld-json-richa", build: richaJsonLd },
  { id: "ld-json-website", build: websiteJsonLd },
] as const;
