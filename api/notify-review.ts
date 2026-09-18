import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";
import { getAdminDb } from "./_lib/firebaseAdmin";
import { makeReviewToken } from "./_lib/reviewToken";
import { escapeHtml, getSiteUrl } from "./_lib/util";

// Called by the browser right after a review is saved to Firestore (see
// LeaveReviewModal in src/App.tsx). It re-fetches the review server-side by
// ID — rather than trusting whatever the client posts — so this endpoint
// can't be used to blast the admin's inbox with made-up content that was
// never actually written to the database.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const reviewId = typeof req.body?.reviewId === "string" ? req.body.reviewId : null;
  if (!reviewId) {
    return res.status(400).json({ error: "reviewId is required" });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection("reviews").doc(reviewId).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Review not found" });
    }
    const review = snap.data() as Record<string, any>;

    const token = makeReviewToken(reviewId);
    const siteUrl = getSiteUrl(req);
    const approveUrl = `${siteUrl}/api/review-action?reviewId=${encodeURIComponent(reviewId)}&action=approve&token=${token}`;
    const rejectUrl = `${siteUrl}/api/review-action?reviewId=${encodeURIComponent(reviewId)}&action=reject&token=${token}`;

    const createdAt: Date = review.createdAt?.toDate ? review.createdAt.toDate() : new Date();
    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Berlin",
    }).format(createdAt);

    const stars = "★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))
      + "☆".repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)));

    const html = renderEmailHtml({
      name: review.name,
      rating: stars,
      content: review.content,
      category: review.category,
      role: review.role,
      lang: review.lang,
      formattedDate,
      approveUrl,
      rejectUrl,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.ADMIN_NOTIFY_EMAIL || "riju.kansal@niramay.me",
      subject: `New review from ${review.name || "a visitor"} — needs approval`,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("notify-review failed:", error);
    return res.status(500).json({ error: "Failed to send notification" });
  }
}

// Exported (in addition to being used above) purely so it can be unit
// tested in isolation without needing live Firebase/Gmail credentials.
export function renderEmailHtml(params: {
  name: string;
  rating: string;
  content: string;
  category: string;
  role?: string;
  lang: string;
  formattedDate: string;
  approveUrl: string;
  rejectUrl: string;
}) {
  const { name, rating, content, category, role, lang, formattedDate, approveUrl, rejectUrl } = params;
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #292524;">
    <h2 style="font-size: 20px; margin-bottom: 4px;">New review awaiting approval</h2>
    <p style="color: #78716c; margin-top: 0;">Submitted ${escapeHtml(formattedDate)} (Europe/Berlin) &middot; language: ${escapeHtml(lang)}</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 6px 0; color: #78716c; width: 110px;">Name</td>
        <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(name)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Rating</td>
        <td style="padding: 6px 0; color: #eab308;">${escapeHtml(rating)}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #78716c;">Category</td>
        <td style="padding: 6px 0;">${escapeHtml(category)}</td>
      </tr>
      ${role ? `<tr>
        <td style="padding: 6px 0; color: #78716c;">Outcome / benefit</td>
        <td style="padding: 6px 0;">${escapeHtml(role)}</td>
      </tr>` : ""}
    </table>

    <div style="background: #f5f5f4; border-radius: 12px; padding: 16px; font-style: italic; line-height: 1.5; margin-bottom: 24px;">
      "${escapeHtml(content)}"
    </div>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-right: 8px;">
          <a href="${approveUrl}" style="display: block; text-align: center; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 0; border-radius: 8px; font-weight: 600;">Approve &amp; publish</a>
        </td>
        <td style="padding-left: 8px;">
          <a href="${rejectUrl}" style="display: block; text-align: center; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 0; border-radius: 8px; font-weight: 600;">Reject</a>
        </td>
      </tr>
    </table>

    <p style="color: #a8a29e; font-size: 12px; margin-top: 24px;">
      You're getting this because you're the admin contact for Niramay's website reviews.
      Clicking Approve makes this review visible on the public Testimonials section immediately.
      Clicking Reject keeps it permanently unpublished but keeps a record of it.
    </p>
  </div>
  `;
}
