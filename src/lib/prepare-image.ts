// Shrinks a customer's photo before it is uploaded: phones and design tools produce files of 5–15 MB
// and 6000+ px, far more than the ~30 cm print area needs (4096 px on the long side is ≈ 350 dpi at
// 30 cm). Smaller files upload faster on mobile data and use a fraction of the server's disk.
// Never blocks the upload: on any problem (or if the result isn't smaller) the original file is used.
const MAX_SIDE = 4096;
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;

export async function prepareImage(file: File): Promise<{ blob: Blob; type: string; name: string }> {
  const original = { blob: file as Blob, type: file.type, name: file.name || "diseno.png" };
  if (file.type === "image/svg+xml" || !/^image\/(png|jpeg|webp)$/.test(file.type)) return original;

  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("load"));
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return original;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return original;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const outType = file.type; // keep the format: PNG stays PNG so transparency is never lost
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outType, outType === "image/png" ? undefined : 0.92));
    if (!blob || blob.type !== outType || blob.size >= file.size) return original;
    return { blob, type: outType, name: original.name };
  } catch {
    return original;
  }
}
