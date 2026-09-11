import { warpMeshImage, type Point } from "./mesh-warp";
import type { BodyKeypoints } from "./pose-detect";

// Bends a flat garment product photo (front-facing, centered, some margin
// around it — the same kind of photo used for the store's own mockups) onto
// a detected body so it follows the shoulders/torso instead of floating on
// top as a flat rectangle. Heuristic, not a real cloth simulation: assumes
// a roughly-centered garment and estimates a 3x3 control grid on it
// (shoulder / waist / hem lines), then maps that grid onto the body's
// shoulder and hip keypoints.
export function fitGarmentToBody(
  garmentImg: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number },
  keypoints: BodyKeypoints,
  outWidth: number,
  outHeight: number,
): HTMLCanvasElement | null {
  const ls = keypoints.left_shoulder;
  const rs = keypoints.right_shoulder;
  if (!ls || !rs) return null;

  const garmentW = garmentImg.naturalWidth ?? garmentImg.width ?? 0;
  const garmentH = garmentImg.naturalHeight ?? garmentImg.height ?? 0;
  if (!garmentW || !garmentH) return null;

  // In a mirror-facing photo, MoveNet's "left" shoulder is the body's own
  // left, which appears on the viewer's right — doesn't matter here since
  // we only need the pair's midpoint and span, not which is which.
  const shoulderMidX = (ls.x + rs.x) / 2;
  const shoulderMidY = (ls.y + rs.y) / 2;
  const shoulderWidth = Math.abs(rs.x - ls.x);
  if (shoulderWidth < 4) return null;

  const lh = keypoints.left_hip;
  const rh = keypoints.right_hip;
  let hipMidY: number;
  let hipWidth: number;
  if (lh && rh) {
    hipMidY = (lh.y + rh.y) / 2;
    hipWidth = Math.abs(rh.x - lh.x);
  } else {
    // No hip detected (half-body photo) — estimate a plausible torso length.
    hipMidY = shoulderMidY + shoulderWidth * 1.5;
    hipWidth = shoulderWidth * 0.9;
  }

  const neckY = shoulderMidY - shoulderWidth * 0.15;
  const waistY = shoulderMidY + (hipMidY - shoulderMidY) * 0.5;
  const hemY = hipMidY + (hipMidY - shoulderMidY) * 0.35;

  const shoulderHalf = shoulderWidth / 2;
  const hipHalf = Math.max(hipWidth, shoulderWidth * 0.85) / 2;
  const waistHalf = (shoulderHalf + hipHalf) / 2;

  // Source control points: where the shoulder/waist/hem lines sit on the
  // flat garment photo, with a small margin since product photos rarely
  // fill the whole frame edge-to-edge.
  const srcGrid: Point[][] = [
    [
      { x: garmentW * 0.06, y: garmentH * 0.1 },
      { x: garmentW * 0.5, y: garmentH * 0.04 },
      { x: garmentW * 0.94, y: garmentH * 0.1 },
    ],
    [
      { x: garmentW * 0.03, y: garmentH * 0.55 },
      { x: garmentW * 0.5, y: garmentH * 0.55 },
      { x: garmentW * 0.97, y: garmentH * 0.55 },
    ],
    [
      { x: garmentW * 0.06, y: garmentH * 0.96 },
      { x: garmentW * 0.5, y: garmentH * 0.96 },
      { x: garmentW * 0.94, y: garmentH * 0.96 },
    ],
  ];

  const dstGrid: Point[][] = [
    [
      { x: shoulderMidX - shoulderHalf * 1.25, y: neckY },
      { x: shoulderMidX, y: neckY - shoulderWidth * 0.08 },
      { x: shoulderMidX + shoulderHalf * 1.25, y: neckY },
    ],
    [
      { x: shoulderMidX - waistHalf * 1.3, y: waistY },
      { x: shoulderMidX, y: waistY },
      { x: shoulderMidX + waistHalf * 1.3, y: waistY },
    ],
    [
      { x: shoulderMidX - hipHalf * 1.35, y: hemY },
      { x: shoulderMidX, y: hemY },
      { x: shoulderMidX + hipHalf * 1.35, y: hemY },
    ],
  ];

  return warpMeshImage(garmentImg, srcGrid, dstGrid, outWidth, outHeight);
}
