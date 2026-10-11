import sharp from "sharp";

// Phone cameras hand out 15-25 MB photos and 6000+ px images; a print needs far less (4096 px on the long side is ~340 dpi on a
// 30 cm print). This re-encodes a PNG/JPEG/WEBP keeping its format, its transparency and its proportions, and only caps the size
// of huge pictures. It returns the new bytes only when they are really smaller; anything unexpected returns null (keep the
// original).
export const MAX_SIDE = 4096;
export const SHRINK_MIN_BYTES = 1.5 * 1024 * 1024;

export async function shrinkImage(input: Buffer, ext: string): Promise<Buffer | null> {
  const kind = ext.toLowerCase().replace(".", "");
  if (kind !== "png" && kind !== "jpg" && kind !== "jpeg" && kind !== "webp") return null;
  try {
    const meta = await sharp(input).metadata();
    if (!meta.width || !meta.height) return null;
    // Animated images (gif/webp) are left alone.
    if ((meta.pages ?? 1) > 1) return null;
    const needsResize = Math.max(meta.width, meta.height) > MAX_SIDE;
    // .rotate() applies the camera's orientation tag and drops it, so the picture looks the same everywhere.
    let img = sharp(input, { failOn: "none" }).rotate();
    if (needsResize) img = img.resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    let out: Buffer;
    if (kind === "png") out = await img.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    else if (kind === "webp") out = await img.webp({ quality: 92, alphaQuality: 100 }).toBuffer();
    else out = await img.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    // Worth it only if it saves at least 10%.
    return out.byteLength < input.byteLength * 0.9 ? out : null;
  } catch {
    return null;
  }
}
