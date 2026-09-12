"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as fabric from "fabric";
import type { ViewPlacement } from "@/types";
import { removeWhiteBackground } from "@/lib/remove-white-bg";
import { removeColorBackground } from "@/lib/remove-color-bg";
import { segmentSubject, preloadSubjectSegmenter } from "@/lib/segment-subject";
import { zoneScaleFactor, type SizeMeasurements } from "@/lib/size-scale";

export type MockupEditorHandle = {
  getPlacement: () => Promise<ViewPlacement | null>;
  getSnapshot: () => string | null;
};

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

// Loaded via Google Fonts <link> in src/app/layout.tsx.
const FONT_OPTIONS = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Poppins", value: '"Poppins", sans-serif' },
  { label: "Montserrat", value: '"Montserrat", sans-serif' },
  { label: "Oswald", value: '"Oswald", sans-serif' },
  { label: "Bebas Neue", value: '"Bebas Neue", sans-serif' },
  { label: "Anton", value: '"Anton", sans-serif' },
  { label: "Archivo Black", value: '"Archivo Black", sans-serif' },
  { label: "Playfair Display", value: '"Playfair Display", serif' },
  { label: "Pacifico", value: '"Pacifico", cursive' },
  { label: "Dancing Script", value: '"Dancing Script", cursive' },
  { label: "Permanent Marker", value: '"Permanent Marker", cursive' },
  { label: "Lobster", value: '"Lobster", cursive' },
  { label: "Roboto Mono", value: '"Roboto Mono", monospace' },
];

type MockupEditorProps = {
  view: MockupView;
  initialPlacement?: ViewPlacement | null;
  sizes?: SizeMeasurements[];
  selectedSizeLabel?: string;
};

