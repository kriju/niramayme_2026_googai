import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "./firebaseAdmin.js";

// GET /api/public-feed?kind=blogs&lang=EN|DE and ?kind=reviews (rewritten
// to /api/sitemap?op=feed in vercel.json — the Hobby plan caps a deployment
// at 12 functions). Serves the homepage's published-post list and approved
// reviews from the CDN cache, so Firestore is read a few times per cache
// window instead of once per document for every visitor. src/lib/publicFeed.ts
// reads it, falling back to Firestore directly if it can't be reached.
//
// Only data the security rules already make public is returned: published
// posts (minus their full text, which the cards don't show) and the display
// fields of approved reviews.

// Short enough that a newly approved review or published post shows up
// within a couple of minutes.
const CACHE_CONTROL = "public, max-age=60, s-maxage=120, stale-while-revalidate=300";

const REVIEW_FIELDS = ["name", "category", "rating", "content", "role", "lang", "createdAt"] as const;

// Firestore Timestamps don't survive JSON; the client rebuilds them from
// millis (same convention as serializePost in api/blog-share.ts).
function serialize(id: string, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { id };
  for (const [key, value] of Object.entries(data)) {
    const ts = value as { toMillis?: () => number } | null;
    out[key] = typeof ts?.toMillis === "function" ? { millis: ts.toMillis() } : value;
  }
  return out;
}

export async function handlePublicFeed(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const db = getAdminDb();
    let items: Record<string, unknown>[];
    if (req.query.kind === "blogs") {
      const lang = req.query.lang === "DE" ? "DE" : req.query.lang === "EN" ? "EN" : null;
      if (!lang) return res.status(400).json({ error: "invalid_request" });
      const snap = await db.collection("blogs")
        .where("lang", "==", lang)
        .where("published", "==", true)
        .orderBy("createdAt", "desc")
        .get();
      items = snap.docs.map((doc) => {
        const { content: _content, ...card } = doc.data();
        return serialize(doc.id, card);
      });
    } else if (req.query.kind === "reviews") {
      const snap = await db.collection("reviews")
        .where("approved", "==", true)
        .orderBy("createdAt", "desc")
        .get();
      items = snap.docs.map((doc) => {
        const data = doc.data();
        const picked: Record<string, unknown> = {};
        for (const field of REVIEW_FIELDS) if (data[field] !== undefined) picked[field] = data[field];
        return serialize(doc.id, picked);
      });
    } else {
      return res.status(400).json({ error: "invalid_request" });
    }

    res.setHeader("Cache-Control", CACHE_CONTROL);
    return res.status(200).json({ items });
  } catch (error) {
    console.error("public-feed failed:", error);
    res.setHeader("Cache-Control", "no-store");
    return res.status(500).json({ error: "server_error" });
  }
}
