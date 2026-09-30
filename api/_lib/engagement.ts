import crypto from "node:crypto";
import type { VercelRequest } from "@vercel/node";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import nodemailer from "nodemailer";
import { adminSubject } from "./util.js";

// Shared plumbing for the public blog engagement endpoints (comments and
// likes/dislikes). Unlike reviews, these accept writes from completely
// anonymous visitors, so every write goes through the server — never
// straight from the browser to Firestore — to get validation, rate limiting
// and spam holding that security rules alone can't express.

// Thrown to short-circuit a handler with a specific status + machine-readable
// error code, which the client maps to a translated message.
export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

// Reuses REVIEW_ACTION_SECRET (already configured for review approval links)
// unless a dedicated ENGAGEMENT_SECRET is set, so this feature needs no new
// env var to go live. Every use below is domain-separated by a prefix, so a
// token minted for one purpose can never validate for another.
function getSecret(): string {
  const secret = process.env.ENGAGEMENT_SECRET || process.env.REVIEW_ACTION_SECRET;
  if (!secret) {
    throw new Error("Neither ENGAGEMENT_SECRET nor REVIEW_ACTION_SECRET is set.");
  }
  return secret;
}

export function hmac(purpose: string, value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(`${purpose}:${value}`).digest("hex");
}

export function safeEqual(a: string, b: string | undefined | null): boolean {
  if (!b) return false;
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

// Vercel sets x-real-ip to the actual client address (x-forwarded-for can
// carry client-supplied entries in front of it). The IP is only ever used
// as a keyed hash for rate limiting and is never stored alongside a comment.
export function clientKey(req: VercelRequest): string {
  const header = req.headers["x-real-ip"] ?? req.headers["x-forwarded-for"];
  const raw = (Array.isArray(header) ? header[0] : header)?.split(",")[0]?.trim() || "unknown";
  return hmac("ip", raw).slice(0, 32);
}

// Fixed-window counter in Firestore (serverless instances share no memory,
// so an in-process counter would reset on every cold start). Old buckets
// carry an expiresAt so a Firestore TTL policy on rateLimits.expiresAt can
// sweep them; without one they're just tiny, never-read docs.
export async function enforceRateLimit(
  db: Firestore,
  kind: string,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<void> {
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  const ref = db.collection("rateLimits").doc(`${kind}_${key}_${bucket}`);
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.exists ? Number(snap.get("count")) || 0 : 0;
    if (count >= max) return false;
    tx.set(ref, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis((bucket + 2) * windowSeconds * 1000),
    });
    return true;
  });
  if (!allowed) throw new HttpError(429, "rate_limited");
}

// A JSON content type forces a CORS preflight for any cross-origin browser
// request, which this API never answers — so other sites can't make their
// visitors' browsers post comments/votes here via a plain HTML form.
export function requireJson(req: VercelRequest): Record<string, unknown> {
  const type = String(req.headers["content-type"] ?? "");
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "unsupported_media_type");
  }
  return req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function requireId(value: unknown, field: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) {
    throw new HttpError(400, "invalid_request", `Invalid ${field}`);
  }
  return value;
}

// Strips control characters (keeping newlines), normalizes line endings and
// runs of blank lines. Output is rendered as plain text by React, so no HTML
// escaping happens here — that's the renderer's job, not the storage layer's.
export function cleanText(value: unknown, { multiline }: { multiline: boolean }): string {
  if (typeof value !== "string") return "";
  let text = value.normalize("NFC").replace(/\r\n?/g, "\n");
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "");
  text = multiline ? text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n") : text.replace(/\s+/g, " ");
  return text.trim();
}

// Anything that looks like a link or domain is held for manual approval
// rather than rejected outright — it's the single strongest spam signal,
// but a genuine reader can still legitimately mention a website.
const LINK_PATTERN = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|info|biz|ru|cn|xyz|top|site|online|shop|io|co|de|me|app|link|click)\b)/i;
export function looksLikeSpam(...parts: string[]): boolean {
  return parts.some((p) => LINK_PATTERN.test(p));
}

// Visitors can't sign as one of the authors — only a verified admin session
// gets the author name and badge (see isAuthor in api/blog-comments.ts).
const RESERVED_NAME_FRAGMENTS = ["richa", "riju", "niramay", "admin"];
export function isReservedName(name: string): boolean {
  const normalized = name.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
  return RESERVED_NAME_FRAGMENTS.some((frag) => normalized.includes(frag));
}

export async function sendAdminEmail(subject: string, html: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Skipping admin email — GMAIL_USER/GMAIL_APP_PASSWORD not set.");
    return;
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.ADMIN_NOTIFY_EMAIL || "riju.kansal@niramay.me",
    subject: adminSubject(subject),
    html,
  });
}
