import crypto from "node:crypto";

// Binds an approve/reject link to one specific review document, so the
// emailed link can't be reused (or guessed) to act on a different review.
// The same token works for both actions — which action fires depends only
// on which link (approve vs reject) was clicked, so an admin can still
// change their mind later by clicking the other link from the same email.
function getSecret(): string {
  const secret = process.env.REVIEW_ACTION_SECRET;
  if (!secret) {
    throw new Error(
      "REVIEW_ACTION_SECRET env var is not set. Set it to a long random string in Vercel " +
        "(the same value must be present when the email was sent and when the link is clicked)."
    );
  }
  return secret;
}

export function makeReviewToken(reviewId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(reviewId).digest("hex");
}

export function verifyReviewToken(reviewId: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = Buffer.from(makeReviewToken(reviewId), "utf8");
  const actual = Buffer.from(token, "utf8");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
