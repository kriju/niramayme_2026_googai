import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireBlogAdmin } from "./_lib/blogAuth.js";

// Wildcards rather than an enumerated list — browsers/OSes are inconsistent
// about the exact MIME subtype for a given file (an .m4a recording, for
// instance, can show up as audio/mp4, audio/x-m4a, or audio/aac depending
// on where it came from), so matching only a hand-picked list of subtypes
// silently rejects real image/audio files with no useful way to predict
// which ones in advance.
const ALLOWED_CONTENT_TYPES = ["image/*", "audio/*"];

// Authorizes a client-side upload to Vercel Blob (see the upload() call in
// WriteDashboard, src/App.tsx). The browser never gets a write token
// directly — it asks this route for one, and this is where the actual
// "are you really Richa or Riju" check happens, via the Firebase ID token
// the client sends as clientPayload.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body as HandleUploadBody;
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        await requireBlogAdmin(clientPayload ? `Bearer ${clientPayload}` : undefined);
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          addRandomSuffix: true,
          // Keep in sync with MAX_UPLOAD_BYTES in src/pages/WritePage.tsx.
          // iPhone Voice Memos in Lossless mode run ~5 MB per minute, so the
          // old 25 MB cap rejected anything past about five minutes.
          maximumSizeInBytes: 200 * 1024 * 1024,
        };
      },
      // Vercel Blob calls this asynchronously once the upload finishes; the
      // browser's own upload() call already has the blob URL by then and
      // writes it straight into the post's Firestore doc (itself gated by
      // firestore.rules' isBlogAdmin()), so there's no bookkeeping to do
      // here.
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error("blog-upload failed:", error);
    // The client SDK surfaces this message directly, and the webhook retries
    // on non-200s — 400 here means "rejected", not "try again".
    return res.status(400).json({ error: (error as Error).message });
  }
}
