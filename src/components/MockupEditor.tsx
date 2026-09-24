"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as fabric from "fabric";
import type { ViewPlacement } from "@/types";
import { removeColorBackground } from "@/lib/remove-color-bg";
import { segmentSubject, preloadSubjectSegmenter } from "@/lib/segment-subject";
import { zoneScaleFactor, type SizeMeasurements } from "@/lib/size-scale";
import { prepareImage } from "@/lib/prepare-image";
import { isNearWhiteHex, looksLikeOpaqueWhiteBackground } from "@/lib/white-bg-detect";

export type PresetPosition = "left" | "center" | "right";

// Error messages we throw ourselves are always plain `Error`s with a Spanish, actionable message
// (e.g. "El archivo supera los 15MB."). Anything else — a native DOMException from the browser's
// canvas/File/URL machinery, which comes out in English and means nothing to a customer — falls
// back to `fallback` instead of being shown raw. This is what was leaking messages like "The
// string did not match the expected pattern." (a WebKit-only error) straight into the UI.
function friendlyMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.name === "Error" && e.message) return e.message;
  return fallback;
}

// Tries one way of POSTing the file to /api/upload and either returns the saved URL or throws
// a descriptive Error (status code + a snippet of whatever came back, when it isn't the JSON we
// expect) — so a failure is diagnosable from the on-screen message instead of a dead end.
async function tryUpload(body: BodyInit, headers: Record<string, string>): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let res: Response;
  try {
    res = await fetch("/api/upload", { method: "POST", headers, body, signal: controller.signal });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "AbortError";
    throw new Error(timedOut ? "La subida tardó demasiado. Revisa tu conexión e intenta de nuevo." : friendlyMessage(e, "No se pudo conectar para subir el archivo."));
  } finally {
    clearTimeout(timer);
  }
  const rawText = await res.text().catch(() => "");
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  let data: { url?: string; error?: string } = {};
  if (isJson) {
    try {
      data = JSON.parse(rawText);
    } catch {
      // fall through: data stays {}, the raw text below still gets shown
    }
  }
  if (!res.ok || !data.url) {
    if (data.error) throw new Error(data.error);
    const snippet = rawText.slice(0, 80).replace(/\s+/g, " ").trim();
    throw new Error(`No se pudo subir el archivo (código ${res.status}${snippet ? `: ${snippet}` : ""}).`);
  }
  return data.url;
}

// Uploads a file/blob, trying two different kinds of request in turn. The primary one sends the
// raw bytes as the POST body (Content-Type: the image's MIME type, no FormData/multipart) — this
// is what fixed the WebKit bug ("The string did not match the expected pattern.") that restricted
// in-app browsers (Instagram, Facebook, TikTok — all WKWebView on iOS) hit building a multipart
// request's Content-Disposition header. If that still fails — e.g. the in-app browser's own
// network layer mishandles a bare binary POST differently — falling back to ordinary
// multipart/form-data (what every browser uses for a normal <input type=file> form) is a
// completely different code path that may get through where the first one didn't.
async function uploadBlob(blob: Blob, mimeType: string, filename: string): Promise<string> {
  try {
    return await tryUpload(blob, { "Content-Type": mimeType });
  } catch (first) {
    try {
      const form = new FormData();
      form.append("file", new File([blob], filename, { type: mimeType }));
      return await tryUpload(form, {});
    } catch (second) {
      // Neither request made it through — report the first (primary) failure; it's the one that
      // matters if this keeps happening, since it's the one used on every normal upload.
      throw new Error(friendlyMessage(second, friendlyMessage(first, "No se pudo subir tu diseño. Revisa tu conexión e intenta de nuevo.")));
    }
  }
}

// Fixed placement recipes for preset (ready-made) designs — front designs
// let the customer choose which of these three to use; back designs always
// use "back" with no choice, sitting just below the hood.
const PRESET_POSITIONS: Record<PresetPosition | "back", { xPct: number; yPct: number; widthPct: number }> = {
  left: { xPct: 28, yPct: 25, widthPct: 28 },
  center: { xPct: 50, yPct: 45, widthPct: 55 },
  right: { xPct: 72, yPct: 25, widthPct: 28 },
  back: { xPct: 50, yPct: 22, widthPct: 55 },
};

export type MockupEditorHandle = {
  getPlacement: () => Promise<ViewPlacement | null>;
  getSnapshot: () => string | null;
  applyPresetDesign: (url: string, position: PresetPosition | "back") => boolean;
  // True when the design still has an opaque white background AND the garment itself is white —
  // the print would be essentially invisible, so the caller should block checkout on this view.
  hasWhiteOnWhiteRisk: () => boolean;
};

// Fabric doesn't track "which of my objects is the design vs. the caption text" on its own, and
// canvas.toJSON()/loadFromJSON() (used for undo) only round-trip properties we explicitly ask for
// — this tiny tag is how both sides of undo re-identify each object after a reload.
type Role = "background" | "design" | "text";
function setRole(obj: fabric.FabricObject, role: Role) {
  (obj as unknown as { role?: Role }).role = role;
}
function getRole(obj: fabric.FabricObject): Role | undefined {
  return (obj as unknown as { role?: Role }).role;
}

export type MockupView = {
  label: string;
  imageUrl: string;
  allowRotate: boolean;
  zoneXPct: number;
  zoneYPct: number;
  zoneWidthPct: number;
  zoneHeightPct: number;
  maxWidthCm: number;
  maxHeightCm: number;
};

const CANVAS_MAX_WIDTH = 460;

// Secondary editor actions (crop, remove bg, add text, ...) — pill buttons
// in the site's black/neon-green brand line instead of plain text links.
const PILL_BTN =
  "rounded-full border-2 border-black bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-black transition hover:border-neon hover:bg-neon disabled:opacity-40 disabled:hover:border-black disabled:hover:bg-white";
const PILL_BTN_DANGER =
  "rounded-full border-2 border-red-600 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-40";

