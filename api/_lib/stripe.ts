import crypto from "node:crypto";

// Minimal Stripe client over the REST API (form-encoded, as Stripe expects).
// Only two things are needed — create a Checkout Session, verify a webhook —
// so this avoids pulling in the SDK.
//
// Env: STRIPE_SECRET_KEY (sk_test_… in Preview, sk_live_… in Production) and
// STRIPE_WEBHOOK_SECRET (whsec_…, from the webhook endpoint in the Stripe
// dashboard).

const STRIPE_API = "https://api.stripe.com/v1";

function secretKey(): string {
  const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return key;
}

export function hasStripe(): boolean {
  return Boolean((process.env.STRIPE_SECRET_KEY ?? "").trim());
}

type FormValue = string | number | boolean | undefined | FormValue[] | { [key: string]: FormValue };

// Stripe's bracket notation: {a: {b: [{c: 1}]}} -> a[b][0][c]=1
function encodeForm(value: FormValue, prefix = "", out: string[] = []): string[] {
  if (value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => encodeForm(v, `${prefix}[${i}]`, out));
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) encodeForm(v, prefix ? `${prefix}[${k}]` : k, out);
  } else {
    out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  }
  return out;
}

export async function stripeRequest<T = Record<string, any>>(
  method: "GET" | "POST",
  path: string,
  params?: { [key: string]: FormValue },
  idempotencyKey?: string,
): Promise<T> {
  const body = params ? encodeForm(params).join("&") : undefined;
  const response = await fetch(`${STRIPE_API}${path}${method === "GET" && body ? `?${body}` : ""}`, {
    method,
    headers: {
      authorization: `Bearer ${secretKey()}`,
      ...(method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: method === "POST" ? body : undefined,
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Stripe ${method} ${path} failed (${response.status}): ${raw.slice(0, 500)}`);
  }
  return JSON.parse(raw) as T;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | null;
  metadata: Record<string, string>;
  customer_details?: { email?: string | null; name?: string | null } | null;
};

/**
 * Verifies the Stripe-Signature header against the raw request body
 * (https://docs.stripe.com/webhooks#verify-manually) and returns the event.
 */
export function verifyWebhook(rawBody: Buffer, signatureHeader: string | undefined, toleranceSeconds = 300): { id: string; type: string; data: { object: any } } {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  if (!signatureHeader) throw new WebhookSignatureError("missing signature");

  const parts = signatureHeader.split(",").map((p) => p.trim().split("="));
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) throw new WebhookSignatureError("malformed signature");
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > toleranceSeconds) throw new WebhookSignatureError("timestamp outside tolerance");

  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.`).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const match = signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "utf8");
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
  if (!match) throw new WebhookSignatureError("signature mismatch");
  return JSON.parse(rawBody.toString("utf8"));
}

export class WebhookSignatureError extends Error {}
