// Writes one HTML file per known route into dist/ after `vite build`, each
// a copy of the app shell with that page's own <title>, description,
// canonical and hreflang already in the <head>.
//
// Without this every URL was served the same dist/index.html, whose static
// tags describe the homepage (canonical "/"), so before rendering the JS
// Google saw /faq, /services/yoga, /de/... all as copies of the homepage —
// Search Console's "Duplicate without user-selected canonical". useSeo in
// src/lib/seo.ts still updates the same tags client-side when navigating.
//
// Also writes dist/404.html (noindex) which Vercel serves, with a real 404
// status, for any path that isn't one of these files — previously unknown
// URLs got the homepage with a 200, i.e. more duplicates/soft 404s.
//
// Files are named like dist/services/yoga.html and served at
// /services/yoga by "cleanUrls" in vercel.json.
//
// Usage: npx tsx scripts/prerender-routes.ts   (runs as part of `npm run build`)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { COURSES, SERVICES, TRANSLATIONS } from "../src/constants";
import { escapeHtml } from "../api/_lib/util";

const SITE_URL = "https://www.niramay.me";
const DIST = "dist";

type Lang = "EN" | "DE";
type Route = {
  // Path without the /de prefix, e.g. "/faq"; "" for the homepage.
  path: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
};

// Titles and descriptions mirror the useSeo calls of each page in
// src/App.tsx — keep them in sync.
const routes: Route[] = [
  {
    path: "",
    title: {
      EN: "Niramay Wellbeing — Yoga, Reiki & Holistic Therapy in Ostfildern",
      DE: "Niramay Wellbeing — Yoga, Reiki & Ganzheitliche Therapie in Ostfildern",
    },
    description: {
      EN: "Niramay Wellbeing: yoga, Reiki, NLP coaching, hypnotherapy and Vedic astrology guidance with Richa Kansal in Ostfildern, Germany. Book a free 15-minute call.",
      DE: "Niramay Wellbeing: Yoga, Reiki, NLP-Coaching, Hypnotherapie und vedische Astrologie mit Richa Kansal in Ostfildern. Vereinbaren Sie ein kostenloses 15-minütiges Gespräch.",
    },
  },
  {
    path: "/faq",
    title: { EN: TRANSLATIONS.EN.faq.seoTitle, DE: TRANSLATIONS.DE.faq.seoTitle },
    description: { EN: TRANSLATIONS.EN.faq.seoDescription, DE: TRANSLATIONS.DE.faq.seoDescription },
  },
  ...SERVICES.filter((s) => !s.openInModal).map((s) => ({
    path: `/services/${s.id}`,
    title: { EN: `${s.EN.title} — Niramay Wellbeing, Ostfildern`, DE: `${s.DE.title} — Niramay Wellbeing, Ostfildern` },
    description: { EN: s.EN.description, DE: s.DE.description },
  })),
  ...COURSES.filter((c) => c.bookable && c.pageKey).map((c) => {
    const key = c.pageKey as "yogaSeries";
    return {
      path: `/courses/${c.id}`,
      title: { EN: TRANSLATIONS.EN[key].seoTitle, DE: TRANSLATIONS.DE[key].seoTitle },
      description: { EN: TRANSLATIONS.EN[key].seoDescription, DE: TRANSLATIONS.DE[key].seoDescription },
    };
  }),
];

const urlOf = (lang: Lang, routePath: string) =>
  lang === "EN" ? `${SITE_URL}${routePath || "/"}` : `${SITE_URL}/de${routePath}`;

// Replaces a tag the shell is known to contain; failing loudly beats
// silently shipping the homepage's tags on every page again.
function replaceTag(html: string, pattern: RegExp, tag: string): string {
  if (!pattern.test(html)) throw new Error(`prerender-routes: shell has no tag matching ${pattern}`);
  return html.replace(pattern, () => tag);
}

function setMeta(html: string, attr: "name" | "property", key: string, value: string): string {
  return replaceTag(
    html,
    new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`),
    `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`
  );
}

const HREFLANG = /\s*<link\s+rel="alternate"\s+hreflang="[^"]*"\s+href="[^"]*"\s*\/?>/g;
const CANONICAL = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/;

function renderRoute(shell: string, route: Route, lang: Lang): string {
  const title = route.title[lang];
  const description = route.description[lang];
  const canonical = urlOf(lang, route.path);
  let html = shell;
  if (lang === "DE") html = replaceTag(html, /<html lang="en">/, `<html lang="de">`);
  html = replaceTag(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = replaceTag(html, CANONICAL, `<link rel="canonical" href="${canonical}" />`);
  html = html.replace(HREFLANG, "");
  const alternates = [
    `<link rel="alternate" hreflang="en" href="${urlOf("EN", route.path)}" />`,
    `<link rel="alternate" hreflang="de" href="${urlOf("DE", route.path)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${urlOf("EN", route.path)}" />`,
  ];
  html = html.replace(CANONICAL, (tag) => [tag, ...alternates].join("\n    "));
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "property", "og:locale", lang === "EN" ? "en_US" : "de_DE");
  html = setMeta(html, "property", "og:locale:alternate", lang === "EN" ? "de_DE" : "en_US");
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  return html;
}

// Not a page of its own: no canonical/hreflang pointing at the homepage,
// and kept out of the index. The SPA still loads and sends the visitor on.
function renderNoIndex(shell: string): string {
  return shell
    .replace(CANONICAL, () => `<meta name="robots" content="noindex, follow" />`)
    .replace(HREFLANG, "");
}

function write(file: string, html: string) {
  const target = path.join(DIST, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, html);
}

const shell = readFileSync(path.join(DIST, "index.html"), "utf8");
let count = 0;
for (const route of routes) {
  for (const lang of ["EN", "DE"] as const) {
    const html = renderRoute(shell, route, lang);
    if (lang === "EN" && !route.path) write("index.html", html);
    else write(`${lang === "DE" ? "/de" : ""}${route.path || ""}.html`.replace(/^\//, ""), html);
    count++;
  }
}
write("write.html", renderNoIndex(shell));
write("404.html", renderNoIndex(shell));
console.log(`prerender-routes: wrote ${count} route pages, write.html and 404.html`);
