import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "./_lib/firebaseAdmin.js";
import { HttpError, clientKey, enforceRateLimit, hmac, requireJson } from "./_lib/engagement.js";
import { brevoRequest, hasBrevo, sendEmail } from "./_lib/mailer.js";
import {
  CONSENT_TEXT,
  CONSENT_VERSION,
  type Lang,
  listIdFor,
  makeConfirmToken,
  normalizeEmail,
  readConfirmToken,
  subscriberId,
} from "./_lib/newsletter.js";
import { escapeHtml, getSiteUrl } from "./_lib/util.js";

// Blog newsletter sign-up with double opt-in:
//
//   POST (JSON) {email, lang, source, company}   sign-up from the form under
//                                                each post; emails a link
//   GET  ?token=…                                page behind that link, with
//                                                a confirm button
//   POST ?token=… (form)                         the button: adds the address
//                                                to the Brevo list
//
// Nobody is added to a list until they click the emailed link, which is what
// proves the address owner — not just whoever typed it — consented.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (typeof req.query.token === "string") {
    return handleConfirm(req, res, req.query.token);
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    await handleSubscribe(req);
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.code });
    }
    console.error("newsletter subscribe failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}

async function handleSubscribe(req: VercelRequest): Promise<void> {
  const body = requireJson(req);
  // Honeypot: a field hidden from people that naive bots fill in. Answer as
  // if it worked, so the bot learns nothing.
  if (typeof body.company === "string" && body.company.trim()) return;

  const email = normalizeEmail(body.email);
  if (!email) throw new HttpError(400, "invalid_email");
  const lang: Lang = body.lang === "DE" ? "DE" : "EN";
  const source = typeof body.source === "string" ? body.source.slice(0, 200).replace(/[^\w\-/.]/g, "") : "";
  if (!hasBrevo() || listIdFor(lang) === null) throw new HttpError(503, "not_configured");

  const db = getAdminDb();
  await enforceRateLimit(db, "newsletter_ip", clientKey(req), 5, 3600);
  // Caps confirmation emails per address, so the form can't be used to
  // flood someone else's inbox ("list bombing").
  await enforceRateLimit(db, "newsletter_email", hmac("newsletter-rl", email).slice(0, 32), 3, 86400);

  // The response never says whether the address was already subscribed, so
  // the form can't be used to find out who is on the list.
  const ref = db.collection("newsletterSubscribers").doc(subscriberId(email));
  await db.runTransaction(async (tx) => {
    const confirmed = (await tx.get(ref)).get("confirmedAt");
    tx.set(
      ref,
      {
        email,
        lang,
        source,
        consentVersion: CONSENT_VERSION,
        consentText: CONSENT_TEXT[lang],
        requestedAt: FieldValue.serverTimestamp(),
        // An address that never confirms is deleted after this (see
        // sweepUnconfirmed); a confirmed subscriber's record is kept.
        ...(confirmed ? {} : { expiresAt: Timestamp.fromMillis(Date.now() + UNCONFIRMED_TTL_MS) }),
      },
      { merge: true },
    );
  });
  await sweepUnconfirmed(db);

  const confirmUrl = `${getSiteUrl(req)}/api/newsletter?token=${encodeURIComponent(makeConfirmToken(email, lang))}`;
  const copy = CONFIRM_EMAIL[lang];
  await sendEmail({
    to: email,
    subject: copy.subject,
    text: [copy.intro, confirmUrl, copy.ignore].join("\n\n"),
    html: `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#292524;line-height:1.5;">
      <h2 style="font-size:20px;">${escapeHtml(copy.heading)}</h2>
      <p>${escapeHtml(copy.intro)}</p>
      <p style="margin:28px 0;"><a href="${escapeHtml(confirmUrl)}" style="background:#583861;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">${escapeHtml(copy.button)}</a></p>
      <p style="color:#78716c;font-size:14px;">${escapeHtml(copy.ignore)}</p>
    </div>`,
    tag: "newsletter-confirm",
  });
}

// Unconfirmed sign-ups hold an email address nobody has verified, so they
// shouldn't linger: gone 30 days after the last request.
const UNCONFIRMED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function sweepUnconfirmed(db: Firestore): Promise<void> {
  try {
    const expired = await db.collection("newsletterSubscribers").where("expiresAt", "<", Timestamp.now()).limit(50).get();
    if (expired.empty) return;
    const batch = db.batch();
    expired.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    console.warn("newsletterSubscribers sweep failed:", error);
  }
}

const CONFIRM_EMAIL: Record<Lang, { subject: string; heading: string; intro: string; button: string; ignore: string }> = {
  EN: {
    subject: "Please confirm your subscription to the Niramay blog",
    heading: "One more step",
    intro: "Thank you for subscribing to the Niramay blog. Please confirm your email address, and we'll let you know whenever a new post is published.",
    button: "Confirm subscription",
    ignore: "If you didn't sign up, just ignore this email — you won't be subscribed. The link is valid for 7 days.",
  },
  DE: {
    subject: "Bitte bestätigen Sie Ihr Abonnement des Niramay-Blogs",
    heading: "Nur noch ein Schritt",
    intro: "Vielen Dank für Ihr Interesse am Niramay-Blog. Bitte bestätigen Sie Ihre E-Mail-Adresse – dann informieren wir Sie, sobald ein neuer Artikel erscheint.",
    button: "Abonnement bestätigen",
    ignore: "Falls Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail einfach – Sie werden dann nicht eingetragen. Der Link ist 7 Tage gültig.",
  },
};

const CONFIRM_PAGE: Record<Lang, Record<"title" | "body" | "button" | "doneTitle" | "doneBody" | "expiredTitle" | "expiredBody" | "invalidTitle" | "invalidBody" | "errorTitle" | "errorBody" | "back", string>> = {
  EN: {
    title: "Confirm your subscription",
    body: "Click below to start receiving an email whenever a new post is published on the Niramay blog.",
    button: "Confirm subscription",
    doneTitle: "You're subscribed",
    doneBody: "Thank you! You'll receive an email whenever a new post is published. Every email has a one-click unsubscribe link.",
    expiredTitle: "This link has expired",
    expiredBody: "Confirmation links are valid for 7 days. Please sign up again under any blog post.",
    invalidTitle: "Link not valid",
    invalidBody: "This confirmation link is incomplete or invalid. Please sign up again under any blog post.",
    errorTitle: "Something went wrong",
    errorBody: "We couldn't confirm your subscription just now. Please try the link again in a few minutes.",
    back: "Back to the blog",
  },
  DE: {
    title: "Abonnement bestätigen",
    body: "Klicken Sie unten, um künftig eine E-Mail zu erhalten, sobald ein neuer Artikel im Niramay-Blog erscheint.",
    button: "Abonnement bestätigen",
    doneTitle: "Sie sind angemeldet",
    doneBody: "Vielen Dank! Sie erhalten eine E-Mail, sobald ein neuer Artikel erscheint. Jede E-Mail enthält einen Link zur Abmeldung mit einem Klick.",
    expiredTitle: "Dieser Link ist abgelaufen",
    expiredBody: "Bestätigungslinks sind 7 Tage gültig. Bitte melden Sie sich unter einem beliebigen Blogartikel erneut an.",
    invalidTitle: "Ungültiger Link",
    invalidBody: "Dieser Bestätigungslink ist unvollständig oder ungültig. Bitte melden Sie sich unter einem beliebigen Blogartikel erneut an.",
    errorTitle: "Etwas ist schiefgelaufen",
    errorBody: "Ihr Abonnement konnte gerade nicht bestätigt werden. Bitte versuchen Sie den Link in ein paar Minuten erneut.",
    back: "Zurück zum Blog",
  },
};

// Email security scanners fetch every link in a message, so a GET must not
// subscribe anyone — it only shows the button whose POST does.
async function handleConfirm(req: VercelRequest, res: VercelResponse, token: string) {
  const parsed = readConfirmToken(token);
  const langHint: Lang = parsed && parsed !== "expired" ? parsed.lang : "EN";
  const copy = CONFIRM_PAGE[langHint];
  const blogUrl = langHint === "DE" ? "/de/#blog" : "/#blog";

  if (parsed === null) return sendPage(res, 400, langHint, copy.invalidTitle, `<p>${copy.invalidBody}</p>`, blogUrl);
  if (parsed === "expired") return sendPage(res, 410, langHint, copy.expiredTitle, `<p>${copy.expiredBody}</p>`, blogUrl);

  if (req.method === "GET") {
    const selfUrl = escapeHtml(`/api/newsletter?token=${encodeURIComponent(token)}`);
    return sendPage(
      res,
      200,
      langHint,
      copy.title,
      `<p>${copy.body}</p>
       <p style="color:#78716c;">${escapeHtml(parsed.email)}</p>
       <form method="POST" action="${selfUrl}">
         <button type="submit" style="background:#583861;color:#fff;border:0;border-radius:8px;padding:12px 28px;font-size:16px;font-weight:600;cursor:pointer;">${copy.button}</button>
       </form>`,
    );
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Method not allowed");
  }

  try {
    const listId = listIdFor(parsed.lang);
    if (listId === null) throw new Error(`No Brevo list configured for ${parsed.lang}.`);
    // updateEnabled makes this idempotent (clicking twice is harmless), and
    // emailBlacklisted:false re-enables someone who unsubscribed earlier —
    // clicking this link is a fresh, explicit opt-in.
    await brevoRequest("POST", "/contacts", {
      email: parsed.email,
      listIds: [listId],
      updateEnabled: true,
      emailBlacklisted: false,
    });
    await getAdminDb().collection("newsletterSubscribers").doc(subscriberId(parsed.email)).set(
      { email: parsed.email, lang: parsed.lang, confirmedAt: FieldValue.serverTimestamp(), expiresAt: FieldValue.delete() },
      { merge: true },
    );
    return sendPage(res, 200, langHint, copy.doneTitle, `<p>${copy.doneBody}</p>`, blogUrl);
  } catch (error) {
    console.error("newsletter confirm failed:", error);
    return sendPage(res, 500, langHint, copy.errorTitle, `<p>${copy.errorBody}</p>`);
  }
}

function sendPage(res: VercelResponse, status: number, lang: Lang, title: string, bodyHtml: string, backUrl?: string) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // This page contains a state-changing form; never let it be framed.
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader("Cache-Control", "no-store");
  const back = backUrl
    ? `<p style="margin-top:28px;"><a href="${escapeHtml(backUrl)}" style="color:#583861;font-weight:600;">${escapeHtml(CONFIRM_PAGE[lang].back)}</a></p>`
    : "";
  return res.status(status).send(`<!doctype html>
<html lang="${lang === "DE" ? "de" : "en"}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" /><title>${escapeHtml(title)}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#fafaf9;margin:0;padding:48px 24px;text-align:center;color:#292524;">
  <img src="/logo.svg" alt="Niramay" width="56" height="56" />
  <h1 style="font-size:24px;">${escapeHtml(title)}</h1>
  <div style="color:#57534e;font-size:16px;max-width:480px;margin:12px auto 0;">${bodyHtml}${back}</div>
</body>
</html>`);
}
