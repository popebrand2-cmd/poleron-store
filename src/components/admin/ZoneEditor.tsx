"use client";

import { useRef, useState } from "react";

export type Zone = {
  zoneXPct: number;
  zoneYPct: number;
  zoneWidthPct: number;
  zoneHeightPct: number;
  maxWidthCm: number;
  maxHeightCm: number;
};

// Starts small on purpose — drag the corner to grow it to the real size you
// want (the cm badge scales up with it), rather than shrinking down from an
// arbitrary large default.
const DEFAULT_ZONE: Zone = {
  zoneXPct: 30,
  zoneYPct: 25,
  zoneWidthPct: 10,
  zoneHeightPct: 10,
  maxWidthCm: 1,
  maxHeightCm: 1,
};

export { DEFAULT_ZONE };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function ZoneEditor({
  imageUrl,
  zone,
  onChange,
}: {
  imageUrl: string;
  zone: Zone;
  onChange: (zone: Zone) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | { mode: "move" | "resize"; startX: number; startY: number; startZone: Zone }>(
    null,
  );

  function pctFromEvent(e: React.PointerEvent, base: DOMRect) {
    return {
      x: ((e.clientX - base.left) / base.width) * 100,
      y: ((e.clientY - base.top) / base.height) * 100,
    };
  }

  function handlePointerDown(mode: "move" | "resize") {
    return (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const p = pctFromEvent(e, rect);
      setDrag({ mode, startX: p.x, startY: p.y, startZone: zone });
      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch {
        // Some browsers/automated inputs reject capture for a pointerId
        // that was never associated with a real pointerdown; dragging
        // still works via document-level pointermove either way.
      }
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const p = pctFromEvent(e, rect);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;

    if (drag.mode === "move") {
      const newX = clamp(drag.startZone.zoneXPct + dx, 0, 100 - drag.startZone.zoneWidthPct);
      const newY = clamp(drag.startZone.zoneYPct + dy, 0, 100 - drag.startZone.zoneHeightPct);
      onChange({ ...drag.startZone, zoneXPct: newX, zoneYPct: newY });
    } else {
      // Dragging only resizes the visual guide (in % of the photo) — it
      // never touches maxWidthCm/maxHeightCm. Auto-scaling cm with the drag
      // was tried and turned out to be a footgun: one careless drag after
      // typing a value silently overwrote it with a nonsense number. Type
      // the real-world size directly in the fields below instead.
      const newWidth = clamp(drag.startZone.zoneWidthPct + dx, 5, 100 - drag.startZone.zoneXPct);
      const newHeight = clamp(drag.startZone.zoneHeightPct + dy, 5, 100 - drag.startZone.zoneYPct);
      onChange({ ...drag.startZone, zoneWidthPct: newWidth, zoneHeightPct: newHeight });
    }
  }

  function handlePointerUp() {
    setDrag(null);
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative w-full select-none overflow-hidden rounded-lg border border-neutral-300 bg-neutral-100"
        style={{ aspectRatio: "1 / 1" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        <div
          onPointerDown={handlePointerDown("move")}
          className="absolute cursor-move border-2 border-dashed border-fuchsia-500 bg-fuchsia-500/10"
          style={{
            left: `${zone.zoneXPct}%`,
            top: `${zone.zoneYPct}%`,
            width: `${zone.zoneWidthPct}%`,
            height: `${zone.zoneHeightPct}%`,
          }}
        >
          <div
            onPointerDown={handlePointerDown("resize")}
            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-fuchsia-500"
          />
          <span className="pointer-events-none absolute -bottom-6 right-0 whitespace-nowrap rounded bg-neutral-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {zone.maxWidthCm} x {zone.maxHeightCm} cm
          </span>
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        Arrastra el rectángulo para mover la zona de impresión; arrastra la esquina para cambiar su tamaño. Este es el
        tamaño MÁXIMO — el cliente podrá achicarlo, nunca agrandarlo.
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Ancho máx (cm)
          <input
            type="number"
            min={1}
            value={zone.maxWidthCm}
            onChange={(e) => {
              const v = e.target.valueAsNumber;
              onChange({ ...zone, maxWidthCm: Number.isFinite(v) && v > 0 ? v : zone.maxWidthCm });
            }}
            className="w-20 rounded-md border border-neutral-300 px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Alto máx (cm)
          <input
            type="number"
            min={1}
            value={zone.maxHeightCm}
            onChange={(e) => {
              const v = e.target.valueAsNumber;
              onChange({ ...zone, maxHeightCm: Number.isFinite(v) && v > 0 ? v : zone.maxHeightCm });
            }}
            className="w-20 rounded-md border border-neutral-300 px-2 py-1"
          />
        </label>
      </div>
    </div>
  );
}
