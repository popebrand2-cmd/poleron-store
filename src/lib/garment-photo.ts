// Product photos of the owner's uploads go through /api/garment-photo (white background removed, blacks deepened)
// wherever they are shown on the collection cards. Anything else (site images, finished mockups) is left as is.
// Bump `v` to refresh browser/CDN caches when the cleaning changes.
export function garmentPhoto(url: string): string {
  const m = /^\/uploads\/([A-Za-z0-9._-]+\.(?:png|jpe?g|webp))$/i.exec(url);
  return m ? `/api/garment-photo?f=${m[1]}&v=2` : url;
}
