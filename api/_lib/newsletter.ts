import { hmac, safeEqual } from "./engagement.js";

// Shared by api/newsletter.ts (sign-up + double opt-in) and
// api/newsletter-announce.ts (new-post campaigns).
//
// Subscribers live in Brevo, one contact list per language. Firestore keeps
// only the consent record German law (UWG §7, GDPR Art. 7) expects us to be
// able to produce: which address asked, when, from which page, which wording
// they agreed to, and when they confirmed via the emailed link.

export type Lang = "EN" | "DE";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bump whenever the consent wording below changes, so each stored record
// says exactly which text that person agreed to.
export const CONSENT_VERSION = "2026-10-10";

// Must match the wording shown under the sign-up form (newsletter.consent in
// src/constants.ts).
export const CONSENT_TEXT: Record<Lang, string> = {
  EN: "Yes, email me when a new blog post is published. I can unsubscribe at any time with one click. See the Privacy Policy.",
  DE: "Ja, ich möchte per E-Mail über neue Blogartikel informiert werden. Ich kann mich jederzeit mit einem Klick abmelden. Siehe Datenschutzerklärung.",
};

export function listIdFor(lang: Lang): number | null {
  const raw = lang === "DE" ? process.env.BREVO_LIST_ID_DE : process.env.BREVO_LIST_ID_EN;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

// Firestore doc id for an address — keyed, so ids don't reveal addresses.
export function subscriberId(email: string): string {
  return hmac("newsletter-subscriber", email).slice(0, 40);
}

// Confirmation links stay valid for a week.
const CONFIRM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function makeConfirmToken(email: string, lang: Lang, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ e: email, l: lang, t: now })).toString("base64url");
  return `${payload}.${hmac("newsletter-confirm", payload)}`;
}

export function readConfirmToken(token: string, now = Date.now()): { email: string; lang: Lang } | "expired" | null {
  const [payload, signature] = token.split(".");
  if (!payload || !safeEqual(hmac("newsletter-confirm", payload), signature)) return null;
  try {
    const { e, l, t } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const email = normalizeEmail(e);
    if (!email || (l !== "EN" && l !== "DE") || typeof t !== "number") return null;
    if (now - t > CONFIRM_TTL_MS) return "expired";
    return { email, lang: l };
  } catch {
    return null;
  }
}