// Loaded via Google Fonts <link> in src/app/layout.tsx — every family here must also be in that URL.
const FONT_GROUPS: { title: string; fonts: { label: string; value: string }[] }[] = [
  {
    title: "POPE",
    fonts: [
      { label: "Teko", value: '"Teko", sans-serif' },
      { label: "Yellowtail", value: '"Yellowtail", cursive' },
    ],
  },
  {
    title: "Urbanas",
    fonts: [
      { label: "Bebas Neue", value: '"Bebas Neue", sans-serif' },
      { label: "Anton", value: '"Anton", sans-serif' },
      { label: "League Gothic", value: '"League Gothic", sans-serif' },
      { label: "Staatliches", value: '"Staatliches", sans-serif' },
      { label: "Big Shoulders", value: '"Big Shoulders Display", sans-serif' },
      { label: "Oswald", value: '"Oswald", sans-serif' },
      { label: "Russo One", value: '"Russo One", sans-serif' },
      { label: "Black Ops One", value: '"Black Ops One", sans-serif' },
      { label: "Bungee", value: '"Bungee", sans-serif' },
      { label: "Archivo Black", value: '"Archivo Black", sans-serif' },
      { label: "Alfa Slab One", value: '"Alfa Slab One", serif' },
      { label: "Rubik Mono", value: '"Rubik Mono One", sans-serif' },
    ],
  },
  {
    title: "Graffiti y a mano",
    fonts: [
      { label: "Permanent Marker", value: '"Permanent Marker", cursive' },
      { label: "Sedgwick Ave", value: '"Sedgwick Ave Display", cursive' },
      { label: "Rock Salt", value: '"Rock Salt", cursive' },
      { label: "Caveat Brush", value: '"Caveat Brush", cursive' },
      { label: "Covered By Your Grace", value: '"Covered By Your Grace", cursive' },
    ],
  },
  {
    title: "Gótica",
    fonts: [
      { label: "Unifraktur", value: '"UnifrakturCook", cursive' },
      { label: "Pirata One", value: '"Pirata One", cursive' },
      { label: "New Rocker", value: '"New Rocker", cursive' },
      { label: "Metal Mania", value: '"Metal Mania", cursive' },
    ],
  },
  {
    title: "Cursivas",
    fonts: [
      { label: "Pacifico", value: '"Pacifico", cursive' },
      { label: "Dancing Script", value: '"Dancing Script", cursive' },
      { label: "Lobster", value: '"Lobster", cursive' },
      { label: "Kaushan Script", value: '"Kaushan Script", cursive' },
      { label: "Sacramento", value: '"Sacramento", cursive' },
    ],
  },
  {
    title: "Retro y neón",
    fonts: [
      { label: "Monoton", value: '"Monoton", cursive' },
      { label: "Righteous", value: '"Righteous", sans-serif' },
      { label: "Press Start", value: '"Press Start 2P", monospace' },
    ],
  },
  {
    title: "Clásicas",
    fonts: [
      { label: "Arial", value: "Arial, sans-serif" },
      { label: "Poppins", value: '"Poppins", sans-serif' },
      { label: "Montserrat", value: '"Montserrat", sans-serif' },
      { label: "Playfair Display", value: '"Playfair Display", serif' },
      { label: "Abril Fatface", value: '"Abril Fatface", serif' },
      { label: "Roboto Mono", value: '"Roboto Mono", monospace' },
      { label: "Space Mono", value: '"Space Mono", monospace' },
    ],
  },
];
const FONT_OPTIONS = FONT_GROUPS.flatMap((g) => g.fonts);

// Quick text colours in the brand palette; the last swatch opens the full colour picker.
const TEXT_COLORS = ["#111111", "#FFFFFF", "#B6FF00", "#FF2D2D", "#2D6BFF", "#FFD400", "#FF4FD8", "#9B5CFF"];

type MockupEditorProps = {
  view: MockupView;
  // Fired once each time the customer adds a NEW design (upload or ready-made) — not when restoring one.
  onDesignAdded?: () => void;
  initialPlacement?: ViewPlacement | null;
  sizes?: SizeMeasurements[];
  selectedSizeLabel?: string;
  // The chosen garment color — used only to warn/block a white-background design on a white
  // garment, where the print would be invisible.
  colorHex?: string;
};

// Round 44px button that repeats while it is held down (nudging a design with a finger).
function PadButton({ label, onStep, children }: { label: string; onStep: () => void; children: React.ReactNode }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(onStep);
  stepRef.current = onStep;

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    if (interval.current) clearInterval(interval.current);
    timer.current = null;
    interval.current = null;
  }
  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        e.preventDefault();
        stepRef.current();
        stop();
        timer.current = setTimeout(() => {
          interval.current = setInterval(() => stepRef.current(), 70);
        }, 350);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          stepRef.current();
        }
      }}
      className="flex h-11 w-11 touch-none select-none items-center justify-center rounded-full border-2 border-black bg-white text-lg font-bold leading-none text-black transition active:bg-neon hover:border-neon hover:bg-neon"
    >
      {children}
    </button>
  );
}