const MockupEditor = forwardRef<MockupEditorHandle, MockupEditorProps>(
  function MockupEditor({ view, initialPlacement, sizes = [], selectedSizeLabel = "" }, ref) {
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
          loadDesign(canvas, placement.designUrl, placement);
        }

        canvas.renderAll();
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
      fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
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
          cornerColor: "#39FF14",
          cornerStyle: "circle",
          transparentCorners: false,
        });
        img.setControlsVisibility({ mtr: view.allowRotate });

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
      });
    }

    function handleAddText() {
      const canvas = fabricCanvasRef.current;
      if (!canvas || textRef.current) return;
      const zone = currentZoneRect();

      const text = new fabric.IText("Tu texto", {
        left: zone.left + zone.width / 2,
        top: zone.top + zone.height / 2,
        originX: "center",
        originY: "center",
        fontFamily,
        fontSize: Math.max(14, Math.round(zone.height * 0.18)),
        fill: textColor,
        cornerColor: "#39FF14",
        cornerStyle: "circle",
        transparentCorners: false,
      });
      textRef.current = text;
      canvas.add(text);
      canvas.setActiveObject(text);
      updateDesignBadge(text);
      canvas.renderAll();
      setHasText(true);
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
      }
    }

    async function handleUpload(file: File) {
      if (cropping) handleCancelCrop();
      setUploading(true);
      setError("");
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al subir el diseño.");
        originalDesignUrlRef.current = data.url;
        const canvas = fabricCanvasRef.current;
        if (canvas) loadDesign(canvas, data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al subir el diseño.");
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
        cornerColor: "#39FF14",
        cornerStyle: "circle",
        transparentCorners: false,
      });
      newImg.setControlsVisibility({ mtr: view.allowRotate });
      designRef.current = newImg;
      canvas.add(newImg);
      canvas.moveObjectTo(newImg, 1);
      canvas.setActiveObject(newImg);
      updateDesignBadge(newImg);
      canvas.renderAll();
    }

    async function handleRemoveWhiteBg() {
      const design = designRef.current;
      if (!design) return;

      setRemovingBg(true);
      setError("");
      try {
        const blob = await removeWhiteBackground(design.getSrc());
        const body = new FormData();
        body.append("file", new File([blob], "diseno-sin-fondo.png", { type: "image/png" }));
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al quitar el fondo.");
        await swapDesignImage(data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al quitar el fondo.");
      } finally {
        setRemovingBg(false);
      }
    }

    async function handleSegmentSubject() {
      const design = designRef.current;
      if (!design) return;

      setSegmentingSubject(true);
      setError("");
      try {
        const blob = await segmentSubject(design.getSrc());
        const body = new FormData();
        body.append("file", new File([blob], "diseno-aislado.png", { type: "image/png" }));
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al aislar el sujeto.");
        await swapDesignImage(data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aislar el sujeto. Intenta con otra foto.");
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
        stroke: "#39FF14",
        strokeWidth: 1.5,
        strokeDashArray: [6, 4],
        cornerColor: "#39FF14",
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

        const body = new FormData();
        body.append("file", new File([blob], "diseno-recortado.png", { type: "image/png" }));
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al recortar la imagen.");

        canvas.remove(rect);
        cropRectRef.current = null;

        const newImg = await fabric.FabricImage.fromURL(data.url, { crossOrigin: "anonymous" });
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
          cornerColor: "#39FF14",
          cornerStyle: "circle",
          transparentCorners: false,
        });
        newImg.setControlsVisibility({ mtr: view.allowRotate });
        designRef.current = newImg;
        clampObjectToMaxSize(newImg);
        newImg.setCoords();
        canvas.add(newImg);
        canvas.moveObjectTo(newImg, 1);
        canvas.setActiveObject(newImg);
        updateDesignBadge(newImg);
        canvas.renderAll();
        setCropping(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al recortar la imagen.");
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
        const body = new FormData();
        body.append("file", new File([blob], "diseno-sin-fondo.png", { type: "image/png" }));
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al quitar el fondo.");
        await swapDesignImage(data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al procesar el fondo.");
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

        const blob = await (await fetch(dataUrl)).blob();
        const body = new FormData();
        body.append("file", new File([blob], "diseno-con-texto.png", { type: "image/png" }));
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) return null;

        return {
          designUrl: data.url,
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
          {hasDesign && !pickingBgColor && !cropping && (
            <button type="button" onClick={handleStartCrop} className={PILL_BTN}>
              Recortar imagen
            </button>
          )}
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
          {hasDesign && !pickingBgColor && !cropping && (
            <button type="button" onClick={handleRemoveWhiteBg} disabled={removingBg} className={PILL_BTN}>
              {removingBg ? "Quitando fondo..." : "Quitar fondo blanco"}
            </button>
          )}
          {hasDesign && !pickingBgColor && !cropping && (
            <button type="button" onClick={handleStartPickBgColor} disabled={removingBg} className={PILL_BTN}>
              Elegir color de fondo
            </button>
          )}
          {pickingBgColor && (
            <button type="button" onClick={handleCancelPickBgColor} className={PILL_BTN_DANGER}>
              Cancelar selección
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
        {cropping && (
          <p className="text-center text-sm font-medium text-green-700">
            Ajusta el recuadro a la parte de la imagen que quieres conservar y presiona &quot;Aplicar recorte&quot;.
          </p>
        )}
        {pickingBgColor && (
          <p className="text-center text-sm font-medium text-green-700">
            Haz clic sobre el color de fondo de tu diseño que quieres quitar (funciona con cualquier color, no solo
            blanco).
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!hasText && !cropping && !pickingBgColor ? (
            <button type="button" onClick={handleAddText} className={PILL_BTN}>
              + Agregar texto
            </button>
          ) : hasText ? (
            <>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                Tipografía
                <select
                  value={fontFamily}
                  onChange={(e) => handleFontChange(e.target.value)}
                  className="rounded border border-neutral-300 px-2 py-1 text-sm"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-600">
                Color del texto
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => handleTextColorChange(e.target.value)}
                  className="h-7 w-10 rounded"
                />
              </label>
              <button type="button" onClick={handleRemoveText} className={PILL_BTN_DANGER}>
                Quitar texto
              </button>
            </>
          ) : null}
        </div>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <p className="text-center text-xs text-neutral-500">
          Arrastra para mover, usa las esquinas para escalar{view.allowRotate ? " y rotar" : ""}. Doble clic sobre el
          texto para editarlo. El tamaño en cm que ves junto a tu diseño es real, según la talla elegida.
        </p>
      </div>
    );
  },
);

export default MockupEditor;
