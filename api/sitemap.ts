import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "./_lib/firebaseAdmin.js";

const SITE_URL = "https://www.niramay.me";

// Kept in sync by hand with the SERVICES ids in src/constants.ts — this
// list is duplicated rather than importing the React app's constants
// module (which drags lucide-react and friends into a serverless bundle)
// since service pages are added rarely and deliberately.
const SERVICE_IDS = ["yoga", "reiki", "subconscious-healing", "astrology", "intuitive-guidance", "tarot"];
// Likewise for the COURSES entries with `bookable: true` (each has a /courses/:id page).
const COURSE_IDS = ["yoga-stress-immunity-sleep", "yoga-adventure"];

type LocalizedPair = { en: string; de: string; changefreq: string; priority: string };

// Blog posts are written per language, each with its own slug. A post that
// translates another stores the original's id in `translationOf` (see
// WritePage.tsx); only such linked, both-published pairs get hreflang
// alternates — an unlinked post has no "sibling" to point at.
type BlogEntry = { loc: string; changefreq: string; priority: string; lastmod?: string; alternates?: { en: string; de: string } };

function renderPair({ en, de, changefreq, priority }: LocalizedPair): string {
  return [en, de]
    .map(
      (loc) => `  <url>
    <loc>${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${en}" />
    <xhtml:link rel="alternate" hreflang="de" href="${de}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${en}" />
  </url>`
    )
    .join("\n");
}

function renderBlogEntry({ loc, changefreq, priority, lastmod, alternates }: BlogEntry): string {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  const alternateTags = alternates
    ? `
    <xhtml:link rel="alternate" hreflang="en" href="${alternates.en}" />
    <xhtml:link rel="alternate" hreflang="de" href="${alternates.de}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${alternates.en}" />`
    : "";
  return `  <url>
    <loc>${loc}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${alternateTags}
  </url>`;
}

function isoDate(value: unknown): string | undefined {
  const date = (value as { toDate?: () => Date })?.toDate?.();
  return date ? date.toISOString().slice(0, 10) : undefined;
}

// Serves /sitemap.xml (see the rewrite in vercel.json) by combining the
// site's static pages with every currently-published blog post — the old
// public/sitemap.xml was hand-written once and never grew new <url> entries
// as posts got published from /write.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pairs: LocalizedPair[] = [
    { en: `${SITE_URL}/`, de: `${SITE_URL}/de`, changefreq: "weekly", priority: "1.0" },
    { en: `${SITE_URL}/faq`, de: `${SITE_URL}/de/faq`, changefreq: "monthly", priority: "0.7" },
    ...SERVICE_IDS.map((id) => ({
      en: `${SITE_URL}/services/${id}`,
      de: `${SITE_URL}/de/services/${id}`,
      changefreq: "monthly",
      priority: "0.8",
    })),
    ...COURSE_IDS.map((id) => ({
      en: `${SITE_URL}/courses/${id}`,
      de: `${SITE_URL}/de/courses/${id}`,
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];

  const blogEntries: BlogEntry[] = [];
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("blogs").where("published", "==", true).get();

    type SitemapPost = { id: string; slug?: string; lang?: "EN" | "DE"; translationOf?: string; updatedAt?: unknown; createdAt?: unknown };
    const posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SitemapPost);
    const byId = new Map(posts.map((post) => [post.id, post]));
    const urlOf = (post: SitemapPost) => `${SITE_URL}${post.lang === "DE" ? "/de" : ""}/blog/${post.slug}`;
    // Each post's published other-language counterpart, in both directions.
    const counterpart = new Map<string, SitemapPost>();
    for (const post of posts) {
      const original = post.translationOf ? byId.get(post.translationOf) : undefined;
      if (original && original.lang && post.lang && original.lang !== post.lang && original.slug && post.slug) {
        counterpart.set(post.id, original);
        counterpart.set(original.id, post);
      }
    }

    for (const post of posts) {
      if (!post.slug || !post.lang) continue;
      const pair = counterpart.get(post.id);
      blogEntries.push({
        loc: urlOf(post),
        changefreq: "monthly",
        priority: "0.6",
        lastmod: isoDate(post.updatedAt) || isoDate(post.createdAt),
        alternates: pair
          ? (post.lang === "EN" ? { en: urlOf(post), de: urlOf(pair) } : { en: urlOf(pair), de: urlOf(post) })
          : undefined,
      });
    }
  } catch (error) {
    console.error("sitemap: failed to load blog posts, serving static pages only:", error);
  }

  const body = [...pairs.map(renderPair), ...blogEntries.map(renderBlogEntry)].join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${body}
</urlset>
`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(xml);
}
