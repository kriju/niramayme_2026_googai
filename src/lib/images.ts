// Blog covers are uploaded straight from the writer's phone to Vercel Blob,
// so the originals are often several megabytes at 4000px+ wide — the single
// biggest cost of a blog post's LCP on mobile. Vercel's image optimizer
// (configured under "images" in vercel.json) resizes and re-encodes them to
// WebP on the fly. Keep the widths in sync with images.sizes there and the
// copy of this logic in api/blog-share.ts. The Blob store host is pinned
// to match images.remotePatterns there; the optimizer rejects any other.
export const IMAGE_WIDTHS = [640, 1080, 1600] as const;

// Only formats the optimizer can read; HEIC etc. are served as-is. Dev
// (vite) has no /_vercel/image endpoint, so it always gets the original.
function canOptimize(src: string | undefined): src is string {
  return (
    import.meta.env.PROD &&
    !!src &&
    /^https:\/\/cvouvjnsr5c8g0or\.public\.blob\.vercel-storage\.com\//.test(src) &&
    /\.(jpe?g|png|webp)(\?|$)/i.test(src)
  );
}

const optimizedUrl = (src: string, width: number) =>
  `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;

// src/srcSet props for an <img>; pass `sizes` alongside srcSet.
export function responsiveImage(src: string, maxWidth: number = IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]) {
  if (!canOptimize(src)) return { src };
  const widths = IMAGE_WIDTHS.filter(w => w <= maxWidth);
  return {
    src: optimizedUrl(src, widths[widths.length - 1]),
    srcSet: widths.map(w => `${optimizedUrl(src, w)} ${w}w`).join(", "),
  };
}
