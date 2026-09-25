// Smaller copy of an image for cards and thumbnails: Next's image optimizer resizes and re-encodes it
// (WebP/AVIF when the browser supports it), which cuts a ~200 KB poster to ~15–30 KB. Widths must be
// one of Next's standard sizes. Anything that isn't a site-relative path is returned untouched.
export function thumb(url: string, width: 256 | 384 | 640 = 384): string {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.startsWith("/_next/")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=72`;
}
