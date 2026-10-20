import type { VercelRequest } from "@vercel/node";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { clientKey, enforceRateLimit } from "./engagement.js";

// The notify-* endpoints are public (the browser calls them right after it
// writes a request doc) and email both us and the address stored in that
// doc. Without a guard, replaying one call would send the same emails again
// and again — spamming whoever's address is on the doc and using up the
// daily Brevo quota that real bookings depend on.
//
// So each (collection, doc, kind) is emailed at most once, and each visitor
// IP gets a generous hourly budget across all notify endpoints. A genuine
// visitor makes one or two of these calls per booking.

const NOTIFY_LIMIT = 20;
const NOTIFY_WINDOW_SECONDS = 3600;

export async function enforceNotifyRateLimit(db: Firestore, req: VercelRequest): Promise<void> {
  await enforceRateLimit(db, "notify", clientKey(req), NOTIFY_LIMIT, NOTIFY_WINDOW_SECONDS);
}

// Claims the right to send the emails for this request + kind. Returns
// false if they were already claimed (a duplicate call), otherwise a
// release function to call if sending fails before anything went out, so
// a later retry can still send. The claim docs hold only ids and live in
// a collection the security rules keep closed to clients.
export async function claimNotification(
  db: Firestore,
  collection: string,
  id: string,
  kind: string,
): Promise<false | (() => Promise<void>)> {
  const ref = db.collection("notificationLog").doc(`${collection}_${id}_${kind}`);
  try {
    await ref.create({ collection, id, kind, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    // gRPC ALREADY_EXISTS: someone already sent these emails.
    if ((error as { code?: number }).code === 6) return false;
    throw error;
  }
  return async () => {
    await ref.delete().catch((error) => console.error("notificationLog release failed:", error));
  };
}
