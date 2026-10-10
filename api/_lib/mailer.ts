import nodemailer from "nodemailer";

// Every email the site sends goes through here. With BREVO_API_KEY set it
// goes out via Brevo's transactional API from a dedicated sender on our own
// domain (DKIM-signed for niramay.me, so it lands in inboxes). Without it —
// or if Brevo errors — it falls back to the Gmail account it always used.
//
// The dedicated sender matters for more than reputation: GMAIL_USER is an
// alias of the same Workspace mailbox as the admin addresses, so Gmail files
// a notification sent from it to them as "sent to yourself" — straight into
// Sent, never the inbox. Mail from notifications@ arrives like any other.

export type Email = {
  // One address, or several comma-separated (e.g. COURSE_NOTIFY_EMAIL).
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // Shown in Brevo's transactional logs, to filter by kind of email.
  tag?: string;
};

const BREVO_API = "https://api.brevo.com/v3";

export function senderAddress(): { name: string; email: string } {
  return {
    name: process.env.MAIL_FROM_NAME || "Niramay",
    email: process.env.MAIL_FROM_EMAIL || "notifications@niramay.me",
  };
}

export function hasBrevo(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

// Thin wrapper over Brevo's REST API, shared with the newsletter endpoints.
// Throws with Brevo's own error body so failures are diagnosable in logs.
export async function brevoRequest<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set.");
  const response = await fetch(`${BREVO_API}${path}`, {
    method,
    headers: {
      "api-key": apiKey,
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Brevo ${method} ${path} failed (${response.status}): ${raw.slice(0, 500)}`);
  }
  return (raw ? JSON.parse(raw) : {}) as T;
}

function splitAddresses(to: string): string[] {
  return to.split(",").map((a) => a.trim()).filter(Boolean);
}

async function sendViaBrevo(email: Email): Promise<void> {
  await brevoRequest("POST", "/smtp/email", {
    sender: senderAddress(),
    to: splitAddresses(email.to).map((address) => ({ email: address })),
    ...(email.replyTo ? { replyTo: { email: email.replyTo } } : {}),
    subject: email.subject,
    htmlContent: email.html,
    ...(email.text ? { textContent: email.text } : {}),
    ...(email.tag ? { tags: [email.tag] } : {}),
  });
}

async function sendViaGmail(email: Email): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail fallback isn't configured (GMAIL_USER/GMAIL_APP_PASSWORD unset).");
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email.to,
    replyTo: email.replyTo,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

export async function sendEmail(email: Email): Promise<void> {
  if (hasBrevo()) {
    try {
      return await sendViaBrevo(email);
    } catch (error) {
      console.error("Brevo send failed, falling back to Gmail:", error);
    }
  }
  await sendViaGmail(email);
}
