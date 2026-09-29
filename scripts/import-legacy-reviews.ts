// One-off import of the reviews exported from the previous (WordPress) site.
//
// Source data: data/legacy-reviews.json (already cleaned and mapped to the
// Review schema in firebase-blueprint.json; IPs/emails/avatars were dropped).
//
// Usage:
//   FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" npx tsx scripts/import-legacy-reviews.ts           # dry run
//   FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" npx tsx scripts/import-legacy-reviews.ts --commit  # write
//
// Writes go through the Admin SDK because firestore.rules only lets the public
// form create unapproved reviews. Documents use fixed IDs (legacy-01 …), so
// re-running the import overwrites them instead of creating duplicates.

import { readFileSync } from "node:fs";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "../api/_lib/firebaseAdmin";

const CATEGORIES = [
  "Physical Wellness", "Mental Clarity", "Spiritual Healing",
  "Kids Yoga", "Dance Therapy", "Tarot Reading", "Chair Yoga",
];

interface LegacyReview {
  id: string;
  name: string;
  rating: number;
  content: string;
  category: string;
  role: string;
  lang: "EN" | "DE";
  approved: boolean;
  createdAt: string;
  legacyTitle: string;
}

// Mirrors isValidReview in firestore.rules so the imported docs look exactly
// like ones the site could have created itself.
function validate(r: LegacyReview): string[] {
  const errors: string[] = [];
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(r.id)) errors.push("invalid id");
  if (!r.name || r.name.length > 100) errors.push("name must be 1-100 chars");
  if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) errors.push("rating must be 1-5");
  if (!r.content || r.content.length > 1000) errors.push("content must be 1-1000 chars");
  if (!CATEGORIES.includes(r.category)) errors.push(`unknown category "${r.category}"`);
  if (r.lang !== "EN" && r.lang !== "DE") errors.push("lang must be EN or DE");
  if (Number.isNaN(Date.parse(r.createdAt))) errors.push("invalid createdAt");
  return errors;
}

async function main() {
  const commit = process.argv.includes("--commit");
  const path = new URL("../data/legacy-reviews.json", import.meta.url);
  const reviews: LegacyReview[] = JSON.parse(readFileSync(path, "utf8"));

  const problems = reviews.flatMap(r => validate(r).map(e => `${r.id}: ${e}`));
  if (problems.length) {
    console.error("Validation failed:\n" + problems.join("\n"));
    process.exit(1);
  }

  for (const r of reviews) {
    console.log(`${r.id}  ${r.rating}★  ${r.category.padEnd(17)} ${r.lang}  ${r.name} — ${r.role}`);
  }

  if (!commit) {
    console.log(`\nDry run: ${reviews.length} reviews valid. Re-run with --commit to write them.`);
    return;
  }

  const db = getAdminDb();
  const batch = db.batch();
  for (const { id, createdAt, ...fields } of reviews) {
    batch.set(db.collection("reviews").doc(id), {
      ...fields,
      createdAt: Timestamp.fromDate(new Date(createdAt)),
    });
  }
  await batch.commit();
  console.log(`\nImported ${reviews.length} reviews into Firestore.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