const MockupEditor = forwardRef<MockupEditorHandle, MockupEditorProps>(
  function MockupEditor({ view, initialPlacement, onDesignAdded, sizes = [], selectedSizeLabel = "", colorHex = "" }, ref) {
    const isWhiteGarment = isNearWhiteHex(colorHex);
    const onDesignAddedRef = useRef(onDesignAdded);
    onDesignAddedRef.current = onDesignAdded;
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    // Measures the REAL available width (not the fixed CANVAS_MAX_WIDTH cap)
    // so the canvas shrinks to fit narrow/mobile viewports instead of
    // forcing the whole page to overflow horizontally.
    const wrapperRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    // The admin-defined MAXIMUM zone, in canvas px — fixed for the life of this editor.
    const maxZoneRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
    const designRef = useRef<fabric.FabricImage | null>(null);
    // The customer's raw uploaded file, before any processing (bg removal,
    // crop, flattening with text). Only set by handleUpload — the bg-removal
    // handlers swap designRef's image but deliberately leave this alone, so
    // admin can always download exactly what the customer submitted.
    const originalDesignUrlRef = useRef<string | null>(null);
    const textRef = useRef<fabric.IText | null>(null);
    const zoneIndicatorRef = useRef<fabric.Rect | null>(null);
    const initialPlacementRef = useRef(initialPlacement);
    const sizesRef = useRef(sizes);
    const selectedSizeLabelRef = useRef(selectedSizeLabel);
    sizesRef.current = sizes;
    selectedSizeLabelRef.current = selectedSizeLabel;
    const [hasDesign, setHasDesign] = useState(Boolean(initialPlacement));
    // Start fetching the AI model/runtime in the background as soon as
    // there's a design to run it on, so it's likely ready by the time the
    // customer clicks "Aislar sujeto (IA)".
    useEffect(() => {
      if (hasDesign) preloadSubjectSegmenter();
    }, [hasDesign]);
    const [hasText, setHasText] = useState(false);
    const [textColor, setTextColor] = useState("#111111");
    const [fontPanelOpen, setFontPanelOpen] = useState(false);
    const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
    const [uploading, setUploading] = useState(false);
    const [removingBg, setRemovingBg] = useState(false);
    const [segmentingSubject, setSegmentingSubject] = useState(false);
    const [pickingBgColor, setPickingBgColor] = useState(false);
    const pickingBgColorRef = useRef(false);
    pickingBgColorRef.current = pickingBgColor;
    const [cropping, setCropping] = useState(false);
    const [applyingCrop, setApplyingCrop] = useState(false);
    const cropRectRef = useRef<fabric.Rect | null>(null);
    // "Más herramientas" opens by itself as soon as the customer has a design (upload, ready-made or
    // restored), and can still be closed/opened by hand.
    const [toolsOpen, setToolsOpen] = useState(false);
    useEffect(() => {
      if (hasDesign) setToolsOpen(true);
    }, [hasDesign]);
    const [whiteRisk, setWhiteRisk] = useState(false);
    const whiteRiskRef = useRef(false);
    function refreshWhiteRisk(url: string) {
      if (!isWhiteGarment) {
        whiteRiskRef.current = false;
        setWhiteRisk(false);
        return;
      }
      looksLikeOpaqueWhiteBackground(url).then((risky) => {
        whiteRiskRef.current = risky;
        setWhiteRisk(risky);
      });
    }
    // Undo: a small stack of full-canvas JSON snapshots (fabric's own toJSON/loadFromJSON), taken
    // at each meaningful checkpoint — never mid-drag. "history[0]" is always the empty/starting
    // canvas, so undo can never leave the editor in a broken state.
    const historyRef = useRef<string[]>([]);
    const lastPushRef = useRef(0);
    const [canUndo, setCanUndo] = useState(false);
    const [undoing, setUndoing] = useState(false);
    function pushHistory(force = false) {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const now = Date.now();
      if (!force && now - lastPushRef.current < 350) return;
      lastPushRef.current = now;
      const json = JSON.stringify(canvas.toObject(["role"]));
      if (historyRef.current[historyRef.current.length - 1] === json) return;
      historyRef.current.push(json);
      if (historyRef.current.length > 30) historyRef.current.shift();
      setCanUndo(historyRef.current.length > 1);
    }
    function handleUndo() {
      const canvas = fabricCanvasRef.current;
      if (!canvas || historyRef.current.length <= 1 || undoing) return;
      setUndoing(true);
      historyRef.current.pop();
      const prevJson = historyRef.current[historyRef.current.length - 1];
      canvas.loadFromJSON(JSON.parse(prevJson)).then(() => {
        designRef.current = null;
        textRef.current = null;
        for (const obj of canvas.getObjects()) {
          const role = getRole(obj);
          if (role === "design") designRef.current = obj as fabric.FabricImage;
          else if (role === "text") textRef.current = obj as fabric.IText;
          else if (role === "background") obj.set({ selectable: false, evented: false });
        }
        setHasDesign(!!designRef.current);
        setHasText(!!textRef.current);
        setCanUndo(historyRef.current.length > 1);
        updateDesignBadge(null);
        if (designRef.current) refreshWhiteRisk(designRef.current.getSrc());
        else {
          whiteRiskRef.current = false;
          setWhiteRisk(false);
        }
        canvas.renderAll();
        setUndoing(false);
      });
    }
    const [error, setError] = useState("");
    // Live cm readout shown on the design/text's own selection box while
    // it's selected or being dragged/scaled — replaces the old fixed
    // dashed-rectangle guide. cm-per-canvas-px is constant for a view
    // (independent of talla — see the comment on updateDesignBadge below).
    const [designBadge, setDesignBadge] = useState<{ left: number; top: number; widthCm: number; heightCm: number } | null>(
      null,
    );

    function currentZoneRect() {
      const max = maxZoneRef.current;
      const zone = zoneIndicatorRef.current;
      const scaleX = zone?.scaleX ?? 1;
      const scaleY = zone?.scaleY ?? 1;
      return { left: max.left, top: max.top, width: max.width * scaleX, height: max.height * scaleY };
    }

    // The customer can place their design/text anywhere on the garment —
    // only its SIZE is capped, to the same real-world max the old fixed
    // zone represented (now invisible; currentZoneRect() still tracks it,
    // scaled per talla). Keeps aspect ratio: shrinks both axes by whichever
    // one is over the limit.
    function clampObjectToMaxSize(obj: fabric.FabricObject) {
      const zone = currentZoneRect();
      if (!zone.width || !zone.height) return;
      const w = obj.getScaledWidth();
      const h = obj.getScaledHeight();
      // Clamp each axis independently — NOT a single shared factor. A
      // shared factor coupled width and height together, so widening past
      // the width cap (e.g. dragging a side handle) also shrank the
      // height back down every frame, fighting the drag and making it
      // feel stuck even when that axis still had room to grow.
      const patch: Partial<fabric.FabricObject> = {};
      if (w > zone.width) patch.scaleX = (obj.scaleX ?? 1) * (zone.width / w);
      if (h > zone.height) patch.scaleY = (obj.scaleY ?? 1) * (zone.height / h);
      if (Object.keys(patch).length > 0) {
        obj.set(patch);
        obj.setCoords();
      }
    }

    // The talla-based scale factor grows the (invisible) max-print-area
    // and the real cm it represents by the same ratio, so canvas-px-to-cm
    // cancels it out — this ratio only depends on the admin's base (talla
    // M) zone, not on which talla is selected.
    function updateDesignBadge(obj: fabric.FabricObject | null) {
      if (!obj) {
        setDesignBadge(null);
        return;
      }
      const cmPerPxX = view.maxWidthCm / maxZoneRef.current.width;
      const cmPerPxY = view.maxHeightCm / maxZoneRef.current.height;
      const w = obj.getScaledWidth();
      const h = obj.getScaledHeight();
      const centerLeft = obj.left ?? 0;
      const centerTop = obj.top ?? 0;
      setDesignBadge({
        left: centerLeft + w / 2,
        top: centerTop + h / 2,
        widthCm: Math.round(w * cmPerPxX * 10) / 10,
        heightCm: Math.round(h * cmPerPxY * 10) / 10,
      });
    }

    useEffect(() => {
      let disposed = false;

      fabric.FabricImage.fromURL(view.imageUrl, { crossOrigin: "anonymous" }).then((bgImg) => {
        if (disposed || !canvasElRef.current) return;

        const naturalWidth = bgImg.width ?? 1;
        const naturalHeight = bgImg.height ?? 1;
        const availableWidth = wrapperRef.current?.clientWidth || CANVAS_MAX_WIDTH;
        const displayWidth = Math.min(CANVAS_MAX_WIDTH, naturalWidth, availableWidth);
        const scale = displayWidth / naturalWidth;
        const displayHeight = naturalHeight * scale;

        const canvas = new fabric.Canvas(canvasElRef.current, {
          width: displayWidth,
          height: displayHeight,
          selection: false,
        });
        fabricCanvasRef.current = canvas;

        bgImg.set({
          left: 0,
          top: 0,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });
        setRole(bgImg, "background");
        // Add as a regular object rather than canvas.backgroundImage — the
        // latter has had scaling/rendering bugs in fabric v6/v7.
        canvas.add(bgImg);

        const zoneLeft = (view.zoneXPct / 100) * displayWidth;
        const zoneTop = (view.zoneYPct / 100) * displayHeight;
        const zoneWidth = (view.zoneWidthPct / 100) * displayWidth;
        const zoneHeight = (view.zoneHeightPct / 100) * displayHeight;
        maxZoneRef.current = { left: zoneLeft, top: zoneTop, width: zoneWidth, height: zoneHeight };

        // The print zone is no longer resizable by hand — it's a fixed
        // rectangle sized from the real garment measurements for the
        // currently chosen talla (see the sizeScaleRef effect below), and
        // just falls back to the admin's max (scale 1) until that data is
        // available.
        const placement = initialPlacementRef.current;
        const initialScale = zoneScaleFactor(sizesRef.current, selectedSizeLabelRef.current, view.label);

        // Purely a data holder for the max-print-area math (clip boundary +
        // cm conversion) — never added to the canvas, so nothing is drawn.
        const zoneIndicator = new fabric.Rect({
          left: zoneLeft,
          top: zoneTop,
          width: zoneWidth,
          height: zoneHeight,
          scaleX: initialScale,
          scaleY: initialScale,
          originX: "left",
          originY: "top",
        });
        zoneIndicatorRef.current = zoneIndicator;

        canvas.on("object:scaling", (e) => {
          if (e.target !== designRef.current && e.target !== textRef.current) return;
          clampObjectToMaxSize(e.target);
          updateDesignBadge(e.target);
        });
        canvas.on("object:moving", (e) => {
          if (e.target === designRef.current || e.target === textRef.current) updateDesignBadge(e.target);
        });
        canvas.on("selection:created", (e) => {
          const obj = e.selected?.[0] ?? null;
          updateDesignBadge(obj === designRef.current || obj === textRef.current ? obj : null);
        });
        canvas.on("selection:updated", (e) => {
          const obj = e.selected?.[0] ?? null;
          updateDesignBadge(obj === designRef.current || obj === textRef.current ? obj : null);
        });
        canvas.on("selection:cleared", () => updateDesignBadge(null));
        // Finished drag/scale/rotate (fires on mouse-up, not per-frame) — exactly the checkpoint
        // undo should capture.
        canvas.on("object:modified", (e) => {
          if (e.target === designRef.current || e.target === textRef.current) pushHistory();
        });

        // "Elegir color de fondo": while active, a click samples the pixel
        // color at that spot straight off the rendered canvas and removes
        // every pixel close to it — works for any flat background color,
        // not just white.
        canvas.on("mouse:down", (opt) => {
          if (!pickingBgColorRef.current) return;
          const pointer = canvas.getPointer(opt.e);
          const ctx = canvas.lowerCanvasEl.getContext("2d");
          if (!ctx) return;
          const scale = canvas.getRetinaScaling ? canvas.getRetinaScaling() : 1;
          const x = Math.round(pointer.x * scale);
          const y = Math.round(pointer.y * scale);
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          handlePickedBgColor({ r: pixel[0], g: pixel[1], b: pixel[2] });
        });

        if (placement) {
          originalDesignUrlRef.current = placement.originalDesignUrl ?? placement.designUrl;
          loadDesign(canvas, placement.designUrl, placement)?.catch(() => setError("No se pudo mostrar tu diseño guardado. Súbelo de nuevo."));
        }

        canvas.renderAll();
        historyRef.current = [];
        pushHistory(true);
      });

      return () => {
        disposed = true;
        fabricCanvasRef.current?.dispose();
        fabricCanvasRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view.imageUrl]);

    // Re-scale the fixed print zone whenever the customer picks a different
    // talla — chestCm/sleeveCm drive the scale (src/lib/size-scale.ts).
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      const zone = zoneIndicatorRef.current;
      if (!canvas || !zone) return;
      const scale = zoneScaleFactor(sizes, selectedSizeLabel, view.label);
      zone.set({ scaleX: scale, scaleY: scale });
      canvas.renderAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSizeLabel, JSON.stringify(sizes), view.label]);

    function loadDesign(canvas: fabric.Canvas, url: string, placement?: ViewPlacement) {
      return fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
        if (designRef.current) {
          canvas.remove(designRef.current);
        }

        const zone = currentZoneRect();
        const naturalWidth = img.width ?? 1;
        const naturalHeight = img.height ?? 1;

        let targetLeft = zone.left + zone.width / 2;
        let targetTop = zone.top + zone.height / 2;
        // Fit within 70% of the zone on BOTH axes, not just width — a tall
        // image (e.g. a portrait logo) sized off width alone could blow
        // way past the real print-area height (seen live: a square upload
        // rendered at 67x105cm on a 27x46cm max).
        let targetScale = Math.min((zone.width * 0.7) / naturalWidth, (zone.height * 0.7) / naturalHeight);
        let targetAngle = 0;

        if (placement) {
          targetLeft = zone.left + (placement.xPct / 100) * zone.width;
          targetTop = zone.top + (placement.yPct / 100) * zone.height;
          targetScale = ((placement.widthPct / 100) * zone.width) / naturalWidth;
          targetAngle = placement.rotationDeg;
        }

        img.set({
          left: targetLeft,
          top: targetTop,
          originX: "center",
          originY: "center",
          scaleX: targetScale,
          scaleY: targetScale,
          angle: targetAngle,
          lockRotation: !view.allowRotate,
          cornerColor: "#B6FF00",
          cornerStyle: "circle",
          transparentCorners: false,
        });
        img.setControlsVisibility({ mtr: view.allowRotate });
        setRole(img, "design");

        designRef.current = img;
        clampObjectToMaxSize(img);
        img.setCoords();
        // Keep the design below any text the customer already added: add it
        // (goes on top), then move it back down to just above the
        // background (index 0).
        canvas.add(img);
        canvas.moveObjectTo(img, 1);
        canvas.setActiveObject(img);
        updateDesignBadge(img);
        canvas.renderAll();
        setHasDesign(true);
        refreshWhiteRisk(url);
        pushHistory(true);
        if (!placement) onDesignAddedRef.current?.();
      });
    }

    // --- Button controls: touch-friendly alternatives to dragging/scaling -----
    // They act on the selected design/text (or the design when nothing is selected).
    function adjustTarget(): fabric.FabricObject | null {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return null;
      const active = canvas.getActiveObject();
      if (active && (active === designRef.current || active === textRef.current)) return active;
      return designRef.current ?? textRef.current;
    }

    function finishAdjust(obj: fabric.FabricObject) {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      obj.setCoords();
      canvas.setActiveObject(obj);
      updateDesignBadge(obj);
      canvas.requestRenderAll();
      pushHistory();
    }

    function moveBy(dx: number, dy: number) {
      const obj = adjustTarget();
      const canvas = fabricCanvasRef.current;
      if (!obj || !canvas) return;
      const left = Math.min(canvas.getWidth(), Math.max(0, (obj.left ?? 0) + dx));
      const top = Math.min(canvas.getHeight(), Math.max(0, (obj.top ?? 0) + dy));
      obj.set({ left, top });
      finishAdjust(obj);
    }

    function scaleBy(factor: number) {
      const obj = adjustTarget();
      if (!obj) return;
      obj.set({ scaleX: (obj.scaleX ?? 1) * factor, scaleY: (obj.scaleY ?? 1) * factor });
      clampObjectToMaxSize(obj);
      finishAdjust(obj);
    }

    function centerInZone() {
      const obj = adjustTarget();
      if (!obj) return;
      const zone = currentZoneRect();
      obj.set({ left: zone.left + zone.width / 2, top: zone.top + zone.height / 2 });
      finishAdjust(obj);
    }

    async function handleAddText() {
      const canvas = fabricCanvasRef.current;
      if (!canvas || textRef.current) return;
      try {
        await document.fonts.load(`16px ${fontFamily.split(",")[0]}`);
      } catch {
        // the text still shows once the browser finishes loading the font
      }
      if (textRef.current) return;
      const zone = currentZoneRect();

      const text = new fabric.IText("Tu texto", {
        left: zone.left + zone.width / 2,
        top: zone.top + zone.height / 2,
        originX: "center",
        originY: "center",
        fontFamily,
        fontSize: Math.max(14, Math.round(zone.height * 0.18)),
        fill: textColor,
        cornerColor: "#B6FF00",
        cornerStyle: "circle",
        transparentCorners: false,
      });
      setRole(text, "text");
      textRef.current = text;
      canvas.add(text);
      canvas.setActiveObject(text);
      updateDesignBadge(text);
      canvas.renderAll();
      setHasText(true);
      pushHistory(true);
    }

    function handleTextColorChange(color: string) {
      setTextColor(color);
      const canvas = fabricCanvasRef.current;
      if (canvas && textRef.current) {
        textRef.current.set({ fill: color });
        canvas.renderAll();
      }
    }

    async function handleFontChange(family: string) {
      setFontFamily(family);
      setFontPanelOpen(false);
      const canvas = fabricCanvasRef.current;
      if (!canvas || !textRef.current) return;
      textRef.current.set({ fontFamily: family });
      // The face may not be downloaded yet the first time it's picked —
      // wait for it, otherwise the canvas keeps drawing with the fallback
      // font until something else triggers a re-render.
      const primaryName = family.split(",")[0].replace(/"/g, "").trim();
      try {
        await document.fonts.load(`16px "${primaryName}"`);
      } catch {
        // ignore — font will still show once the browser finishes loading it
      }
      canvas.renderAll();
    }

    function handleRemoveText() {
      const canvas = fabricCanvasRef.current;
      if (canvas && textRef.current) {
        canvas.remove(textRef.current);
        textRef.current = null;
        updateDesignBadge(null);
        canvas.renderAll();
        setHasText(false);
        pushHistory(true);
      }
    }

    async function handleUpload(file: File) {
      if (cropping) handleCancelCrop();
      setUploading(true);
      setError("");
      try {
        const prepared = await prepareImage(file);
        const url = await uploadBlob(prepared.blob, prepared.type, prepared.name);
        originalDesignUrlRef.current = url;
        const canvas = fabricCanvasRef.current;
        if (canvas) await loadDesign(canvas, url);
      } catch (e) {
        setError(friendlyMessage(e, "No se pudo subir tu diseño. Revisa tu conexión e intenta de nuevo, o prueba con otra foto."));
      } finally {
        setUploading(false);
      }
    }

    // Keeps the exact same on-canvas position/size/rotation — just swaps
    // which image is drawn. Shared by both background-removal flows below.
    async function swapDesignImage(url: string) {
      const canvas = fabricCanvasRef.current;
      const design = designRef.current;
      if (!canvas || !design) return;

      const transform = {
        left: design.left,
        top: design.top,
        scaleX: design.scaleX,
        scaleY: design.scaleY,
        angle: design.angle,
      };
      const newImg = await fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      canvas.remove(design);
      newImg.set({
        ...transform,
        originX: "center",
        originY: "center",
        lockRotation: !view.allowRotate,
        cornerColor: "#B6FF00",
        cornerStyle: "circle",
        transparentCorners: false,
      });
      newImg.setControlsVisibility({ mtr: view.allowRotate });
      setRole(newImg, "design");
      designRef.current = newImg;
      canvas.add(newImg);
      canvas.moveObjectTo(newImg, 1);
      canvas.setActiveObject(newImg);
      updateDesignBadge(newImg);
      canvas.renderAll();
      refreshWhiteRisk(url);
      pushHistory(true);
    }

    async function handleSegmentSubject() {
      const design = designRef.current;
      if (!design) return;

      setSegmentingSubject(true);
      setError("");
      try {
        const blob = await segmentSubject(design.getSrc());
        const url = await uploadBlob(blob, "image/png", "diseno-aislado.png");
        await swapDesignImage(url);
      } catch (e) {
        setError(friendlyMessage(e, "No se pudo aislar el sujeto. Intenta con otra foto."));
      } finally {
        setSegmentingSubject(false);
      }
    }

    // Manual crop — independent of background removal, works on any
    // uploaded image (photo or logo). The customer drags a rectangle over
    // the part of their image they want to keep.
    function handleStartCrop() {
      const canvas = fabricCanvasRef.current;
      const design = designRef.current;
      if (!canvas || !design) return;
      setError("");
      // Cropping math below assumes an axis-aligned bounding box — reset
      // rotation first (customer can re-rotate the cropped result after).
      design.set({ angle: 0 });
      design.setCoords();
      const bounds = design.getBoundingRect();
      const rect = new fabric.Rect({
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        fill: "rgba(217,70,239,0.15)",
        stroke: "#B6FF00",
        strokeWidth: 1.5,
        strokeDashArray: [6, 4],
        cornerColor: "#B6FF00",
        cornerStyle: "circle",
        transparentCorners: false,
        lockRotation: true,
      });
      rect.setControlsVisibility({ mtr: false });
      cropRectRef.current = rect;
      canvas.add(rect);
      canvas.setActiveObject(rect);
      canvas.renderAll();
      setCropping(true);
    }

    function handleCancelCrop() {
      const canvas = fabricCanvasRef.current;
      if (canvas && cropRectRef.current) {
        canvas.remove(cropRectRef.current);
        cropRectRef.current = null;
        canvas.renderAll();
      }
      setCropping(false);
    }

    async function handleApplyCrop() {
      const canvas = fabricCanvasRef.current;
      const design = designRef.current;
      const rect = cropRectRef.current;
      if (!canvas || !design || !rect) return;

      setApplyingCrop(true);
      setError("");
      try {
        const designBounds = design.getBoundingRect();
        const naturalWidth = design.width ?? 1;
        const naturalHeight = design.height ?? 1;
        const pxPerUnitX = designBounds.width / naturalWidth;
        const pxPerUnitY = designBounds.height / naturalHeight;

        const cropBounds = rect.getBoundingRect();
        const srcX = Math.max(0, (cropBounds.left - designBounds.left) / pxPerUnitX);
        const srcY = Math.max(0, (cropBounds.top - designBounds.top) / pxPerUnitY);
        const srcW = Math.min(naturalWidth - srcX, cropBounds.width / pxPerUnitX);
        const srcH = Math.min(naturalHeight - srcY, cropBounds.height / pxPerUnitY);

        if (srcW < 2 || srcH < 2) {
          setError("El recorte es muy pequeño.");
          return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
          img.src = design.getSrc();
        });

        const outCanvas = document.createElement("canvas");
        outCanvas.width = Math.round(srcW);
        outCanvas.height = Math.round(srcH);
        const outCtx = outCanvas.getContext("2d");
        if (!outCtx) throw new Error("No se pudo procesar la imagen.");
        outCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outCanvas.width, outCanvas.height);

        const blob = await new Promise<Blob>((resolve, reject) => {
          outCanvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("No se pudo generar la imagen recortada."))),
            "image/png",
          );
        });

        const croppedUrl = await uploadBlob(blob, "image/png", "diseno-recortado.png");

        canvas.remove(rect);
        cropRectRef.current = null;

        const newImg = await fabric.FabricImage.fromURL(croppedUrl, { crossOrigin: "anonymous" });
        canvas.remove(design);
        newImg.set({
          left: cropBounds.left + cropBounds.width / 2,
          top: cropBounds.top + cropBounds.height / 2,
          originX: "center",
          originY: "center",
          scaleX: cropBounds.width / (newImg.width ?? 1),
          scaleY: cropBounds.height / (newImg.height ?? 1),
          angle: 0,
          lockRotation: !view.allowRotate,
          cornerColor: "#B6FF00",
          cornerStyle: "circle",
          transparentCorners: false,
        });
        newImg.setControlsVisibility({ mtr: view.allowRotate });
        setRole(newImg, "design");
        designRef.current = newImg;
        clampObjectToMaxSize(newImg);
        newImg.setCoords();
        canvas.add(newImg);
        canvas.moveObjectTo(newImg, 1);
        canvas.setActiveObject(newImg);
        updateDesignBadge(newImg);
        canvas.renderAll();
        setCropping(false);
        refreshWhiteRisk(croppedUrl);
        pushHistory(true);
      } catch (e) {
        setError(friendlyMessage(e, "No se pudo recortar la imagen. Intenta de nuevo."));
      } finally {
        setApplyingCrop(false);
      }
    }

    function handleStartPickBgColor() {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !designRef.current) return;
      setError("");
      canvas.discardActiveObject();
      canvas.skipTargetFind = true;
      canvas.defaultCursor = "crosshair";
      canvas.renderAll();
      setPickingBgColor(true);
    }

    function handleCancelPickBgColor() {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        canvas.skipTargetFind = false;
        canvas.defaultCursor = "default";
      }
      setPickingBgColor(false);
    }

    async function handlePickedBgColor(color: { r: number; g: number; b: number }) {
      const canvas = fabricCanvasRef.current;
      const design = designRef.current;
      if (canvas) {
        canvas.skipTargetFind = false;
        canvas.defaultCursor = "default";
      }
      setPickingBgColor(false);
      if (!design) return;

      setRemovingBg(true);
      setError("");
      try {
        const blob = await removeColorBackground(design.getSrc(), color);
        const url = await uploadBlob(blob, "image/png", "diseno-sin-fondo.png");
        await swapDesignImage(url);
      } catch (e) {
        setError(friendlyMessage(e, "No se pudo quitar ese color. Intenta con otra foto o toca otro punto."));
      } finally {
        setRemovingBg(false);
      }
    }

    function handleRemoveDesign() {
      const canvas = fabricCanvasRef.current;
      if (canvas && designRef.current) {
        canvas.remove(designRef.current);
        designRef.current = null;
        originalDesignUrlRef.current = null;
        updateDesignBadge(null);
        canvas.renderAll();
        setHasDesign(false);
        whiteRiskRef.current = false;
        setWhiteRisk(false);
        pushHistory(true);
      }
    }

    useImperativeHandle(ref, () => ({
      async getPlacement() {
        const canvas = fabricCanvasRef.current;
        const img = designRef.current;
        const text = textRef.current;
        const zone = currentZoneRect();
        if (!canvas || (!img && !text) || !zone.width || !zone.height) return null;

        // No text: keep the simple, exact transform of the uploaded image —
        // no need to flatten anything into a new file. xPct/yPct/widthPct
        // are just an internal reference frame (relative to the invisible
        // max-size box) for restoring the transform later; the design can
        // sit anywhere on the garment now, so these aren't bounded to 0-100.
        if (!text && img) {
          const left = img.left ?? 0;
          const top = img.top ?? 0;
          return {
            designUrl: (img.getSrc && img.getSrc()) || "",
            originalDesignUrl: originalDesignUrlRef.current ?? undefined,
            xPct: ((left - zone.left) / zone.width) * 100,
            yPct: ((top - zone.top) / zone.height) * 100,
            widthPct: (img.getScaledWidth() / zone.width) * 100,
            rotationDeg: img.angle ?? 0,
            zoneWidthCm: img.getScaledWidth() * (view.maxWidthCm / maxZoneRef.current.width),
            zoneHeightCm: img.getScaledHeight() * (view.maxHeightCm / maxZoneRef.current.height),
          };
        }

        // Text is involved (with or without an uploaded image): flatten
        // whatever the customer placed into one final PNG, so production
        // gets exactly what they designed instead of separate layers our
        // data model doesn't otherwise track. Crop to the actual combined
        // bounding box of the content — it can be placed anywhere on the
        // garment now, not just inside the old fixed zone.
        if (text?.isEditing) text.exitEditing();
        canvas.discardActiveObject();
        canvas.renderAll();
        const contentObjects: fabric.FabricObject[] = [];
        if (img) contentObjects.push(img);
        if (text) contentObjects.push(text);
        const rects = contentObjects.map((o) => o.getBoundingRect());
        const cropLeft = Math.min(...rects.map((r) => r.left));
        const cropTop = Math.min(...rects.map((r) => r.top));
        const cropWidth = Math.max(...rects.map((r) => r.left + r.width)) - cropLeft;
        const cropHeight = Math.max(...rects.map((r) => r.top + r.height)) - cropTop;
        const dataUrl = canvas.toDataURL({
          format: "png",
          left: cropLeft,
          top: cropTop,
          width: cropWidth,
          height: cropHeight,
          multiplier: 1,
        });
        canvas.renderAll();

        let designUrl: string;
        try {
          const blob = await (await fetch(dataUrl)).blob();
          designUrl = await uploadBlob(blob, "image/png", "diseno-con-texto.png");
        } catch (e) {
          throw new Error(friendlyMessage(e, "No se pudo preparar tu diseño con texto. Intenta de nuevo."));
        }

        return {
          designUrl,
          originalDesignUrl: originalDesignUrlRef.current ?? undefined,
          xPct: 50,
          yPct: 50,
          widthPct: 100,
          rotationDeg: 0,
          zoneWidthCm: cropWidth * (view.maxWidthCm / maxZoneRef.current.width),
          zoneHeightCm: cropHeight * (view.maxHeightCm / maxZoneRef.current.height),
        };
      },
      getSnapshot() {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL({ format: "png", multiplier: 1 });
      },
      applyPresetDesign(url, position) {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return false;
        const p = PRESET_POSITIONS[position];
        originalDesignUrlRef.current = url;
        loadDesign(canvas, url, {
          designUrl: url,
          xPct: p.xPct,
          yPct: p.yPct,
          widthPct: p.widthPct,
          rotationDeg: 0,
          zoneWidthCm: 0,
          zoneHeightCm: 0,
        });
        return true;
      },
      hasWhiteOnWhiteRisk() {
        return isWhiteGarment && whiteRiskRef.current;
      },
    }));

    return (
      <div ref={wrapperRef} className="min-w-0 space-y-3">
        <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-lg border border-neutral-200">
          <canvas ref={canvasElRef} />
          {designBadge && (
            <span
              className="pointer-events-none absolute rounded bg-neutral-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{
                left: designBadge.left - 4,
                top: designBadge.top + 4,
                transform: "translateX(-100%)",
              }}
            >
              {designBadge.widthCm} x {designBadge.heightCm} cm
            </span>
          )}
        </div>
        {/* Main controls: always visible */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <label className="cursor-pointer rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            {uploading ? "Subiendo..." : hasDesign ? "Cambiar diseño" : "Subir tu diseño"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </label>
          {cropping && (
            <>
              <button type="button" onClick={handleApplyCrop} disabled={applyingCrop} className={PILL_BTN}>
                {applyingCrop ? "Recortando..." : "Aplicar recorte"}
              </button>
              <button type="button" onClick={handleCancelCrop} className={PILL_BTN_DANGER}>
                Cancelar
              </button>
            </>
          )}
          {pickingBgColor && (
            <button type="button" onClick={handleCancelPickBgColor} className={PILL_BTN_DANGER}>
              Cancelar selección
            </button>
          )}
        </div>
        {cropping && (
          <p className="text-center text-sm font-medium text-green-700">
            Ajusta el recuadro a la parte de la imagen que quieres conservar y presiona &quot;Aplicar recorte&quot;.
          </p>
        )}
        {pickingBgColor && (
          <p className="text-center text-sm font-medium text-green-700">
            Selecciona el fondo: haz clic sobre el fondo de tu diseño (del color que quieres quitar).
          </p>
        )}

        {hasDesign && !cropping && !pickingBgColor && (
          <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3" aria-label="Ajustes del diseño">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Mover</span>
              <div className="flex gap-1.5">
                <PadButton label="Mover a la izquierda" onStep={() => moveBy(-8, 0)}>←</PadButton>
                <PadButton label="Mover hacia arriba" onStep={() => moveBy(0, -8)}>↑</PadButton>
                <PadButton label="Mover hacia abajo" onStep={() => moveBy(0, 8)}>↓</PadButton>
                <PadButton label="Mover a la derecha" onStep={() => moveBy(8, 0)}>→</PadButton>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Tamaño</span>
              <div className="flex gap-1.5">
                <PadButton label="Hacer más pequeño" onStep={() => scaleBy(0.94)}>−</PadButton>
                <PadButton label="Hacer más grande" onStep={() => scaleBy(1.06)}>+</PadButton>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Posición</span>
              <button
                type="button"
                onClick={centerInZone}
                className="h-11 rounded-full border-2 border-black bg-white px-4 text-xs font-bold uppercase tracking-wide text-black transition hover:border-neon hover:bg-neon"
              >
                Centrar
              </button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Historial</span>
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo || undoing}
                title="Deshacer (Ctrl+Z)"
                className="flex h-11 items-center gap-1.5 rounded-full border-2 border-black bg-white px-4 text-xs font-bold uppercase tracking-wide text-black transition hover:border-neon hover:bg-neon disabled:opacity-40 disabled:hover:border-black disabled:hover:bg-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
                </svg>
                Deshacer
              </button>
            </div>
          </div>
        )}

        {isWhiteGarment && whiteRisk && (
          <p className="mx-auto max-w-md rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-center text-sm font-medium text-amber-800">
            Tu diseño tiene fondo blanco y el polerón también es blanco: la estampa quedaría invisible. Usa
            &quot;Quitar fondo&quot; o &quot;Aislar sujeto (IA)&quot; antes de continuar.
          </p>
        )}

        {/* Secondary tools: collapsed by default so the phone screen stays simple */}
        {!cropping && !pickingBgColor && (
          <details
            open={toolsOpen}
            onToggle={(e) => setToolsOpen(e.currentTarget.open)}
            className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white"
          >
            <summary className="cursor-pointer select-none px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-neutral-700">
              Más herramientas (recorte, fondo, texto…)
            </summary>
            <div className="space-y-3 px-3 pb-3 pt-1">
              <div className="flex flex-wrap items-center justify-center gap-2">
          {hasDesign && !pickingBgColor && !cropping && (
            <button type="button" onClick={handleStartCrop} className={PILL_BTN}>
              Recortar imagen
            </button>
          )}
          {hasDesign && !pickingBgColor && !cropping && (
            <button type="button" onClick={handleStartPickBgColor} disabled={removingBg} className={PILL_BTN}>
              {removingBg ? "Quitando fondo..." : "Quitar fondo \u201Cseleccionar el fondo\u201D"}
            </button>
          )}
          {hasDesign && !pickingBgColor && !cropping && (
            <button type="button" onClick={handleSegmentSubject} disabled={segmentingSubject} className={PILL_BTN}>
              {segmentingSubject ? "Aislando (puede tardar)..." : "Aislar sujeto (IA)"}
            </button>
          )}
          {hasDesign && !pickingBgColor && !cropping && (
            <button type="button" onClick={handleRemoveDesign} className={PILL_BTN_DANGER}>
              Quitar
            </button>
          )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
          {!hasText && !cropping && !pickingBgColor ? (
            <button type="button" onClick={handleAddText} className={PILL_BTN}>
              + Agregar texto
            </button>
          ) : hasText ? (
            <>
              <div className="flex w-full flex-col items-center gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Tipografía</span>
                <button
                  type="button"
                  onClick={() => setFontPanelOpen((o) => !o)}
                  aria-expanded={fontPanelOpen}
                  className="flex min-h-11 max-w-full items-center gap-3 rounded-full border-2 border-black bg-white px-5 py-1.5 text-black transition hover:border-neon hover:bg-neon"
                >
                  <span className="truncate text-xl leading-none" style={{ fontFamily }}>
                    {(FONT_OPTIONS.find((f) => f.value === fontFamily) ?? FONT_OPTIONS[0]).label}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition ${fontPanelOpen ? "rotate-180" : ""}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {fontPanelOpen && (
                  <div className="mt-1 max-h-72 w-full space-y-3 overflow-y-auto rounded-xl border-2 border-black bg-neutral-950 p-3">
                    {FONT_GROUPS.map((g) => (
                      <div key={g.title}>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-neon">{g.title}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.fonts.map((fo) => (
                            <button
                              key={fo.label}
                              type="button"
                              onClick={() => handleFontChange(fo.value)}
                              aria-pressed={fo.value === fontFamily}
                              className={`rounded-full border-2 px-3.5 py-1 text-lg leading-tight transition ${
                                fo.value === fontFamily
                                  ? "border-neon bg-neon text-black"
                                  : "border-neutral-700 bg-neutral-900 text-white hover:border-neon"
                              }`}
                              style={{ fontFamily: fo.value }}
                            >
                              {fo.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex w-full flex-col items-center gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">Color del texto</span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      aria-pressed={textColor.toLowerCase() === c.toLowerCase()}
                      onClick={() => handleTextColorChange(c)}
                      className={`h-9 w-9 rounded-full border-2 transition ${
                        textColor.toLowerCase() === c.toLowerCase() ? "border-black ring-2 ring-neon" : "border-neutral-300 hover:border-black"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <label
                    title="Otro color"
                    className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-black bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)] transition hover:border-neon"
                  >
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Elegir otro color"
                    />
                  </label>
                </div>
              </div>
              <button type="button" onClick={handleRemoveText} className={PILL_BTN_DANGER}>
                Quitar texto
              </button>
            </>
          ) : null}
        </div>

            </div>
          </details>
        )}
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <p className="text-center text-xs text-neutral-500">
          Arrastra para mover, usa las esquinas para escalar{view.allowRotate ? " y rotar" : ""}, o usa los botones de arriba. Doble clic sobre el
          texto para editarlo. El tamaño en cm que ves junto a tu diseño es real, según la talla elegida.
        </p>
      </div>
    );
  },
);

export default MockupEditor;
