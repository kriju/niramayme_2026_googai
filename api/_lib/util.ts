// Review content is arbitrary visitor input — always escape it before
// interpolating into the HTML email or the confirmation page.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Prefer an explicit SITE_URL (set this to your real domain once you have
// one, e.g. https://niramay.me) so links work the same from every
// deployment; falls back to the request's own host for previews.
export function getSiteUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const proto = firstHeader(req.headers["x-forwarded-proto"]) || "https";
  const host = firstHeader(req.headers["x-forwarded-host"]) || firstHeader(req.headers.host) || "localhost:3000";
  return `${proto}://${host}`;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
