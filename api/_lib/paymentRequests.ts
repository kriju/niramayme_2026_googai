import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./firebaseAdmin.js";
import { sendEmail } from "./mailer.js";
import { requireBlogAdmin } from "./blogAuth.js";
import { HttpError, clientKey, enforceRateLimit } from "./engagement.js";
import { escapeHtml, getSiteUrl } from "./util.js";
import { formatEuro, type Lang } from "./courses.js";
import { readJson } from "./coursePayments.js";

// Personal payment links for sessions whose package is agreed in a
// conversation first (Subconscious Healing; anything else Richa sells
// individually). A founder creates one on /write (PaymentLinksPanel) with the
// client's name, email, the package and the amount; the client opens
// /pay/<id>, accepts the AGB/withdrawal information and pays via Stripe
// (servicePayments.ts, collection "paymentRequests"). The Stripe webhook then
// sends the usual confirmation + invoice.
//
// Security:
//  - Only the two founder accounts can create or list links (Firebase ID
//    token, requireBlogAdmin). The amount lives server-side; the client
//    never sends a price.
//  - Ids are 20 random characters (~119 bits), so links can't be guessed.
//    The public read returns only what the pay page shows (first name,
//    package, amount, status) — never the email or WhatsApp number.
//  - A link can be paid once and expires after LINK_VALID_DAYS.
//  - paymentRequests is admin-SDK only (firestore.rules default deny).
//
//   POST /api/payment-request?op=create   (founder)  -> {id, url}
//   GET  /api/payment-request?op=list     (founder)  -> latest links
//   GET  /api/payment-request?op=get&id=  (public)   -> pay page data

export const LINK_VALID_DAYS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_RE = /^[A-Za-z0-9]{20}$/;

function newId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(20), (b) => alphabet[b % alphabet.length]).join("");
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";
}

export function payUrl(site: string, id: string, lang: Lang): string {
  return `${site}${lang === "DE" ? "/de" : ""}/pay/${id}`;
}

export async function handlePaymentRequest(req: VercelRequest, res: VercelResponse) {
  try {
    const op = req.query.sub;
    if (op === "get") return await handleGet(req, res);
    const admin = await requireBlogAdmin(req.headers.authorization).catch(() => {
      throw new HttpError(401, "unauthorized");
    });
    if (op === "create") return await handleCreate(req, res, admin);
    if (op === "list") return await handleList(req, res);
    throw new HttpError(400, "unknown_op");
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.code });
    console.error("payment request failed:", error);
    return res.status(500).json({ error: "server_error" });
  }
}

async function handleCreate(req: VercelRequest, res: VercelResponse, admin: string) {
  if (req.method !== "POST") throw new HttpError(405, "method_not_allowed");
  const body = await readJson(req);
  const name = clean(body.name, 100);
  const email = clean(body.email, 200).toLowerCase();
  const whatsapp = clean(body.whatsapp, 40);
  const description = clean(body.description, 200);
  const amountCents = Math.round(Number(body.amountEur) * 100);
  const lang: Lang = body.lang === "DE" ? "DE" : "EN";
  if (!name || !EMAIL_RE.test(email) || !description) throw new HttpError(400, "missing_fields");
  if (!Number.isFinite(amountCents) || amountCents < 100 || amountCents > 200000) throw new HttpError(400, "invalid_amount");

  const id = newId();
  const expiresAt = Timestamp.fromMillis(Date.now() + LINK_VALID_DAYS * 24 * 60 * 60 * 1000);
  await getAdminDb().collection("paymentRequests").doc(id).set({
    name, email, whatsapp, description, amountCents, lang,
    createdBy: admin,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    paid: false,
  });
  const url = payUrl(getSiteUrl(req), id, lang);

  if (body.sendEmail !== false) {
    const de = lang === "DE";
    const until = new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { dateStyle: "long", timeZone: "Europe/Berlin" }).format(expiresAt.toDate());
    const paragraphs = [
      de ? `Hallo ${name},` : `Hi ${name},`,
      de
        ? `wie besprochen finden Sie hier den Link, um „${description}“ (${formatEuro(amountCents, lang)}) zu buchen und zu bezahlen:`
        : `As discussed, here is your link to book and pay for "${description}" (${formatEuro(amountCents, lang)}):`,
      url,
      de
        ? `Der Link ist bis ${until} gültig. Nach der Zahlung erhalten Sie sofort eine Bestätigung mit Rechnung, und wir vereinbaren die Termine mit Ihnen.`
        : `The link is valid until ${until}. After paying you'll get a confirmation with your invoice straight away, and we'll agree the dates with you.`,
      de ? "Herzliche Grüße,\nRicha" : "Warmly,\nRicha",
    ];
    await sendEmail({
      to: email,
      replyTo: "richa@niramay.me",
      subject: de ? `Ihr Zahlungslink: ${description}` : `Your payment link: ${description}`,
      text: paragraphs.join("\n\n"),
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#292524;line-height:1.5;">${paragraphs
        .map((p) => (p === url
          ? `<p style="margin:24px 0;"><a href="${escapeHtml(url)}" style="background:#583861;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">${de ? "Jetzt buchen und bezahlen" : "Book and pay now"}</a></p>`
          : `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`))
        .join("")}</div>`,
      tag: "customer-payment-link",
    });
  }
  return res.status(200).json({ id, url });
}

async function handleList(_req: VercelRequest, res: VercelResponse) {
  const snap = await getAdminDb().collection("paymentRequests").orderBy("createdAt", "desc").limit(25).get();
  return res.status(200).json({
    links: snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        email: data.email,
        description: data.description,
        amountCents: data.amountCents,
        lang: data.lang,
        paid: data.paid === true,
        invoiceNumber: data.invoiceNumber ?? null,
        createdAt: data.createdAt?.toMillis?.() ?? null,
        expiresAt: data.expiresAt?.toMillis?.() ?? null,
      };
    }),
  });
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!ID_RE.test(id)) throw new HttpError(404, "not_found");
  const db = getAdminDb();
  await enforceRateLimit(db, "pay_link", clientKey(req), 60, 3600);
  const snap = await db.collection("paymentRequests").doc(id).get();
  if (!snap.exists) throw new HttpError(404, "not_found");
  const data = snap.data() as Record<string, any>;
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    firstName: String(data.name || "").split(/\s+/)[0],
    description: data.description,
    amountCents: data.amountCents,
    lang: data.lang,
    paid: data.paid === true,
    expired: !data.paid && data.expiresAt?.toMillis?.() < Date.now(),
  });
}
