// Isolates the main subject (person, pet, object) from a photo with a real,
// complex background — unlike remove-white-bg.ts / remove-color-bg.ts, which
// only handle flat-color backgrounds. Runs a small U2Net-portable model
// (u2netp, Apache-2.0 licensed weights — see README) entirely client-side
// via onnxruntime-web (MIT), so there's no per-image cost and no photo ever
// leaves the customer's browser. The model + WASM runtime (~16MB total) are
// only fetched the first time this feature is used, then cached by the
// browser.
import * as ort from "onnxruntime-web";

const MODEL_SIZE = 320;
const MODEL_URL = "/models/u2netp.onnx";
// ImageNet normalization — what this model was trained/exported with.
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function getSession() {
  if (!sessionPromise) {
    ort.env.wasm.wasmPaths = "/ort/";
    // Force single-threaded: the multi-threaded WASM build needs
    // SharedArrayBuffer, which needs COOP/COEP response headers we don't
    // set site-wide (they'd risk breaking other cross-origin resources).
    ort.env.wasm.numThreads = 1;
    sessionPromise = ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
  }
  return sessionPromise;
}

// Kicks off loading the model/runtime early (e.g. as soon as the customer
// opens the upload UI) so it's likely ready by the time they click the
// button — safe to call multiple times, only fetches once.
export function preloadSubjectSegmenter() {
  getSession().catch(() => {
    // Ignore — segmentSubject() will surface the real error when used.
  });
}

export async function segmentSubject(imageUrl: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para procesarla."));
    img.src = imageUrl;
  });

  const fullWidth = img.naturalWidth;
  const fullHeight = img.naturalHeight;

  // 1. Resize to the model's fixed 320x320 input and normalize to a CHW
  // float32 tensor.
  const inputCanvas = document.createElement("canvas");
  inputCanvas.width = MODEL_SIZE;
  inputCanvas.height = MODEL_SIZE;
  const inputCtx = inputCanvas.getContext("2d");
  if (!inputCtx) throw new Error("No se pudo procesar la imagen.");
  inputCtx.drawImage(img, 0, 0, MODEL_SIZE, MODEL_SIZE);
  const inputPixels = inputCtx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;

  const plane = MODEL_SIZE * MODEL_SIZE;
  const chw = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    chw[i] = (inputPixels[i * 4] / 255 - MEAN[0]) / STD[0];
    chw[plane + i] = (inputPixels[i * 4 + 1] / 255 - MEAN[1]) / STD[1];
    chw[plane * 2 + i] = (inputPixels[i * 4 + 2] / 255 - MEAN[2]) / STD[2];
  }

  // 2. Run inference.
  const session = await getSession();
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const tensor = new ort.Tensor("float32", chw, [1, 3, MODEL_SIZE, MODEL_SIZE]);
  const results = await session.run({ [inputName]: tensor });
  const maskData = results[outputName].data as Float32Array;

  // 3. The raw output is a saliency map, not yet 0-1 — min-max normalize it.
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < maskData.length; i++) {
    if (maskData[i] < min) min = maskData[i];
    if (maskData[i] > max) max = maskData[i];
  }
  const range = max - min || 1;

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = MODEL_SIZE;
  maskCanvas.height = MODEL_SIZE;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) throw new Error("No se pudo procesar la imagen.");
  const maskImageData = maskCtx.createImageData(MODEL_SIZE, MODEL_SIZE);
  for (let i = 0; i < plane; i++) {
    const v = Math.round(((maskData[i] - min) / range) * 255);
    maskImageData.data[i * 4] = v;
    maskImageData.data[i * 4 + 1] = v;
    maskImageData.data[i * 4 + 2] = v;
    maskImageData.data[i * 4 + 3] = 255;
  }
  maskCtx.putImageData(maskImageData, 0, 0);

  // 4. Upscale the 320x320 mask to the original resolution (letting canvas
  // do smooth interpolation) and use it as the alpha channel over the
  // original full-res image.
  const upscaledMaskCanvas = document.createElement("canvas");
  upscaledMaskCanvas.width = fullWidth;
  upscaledMaskCanvas.height = fullHeight;
  const upscaledCtx = upscaledMaskCanvas.getContext("2d");
  if (!upscaledCtx) throw new Error("No se pudo procesar la imagen.");
  upscaledCtx.imageSmoothingEnabled = true;
  upscaledCtx.drawImage(maskCanvas, 0, 0, fullWidth, fullHeight);
  const upscaledMask = upscaledCtx.getImageData(0, 0, fullWidth, fullHeight).data;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = fullWidth;
  outCanvas.height = fullHeight;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) throw new Error("No se pudo procesar la imagen.");
  outCtx.drawImage(img, 0, 0, fullWidth, fullHeight);
  const outImageData = outCtx.getImageData(0, 0, fullWidth, fullHeight);
  for (let i = 0; i < outImageData.data.length / 4; i++) {
    outImageData.data[i * 4 + 3] = upscaledMask[i * 4];
  }
  outCtx.putImageData(outImageData, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    outCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar la imagen procesada."));
    }, "image/png");
  });
}
