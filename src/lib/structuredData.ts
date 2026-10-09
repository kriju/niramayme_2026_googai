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

export function businessJsonLd(lang: Lang) {
  const t = TRANSLATIONS[lang];
  return {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": BUSINESS_JSONLD_ID,
    name: "Niramay Wellbeing",
    alternateName: ["Niramay", "niramay.me"],
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
    makesOffer: SERVICES.filter(s => !s.openInModal).map(s => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: s[lang].title,
        description: s[lang].description,
        areaServed: "Ostfildern, Germany",
        url: `${SITE_URL}${lang === "DE" ? "/de" : ""}/services/${s.id}`,
      },
    })),
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
    alternateName: ["Niramay", "niramay.me"],
    url: `${SITE_URL}/`,
    publisher: { "@id": BUSINESS_JSONLD_ID },
    inLanguage: ["en", "de"],
  };
}

// Script-tag ids, shared with useJsonLd so the client updates the static
// copies in place instead of adding duplicates.
export const SITE_JSONLD = [
  { id: "ld-json-business", build: businessJsonLd },
  { id: "ld-json-richa", build: richaJsonLd },
  { id: "ld-json-website", build: websiteJsonLd },
] as const;
