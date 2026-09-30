import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { HttpError, clientKey, enforceRateLimit, requireId, requireJson } from "./_lib/engagement.js";

// Like / dislike for a blog post, without requiring an account. Each browser
// holds a random voter ID (localStorage) and states the vote it *wants* —
// "like", "dislike" or "none" — rather than sending a toggle, so a retried
// or duplicated request can never flip a vote back the wrong way.
//
// Totals live in blogStats/{blogId} (publicly readable, server-written
// only), not on the blog doc itself: that keeps the post's own validation
// rules untouched, and lets the page read counts with one tiny doc get.
// Each voter's current choice is kept at blogs/{blogId}/votes/{hash}, keyed
// by a hash of the voter ID so the raw ID isn't stored.
//
// A voter ID is only as durable as the browser's storage, so this stops
// accidental double counting, not a determined person clearing storage in
// a loop — the per-IP rate limit below caps how far that can go.

const VOTE_LIMIT = 30;
const VOTE_WINDOW_SECONDS = 600;
const VOTER_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

type Vote = "like" | "dislike" | "none";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const body = requireJson(req);
    const blogId = requireId(body.blogId, "blogId");
    const voterId = typeof body.voterId === "string" && VOTER_ID_PATTERN.test(body.voterId) ? body.voterId : null;
    const vote = body.vote as Vote;
    if (!voterId || (vote !== "like" && vote !== "dislike" && vote !== "none")) {
      throw new HttpError(400, "invalid_request");
    }

    const db = getAdminDb();
    await enforceRateLimit(db, "vote", clientKey(req), VOTE_LIMIT, VOTE_WINDOW_SECONDS);

    const blogRef = db.collection("blogs").doc(blogId);
    const voteRef = blogRef.collection("votes").doc(crypto.createHash("sha256").update(voterId).digest("hex"));
    const statsRef = db.collection("blogStats").doc(blogId);

    // One transaction so concurrent votes (or two tabs) can't both read the
    // same totals and each write back a +1, losing one.
    const result = await db.runTransaction(async (tx) => {
      const [blogSnap, voteSnap, statsSnap] = await Promise.all([tx.get(blogRef), tx.get(voteRef), tx.get(statsRef)]);
      if (!blogSnap.exists || blogSnap.get("published") !== true) {
        throw new HttpError(404, "not_found");
      }
      const previous: Vote = voteSnap.exists ? (voteSnap.get("vote") as Vote) : "none";
      let likes = Math.max(0, Number(statsSnap.get("likes")) || 0);
      let dislikes = Math.max(0, Number(statsSnap.get("dislikes")) || 0);
      if (previous === vote) return { likes, dislikes, vote };

      likes = Math.max(0, likes + (vote === "like" ? 1 : 0) - (previous === "like" ? 1 : 0));
      dislikes = Math.max(0, dislikes + (vote === "dislike" ? 1 : 0) - (previous === "dislike" ? 1 : 0));
      tx.set(statsRef, { likes, dislikes, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (vote === "none") tx.delete(voteRef);
      else tx.set(voteRef, { vote, updatedAt: FieldValue.serverTimestamp() });
      return { likes, dislikes, vote };
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.code });
    }
    console.error("blog-vote failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}
