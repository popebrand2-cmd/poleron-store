// Shared by remove-white-bg.ts, remove-color-bg.ts and segment-subject.ts:
// after making the background transparent, the canvas is still the full
// original size — lots of wasted transparent padding around the actual
// artwork. That padding isn't just visual clutter: it also throws off the
// real-world cm size the customer sees (it measures the whole padded box,
// not the actual printed content). Crop to the bounding box of non-
// transparent pixels so the exported image matches its visible content.
export function cropToOpaqueBounds(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;

  // Ignore near-fully-transparent pixels (anti-aliased fade edge) so a
  // faint fringe doesn't stretch the crop back out to the original size.
  const ALPHA_THRESHOLD = 10;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Nothing survived (fully transparent result) — return as-is rather than
  // producing a zero-size canvas.
  if (maxX < minX || maxY < minY) return canvas;

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  if (minX === 0 && minY === 0 && cropWidth === width && cropHeight === height) return canvas;

  const cropped = document.createElement("canvas");
  cropped.width = cropWidth;
  cropped.height = cropHeight;
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) return canvas;
  croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return cropped;
}
