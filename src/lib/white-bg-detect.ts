// Samples an image's edges to guess whether it still has an opaque, near-white background (i.e.
// the customer hasn't removed it). Used to warn/block a white-background design on a white
// garment, where a print would come out essentially invisible. Cheap: only reads a handful of
// pixels, not the whole image.
export async function looksLikeOpaqueWhiteBackground(imageUrl: string): Promise<boolean> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("load failed"));
      img.src = imageUrl;
    });
  } catch {
    return false; // can't tell — don't block on a guess
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return false;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0);

  // A margin in from each edge — the very corner of a real photo can be noisy/rounded.
  const mx = Math.max(1, Math.round(w * 0.03));
  const my = Math.max(1, Math.round(h * 0.03));
  const points: [number, number][] = [
    [mx, my],
    [w - mx, my],
    [mx, h - my],
    [w - mx, h - my],
    [Math.round(w / 2), my],
    [mx, Math.round(h / 2)],
  ];

  let opaqueWhiteCount = 0;
  for (const [x, y] of points) {
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(x, y, 1, 1).data;
    } catch {
      return false; // tainted canvas or similar — can't sample, don't block
    }
    const [r, g, b, a] = data;
    if (a > 240 && r > 235 && g > 235 && b > 235) opaqueWhiteCount++;
  }
  // Require every sampled edge point to be opaque near-white — a design that's already been
  // background-removed will have transparency (a low alpha) at most/all of these points.
  return opaqueWhiteCount === points.length;
}

export function isNearWhiteHex(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r > 225 && g > 225 && b > 225;
}
