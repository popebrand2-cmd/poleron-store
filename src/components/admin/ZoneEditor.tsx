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
  // zoneXPct/Y/Width/Height are percentages of this container's own box —
  // MockupEditor (the customer-facing canvas) scales that same percentage
  // against the photo's real aspect ratio, so this container has to match
  // it exactly. It used to be forced to a 1:1 square regardless of the
  // photo's actual shape, which meant a zone box dragged to "look right"
  // here landed in the wrong place on the real product page for any photo
  // that wasn't itself square.
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

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
      // Resizing scales maxWidthCm/maxHeightCm proportionally with the box,
      // so the badge always reflects the real size. Every pointermove
      // recomputes from the SAME fixed `drag.startZone` snapshot taken at
      // pointerDown — never from the previous onChange's result — which is
      // what makes this safe: an earlier version derived the new cm from
      // whatever the last onChange had already produced, so tiny per-frame
      // rounding/drift compounded across a single drag gesture into a
      // wildly wrong number. Anchoring every frame to the same start state
      // makes the math exact regardless of how many pointermove events fire.
      const newWidth = clamp(drag.startZone.zoneWidthPct + dx, 5, 100 - drag.startZone.zoneXPct);
      const newHeight = clamp(drag.startZone.zoneHeightPct + dy, 5, 100 - drag.startZone.zoneYPct);
      const widthRatio = newWidth / drag.startZone.zoneWidthPct;
      const heightRatio = newHeight / drag.startZone.zoneHeightPct;
      onChange({
        ...drag.startZone,
        zoneWidthPct: newWidth,
        zoneHeightPct: newHeight,
        maxWidthCm: Math.round(drag.startZone.maxWidthCm * widthRatio * 10) / 10,
        maxHeightCm: Math.round(drag.startZone.maxHeightCm * heightRatio * 10) / 10,
      });
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
        style={{ aspectRatio: aspectRatio ?? "1 / 1" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
          onLoad={(e) => {
            const el = e.currentTarget;
            if (el.naturalWidth && el.naturalHeight) setAspectRatio(el.naturalWidth / el.naturalHeight);
          }}
        />
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
        Arrastra el rectángulo para mover la zona de impresión; arrastra la esquina para cambiar su tamaño — los cm
        se actualizan solos con el arrastre, o escríbelos directamente abajo. Estas medidas son para la talla M — si
        cargaste las medidas reales en la sección Tallas, el tamaño se ajusta solo para las demás tallas.
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
