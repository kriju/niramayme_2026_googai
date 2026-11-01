// Gives the two founder accounts the admin role: the Firebase custom claim
// role: "owner", which api/_lib/adminAuth.ts and firestore.rules check.
// Run once per Firebase project (live and preview); safe to run again.
//
// Usage:
//   FIREBASE_SERVICE_ACCOUNT="$(cat live-service-account.json)" npx tsx scripts/set-admin-claims.ts
//   FIREBASE_SERVICE_ACCOUNT="$(cat preview-service-account.json)" npx tsx scripts/set-admin-claims.ts
//
// Add --dry-run to only print what would change. Signed-in founders pick up
// the claim at their next token refresh (the admin page forces one on load).

import { getAdminAuth, getProjectId } from "../api/_lib/firebaseAdmin";
import { OWNER_EMAILS } from "../api/_lib/adminAuth";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const auth = getAdminAuth();
  console.log(`Project: ${getProjectId()}${dryRun ? " (dry run)" : ""}`);
  for (const email of OWNER_EMAILS) {
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch {
      console.warn(`  ${email}: no such account in this project, skipped`);
      continue;
    }
    const claims = user.customClaims ?? {};
    if (claims.role === "owner") {
      console.log(`  ${email}: already owner`);
      continue;
    }
    if (!dryRun) await auth.setCustomUserClaims(user.uid, { ...claims, role: "owner" });
    console.log(`  ${email}: ${dryRun ? "would set" : "set"} role = owner`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
