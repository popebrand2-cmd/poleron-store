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
};

const CANVAS_MAX_WIDTH = 460;

const MockupEditor = forwardRef<MockupEditorHandle, { view: MockupView; initialPlacement?: ViewPlacement | null }>(
  function MockupEditor({ view, initialPlacement }, ref) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const zoneRef = useRef({ left: 0, top: 0, width: 0, height: 0 });
    const designRef = useRef<fabric.FabricImage | null>(null);
    const zoneIndicatorRef = useRef<fabric.Rect | null>(null);
    const initialPlacementRef = useRef(initialPlacement);
    const [hasDesign, setHasDesign] = useState(Boolean(initialPlacement));
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

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

        bgImg.scale(scale);
        bgImg.set({ selectable: false, evented: false });
        canvas.backgroundImage = bgImg;

        const zoneLeft = (view.zoneXPct / 100) * displayWidth;
        const zoneTop = (view.zoneYPct / 100) * displayHeight;
        const zoneWidth = (view.zoneWidthPct / 100) * displayWidth;
        const zoneHeight = (view.zoneHeightPct / 100) * displayHeight;
        zoneRef.current = { left: zoneLeft, top: zoneTop, width: zoneWidth, height: zoneHeight };

        const zoneIndicator = new fabric.Rect({
          left: zoneLeft,
          top: zoneTop,
          width: zoneWidth,
          height: zoneHeight,
          fill: "transparent",
          stroke: "#d946ef",
          strokeWidth: 1.5,
          strokeDashArray: [6, 4],
          selectable: false,
          evented: false,
        });
        zoneIndicatorRef.current = zoneIndicator;
        canvas.add(zoneIndicator);

        const placement = initialPlacementRef.current;
        if (placement) {
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

    function loadDesign(canvas: fabric.Canvas, url: string, placement?: ViewPlacement) {
      fabric.FabricImage.fromURL(url, { crossOrigin: "anonymous" }).then((img) => {
        if (designRef.current) {
          canvas.remove(designRef.current);
        }

        const zone = zoneRef.current;
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
        // Keep the zone indicator visible above the background but the
        // design should render above it too once placed.
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
        const zone = zoneRef.current;
        if (!img || !zone.width || !zone.height) return null;
        const left = img.left ?? 0;
        const top = img.top ?? 0;
        return {
          designUrl: (img.getSrc && img.getSrc()) || "",
          xPct: ((left - zone.left) / zone.width) * 100,
          yPct: ((top - zone.top) / zone.height) * 100,
          widthPct: (img.getScaledWidth() / zone.width) * 100,
          rotationDeg: img.angle ?? 0,
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
        <div className="mx-auto w-fit overflow-hidden rounded-lg border border-neutral-200">
          <canvas ref={canvasElRef} />
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
          Arrastra para mover, usa las esquinas para escalar{view.allowRotate ? " y rotar" : ""}.
        </p>
      </div>
    );
  },
);

export default MockupEditor;
