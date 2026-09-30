import { readFile } from "node:fs/promises";
import path from "node:path";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { escapeHtml } from "./_lib/util.js";

const SITE_URL = "https://www.niramay.me";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

// WhatsApp, iMessage, Facebook etc. only ever read the static <head> — they
// don't run the SPA's JS, so useSeo's per-post tags never reach them and
// every shared post previewed as the homepage. This serves /blog/:slug (and
// /de/blog/:slug, see the rewrites in vercel.json) as the normal app shell
// with that post's title, summary and cover image already in the tags.

type Post = { title?: string; excerpt?: string; image?: string };

let cachedShell: string | null = null;

async function loadShell(req: VercelRequest): Promise<string> {
  if (cachedShell) return cachedShell;
  try {
    // Bundled with this function via "includeFiles" in vercel.json.
    cachedShell = await readFile(path.join(process.cwd(), "dist", "index.html"), "utf8");
  } catch {
    // Static files take precedence over rewrites, so this is the built
    // shell itself rather than a loop back into this function.
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const response = await fetch(`https://${host}/index.html`);
    if (!response.ok) throw new Error(`blog-share: shell fetch failed (${response.status})`);
    cachedShell = await response.text();
  }
  return cachedShell;
}

function setTag(html: string, pattern: RegExp, tag: string): string {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function setMeta(html: string, attr: "name" | "property", key: string, value: string): string {
  const pattern = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`);
  return setTag(html, pattern, `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`);
}

// Blog covers are uploaded straight from the writer's phone (see
// resolveContentType in WritePage.tsx), and HEIC/AVIF won't render as a
// link preview in most chat apps — fall back to the site card for those.
function shareImage(image: string | undefined): string {
  if (!image || !/^https:\/\//.test(image)) return DEFAULT_IMAGE;
  return /\.(heic|heif|avif)(\?|$)/i.test(image) ? DEFAULT_IMAGE : image;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  const lang = req.query.lang === "de" ? "DE" : "EN";
  let html = await loadShell(req);

  let post: Post | null = null;
  if (slug) {
    try {
      const snapshot = await getAdminDb()
        .collection("blogs")
        .where("slug", "==", slug)
        .where("lang", "==", lang)
        .where("published", "==", true)
        .limit(1)
        .get();
      post = snapshot.empty ? null : (snapshot.docs[0].data() as Post);
    } catch (error) {
      console.error("blog-share: failed to load post, serving default tags:", error);
    }
  }

  // Unknown slug: serve the untouched shell and let the SPA redirect as usual.
  if (post?.title) {
    const title = `${post.title} — Niramay Wellbeing Blog`;
    const description = post.excerpt || "";
    const url = `${SITE_URL}${lang === "DE" ? "/de" : ""}/blog/${slug}`;
    const image = shareImage(post.image);

    html = setTag(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
    html = setTag(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escapeHtml(url)}" />`);
    html = setMeta(html, "name", "description", description);
    html = setMeta(html, "property", "og:type", "article");
    html = setMeta(html, "property", "og:title", post.title);
    html = setMeta(html, "property", "og:description", description);
    html = setMeta(html, "property", "og:url", url);
    html = setMeta(html, "property", "og:image", image);
    if (image !== DEFAULT_IMAGE) {
      // The shell's width/height describe og-default.jpg, not this cover.
      html = html.replace(/\s*<meta\s+property="og:image:(width|height)"\s+content="[^"]*"\s*\/?>/g, "");
    }
    html = setMeta(html, "property", "og:image:alt", post.title);
    html = setMeta(html, "property", "og:locale", lang === "EN" ? "en_US" : "de_DE");
    html = setMeta(html, "property", "og:locale:alternate", lang === "EN" ? "de_DE" : "en_US");
    html = setMeta(html, "name", "twitter:card", "summary_large_image");
    html = setMeta(html, "name", "twitter:title", post.title);
    html = setMeta(html, "name", "twitter:description", description);
    html = setMeta(html, "name", "twitter:image", image);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Short edge cache so an edited title/cover shows up in new shares within minutes.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
  return res.status(200).send(html);
}
