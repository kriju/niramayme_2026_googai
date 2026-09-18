import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin";
import { verifyReviewToken } from "./_lib/reviewToken";
import { escapeHtml } from "./_lib/util";

// The link an admin clicks from the notification email. Deliberately a
// plain GET so it works as an ordinary link with no JavaScript required —
// the security boundary is the per-review token, not the HTTP method.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const reviewId = firstQueryValue(req.query.reviewId);
  const action = firstQueryValue(req.query.action);
  const token = firstQueryValue(req.query.token);

  if (!reviewId || (action !== "approve" && action !== "reject")) {
    return sendPage(res, 400, "Invalid link", "This approval link is missing required information.");
  }

  if (!verifyReviewToken(reviewId, token)) {
    return sendPage(res, 403, "Link not valid", "This link is invalid or doesn't match this review.");
  }

  try {
    const db = getAdminDb();
    const ref = db.collection("reviews").doc(reviewId);
    const snap = await ref.get();
    if (!snap.exists) {
      return sendPage(res, 404, "Review not found", "This review no longer exists — it may have already been deleted.");
    }
    const review = snap.data() as Record<string, any>;

    if (action === "approve") {
      await ref.update({ approved: true, rejected: false, moderatedAt: FieldValue.serverTimestamp() });
      return sendPage(
        res,
        200,
        "Review approved",
        `The review from ${escapeHtml(review.name)} is now live on the site.`,
        true
      );
    } else {
      await ref.update({ approved: false, rejected: true, moderatedAt: FieldValue.serverTimestamp() });
      return sendPage(
        res,
        200,
        "Review rejected",
        `The review from ${escapeHtml(review.name)} will stay unpublished.`,
        false
      );
    }
  } catch (error) {
    console.error("review-action failed:", error);
    return sendPage(res, 500, "Something went wrong", "Could not update this review. Please try again, or handle it directly in the Firebase console.");
  }
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sendPage(res: VercelResponse, status: number, title: string, message: string, success?: boolean) {
  const color = success === undefined ? "#292524" : success ? "#16a34a" : "#78716c";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(status).send(`<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title></head>
<body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #fafaf9; margin: 0; padding: 48px 24px; text-align: center; color: #292524;">
  <h1 style="color: ${color}; font-size: 24px;">${escapeHtml(title)}</h1>
  <p style="color: #57534e; font-size: 16px; max-width: 420px; margin: 12px auto 0;">${message}</p>
</body>
</html>`);
}
