"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as fabric from "fabric";
import type { ViewPlacement } from "@/types";

export type MockupEditorHandle = {
  getPlacement: () => ViewPlacement | null;
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
const MIN_ZONE_SCALE = 0.25;

const MockupEditor = forwardRef<MockupEditorHandle, { view: MockupView; initialPlacement?: ViewPlacement | null }>(
  function MockupEditor({ view, initialPlacement }, ref) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    // The admin-defined MAXIMUM zone, in canvas px — fixed for the life of this editor.
    const maxZoneRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
    const designRef = useRef<fabric.FabricImage | null>(null);
    const zoneIndicatorRef = useRef<fabric.Rect | null>(null);
    const initialPlacementRef = useRef(initialPlacement);
    const [hasDesign, setHasDesign] = useState(Boolean(initialPlacement));
    const [uploading, setUploading] = useState(false);
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
      const design = designRef.current;
      if (!design) return;
      const rect = currentZoneRect();
      design.clipPath = new fabric.Rect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        absolutePositioned: true,
      });
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

        // Restore the customer's previously chosen zone size, if any.
        const placement = initialPlacementRef.current;
        let initialScaleX = 1;
        let initialScaleY = 1;
        if (placement?.zoneWidthCm && placement?.zoneHeightCm) {
          initialScaleX = Math.min(1, Math.max(MIN_ZONE_SCALE, placement.zoneWidthCm / view.maxWidthCm));
          initialScaleY = Math.min(1, Math.max(MIN_ZONE_SCALE, placement.zoneHeightCm / view.maxHeightCm));
        }

        const zoneIndicator = new fabric.Rect({
          left: zoneLeft,
          top: zoneTop,
          width: zoneWidth,
          height: zoneHeight,
          scaleX: initialScaleX,
          scaleY: initialScaleY,
          fill: "transparent",
          stroke: "#d946ef",
          strokeWidth: 1.5,
          strokeDashArray: [6, 4],
          originX: "left",
          originY: "top",
          selectable: true,
          evented: true,
          lockMovementX: true,
          lockMovementY: true,
          lockRotation: true,
          hasBorders: false,
          cornerColor: "#d946ef",
          cornerStyle: "circle",
          transparentCorners: false,
          cornerSize: 14,
          minScaleLimit: MIN_ZONE_SCALE,
        });
        zoneIndicator.setControlsVisibility({
          mt: false,
          mb: false,
          ml: false,
          mr: false,
          tl: false,
          tr: false,
          bl: false,
          mtr: false,
          br: true,
        });
        zoneIndicatorRef.current = zoneIndicator;
        canvas.add(zoneIndicator);
        // Select it immediately so the resize handle is visible from the
        // start — otherwise fabric only renders/hit-tests control handles
        // on the active object, and the customer would have to click the
        // zone once (as a no-op) before they could even see the handle.
        canvas.setActiveObject(zoneIndicator);

        canvas.on("object:scaling", (e) => {
          if (e.target !== zoneIndicator) return;
          // The lower bound is enforced natively via minScaleLimit (fabric
          // recomputes scale from the drag anchor each frame, so it never
          // drifts). There's no native upper-bound equivalent, so only the
          // "can't exceed the admin's max zone" side needs a manual clamp.
          if ((zoneIndicator.scaleX ?? 1) > 1) zoneIndicator.set({ scaleX: 1 });
          if ((zoneIndicator.scaleY ?? 1) > 1) zoneIndicator.set({ scaleY: 1 });
          updateClipPathToCurrentZone(canvas);
          updateZoneBadge();
        });

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

    function loadDesign(canvas: fabric.Canvas, url: string, placement?: ViewPlacement) {
      fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
        if (designRef.current) {
          canvas.remove(designRef.current);
        }

        const zone = currentZoneRect();
        const clipPath = new fabric.Rect({
          left: zone.left,
          top: zone.top,
          width: zone.width,
          height: zone.height,
          absolutePositioned: true,
        });

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
          clipPath,
          lockRotation: !view.allowRotate,
          cornerColor: "#d946ef",
          cornerStyle: "circle",
          transparentCorners: false,
        });
        img.setControlsVisibility({ mtr: view.allowRotate });

        designRef.current = img;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        setHasDesign(true);
      });
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
      getPlacement() {
        const img = designRef.current;
        const zone = currentZoneRect();
        if (!img || !zone.width || !zone.height) return null;
        const left = img.left ?? 0;
        const top = img.top ?? 0;
        return {
          designUrl: (img.getSrc && img.getSrc()) || "",
          xPct: ((left - zone.left) / zone.width) * 100,
          yPct: ((top - zone.top) / zone.height) * 100,
          widthPct: (img.getScaledWidth() / zone.width) * 100,
          rotationDeg: img.angle ?? 0,
          zoneWidthCm: (zone.width / maxZoneRef.current.width) * view.maxWidthCm,
          zoneHeightCm: (zone.height / maxZoneRef.current.height) * view.maxHeightCm,
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
        <div className="flex items-center justify-center gap-3">
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
              onClick={handleRemoveDesign}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Quitar
            </button>
          )}
        </div>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
        <p className="text-center text-xs text-neutral-500">
          Arrastra tu diseño para moverlo, usa sus esquinas para escalar{view.allowRotate ? " y rotar" : ""}. Arrastra
          la esquina del recuadro punteado para achicar el área de impresión a tu gusto.
        </p>
      </div>
    );
  },
);

export default MockupEditor;
