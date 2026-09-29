import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { authorDisplayName, requireBlogAdmin } from "./_lib/blogAuth.js";
import {
  HttpError,
  cleanText,
  clientKey,
  enforceRateLimit,
  hmac,
  isReservedName,
  looksLikeSpam,
  requireId,
  requireJson,
  safeEqual,
  sendAdminEmail,
} from "./_lib/engagement.js";
import { escapeHtml, getSiteUrl } from "./_lib/util.js";

// Blog comments live at blogs/{blogId}/comments/{commentId}. Visitors read
// them straight from Firestore (only status == "visible", see
// firestore.rules), but every write comes through here:
//
//   POST   (JSON)                 visitor comment, or an author's reply when
//                                 an admin Firebase ID token is attached
//   PATCH  (JSON, admin)          show / hide / delete a comment
//   DELETE (JSON, admin)          purge all comments + votes of a deleted post
//   GET    ?token=…               confirmation page for an emailed
//                                 approve/hide link, which then POSTs back
//   POST   ?token=… (form)        performs that emailed action
//
// Comment docs are publicly readable once visible, so they hold nothing a
// visitor shouldn't see: no IP, email or user agent — just what's rendered.

const MAX_CONTENT = 2000;
const MIN_CONTENT = 2;
const MAX_NAME = 60;
// Per visitor IP: a handful of comments per 10 minutes is plenty for a real
// reader and makes bulk spam from one source impractical.
const COMMENT_LIMIT = 5;
const COMMENT_WINDOW_SECONDS = 600;

type Status = "visible" | "pending" | "hidden";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (typeof req.query.token === "string") {
      return await handleEmailAction(req, res);
    }
    switch (req.method) {
      case "POST":
        return await handleCreate(req, res);
      case "PATCH":
        return await handleModerate(req, res);
      case "DELETE":
        return await handlePurge(req, res);
      default:
        res.setHeader("Allow", "POST, PATCH, DELETE");
        return res.status(405).json({ error: "method_not_allowed" });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.code });
    }
    console.error("blog-comments failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}

// Returns the admin's email if a valid admin token is attached, null if no
// token was sent at all, and throws if a token was sent but isn't an admin's
// (an expired session should surface as "sign in again", not silently post
// as an anonymous visitor).
async function optionalAdmin(req: VercelRequest): Promise<string | null> {
  if (!req.headers.authorization) return null;
  return requireAdmin(req);
}

async function requireAdmin(req: VercelRequest): Promise<string> {
  try {
    return await requireBlogAdmin(req.headers.authorization);
  } catch {
    throw new HttpError(401, "unauthorized");
  }
}

async function getPublishedBlog(db: Firestore, blogId: string) {
  const snap = await db.collection("blogs").doc(blogId).get();
  if (!snap.exists || snap.get("published") !== true) {
    throw new HttpError(404, "not_found");
  }
  return snap;
}

async function handleCreate(req: VercelRequest, res: VercelResponse) {
  const body = requireJson(req);
  const blogId = requireId(body.blogId, "blogId");
  // Client-generated so a retry after a dropped connection re-sends the same
  // ID and lands on the same doc instead of posting the comment twice.
  const commentId = requireId(body.commentId, "commentId");
  const parentId = body.parentId == null || body.parentId === "" ? null : requireId(body.parentId, "parentId");

  const adminEmail = await optionalAdmin(req);

  // Honeypot: a visually hidden field real visitors never see or fill. Bots
  // that do get a normal-looking success response and nothing is stored, so
  // they have no signal to adapt to.
  if (!adminEmail && typeof body.website === "string" && body.website.trim() !== "") {
    return res.status(200).json({ status: "pending" });
  }

  const content = cleanText(body.content, { multiline: true });
  if (content.length < MIN_CONTENT || content.length > MAX_CONTENT) {
    throw new HttpError(400, "invalid_content");
  }

  const anonymous = adminEmail ? false : body.anonymous === true;
  let name: string | null = null;
  if (adminEmail) {
    name = authorDisplayName(adminEmail);
  } else if (!anonymous) {
    name = cleanText(body.name, { multiline: false });
    if (!name) throw new HttpError(400, "name_required");
    if (name.length > MAX_NAME) throw new HttpError(400, "invalid_name");
    if (isReservedName(name)) throw new HttpError(400, "reserved_name");
  }

  // Replies are how Richa/Riju answer readers; visitors only post top-level
  // comments, which keeps threads one level deep and stops visitor-to-visitor
  // arguments from happening under the authors' posts.
  if (parentId && !adminEmail) throw new HttpError(403, "forbidden");

  const db = getAdminDb();
  if (!adminEmail) {
    await enforceRateLimit(db, "comment", clientKey(req), COMMENT_LIMIT, COMMENT_WINDOW_SECONDS);
  }

  const blogSnap = await getPublishedBlog(db, blogId);
  const commentsRef = blogSnap.ref.collection("comments");

  if (parentId) {
    const parent = await commentsRef.doc(parentId).get();
    // Only top-level, currently visible comments can be answered — a reply
    // under a hidden/pending parent would render nowhere for visitors.
    if (!parent.exists || parent.get("parentId") || parent.get("status") !== "visible") {
      throw new HttpError(409, "parent_unavailable");
    }
  }

  const status: Status = adminEmail ? "visible" : looksLikeSpam(content, name ?? "") ? "pending" : "visible";
  const ref = commentsRef.doc(commentId);
  const doc = {
    content,
    name,
    parentId,
    isAuthor: Boolean(adminEmail),
    status,
    lang: blogSnap.get("lang") === "DE" ? "DE" : "EN",
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    await ref.create(doc);
  } catch (error) {
    // gRPC ALREADY_EXISTS: this exact submission already landed (a retry of
    // a request whose response got lost). Answer with what's stored rather
    // than an error, so the client shows success exactly once.
    if ((error as { code?: number }).code === 6) {
      const existing = await ref.get();
      return res.status(200).json({ comment: serialize(existing.id, existing.data()!) });
    }
    throw error;
  }

  if (!adminEmail) {
    // A mail outage must never turn into a failed comment for the visitor —
    // the comment is already saved and moderatable from the site itself.
    try {
      await notifyAdmins(req, blogSnap.data()!, blogId, commentId, doc);
    } catch (error) {
      console.error("blog-comments notification failed:", error);
    }
  }

  return res.status(201).json({ comment: serialize(commentId, { ...doc, createdAt: null }) });
}

async function handleModerate(req: VercelRequest, res: VercelResponse) {
  const body = requireJson(req);
  await requireAdmin(req);
  const blogId = requireId(body.blogId, "blogId");
  const commentId = requireId(body.commentId, "commentId");
  const action = body.action;
  if (action !== "show" && action !== "hide" && action !== "delete") {
    throw new HttpError(400, "invalid_request");
  }

  const db = getAdminDb();
  const ref = db.collection("blogs").doc(blogId).collection("comments").doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "not_found");

  if (action === "delete") {
    await deleteWithReplies(db, ref);
    return res.status(200).json({ ok: true, deleted: true });
  }
  const status: Status = action === "show" ? "visible" : "hidden";
  await ref.update({ status, moderatedAt: FieldValue.serverTimestamp() });
  return res.status(200).json({ ok: true, status });
}

