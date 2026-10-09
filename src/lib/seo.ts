import { useEffect } from "react";

export { SITE_URL, BUSINESS_JSONLD_ID } from "./structuredData";

// Injects/updates a <script type="application/ld+json"> tag in <head>, keyed
// by id. Structured data must match what's actually visible on the page (a
// Google Search Central requirement), so callers should build `data` from
// the same state a section renders from, and pass null while that data
// (e.g. approved reviews) hasn't loaded yet rather than emitting a stub.
export function useJsonLd(id: string, data: object | null) {
  useEffect(() => {
    if (!data) return;
    let script = document.getElementById(id) as HTMLScriptElement | null;
    const created = !script;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => {
      if (created) script?.remove();
    };
  }, [id, data]);
}

// Updates the page's <title>, description/OG/Twitter meta tags, and
// canonical link in place (they already exist as static defaults in
// index.html) so each route carries its own accurate metadata instead of
// every URL sharing the homepage's.
export function useSeo({ title, description, canonical, lang, alternates }: {
  title: string;
  description: string;
  canonical: string;
  // EN/DE alternate URLs for this same page, so Google can offer the
  // right language version instead of only ever surfacing English. Every
  // page that has one should pass both, including the English version of
  // itself (self-referencing hreflang is required, not optional).
  lang: "EN" | "DE";
  alternates?: { en: string; de: string };
}) {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, attr: string, attrValue: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonical);
    setMeta('meta[property="og:locale"]', "property", "og:locale", lang === "EN" ? "en_US" : "de_DE");
    setMeta('meta[property="og:locale:alternate"]', "property", "og:locale:alternate", lang === "EN" ? "de_DE" : "en_US");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    const setLink = (rel: string, href: string, hreflang?: string) => {
      const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
      let link = document.querySelector(selector) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        if (hreflang) link.setAttribute("hreflang", hreflang);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    };
    setLink("canonical", canonical);
    if (alternates) {
      setLink("alternate", alternates.en, "en");
      setLink("alternate", alternates.de, "de");
      // English is the un-prefixed, originally-indexed version, so it's the
      // fallback for a visitor whose language isn't explicitly EN or DE.
      setLink("alternate", alternates.en, "x-default");
    } else {
      // A page with no other-language version (e.g. a blog post that was
      // never translated) mustn't keep the previous page's alternates, nor
      // the homepage ones index.html starts with.
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => link.remove());
    }
  }, [title, description, canonical, lang, alternates?.en, alternates?.de]);
}

// Keeps a page out of search results (robots noindex) while `active`, e.g.
// the admin tool, or a placeholder that only points to another URL.
export function useNoIndex(active = true) {
  useEffect(() => {
    if (!active) return;
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      if (created) meta?.remove();
      else meta?.setAttribute("content", "index, follow");
    };
  }, [active]);
}
