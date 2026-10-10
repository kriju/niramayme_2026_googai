import { hmac, safeEqual } from "./engagement.js";
import { brevoRequest } from "./mailer.js";

// Shared by api/newsletter.ts (sign-up + double opt-in) and
// api/_lib/newsletterAnnounce.ts (new-post campaigns).
//
// Subscribers live in Brevo, one contact list per language ("Blog EN" /
// "Blog DE", created automatically on first use). Firestore keeps
// only the consent record German law (UWG §7, GDPR Art. 7) expects us to be
// able to produce: which address asked, when, from which page, which wording
// they agreed to, and when they confirmed via the emailed link.

export type Lang = "EN" | "DE";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bump whenever the consent wording below changes, so each stored record
// says exactly which text that person agreed to.
export const CONSENT_VERSION = "2026-10-10b";

// Must match the wording shown under the sign-up form (newsletter.consent in
// src/constants.ts).
export const CONSENT_TEXT: Record<Lang, string> = {
  EN: "Yes, email me when a new blog post is published (about once a week). I can unsubscribe at any time with one click. See the Privacy Policy.",
  DE: "Ja, ich möchte per E-Mail über neue Blogartikel informiert werden (etwa einmal pro Woche). Ich kann mich jederzeit mit einem Klick abmelden. Siehe Datenschutzerklärung.",
};

const LIST_NAMES: Record<Lang, string> = { EN: "Blog EN", DE: "Blog DE" };
const listIdCache: Partial<Record<Lang, number>> = {};

// The Brevo list for a language: BREVO_LIST_ID_EN/_DE if set, otherwise the
// list named "Blog EN"/"Blog DE", created (in the first contact folder) if
// it doesn't exist yet — so no list ids need configuring by hand.
export async function listIdFor(lang: Lang): Promise<number> {
  const configured = Number(lang === "DE" ? process.env.BREVO_LIST_ID_DE : process.env.BREVO_LIST_ID_EN);
  if (Number.isInteger(configured) && configured > 0) return configured;
  const cached = listIdCache[lang];
  if (cached) return cached;

  const name = LIST_NAMES[lang];
  // Oldest match wins, so a duplicate from a rare concurrent first sign-up
  // is simply never used.
  const matches: number[] = [];
  for (let offset = 0; ; offset += 50) {
    const page = await brevoRequest<{ lists?: { id: number; name: string }[] }>("GET", `/contacts/lists?limit=50&offset=${offset}`);
    const lists = page.lists ?? [];
    matches.push(...lists.filter((l) => l.name === name).map((l) => l.id));
    if (lists.length < 50) break;
  }
  let id = matches.length ? Math.min(...matches) : 0;
  if (!id) {
    const folders = await brevoRequest<{ folders?: { id: number }[] }>("GET", "/contacts/folders?limit=10&offset=0");
    const folderId = folders.folders?.[0]?.id
      ?? (await brevoRequest<{ id: number }>("POST", "/contacts/folders", { name: "Niramay" })).id;
    id = (await brevoRequest<{ id: number }>("POST", "/contacts/lists", { name, folderId })).id;
  }
  listIdCache[lang] = id;
  return id;
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
