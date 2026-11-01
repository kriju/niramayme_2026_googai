import type { User } from "firebase/auth";

// Client for api/admin.ts. Every call carries the founder's Firebase ID
// token; the server decides what's allowed.

export class AdminApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function adminFetch<T>(
  user: User,
  op: string,
  options: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string> } = {},
): Promise<T> {
  const params = new URLSearchParams({ op, ...(options.query ?? {}) });
  const token = await user.getIdToken();
  const response = await fetch(`/api/admin?${params}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new AdminApiError(response.status, (data as { error?: string }).error ?? `http_${response.status}`);
  return data as T;
}

export type WhoAmI = {
  email: string;
  name: string;
  role: "owner";
  twoFactor: boolean;
  twoFactorRequired: boolean;
  environment: "live" | "preview";
};

/** Plain-English text for the error codes the admin API returns. */
export function describeError(error: unknown): string {
  const code = error instanceof AdminApiError ? error.code : error instanceof Error ? error.message : String(error);
  switch (code) {
    case "unauthorized":
      return "Your sign-in has expired. Please sign in again.";
    case "forbidden":
      return "This account doesn't have access to the admin section.";
    case "two_factor_required":
      return "Sign in with your 2-step code to use the admin section.";
    case "recent_login_required":
      return "For this action, please confirm your password again.";
    case "server_error":
      return "Something went wrong on the server. Please try again in a moment.";
    default:
      return `Something went wrong (${code}).`;
  }
}

export const euro = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

/** Dates are always shown in German time, whatever the device's zone. */
export const berlinDateTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
      }).format(new Date(iso))
    : "—";
