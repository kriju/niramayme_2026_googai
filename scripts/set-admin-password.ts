// Sets a new password for one of the two founder logins, without any email
// (their login addresses, e.g. rijuk@niramay.me, have no mailbox, so
// Firebase's "reset password" email can't arrive).
//
// Run on your own computer, once per Firebase project as needed:
//   FIREBASE_SERVICE_ACCOUNT="$(cat preview-service-account.json)" npx tsx scripts/set-admin-password.ts rijuk
//
// The password is typed at a hidden prompt, so it never ends up in your
// shell history, a file or a chat. Other sessions of that account are
// signed out.

import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { getAdminAuth, getProjectId } from "../api/_lib/firebaseAdmin";
import { OWNER_EMAILS } from "../api/_lib/adminAuth";

function askHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const username = (process.argv[2] ?? "").trim().toLowerCase();
  const email = OWNER_EMAILS.find((e) => e.split("@")[0] === username);
  if (!email) {
    console.error(`Usage: npx tsx scripts/set-admin-password.ts <${OWNER_EMAILS.map((e) => e.split("@")[0]).join("|")}>`);
    process.exit(1);
  }
  const auth = getAdminAuth();
  console.log(`Project: ${getProjectId()} · account: ${email}`);
  const password = await askHidden("New password (at least 12 characters): ");
  if (password.length < 12) {
    console.error("Too short: use at least 12 characters.");
    process.exit(1);
  }
  if ((await askHidden("Repeat it: ")) !== password) {
    console.error("The two entries don't match. Nothing changed.");
    process.exit(1);
  }
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password, emailVerified: true });
    console.log("The account didn't exist in this project, so it was created.");
  }
  await auth.updateUser(user.uid, { password });
  await auth.revokeRefreshTokens(user.uid);
  console.log("Password set. Sign in with the username and the new password.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
