import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "./_lib/firebaseAdmin.js";

const SITE_URL = "https://www.niramay.me";

// Kept in sync by hand with the SERVICES ids in src/constants.ts — this
// list is duplicated rather than importing the React app's constants
// module (which drags lucide-react and friends into a serverless bundle)
// since service pages are added rarely and deliberately.
const SERVICE_IDS = ["yoga", "reiki", "subconscious-healing", "astrology", "intuitive-guidance", "tarot"];

type LocalizedPair = { en: string; de: string; changefreq: string; priority: string };

// Blog posts are written independently per language (see handleSave in
// WriteDashboard, src/App.tsx) rather than as EN/DE translations of one
// underlying post, so — unlike the static pages below — a post's <url>
// carries no hreflang alternates pointing at a "sibling" post that may not
// exist.
type BlogEntry = { loc: string; changefreq: string; priority: string; lastmod?: string };

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

function renderBlogEntry({ loc, changefreq, priority, lastmod }: BlogEntry): string {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  return `  <url>
    <loc>${loc}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
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
  ];

  const blogEntries: BlogEntry[] = [];
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("blogs").where("published", "==", true).get();

    for (const doc of snapshot.docs) {
      const post = doc.data() as { slug?: string; lang?: "EN" | "DE"; updatedAt?: unknown; createdAt?: unknown };
      if (!post.slug || !post.lang) continue;
      const prefix = post.lang === "DE" ? "/de" : "";
      blogEntries.push({
        loc: `${SITE_URL}${prefix}/blog/${post.slug}`,
        changefreq: "monthly",
        priority: "0.6",
        lastmod: isoDate(post.updatedAt) || isoDate(post.createdAt),
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
