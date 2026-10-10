import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin.js";
import { requireBlogAdmin } from "./blogAuth.js";
import { brevoRequest, hasBrevo, senderAddress } from "./mailer.js";
import { type Lang, listIdFor } from "./newsletter.js";
import { escapeHtml, getSiteUrl } from "./util.js";

// Served by api/newsletter.ts (vercel.json rewrites /api/newsletter-announce
// there, since the Hobby plan caps a deployment at 12 functions).
//
// Called by the Write dashboard (src/pages/WritePage.tsx) right after a post
// goes from draft to published. Creates a Brevo email campaign for that
// post's language list, so subscribers hear about it.
//
// By default the campaign is left as a draft in Brevo for a final look and a
// manual "Send"; NEWSLETTER_AUTO_SEND=true sends it straight away. Preview
// deployments only ever create a clearly-labelled draft, since the Brevo
// lists are the real ones.
//
// Each post is announced at most once: newsletterCampaigns/{blogId} is
// claimed before anything is created, so re-saving, unpublishing and
// republishing, or a double click never emails subscribers twice.

const REPLY_TO = "richa@niramay.me";

export async function handleAnnounce(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireBlogAdmin(req.headers.authorization);
  } catch {
    return res.status(401).json({ error: "Not authorized" });
  }

  const blogId = typeof req.body?.blogId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(req.body.blogId) ? req.body.blogId : null;
  if (!blogId) return res.status(400).json({ error: "blogId is required" });

  const db = getAdminDb();
  const snap = await db.collection("blogs").doc(blogId).get();
  if (!snap.exists) return res.status(404).json({ error: "Post not found" });
  const post = snap.data() as Record<string, any>;
  if (!post.published) return res.status(400).json({ error: "Post is not published" });

  const lang: Lang = post.lang === "DE" ? "DE" : "EN";
  if (!hasBrevo()) {
    return res.status(503).json({ error: "Newsletter isn't set up yet (BREVO_API_KEY missing)." });
  }

  const claimRef = db.collection("newsletterCampaigns").doc(blogId);
  try {
    await claimRef.create({ lang, status: "creating", createdAt: FieldValue.serverTimestamp() });
  } catch {
    return res.status(200).json({ status: "already_announced" });
  }

  const isPreview = process.env.VERCEL_ENV === "preview";
  const autoSend = !isPreview && process.env.NEWSLETTER_AUTO_SEND === "true";
  try {
    const listId = await listIdFor(lang);
    const postUrl = `${getSiteUrl(req)}${lang === "DE" ? "/de" : ""}/blog/${encodeURIComponent(post.slug)}`;
    const { id: campaignId } = await brevoRequest<{ id: number }>("POST", "/emailCampaigns", {
      name: `${isPreview ? "[Preview] " : ""}Blog ${lang}: ${String(post.title).slice(0, 150)}`,
      subject: String(post.title).slice(0, 200),
      previewText: summary(post).slice(0, 150),
      sender: senderAddress(),
      replyTo: REPLY_TO,
      recipients: { listIds: [listId] },
      htmlContent: renderCampaignHtml({ post, lang, postUrl }),
    });
    if (autoSend) {
      await brevoRequest("POST", `/emailCampaigns/${campaignId}/sendNow`);
    }
    const status = autoSend ? "sent" : "draft";
    await claimRef.update({ status, campaignId });
    return res.status(200).json({ status, campaignId });
  } catch (error) {
    console.error("newsletter-announce failed:", error);
    // Release the claim so publishing again (or retrying) can announce it.
    await claimRef.delete().catch(() => {});
    return res.status(502).json({ error: "Couldn't create the newsletter campaign in Brevo." });
  }
}

// The post's own summary, or the start of its body with the hand-rolled
// formatting markers (## / ** / * / - / tables) stripped.
function summary(post: Record<string, any>): string {
  const excerpt = String(post.excerpt ?? "").trim();
  if (excerpt) return excerpt;
  const plain = String(post.content ?? "")
    .split("\n")
    .filter((line) => !/^\s*(##|\|)/.test(line))
    .join(" ")
    .replace(/\*\*|\*/g, "")
    .replace(/^\s*-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 280 ? `${plain.slice(0, 277).trimEnd()}…` : plain;
}

const COPY: Record<Lang, { intro: string; read: string; why: string; unsubscribe: string }> = {
  EN: {
    intro: "A new post is up on the Niramay blog:",
    read: "Read the full post",
    why: "You're receiving this because you subscribed to new posts on niramay.me.",
    unsubscribe: "Unsubscribe",
  },
  DE: {
    intro: "Ein neuer Artikel ist im Niramay-Blog erschienen:",
    read: "Ganzen Artikel lesen",
    why: "Sie erhalten diese E-Mail, weil Sie neue Blogartikel auf niramay.me abonniert haben.",
    unsubscribe: "Abmelden",
  },
};

function renderCampaignHtml({ post, lang, postUrl }: { post: Record<string, any>; lang: Lang; postUrl: string }) {
  const c = COPY[lang];
  const url = escapeHtml(postUrl);
  const image = typeof post.image === "string" && post.image.startsWith("https://")
    ? `<a href="${url}"><img src="${escapeHtml(post.image)}" alt="" width="560" style="width:100%;max-width:560px;height:auto;border-radius:12px;display:block;margin:0 0 20px;" /></a>`
    : "";
  // {{ unsubscribe }} is Brevo's placeholder for the subscriber's own
  // one-click unsubscribe link; Brevo also adds the List-Unsubscribe headers.
  return `<!doctype html>
<html lang="${lang === "DE" ? "de" : "en"}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(post.title)}</title></head>
<body style="margin:0;padding:24px 16px;background:#fafaf9;">
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;color:#292524;line-height:1.55;">
    <p style="color:#78716c;margin:0 0 16px;">${escapeHtml(c.intro)}</p>
    ${image}
    <h1 style="font-family:Georgia,serif;font-size:26px;line-height:1.25;margin:0 0 12px;"><a href="${url}" style="color:#292524;text-decoration:none;">${escapeHtml(post.title)}</a></h1>
    <p style="margin:0 0 24px;">${escapeHtml(summary(post))}</p>
    <p style="margin:0 0 8px;"><a href="${url}" style="background:#583861;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">${escapeHtml(c.read)}</a></p>
    <p style="margin:24px 0 0;">${lang === "DE" ? "Herzliche Grüße," : "Warmly,"}<br />Richa &amp; Riju</p>
  </div>
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:16px auto 0;color:#a8a29e;font-size:12px;text-align:center;line-height:1.5;">
    <p style="margin:0 0 6px;">${escapeHtml(c.why)} <a href="{{ unsubscribe }}" style="color:#78716c;">${escapeHtml(c.unsubscribe)}</a></p>
    <p style="margin:0;">Niramay – Holistic Wellbeing · Richa Kansal · Ernst Kirchner Str 13/3 · 73760 Ostfildern · Germany</p>
  </div>
</body>
</html>`;
}
