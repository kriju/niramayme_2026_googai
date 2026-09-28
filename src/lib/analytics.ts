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
  // Gating *whether we load this script at all* behind the cookie banner
  // isn't the same thing as telling Google's own Consent Mode the visitor
  // granted analytics consent — without this explicit signal, gtag.js can
  // still default analytics_storage to denied and silently drop every hit
  // even though the tag itself initializes fine. We only ever reach this
  // line after the visitor has actually granted consent, so it's safe to
  // declare that upfront rather than leaving it unset.
  // This property has a linked Google tag (GTM-style container) rather
  // than a bare gtag.js install, which holds every hit until it sees a
  // complete Consent Mode v2 state — sending analytics_storage alone
  // still left the tag waiting on the other three, so all four are set
  // explicitly (we don't do ads/personalization, hence denied for those).
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
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
  // Accepting the banner doesn't change the route, so the route-change
  // effect that normally calls trackPageview won't fire on its own here —
  // without this, GA would never see a single hit until the next navigation.
  trackPageview(window.location.pathname);
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
