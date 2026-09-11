// Detects body keypoints (shoulders, hips, ...) in a customer's photo so we
// can warp the garment mockup to follow their body instead of pasting it as
// a flat rectangle. Runs entirely in the browser via TensorFlow.js MoveNet
// (Apache-2.0) — same "free while the site has no paying traffic" choice
// made for the other AI features (see remove-color-bg.ts / segment-subject.ts).
import type * as PoseDetectionNS from "@tensorflow-models/pose-detection";

export type BodyKeypointName =
  | "nose"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow"
  | "left_wrist"
  | "right_wrist"
  | "left_hip"
  | "right_hip";

export type BodyKeypoints = Partial<Record<BodyKeypointName, { x: number; y: number; score: number }>>;

let detectorPromise: Promise<PoseDetectionNS.PoseDetector> | null = null;

async function getDetector(): Promise<PoseDetectionNS.PoseDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const tf = await import("@tensorflow/tfjs-core");
      await import("@tensorflow/tfjs-converter");
      try {
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
      } catch {
        await import("@tensorflow/tfjs-backend-cpu");
        await tf.setBackend("cpu");
      }
      await tf.ready();
      const poseDetection = await import("@tensorflow-models/pose-detection");
      return poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
    })();
  }
  return detectorPromise;
}

// Kicks off model loading ahead of time so the first real detection is fast.
// Safe to call multiple times; failures are swallowed (falls back later).
export function preloadPoseDetector() {
  getDetector().catch(() => {});
}

const MIN_SCORE = 0.3;

export async function detectBodyKeypoints(
  input: HTMLImageElement | HTMLCanvasElement,
): Promise<BodyKeypoints | null> {
  const detector = await getDetector();
  const poses = await detector.estimatePoses(input, { flipHorizontal: false });
  const pose = poses[0];
  if (!pose) return null;

  const out: BodyKeypoints = {};
  for (const kp of pose.keypoints) {
    const name = kp.name as BodyKeypointName | undefined;
    if (name && kp.score !== undefined && kp.score >= MIN_SCORE) {
      out[name] = { x: kp.x, y: kp.y, score: kp.score };
    }
  }
  return out.left_shoulder && out.right_shoulder ? out : null;
}
