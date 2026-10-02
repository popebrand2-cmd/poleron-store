import { stat } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { uploadsDir } from "@/lib/storage";

export type GarmentBox = { x: number; y: number; w: number; h: number };

const cache = new Map<string, GarmentBox | null>();

// Where the garment sits inside its product photo (fractions 0-1 of the photo), found from a small copy of
// the image: the transparent area, or failing that everything that is not paper-white. Cached in memory.
export async function garmentBox(url: string): Promise<GarmentBox | null> {
  const m = /^\/uploads\/([A-Za-z0-9._-]+)$/.exec(url);
  if (!m) return null;
  const file = path.join(uploadsDir(), m[1]);
  let mtime = 0;
  try {
    mtime = (await stat(file)).mtimeMs;
  } catch {
    return null;
  }
  const key = `${m[1]}:${mtime}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  let box: GarmentBox | null = null;
  try {
    const { data, info } = await sharp(file).resize({ width: 300, withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;
    const transparent = [0, W - 1, (H - 1) * W, W * H - 1].some((i) => data[i * 4 + 3] < 200);
    let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const solid = data[i + 3] > 40 && (transparent || Math.min(data[i], data[i + 1], data[i + 2]) < 246);
        if (!solid) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 >= 0 && x1 - x0 > W * 0.1 && y1 - y0 > H * 0.1) box = { x: x0 / W, y: y0 / H, w: (x1 - x0 + 1) / W, h: (y1 - y0 + 1) / H };
  } catch {
    box = null;
  }
  cache.set(key, box);
  return box;
}
