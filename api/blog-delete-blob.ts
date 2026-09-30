import type { VercelRequest, VercelResponse } from "@vercel/node";
import { del } from "@vercel/blob";
import { requireBlogAdmin } from "./_lib/blogAuth.js";

// Deleting a blob needs the store's write token, which only ever lives on
// the server, so this can't be done from the browser directly — called when
// WriteDashboard deletes a post that had an image/audio file.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await requireBlogAdmin(req.headers.authorization);
    const url = typeof req.body?.url === "string" ? req.body.url : null;
    if (!url || !url.includes(".public.blob.vercel-storage.com/")) {
      return res.status(400).json({ error: "Invalid url" });
    }
    // Previews mirror the live posts (scripts/sync-preview-content.ts) and
    // share the live Blob store, so deleting a mirrored post on a preview
    // must leave its media alone — only files uploaded from a preview (see
    // WritePage) may be removed there.
    if (process.env.VERCEL_ENV === "preview" && !new URL(url).pathname.startsWith("/preview/")) {
      return res.status(200).json({ ok: true, skipped: "production media is never deleted from a preview" });
    }
    await del(url);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("blog-delete-blob failed:", error);
    return res.status(400).json({ error: (error as Error).message });
  }
}
