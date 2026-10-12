// Backlog audit of the live blog (feature spec, Feature 1 / Phase 1):
// runs every published post through the same automatic legal checks the
// /write editor shows (api/_lib/claimsCheck.ts) and lists which posts still
// lack an approval record of their current version.
//
// Read-only: it changes nothing. The fixes and sign-offs happen in /write,
// where each post marked "Published, not yet reviewed" gets a Review button
// for the other founder. Phase 1's gate is passed when this prints
// "All N live posts have an approval record".
//
// Usage:
//   FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" npx tsx scripts/audit-blog-posts.ts
//   ... --all     also list posts without warnings
//   ... --drafts  include unpublished posts

import { getAdminDb } from "../api/_lib/firebaseAdmin";
import { checkPost } from "../api/_lib/claimsCheck";

const showAll = process.argv.includes("--all");
const includeDrafts = process.argv.includes("--drafts");

const db = getAdminDb();
const [blogs, reviews] = await Promise.all([
  includeDrafts ? db.collection("blogs").get() : db.collection("blogs").where("published", "==", true).get(),
  db.collection("blogReviews").get(),
]);
const reviewById = new Map(reviews.docs.map((d) => [d.id, d.data()]));

let approved = 0;
let withWarnings = 0;
const live = blogs.docs.filter((d) => d.get("published") === true).length;

for (const doc of blogs.docs) {
  const post = doc.data();
  const review = reviewById.get(doc.id);
  const isApproved = !!review?.approvalId && review.approvedRevision === (post.revision ?? 0);
  if (isApproved && post.published) approved++;
  const warnings = checkPost({ ...post, machineTranslated: !!review?.machineTranslated });
  if (warnings.length) withWarnings++;
  if (!showAll && !warnings.length && isApproved) continue;

  const state = isApproved ? "approved" : review?.status ? `not approved (${review.status})` : "not yet reviewed";
  console.log(`\n${post.published ? "LIVE " : "DRAFT"} ${post.lang} /${post.lang === "DE" ? "de/" : ""}blog/${post.slug}`);
  console.log(`      "${post.title}" by ${post.author ?? "?"} — ${state}`);
  for (const w of warnings) {
    console.log(`  ! ${w.message}`);
    if (w.excerpt) console.log(`      "${w.excerpt}"`);
  }
}

console.log(`\n${blogs.size} posts checked, ${withWarnings} with warnings.`);
console.log(
  approved === live
    ? `All ${live} live posts have an approval record.`
    : `${approved} of ${live} live posts have an approval record; ${live - approved} still need review in /write.`,
);
