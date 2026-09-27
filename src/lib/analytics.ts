// Google Analytics 4, loaded only after the visitor consents via the
// cookie banner (App.tsx's CookieConsent) — GA sets cookies, and GDPR
// requires consent before those load for a German business site.
// Set VITE_GA_MEASUREMENT_ID (a "G-XXXXXXXXXX" id from GA4 Admin > Data
// Streams) in Vercel's project env vars for this to do anything.
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const CONSENT_KEY = "niramay-cookie-consent";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let scriptLoaded = false;

function loadGtagScript() {
  if (scriptLoaded || !GA_MEASUREMENT_ID) return;
  scriptLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  // We send page_view ourselves on route change (see trackPageview) since
  // this is a client-side-routed SPA, not a fresh document load per page.
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export type ConsentState = "granted" | "denied";

export function getStoredConsent(): ConsentState | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

// Called once on app start so a returning visitor who already granted
// consent doesn't have to see the banner again before GA loads.
export function initAnalyticsFromStoredConsent() {
  if (getStoredConsent() === "granted") loadGtagScript();
}

export function grantAnalyticsConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, "granted");
  } catch {
    // Storage unavailable (private mode, blocked cookies) — GA simply
    // won't persist consent across visits; not worth surfacing to the user.
  }
  loadGtagScript();
}

export function denyAnalyticsConsent() {
  try {
    localStorage.setItem(CONSENT_KEY, "denied");
  } catch {
    // See grantAnalyticsConsent.
  }
}

export function trackPageview(path: string) {
  if (!scriptLoaded) return;
  window.gtag("event", "page_view", { page_path: path });
}
