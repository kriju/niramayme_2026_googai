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

type Post = { title?: string; excerpt?: string; image?: string; [key: string]: unknown };

// The post is also embedded in the page (read by BlogPostPage in
// src/App.tsx), so the article renders as soon as the JS runs instead of
// waiting on a second, client-side Firestore round trip for data this
// function already fetched. Keep the id in sync with POST_DATA_ID there.
const POST_DATA_ID = "blog-post-data";

// Keep in sync with src/lib/images.ts (and images.sizes in vercel.json).
const IMAGE_WIDTHS = [640, 1080, 1600];
const COVER_SIZES = "(min-width: 768px) 720px, calc(100vw - 48px)";

function optimizableImage(image: string): boolean {
  return /^https:\/\/cvouvjnsr5c8g0or\.public\.blob\.vercel-storage\.com\//.test(image) && /\.(jpe?g|png|webp)(\?|$)/i.test(image);
}

// Starts the cover download alongside the JS bundle rather than after the
// app has booted and rendered the <img> — it's the post's LCP element.
function coverPreload(image: string): string {
  if (!optimizableImage(image)) {
    return `<link rel="preload" as="image" href="${escapeHtml(image)}" fetchpriority="high" />`;
  }
  const url = (w: number) => `/_vercel/image?url=${encodeURIComponent(image)}&w=${w}&q=75`;
  const srcset = IMAGE_WIDTHS.map(w => `${url(w)} ${w}w`).join(", ");
  return `<link rel="preload" as="image" href="${escapeHtml(url(IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]))}" imagesrcset="${escapeHtml(srcset)}" imagesizes="${COVER_SIZES}" fetchpriority="high" />`;
}

// Firestore Timestamps don't survive JSON; the client rebuilds them from millis.
function serializePost(id: string, post: Post): string {
  const data: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(post)) {
    const ts = value as { toMillis?: () => number } | null;
    data[key] = typeof ts?.toMillis === "function" ? { millis: ts.toMillis() } : value;
  }
  // "<" escaped so post content can never close the <script> tag early.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

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
  // Function replacers: a post title containing "$'" or "$&" would otherwise
  // be expanded as a replacement pattern and splice the page into the tag.
  return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace("</head>", () => `    ${tag}\n  </head>`);
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
  let postId = "";
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
      postId = snapshot.empty ? "" : snapshot.docs[0].id;
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

    const headExtras = [`<script id="${POST_DATA_ID}" type="application/json">${serializePost(postId, post)}</script>`];
    // HEIC only renders in Safari, so preloading it elsewhere is wasted bytes.
    if (post.image && /^https:\/\//.test(post.image) && !/\.(heic|heif)(\?|$)/i.test(post.image)) {
      headExtras.unshift(coverPreload(post.image));
    }
    // Function replacer: post text may contain "$&"-style replacement patterns.
    html = html.replace("</head>", () => `    ${headExtras.join("\n    ")}\n  </head>`);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Short edge cache so an edited title/cover shows up in new shares within minutes.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");
  return res.status(200).send(html);
}
