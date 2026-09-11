"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import { removeWhiteBackground } from "@/lib/remove-white-bg";
import { detectBodyKeypoints, preloadPoseDetector } from "@/lib/pose-detect";
import { fitGarmentToBody } from "@/lib/garment-fit";

const CANVAS_MAX_WIDTH = 460;

export default function TryOnEditor({
  garmentSnapshotUrl,
  onClose,
}: {
  garmentSnapshotUrl: string;
  onClose: () => void;
}) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const garmentRef = useRef<fabric.FabricImage | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Procesando...");
  const [error, setError] = useState("");
  // null = not attempted yet, true = warped onto detected body, false = fell
  // back to a flat overlay (no pose detected with enough confidence).
  const [fitted, setFitted] = useState<boolean | null>(null);

  // Warm up the pose-detection model while the customer picks a photo.
  useEffect(() => {
    preloadPoseDetector();
  }, []);

  // Dispose the canvas whenever the photo changes (new background = fresh canvas).
  useEffect(() => {
    if (!photoUrl) return;
    let disposed = false;
    setLoading(true);
    setLoadingLabel("Procesando...");
    setError("");
    setFitted(null);

    fabric.FabricImage.fromURL(photoUrl).then(async (photoImg) => {
      if (disposed || !canvasElRef.current) return;

      const naturalWidth = photoImg.width ?? 1;
      const naturalHeight = photoImg.height ?? 1;
      const displayWidth = Math.min(CANVAS_MAX_WIDTH, naturalWidth);
      const scale = displayWidth / naturalWidth;
      const displayHeight = naturalHeight * scale;

      fabricCanvasRef.current?.dispose();
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: displayWidth,
        height: displayHeight,
        selection: false,
      });
      fabricCanvasRef.current = canvas;

      photoImg.set({ left: 0, top: 0, scaleX: scale, scaleY: scale, selectable: false, evented: false });
      canvas.add(photoImg);

      try {
        const cleanBlob = await removeWhiteBackground(garmentSnapshotUrl);
        const cleanUrl = URL.createObjectURL(cleanBlob);
        const garmentFabricImg = await fabric.FabricImage.fromURL(cleanUrl);
        if (disposed) return;

        let placed = false;
        try {
          setLoadingLabel("Ajustando a tu cuerpo...");
          const photoEl = photoImg.getElement();
          const keypoints = await detectBodyKeypoints(photoEl as HTMLImageElement);
          if (keypoints && !disposed) {
            const garmentEl = garmentFabricImg.getElement();
            const warpedCanvas = fitGarmentToBody(garmentEl, keypoints, naturalWidth, naturalHeight);
            if (warpedCanvas) {
              const warpedImg = new fabric.FabricImage(warpedCanvas, {
                left: 0,
                top: 0,
                scaleX: scale,
                scaleY: scale,
                cornerColor: "#d946ef",
                cornerStyle: "circle",
                transparentCorners: false,
              });
              garmentRef.current = warpedImg;
              canvas.add(warpedImg);
              canvas.setActiveObject(warpedImg);
              canvas.renderAll();
              placed = true;
              setFitted(true);
            }
          }
        } catch {
          // Pose detection unavailable/failed for this photo — fall back below.
        }

        if (!placed && !disposed) {
          setFitted(false);
          const garmentNaturalWidth = garmentFabricImg.width ?? 1;
          const targetScale = (displayWidth * 0.6) / garmentNaturalWidth;
          garmentFabricImg.set({
            left: displayWidth / 2,
            top: displayHeight / 2,
            originX: "center",
            originY: "center",
            scaleX: targetScale,
            scaleY: targetScale,
            cornerColor: "#d946ef",
            cornerStyle: "circle",
            transparentCorners: false,
          });
          garmentRef.current = garmentFabricImg;
          canvas.add(garmentFabricImg);
          canvas.setActiveObject(garmentFabricImg);
          canvas.renderAll();
        }
      } catch {
        setError("No se pudo procesar el diseño. Intenta con otra foto.");
      } finally {
        if (!disposed) setLoading(false);
      }
    });

    return () => {
      disposed = true;
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUrl, garmentSnapshotUrl]);

  function handlePhotoChange(file: File) {
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleDownload() {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "mi-diseno-puesto.png";
    link.click();
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">¿Cómo se vería puesto?</h3>
        <button type="button" onClick={onClose} className="text-sm text-neutral-500 hover:underline">
          Cerrar
        </button>
      </div>

      {!photoUrl ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="max-w-sm text-center text-sm text-neutral-500">
            Sube una foto tuya (de cuerpo o medio cuerpo, de frente) y te mostramos tu diseño puesto encima —
            podrás moverlo, agrandarlo y rotarlo para ajustarlo.
          </p>
          <label className="cursor-pointer rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            Subir mi foto
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoChange(file);
              }}
            />
          </label>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex w-full items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
            <canvas ref={canvasElRef} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-neutral-600">
                {loadingLabel}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && fitted === true && (
            <p className="text-center text-xs text-emerald-600">
              Ajustamos el diseño a tu postura automáticamente — puedes moverlo o rotarlo si quieres afinarlo.
            </p>
          )}
          {!loading && fitted === false && (
            <p className="text-center text-xs text-amber-600">
              No pudimos detectar bien tu cuerpo en esta foto (prueba una de frente, con buena luz, de medio cuerpo
              o más) — quedó como una superposición simple que puedes ajustar a mano.
            </p>
          )}
          <p className="text-center text-xs text-neutral-500">
            Arrastra para mover, usa las esquinas para ajustar el tamaño y rotar.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <label className="cursor-pointer text-sm font-medium text-fuchsia-600 hover:underline">
              Cambiar foto
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoChange(file);
                }}
              />
            </label>
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Descargar imagen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
