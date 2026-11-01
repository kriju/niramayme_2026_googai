import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireBlogAdmin } from "./_lib/blogAuth.js";

// DeepL's two API tiers live at different hosts; a free-tier key is always
// suffixed ":fx", so that's the only reliable way to tell which one a given
// DEEPL_API_KEY belongs to.
function deeplApiBase(apiKey: string): string {
  return apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
}

interface DeeplResponse {
  translations: { text: string }[];
}

// Machine-translates a blog post's title/excerpt/content from English to
// German. This is assisted, not automatic publishing — WriteDashboard drops
// the result into a brand-new (unsaved) German draft for Richa/Riju to
// review and edit before it's ever saved, let alone published.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireBlogAdmin(req.headers.authorization);

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      throw new Error("Translation is not configured (missing DEEPL_API_KEY).");
    }

    // Courses (admin course editor) send a list of texts instead: every
    // field of the course page in one request, translated in place.
    const list = Array.isArray(req.body?.texts)
      ? (req.body.texts as unknown[]).slice(0, 100).map((t) => (typeof t === "string" ? t.slice(0, 5000) : ""))
      : null;
    const title = typeof req.body?.title === "string" ? req.body.title : "";
    const excerpt = typeof req.body?.excerpt === "string" ? req.body.excerpt : "";
    const content = typeof req.body?.content === "string" ? req.body.content : "";
    if (list ? !list.some((t) => t.trim()) : !title.trim() && !content.trim()) {
      return res.status(400).json({ error: "Nothing to translate" });
    }

    // DeepL keeps each array entry as its own translation unit, so title,
    // excerpt and content go over in one request rather than three.
    const texts = list ?? [title, excerpt, content];
    const response = await fetch(`${deeplApiBase(apiKey)}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: texts,
        source_lang: "EN",
        target_lang: "DE",
        // Posts use a hand-rolled convention (## headings, **bold**, *italic*,
        // - bullets, newlines as paragraph breaks) rather than real
        // markup — preserve_formatting keeps DeepL from collapsing those
        // newlines, and plain "text" mode (the default) leaves the ##/**/*
        // markers alone since they're not XML/HTML tags.
        preserve_formatting: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`DeepL request failed (${response.status}): ${errBody}`);
    }

    const data = (await response.json()) as DeeplResponse;
    if (list) return res.status(200).json({ texts: data.translations.map(t => t.text) });
    const [translatedTitle, translatedExcerpt, translatedContent] = data.translations.map(t => t.text);

    return res.status(200).json({
      title: translatedTitle ?? "",
      excerpt: translatedExcerpt ?? "",
      content: translatedContent ?? "",
    });
  } catch (error) {
    console.error("translate-post failed:", error);
    return res.status(400).json({ error: (error as Error).message });
  }
}
