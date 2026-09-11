import { cropToOpaqueBounds } from "./crop-transparent";

// Generalized version of remove-white-bg.ts's technique: makes pixels near
// a given target color transparent, entirely in the browser. Works for any
// solid background color (black, a brand color, etc.), not just white — the
// customer picks the color by clicking on it.
export async function removeColorBackground(
  imageUrl: string,
  target: { r: number; g: number; b: number },
  tolerance = 40,
): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para procesarla."));
    img.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Euclidean distance in RGB space to the picked color. Fully transparent
  // within `tolerance`, then a soft fade band so anti-aliased edges don't
  // get a hard jagged cutoff.
  const FADE_BAND = tolerance * 0.5;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - target.r;
    const dg = data[i + 1] - target.g;
    const db = data[i + 2] - target.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    if (distance <= tolerance) {
      data[i + 3] = 0;
    } else if (distance < tolerance + FADE_BAND) {
      const fade = (tolerance + FADE_BAND - distance) / FADE_BAND;
      data[i + 3] = Math.round(data[i + 3] * (1 - fade));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const cropped = cropToOpaqueBounds(canvas);

  return new Promise<Blob>((resolve, reject) => {
    cropped.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar la imagen procesada."));
    }, "image/png");
  });
}
