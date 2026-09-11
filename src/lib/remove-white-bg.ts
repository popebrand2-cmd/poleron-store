// Makes near-white pixels transparent, entirely in the browser (no external
// API, no cost). Works well for logos/designs exported on a plain white
// background; a soft threshold band avoids a hard jagged edge on
// anti-aliased artwork.
export async function removeWhiteBackground(imageUrl: string): Promise<Blob> {
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

  const FULLY_TRANSPARENT_AT = 245; // channels at/above this -> alpha 0
  const FULLY_OPAQUE_BELOW = 195; // channels at/below this -> untouched

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minChannel = Math.min(r, g, b);

    if (minChannel >= FULLY_TRANSPARENT_AT) {
      data[i + 3] = 0;
    } else if (minChannel > FULLY_OPAQUE_BELOW) {
      const fade = (FULLY_TRANSPARENT_AT - minChannel) / (FULLY_TRANSPARENT_AT - FULLY_OPAQUE_BELOW);
      data[i + 3] = Math.round(data[i + 3] * (1 - fade));
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar la imagen procesada."));
    }, "image/png");
  });
}
