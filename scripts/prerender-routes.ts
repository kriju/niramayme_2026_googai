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
// Each page also gets, without needing JS: the site-wide JSON-LD (business,
// Richa Kansal, website — see src/lib/structuredData.ts) and a plain-HTML
// version of its heading, description, address and links to every other
// page inside #root, which React replaces on mount. Until Google rendered
// the JS it saw an empty <div id="root">, no internal links and no brand
// entity — one reason the site didn't show up even for "Niramay Wellbeing".
//
// Set GOOGLE_SITE_VERIFICATION (the content of Search Console's HTML-tag
// method) to also emit that meta tag; DNS verification needs no code.
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
import { ASTROLOGY_PAGE_PATH, BUSINESS_CITY, BUSINESS_POSTAL_CODE, BUSINESS_STREET_ADDRESS, COURSES, SERVICES, TRANSLATIONS } from "../src/constants";
import { SITE_JSONLD } from "../src/lib/structuredData";
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
  {
    path: ASTROLOGY_PAGE_PATH,
    title: { EN: TRANSLATIONS.EN.astrologyPage.seoTitle, DE: TRANSLATIONS.DE.astrologyPage.seoTitle },
    description: { EN: TRANSLATIONS.EN.astrologyPage.seoDescription, DE: TRANSLATIONS.DE.astrologyPage.seoDescription },
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

// Link text for the fallback body's page list (the homepage is "Home").
const linkLabel = (route: Route, lang: Lang) =>
  route.path ? route.title[lang].split(" — ")[0] : lang === "EN" ? "Home" : "Startseite";

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

// JSON-LD content is never HTML-escaped, only kept from closing the tag.
const jsonForScript = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

function siteJsonLdTags(lang: Lang): string {
  return SITE_JSONLD
    .map(({ id, build }) => `<script type="application/ld+json" id="${id}">${jsonForScript(build(lang))}</script>`)
    .join("\n    ");
}

// Marked so api/blog-share.ts, which reuses dist/index.html as its shell,
// can strip the homepage's body from blog post pages.
//
// While the app loads, the fallback is visually hidden (but still in the
// HTML for crawlers) so visitors don't see it flash before React replaces
// it. The class doing the hiding is only ever set by JS, so with JS off the
// fallback simply shows; and if the app still hasn't mounted after
// FALLBACK_REVEAL_MS (bundle failed to load, blocked, very slow network)
// the class is removed again so the visitor gets content, not a blank page.
// It gets a little styling of its own, as none of the site's CSS applies.
const FALLBACK_REVEAL_MS = 4000;
const FALLBACK_HEAD = `<style>
      #prerender-fallback{max-width:40rem;margin:0 auto;padding:2.5rem 1.25rem;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#2d2a2e}
      #prerender-fallback h1{font:600 1.75rem/1.25 Georgia,"Times New Roman",serif;color:#583861;margin:0 0 .75rem}
      #prerender-fallback ul{padding-left:1.25rem;list-style:disc}
      #prerender-fallback a{color:#583861;text-decoration:underline}
      #prerender-fallback address{font-style:normal;margin-top:1.5rem;padding-top:1rem;border-top:1px solid #e5dfe7;font-size:.9rem}
      .prerender-pending #prerender-fallback{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    </style>
    <script>(function(d){d.classList.add("prerender-pending");setTimeout(function(){d.classList.remove("prerender-pending")},${FALLBACK_REVEAL_MS})})(document.documentElement)</script>`;

function fallbackBody(route: Route, lang: Lang): string {
  const prefix = lang === "DE" ? "/de" : "";
  const links = routes
    .map((r) => `<li><a href="${prefix}${r.path || (prefix ? "" : "/")}">${escapeHtml(linkLabel(r, lang))}</a></li>`)
    .join("");
  const other: Lang = lang === "EN" ? "DE" : "EN";
  return `<!--prerender-body--><main id="prerender-fallback">
        <h1>${escapeHtml(route.title[lang])}</h1>
        <p>${escapeHtml(route.description[lang])}</p>
        <nav><ul>${links}</ul></nav>
        <p><a href="${urlOf(other, route.path).replace(SITE_URL, "")}" hreflang="${other.toLowerCase()}">${other === "DE" ? "Deutsch" : "English"}</a></p>
        <address>Niramay Wellbeing · Richa Kansal · ${escapeHtml(BUSINESS_STREET_ADDRESS)}, ${BUSINESS_POSTAL_CODE} ${BUSINESS_CITY}, Germany · <a href="tel:+4915175315761">+49 151 75315761</a> · <a href="mailto:richa@niramay.me">richa@niramay.me</a></address>
      </main><!--/prerender-body-->`;
}

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
  html = html.replace("</head>", () => `    ${siteJsonLdTags(lang)}\n    ${FALLBACK_HEAD}\n  </head>`);
  html = replaceTag(html, /<div id="root"><\/div>/, `<div id="root">${fallbackBody(route, lang)}</div>`);
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

let shell = readFileSync(path.join(DIST, "index.html"), "utf8");
const verification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
if (verification) {
  shell = shell.replace("</head>", () => `    <meta name="google-site-verification" content="${escapeHtml(verification)}" />\n  </head>`);
}
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
