// Browser-side image helpers for the admin design studio. Everything runs on the owner's machine
// (canvas), so nothing is uploaded until the design is published.

const MAX_SIDE = 4096;

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen."))), "image/png"));
}

// Average color of the four corners — for an AI/ChatGPT design on a flat background that IS the background.
export async function cornerColor(url: string): Promise<{ r: number; g: number; b: number; transparent: boolean }> {
  const img = await loadImage(url);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(img, 0, 0);
  const n = 6;
  const spots = [
    [0, 0],
    [c.width - n, 0],
    [0, c.height - n],
    [c.width - n, c.height - n],
  ];
  let r = 0, g = 0, b = 0, a = 0, count = 0;
  for (const [x, y] of spots) {
    const d = ctx.getImageData(Math.max(0, x), Math.max(0, y), n, n).data;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; count++;
    }
  }
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count), transparent: a / count < 40 };
}

// Doubles small images (up to MAX_SIDE) with smooth resampling, then applies an unsharp mask to the
// color channels so edges and fine lines look crisp when printed. Alpha is left untouched.
export async function enhanceImage(url: string, onlyIfSmall = false): Promise<Blob> {
  const img = await loadImage(url);
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(2, MAX_SIDE / longest);
  if (onlyIfSmall && scale <= 1) throw new Error("La imagen ya es muy grande.");
  const w = Math.max(1, Math.round(img.naturalWidth * Math.max(1, scale)));
  const h = Math.max(1, Math.round(img.naturalHeight * Math.max(1, scale)));

  const base = document.createElement("canvas");
  base.width = w;
  base.height = h;
  const bctx = base.getContext("2d", { willReadFrequently: true });
  if (!bctx) throw new Error("No se pudo procesar la imagen.");
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(img, 0, 0, w, h);

  const blurred = document.createElement("canvas");
  blurred.width = w;
  blurred.height = h;
  const blctx = blurred.getContext("2d", { willReadFrequently: true });
  if (!blctx) throw new Error("No se pudo procesar la imagen.");
  blctx.filter = `blur(${Math.max(1, w / 1400).toFixed(2)}px)`;
  blctx.drawImage(base, 0, 0);

  const src = bctx.getImageData(0, 0, w, h);
  const blur = blctx.getImageData(0, 0, w, h).data;
  const d = src.data;
  const amount = 0.9;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    for (let k = 0; k < 3; k++) {
      const v = d[i + k] + amount * (d[i + k] - blur[i + k]);
      d[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  bctx.putImageData(src, 0, 0);
  return canvasToBlob(base);
}

export async function imageSize(url: string): Promise<{ w: number; h: number }> {
  const img = await loadImage(url);
  return { w: img.naturalWidth, h: img.naturalHeight };
}
