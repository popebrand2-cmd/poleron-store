// Piecewise-affine image warp: bends a flat source image onto an arbitrary
// destination shape by mapping a grid of control points, triangle by
// triangle. This is what lets the garment mockup follow a body's shoulders
// and torso instead of sitting on top of the photo as a flat rectangle.
export type Point = { x: number; y: number };

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  s0: Point,
  s1: Point,
  s2: Point,
  d0: Point,
  d1: Point,
  d2: Point,
) {
  const denom = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  if (Math.abs(denom) < 1e-6) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d0.x, d0.y);
  ctx.lineTo(d1.x, d1.y);
  ctx.lineTo(d2.x, d2.y);
  ctx.closePath();
  ctx.clip();

  // Affine matrix [a c e; b d f] solved from the source->dest triangle pair.
  const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
  const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
  const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom;
  const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom;
  const e =
    (d0.x * (s1.x * s2.y - s2.x * s1.y) +
      d1.x * (s2.x * s0.y - s0.x * s2.y) +
      d2.x * (s0.x * s1.y - s1.x * s0.y)) /
    denom;
  const f =
    (d0.y * (s1.x * s2.y - s2.x * s1.y) +
      d1.y * (s2.x * s0.y - s0.x * s2.y) +
      d2.y * (s0.x * s1.y - s1.x * s0.y)) /
    denom;

  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

// srcGrid/dstGrid: same-shaped rows x cols arrays of control points. Each
// grid cell (quad) is split into two triangles and warped independently.
export function warpMeshImage(
  img: CanvasImageSource,
  srcGrid: Point[][],
  dstGrid: Point[][],
  outWidth: number,
  outHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(outWidth));
  canvas.height = Math.max(1, Math.round(outHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const rows = srcGrid.length;
  const cols = rows > 0 ? srcGrid[0].length : 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const s00 = srcGrid[r][c];
      const s10 = srcGrid[r][c + 1];
      const s01 = srcGrid[r + 1][c];
      const s11 = srcGrid[r + 1][c + 1];
      const d00 = dstGrid[r][c];
      const d10 = dstGrid[r][c + 1];
      const d01 = dstGrid[r + 1][c];
      const d11 = dstGrid[r + 1][c + 1];
      drawTriangle(ctx, img, s00, s10, s01, d00, d10, d01);
      drawTriangle(ctx, img, s10, s11, s01, d10, d11, d01);
    }
  }
  return canvas;
}
