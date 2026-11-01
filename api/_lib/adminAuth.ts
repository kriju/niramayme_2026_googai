import type { VercelRequest } from "@vercel/node";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminAuth } from "./firebaseAdmin.js";
import { HttpError } from "./engagement.js";

// Who may use the admin section (/admin, api/admin.ts).
//
// The source of truth is a Firebase custom claim, role: "owner", set once
// per account by scripts/set-admin-claims.ts. Until that script has been run
// for a project, the two founder login emails are still accepted, so nothing
// breaks during the switch. firestore.rules (isBlogAdmin) accepts the same
// two things. Once the claims are set on both projects, the email fallback
// can be removed here, in blogAuth.ts and in the rules.

export const OWNER_EMAILS = ["rijuk@niramay.me", "richak@niramay.me"] as const;

const DISPLAY_NAMES: Record<string, string> = {
  "rijuk@niramay.me": "Riju",
  "richak@niramay.me": "Richa",
};

export type AdminUser = {
  uid: string;
  email: string;
  name: string;
  role: "owner";
  /** Seconds since epoch of the last real sign-in (not a token refresh). */
  authTime: number;
  /** Signed in with a second factor (TOTP) in this session. */
  twoFactor: boolean;
};

export function isOwnerToken(decoded: DecodedIdToken): boolean {
  if (decoded.role === "owner") return true;
  return typeof decoded.email === "string" && (OWNER_EMAILS as readonly string[]).includes(decoded.email);
}

/** ADMIN_REQUIRE_2FA=true turns on the two-step requirement for admin calls. */
export function twoFactorRequired(): boolean {
  return (process.env.ADMIN_REQUIRE_2FA ?? "").trim().toLowerCase() === "true";
}

function bearer(req: VercelRequest): string {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  return value?.replace(/^Bearer\s+/i, "") ?? "";
}

/**
 * Verifies the Firebase ID token on the request and that it belongs to an
 * owner. Throws HttpError 401/403 otherwise. This, not anything in the
 * browser, is the security boundary of the admin section.
 */
export async function requireAdmin(req: VercelRequest): Promise<AdminUser> {
  const token = bearer(req);
  if (!token) throw new HttpError(401, "unauthorized");
  let decoded: DecodedIdToken;
  try {
    // checkRevoked: a password change or "sign out everywhere" takes effect
    // at once, not only when the hour-long token expires.
    decoded = await getAdminAuth().verifyIdToken(token, true);
  } catch {
    throw new HttpError(401, "unauthorized");
  }
  if (!isOwnerToken(decoded) || !decoded.email) throw new HttpError(403, "forbidden");
  const twoFactor = Boolean(decoded.firebase?.sign_in_second_factor);
  if (twoFactorRequired() && !twoFactor) throw new HttpError(403, "two_factor_required");
  return {
    uid: decoded.uid,
    email: decoded.email,
    name: DISPLAY_NAMES[decoded.email] ?? decoded.email.split("@")[0],
    role: "owner",
    authTime: decoded.auth_time,
    twoFactor,
  };
}

/**
 * For money and destructive actions: the user must have actually signed in
 * (typed their password) within the last `maxAgeSeconds`. The client reacts
 * to "recent_login_required" by asking for the password again.
 */
export function requireRecentLogin(admin: AdminUser, maxAgeSeconds = 5 * 60, now = Date.now()): void {
  if (now / 1000 - admin.authTime > maxAgeSeconds) throw new HttpError(401, "recent_login_required");
}
