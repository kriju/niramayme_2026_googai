import React, { useState } from "react";
import { Check, LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRANSLATIONS } from "../constants";

// "Subscribe to new posts" box at the end of each blog post. Only collects
// the address: api/newsletter.ts emails a confirmation link, and nobody is
// added to the list until they click it (double opt-in).

type Lang = "EN" | "DE";
type ErrorKey = keyof (typeof TRANSLATIONS)["EN"]["newsletter"]["errors"];

// Per-device convenience only, so a reader who already signed up isn't asked
// again on every post. Storage can be unavailable (private mode), hence the
// try/catch — the form simply shows again.
const STORAGE_KEY = "niramay:newsletter-signed-up";
function readSignedUp(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}
function rememberSignedUp() {
  try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
}

export default function NewsletterSignup({ lang, onOpenPrivacy }: { lang: Lang; onOpenPrivacy: () => void }) {
  const t = TRANSLATIONS[lang].newsletter;
  const [email, setEmail] = useState("");
  // Honeypot: hidden from people (and screen readers), filled in by bots.
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [signedUpBefore] = useState(readSignedUp);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState("sending");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), lang, source: window.location.pathname, company }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error in t.errors ? data.error : "generic");
      }
      rememberSignedUp();
      setState("sent");
    } catch (err) {
      const code = err instanceof Error && err.message in t.errors ? (err.message as ErrorKey) : "generic";
      setError(code);
      setState("idle");
    }
  };

  if (signedUpBefore && state !== "sent") {
    return (
      <section className="my-12 rounded-2xl border border-stone-100 bg-stone-50 px-6 py-5 flex items-center gap-3 text-sm text-stone-600">
        <Check className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <p>{t.alreadySubscribed}</p>
      </section>
    );
  }

  return (
    <section className="my-12 rounded-2xl border border-primary/15 bg-primary/5 p-5 sm:p-6 md:p-8" aria-labelledby="newsletter-title">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex w-10 h-10 rounded-full bg-primary/10 items-center justify-center shrink-0" aria-hidden="true">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 id="newsletter-title" className="text-xl font-serif font-bold mb-1">{t.title}</h2>
          <p className="text-stone-600 mb-4">{t.subtitle}</p>

          {state === "sent" ? (
            <p className="flex items-start gap-2 text-stone-700" role="status">
              <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t.checkInbox}</span>
            </p>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="newsletter-email" className="sr-only">{t.emailLabel}</label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  aria-invalid={error === "invalid_email" || undefined}
                  aria-describedby="newsletter-consent"
                  className="w-full sm:flex-1 min-w-0 h-11 rounded-lg border border-stone-200 bg-white px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
                  {/* Deliberately not labelled like a real field, so browser autofill leaves it empty. */}
                  <label>
                    Leave this field empty
                    <input type="text" tabIndex={-1} autoComplete="off" value={company} onChange={e => setCompany(e.target.value)} />
                  </label>
                </div>
                <Button type="submit" className="h-11 px-6 gap-2" disabled={state === "sending"}>
                  {state === "sending" && <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  {state === "sending" ? t.submitting : t.submit}
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600" role="alert">{t.errors[error]}</p>}
              <p id="newsletter-consent" className="mt-3 text-xs text-stone-500 leading-relaxed">
                {t.consent}{" "}
                <button type="button" onClick={onOpenPrivacy} className="underline hover:text-primary bg-transparent border-none p-0 cursor-pointer">
                  {t.privacyLink}
                </button>.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
