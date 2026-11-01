import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import type { AdminUser } from "./adminAuth.js";

// Append-only record of every change made through the admin section:
// who, when, which operation, on what, and the before/after values.
// Lives in adminAudit, which firestore.rules keep closed to every client
// (default deny); only the admin SDK writes it, and nothing ever updates or
// deletes an entry.

export type AuditEntry = {
  op: string;
  /** e.g. "courses/yoga-adventure" or "session". */
  target: string;
  before?: unknown;
  after?: unknown;
  note?: string;
  /** "admin" = the admin pages; "connector" = Claude acting for this founder. */
  via?: "admin" | "connector";
};

function record(admin: AdminUser, entry: AuditEntry) {
  return {
    by: admin.email,
    byName: admin.name,
    via: entry.via ?? "admin",
    op: entry.op,
    target: entry.target,
    // Firestore rejects undefined values, so absent fields are left out.
    ...(entry.before !== undefined ? { before: entry.before } : {}),
    ...(entry.after !== undefined ? { after: entry.after } : {}),
    ...(entry.note ? { note: entry.note.slice(0, 2000) } : {}),
    at: FieldValue.serverTimestamp(),
  };
}

export async function writeAudit(db: Firestore, admin: AdminUser, entry: AuditEntry): Promise<void> {
  await db.collection("adminAudit").add(record(admin, entry));
}

/** Same, inside a transaction, so the change and its log entry land together. */
export function writeAuditInTx(tx: Transaction, db: Firestore, admin: AdminUser, entry: AuditEntry): void {
  tx.create(db.collection("adminAudit").doc(), record(admin, entry));
}