// Deleting a top-level comment also removes the authors' replies to it,
// which would otherwise be left answering nothing.
async function deleteWithReplies(db: Firestore, ref: DocumentReference) {
  const replies = await ref.parent.where("parentId", "==", ref.id).get();
  const batch = db.batch();
  replies.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref);
  await batch.commit();
}

// Called by the /write dashboard after deleting a post — Firestore doesn't
// cascade deletes into subcollections, so comments/votes would otherwise
// linger as orphans.
async function handlePurge(req: VercelRequest, res: VercelResponse) {
  const body = requireJson(req);
  await requireAdmin(req);
  const blogId = requireId(body.blogId, "blogId");
  const db = getAdminDb();
  const blogRef = db.collection("blogs").doc(blogId);
  const blog = await blogRef.get();
  // Refuse to wipe engagement on a post that still exists — this is cleanup
  // after deletion, not a "clear all comments" button.
  if (blog.exists) throw new HttpError(409, "blog_still_exists");
  await Promise.all([
    db.recursiveDelete(blogRef.collection("comments")),
    db.recursiveDelete(blogRef.collection("votes")),
    db.collection("blogStats").doc(blogId).delete(),
  ]);
  return res.status(200).json({ ok: true });
}

function serialize(id: string, data: Record<string, any>) {
  return {
    id,
    content: data.content,
    name: data.name ?? null,
    parentId: data.parentId ?? null,
    isAuthor: Boolean(data.isAuthor),
    status: data.status,
    createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Emailed moderation links

function actionToken(blogId: string, commentId: string) {
  return hmac("comment-action", `${blogId}/${commentId}`);
}

function actionUrl(siteUrl: string, blogId: string, commentId: string, action: "show" | "hide") {
  const params = new URLSearchParams({ blogId, commentId, action, token: actionToken(blogId, commentId) });
  return `${siteUrl}/api/blog-comments?${params.toString()}`;
}

// Email security scanners (Outlook Safe Links, corporate gateways) fetch
// every link in a message. If a GET changed anything, merely receiving the
// notification could hide a comment — so GET only shows a confirm button,
// and the actual change needs the POST that button sends.
async function handleEmailAction(req: VercelRequest, res: VercelResponse) {
  const q = (k: string) => (typeof req.query[k] === "string" ? (req.query[k] as string) : "");
  const blogId = q("blogId");
  const commentId = q("commentId");
  const action = q("action");
  const token = q("token");

  if (!/^[A-Za-z0-9_-]{1,128}$/.test(blogId) || !/^[A-Za-z0-9_-]{1,128}$/.test(commentId) || (action !== "show" && action !== "hide")) {
    return sendPage(res, 400, "Invalid link", "This moderation link is missing required information.");
  }
  if (!safeEqual(actionToken(blogId, commentId), token)) {
    return sendPage(res, 403, "Link not valid", "This link is invalid or doesn't match this comment.");
  }

  const db = getAdminDb();
  const ref = db.collection("blogs").doc(blogId).collection("comments").doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) {
    return sendPage(res, 404, "Comment not found", "This comment no longer exists — it may already have been deleted.");
  }
  const verb = action === "show" ? "Publish" : "Hide";

  if (req.method === "GET") {
    const preview = escapeHtml(String(snap.get("content")).slice(0, 400));
    const selfUrl = escapeHtml(actionUrl("", blogId, commentId, action));
    return sendPage(
      res,
      200,
      `${verb} this comment?`,
      `<blockquote style="background:#f5f5f4;border-radius:12px;padding:16px;text-align:left;white-space:pre-line;">${preview}</blockquote>
       <p>Currently: <strong>${escapeHtml(snap.get("status"))}</strong></p>
       <form method="POST" action="${selfUrl}">
         <button type="submit" style="background:${action === "show" ? "#16a34a" : "#dc2626"};color:#fff;border:0;border-radius:8px;padding:12px 28px;font-size:16px;font-weight:600;cursor:pointer;">${verb}</button>
       </form>`,
    );
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Method not allowed");
  }

  await ref.update({ status: action === "show" ? "visible" : "hidden", moderatedAt: FieldValue.serverTimestamp() });
  return sendPage(
    res,
    200,
    action === "show" ? "Comment published" : "Comment hidden",
    action === "show"
      ? "The comment is now visible on the blog post."
      : "The comment is no longer visible to visitors. You can publish it again from the blog post while signed in.",
  );
}

async function notifyAdmins(
  req: VercelRequest,
  blog: Record<string, any>,
  blogId: string,
  commentId: string,
  comment: { content: string; name: string | null; status: Status },
) {
  const siteUrl = getSiteUrl(req);
  const postUrl = `${siteUrl}${blog.lang === "DE" ? "/de" : ""}/blog/${encodeURIComponent(blog.slug)}#comments`;
  const held = comment.status === "pending";
  const button = held
    ? { url: actionUrl(siteUrl, blogId, commentId, "show"), label: "Review &amp; publish", color: "#16a34a" }
    : { url: actionUrl(siteUrl, blogId, commentId, "hide"), label: "Review &amp; hide", color: "#dc2626" };

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#292524;">
    <h2 style="font-size:20px;margin-bottom:4px;">${held ? "New comment held for approval" : "New comment on your blog"}</h2>
    <p style="color:#78716c;margin-top:0;">On <strong>${escapeHtml(blog.title)}</strong> &middot; by ${comment.name ? escapeHtml(comment.name) : "<em>Anonymous</em>"}</p>
    ${held ? `<p style="color:#b45309;">It contains a link, so it stays hidden until you publish it.</p>` : ""}
    <div style="background:#f5f5f4;border-radius:12px;padding:16px;line-height:1.5;white-space:pre-line;margin-bottom:24px;">${escapeHtml(comment.content)}</div>
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td style="padding-right:8px;"><a href="${escapeHtml(postUrl)}" style="display:block;text-align:center;background:#583861;color:#fff;text-decoration:none;padding:12px 0;border-radius:8px;font-weight:600;">Open post to reply</a></td>
      <td style="padding-left:8px;"><a href="${escapeHtml(button.url)}" style="display:block;text-align:center;background:${button.color};color:#fff;text-decoration:none;padding:12px 0;border-radius:8px;font-weight:600;">${button.label}</a></td>
    </tr></table>
    <p style="color:#a8a29e;font-size:12px;margin-top:24px;">Sign in on the site as Riju or Richa to reply, hide or delete comments directly under the post.</p>
  </div>`;

  await sendAdminEmail(
    `${held ? "[Held] " : ""}New comment on "${String(blog.title).slice(0, 80)}"`,
    html,
  );
}

function sendPage(res: VercelResponse, status: number, title: string, bodyHtml: string) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // This page contains a state-changing form; never let it be framed.
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).send(`<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>${escapeHtml(title)}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fafaf9;margin:0;padding:48px 24px;text-align:center;color:#292524;">
  <h1 style="font-size:24px;">${escapeHtml(title)}</h1>
  <div style="color:#57534e;font-size:16px;max-width:480px;margin:12px auto 0;">${bodyHtml}</div>
</body>
</html>`);
}
