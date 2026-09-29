import { getAdminAuth } from "./firebaseAdmin.js";

// Kept in sync by hand with BLOG_ADMIN_USERNAMES/BLOG_ADMIN_EMAIL_DOMAIN in
// src/constants.ts and the isBlogAdmin() allowlist in firestore.rules — all
// three need to agree on exactly these two accounts.
const BLOG_ADMIN_EMAILS = ["rijuk@niramay.me", "richak@niramay.me"];

// Verifies a Firebase ID token really belongs to one of the two blog admin
// accounts, throwing otherwise. This — not the client-side username check
// in the login form, and not anything about which route a request hits —
// is what actually gates blog media uploads/deletes server-side.
export async function requireBlogAdmin(bearerHeader: string | string[] | undefined): Promise<string> {
  const header = Array.isArray(bearerHeader) ? bearerHeader[0] : bearerHeader;
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Missing Authorization header");
  const decoded = await getAdminAuth().verifyIdToken(token);
  if (!decoded.email || !BLOG_ADMIN_EMAILS.includes(decoded.email)) {
    throw new Error("Not authorized");
  }
  return decoded.email;
}

// How each admin is credited when they reply to a blog comment. Keyed by
// login email so the name always comes from the verified token, never from
// anything the request body says.
const AUTHOR_DISPLAY_NAMES: Record<string, string> = {
  "rijuk@niramay.me": "Riju",
  "richak@niramay.me": "Richa",
};

export function authorDisplayName(email: string): string {
  return AUTHOR_DISPLAY_NAMES[email] ?? "Niramay";
}
