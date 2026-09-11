"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as fabric from "fabric";
import type { ViewPlacement } from "@/types";
import { removeWhiteBackground } from "@/lib/remove-white-bg";
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

function makeZoneClipPath(rect: { left: number; top: number; width: number; height: number }) {
  return new fabric.Rect({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    absolutePositioned: true,
  });
}

type MockupEditorProps = {
  view: MockupView;
  initialPlacement?: ViewPlacement | null;
  sizes?: SizeMeasurements[];
  selectedSizeLabel?: string;
};

const MockupEditor = forwardRef<MockupEditorHandle, MockupEditorProps>(
  function MockupEditor({ view, initialPlacement, sizes = [], selectedSizeLabel = "" }, ref) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    // The admin-defined MAXIMUM zone, in canvas px — fixed for the life of this editor.
    const maxZoneRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
    const designRef = useRef<fabric.FabricImage | null>(null);
    const textRef = useRef<fabric.IText | null>(null);
    const zoneIndicatorRef = useRef<fabric.Rect | null>(null);
    const initialPlacementRef = useRef(initialPlacement);
    const sizesRef = useRef(sizes);
    const selectedSizeLabelRef = useRef(selectedSizeLabel);
    sizesRef.current = sizes;
    selectedSizeLabelRef.current = selectedSizeLabel;
    const [hasDesign, setHasDesign] = useState(Boolean(initialPlacement));
    const [hasText, setHasText] = useState(false);
    const [textColor, setTextColor] = useState("#111111");
    const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
    const [uploading, setUploading] = useState(false);
    const [removingBg, setRemovingBg] = useState(false);
    const [error, setError] = useState("");
    const [zoneBadge, setZoneBadge] = useState<{
      left: number;
      top: number;
      width: number;
      height: number;
      widthCm: number;
      heightCm: number;
    } | null>(null);

    function currentZoneRect() {
      const max = maxZoneRef.current;
      const zone = zoneIndicatorRef.current;
      const scaleX = zone?.scaleX ?? 1;
      const scaleY = zone?.scaleY ?? 1;
      return { left: max.left, top: max.top, width: max.width * scaleX, height: max.height * scaleY };
    }

    function updateClipPathToCurrentZone(canvas: fabric.Canvas) {
      const rect = currentZoneRect();
      if (designRef.current) designRef.current.clipPath = makeZoneClipPath(rect);
      if (textRef.current) textRef.current.clipPath = makeZoneClipPath(rect);
      canvas.renderAll();
    }

    function updateZoneBadge() {
      const rect = currentZoneRect();
      setZoneBadge({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        widthCm: Math.round((rect.width / maxZoneRef.current.width) * view.maxWidthCm * 10) / 10,
        heightCm: Math.round((rect.height / maxZoneRef.current.height) * view.maxHeightCm * 10) / 10,
      });
    }

    useEffect(() => {
      let disposed = false;

      fabric.FabricImage.fromURL(view.imageUrl, { crossOrigin: "anonymous" }).then((bgImg) => {
        if (disposed || !canvasElRef.current) return;

        const naturalWidth = bgImg.width ?? 1;
        const naturalHeight = bgImg.height ?? 1;
        const displayWidth = Math.min(CANVAS_MAX_WIDTH, naturalWidth);
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

        const zoneIndicator = new fabric.Rect({
          left: zoneLeft,
          top: zoneTop,
          width: zoneWidth,
          height: zoneHeight,
          scaleX: initialScale,
          scaleY: initialScale,
          fill: "transparent",
          stroke: "#d946ef",
          strokeWidth: 1.5,
          strokeDashArray: [6, 4],
          originX: "left",
          originY: "top",
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
        });
        zoneIndicatorRef.current = zoneIndicator;
        canvas.add(zoneIndicator);

        if (placement) {
          loadDesign(canvas, placement.designUrl, placement);
        }

        updateZoneBadge();
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
      updateClipPathToCurrentZone(canvas);
      updateZoneBadge();
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

        let targetLeft = zone.left + zone.width / 2;
        let targetTop = zone.top + zone.height / 2;
        let targetScale = (zone.width * 0.7) / naturalWidth;
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
          clipPath: makeZoneClipPath(zone),
          lockRotation: !view.allowRotate,
          cornerColor: "#d946ef",
          cornerStyle: "circle",
          transparentCorners: false,
        });
        img.setControlsVisibility({ mtr: view.allowRotate });

        designRef.current = img;
        // Keep the design below any text the customer already added: add it
        // (goes on top), then move it back down to just above the
        // background (index 0).
        canvas.add(img);
        canvas.moveObjectTo(img, 1);
        canvas.setActiveObject(img);
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
        clipPath: makeZoneClipPath(zone),
        cornerColor: "#d946ef",
        cornerStyle: "circle",
        transparentCorners: false,
      });
      textRef.current = text;
      canvas.add(text);
      canvas.setActiveObject(text);
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
        canvas.renderAll();
        setHasText(false);
      }
    }

    async function handleUpload(file: File) {
      setUploading(true);
      setError("");
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al subir el diseño.");
        const canvas = fabricCanvasRef.current;
        if (canvas) loadDesign(canvas, data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al subir el diseño.");
      } finally {
        setUploading(false);
      }
    }

    async function handleRemoveWhiteBg() {
      const canvas = fabricCanvasRef.current;
      const design = designRef.current;
      if (!canvas || !design) return;

      setRemovingBg(true);
      setError("");
      try {
        const currentSrc = design.getSrc();
        const blob = await removeWhiteBackground(currentSrc);

        const body = new FormData();
        body.append("file", new File([blob], "diseno-sin-fondo.png", { type: "image/png" }));
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al quitar el fondo.");

        // Keep the exact same on-canvas position/size/rotation — just swap
        // which image is drawn.
        const transform = {
          left: design.left,
          top: design.top,
          scaleX: design.scaleX,
          scaleY: design.scaleY,
          angle: design.angle,
        };
        const newImg = await fabric.FabricImage.fromURL(data.url, { crossOrigin: "anonymous" });
        canvas.remove(design);
        newImg.set({
          ...transform,
          originX: "center",
          originY: "center",
          clipPath: design.clipPath,
          lockRotation: !view.allowRotate,
          cornerColor: "#d946ef",
          cornerStyle: "circle",
          transparentCorners: false,
        });
        newImg.setControlsVisibility({ mtr: view.allowRotate });
        designRef.current = newImg;
        canvas.add(newImg);
        canvas.moveObjectTo(newImg, 1);
        canvas.setActiveObject(newImg);
        canvas.renderAll();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al quitar el fondo.");
      } finally {
        setRemovingBg(false);
      }
    }

    function handleRemoveDesign() {
      const canvas = fabricCanvasRef.current;
      if (canvas && designRef.current) {
        canvas.remove(designRef.current);
        designRef.current = null;
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

        const zoneWidthCm = (zone.width / maxZoneRef.current.width) * view.maxWidthCm;
        const zoneHeightCm = (zone.height / maxZoneRef.current.height) * view.maxHeightCm;

        // No text: keep the simple, exact transform of the uploaded image —
        // no need to flatten anything into a new file.
        if (!text && img) {
          const left = img.left ?? 0;
          const top = img.top ?? 0;
          return {
            designUrl: (img.getSrc && img.getSrc()) || "",
            xPct: ((left - zone.left) / zone.width) * 100,
            yPct: ((top - zone.top) / zone.height) * 100,
            widthPct: (img.getScaledWidth() / zone.width) * 100,
            rotationDeg: img.angle ?? 0,
            zoneWidthCm,
            zoneHeightCm,
          };
        }

        // Text is involved (with or without an uploaded image): flatten
        // whatever is inside the zone into one final PNG, so production
        // gets exactly what the customer designed instead of separate
        // layers our data model doesn't otherwise track.
        const indicator = zoneIndicatorRef.current;
        if (indicator) indicator.visible = false;
        if (text?.isEditing) text.exitEditing();
        canvas.discardActiveObject();
        canvas.renderAll();
        const dataUrl = canvas.toDataURL({
          format: "png",
          left: zone.left,
          top: zone.top,
          width: zone.width,
          height: zone.height,
          multiplier: 1,
        });
        if (indicator) indicator.visible = true;
        canvas.renderAll();

        const blob = await (await fetch(dataUrl)).blob();
        const body = new FormData();
        body.append("file", new File([blob], "diseno-con-texto.png", { type: "image/png" }));
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) return null;

        return {
          designUrl: data.url,
          xPct: 50,
          yPct: 50,
          widthPct: 100,
          rotationDeg: 0,
          zoneWidthCm,
          zoneHeightCm,
        };
      },
      getSnapshot() {
        const canvas = fabricCanvasRef.current;
        const indicator = zoneIndicatorRef.current;
        if (!canvas) return null;
        if (indicator) indicator.visible = false;
        canvas.renderAll();
        const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
        if (indicator) indicator.visible = true;
        canvas.renderAll();
        return dataUrl;
      },
    }));

    return (
      <div className="space-y-3">
        <div className="relative mx-auto w-fit overflow-hidden rounded-lg border border-neutral-200">
          <canvas ref={canvasElRef} />
          {zoneBadge && (
            <span
              className="pointer-events-none absolute rounded bg-neutral-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{
                left: zoneBadge.left + zoneBadge.width - 4,
                top: zoneBadge.top + zoneBadge.height + 4,
                transform: "translateX(-100%)",
              }}
            >
              {zoneBadge.widthCm} x {zoneBadge.heightCm} cm
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
          {hasDesign && (
            <button
              type="button"
              onClick={handleRemoveWhiteBg}
              disabled={removingBg}
              className="text-sm font-medium text-fuchsia-600 hover:underline disabled:opacity-50"
            >
              {removingBg ? "Quitando fondo..." : "Quitar fondo blanco"}
            </button>
          )}
          {hasDesign && (
            <button
              type="button"
              onClick={handleRemoveDesign}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Quitar
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!hasText ? (
            <button
              type="button"
              onClick={handleAddText}
              className="text-sm font-medium text-fuchsia-600 hover:underline"
            >
              + Agregar texto
            </button>
          ) : (
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
              <button
                type="button"
                onClick={handleRemoveText}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Quitar texto
              </button>
            </>
          )}
        </div>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <p className="text-center text-xs text-neutral-500">
          Arrastra para mover, usa las esquinas para escalar{view.allowRotate ? " y rotar" : ""}. Doble clic sobre el
          texto para editarlo. El recuadro punteado muestra el área máxima de impresión para tu talla.
        </p>
      </div>
    );
  },
);

export default MockupEditor;
