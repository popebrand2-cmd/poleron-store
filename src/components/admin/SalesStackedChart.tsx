"use client";

import { useState } from "react";
import { formatCLP } from "@/lib/money";

// Admin > Ventas: net received per day (or month), split into net from products (brand neon) and the shipping
// charged (gray) stacked on top. Hover or tap a bar for the breakdown.
export type StackedBucket = { label: string; netProducts: number; shipping: number; orders: number };

const C_PRODUCTS = "var(--neon)";
const C_SHIPPING = "#8a8a8a";

export default function SalesStackedChart({ data, unit }: { data: StackedBucket[]; unit: "día" | "mes" }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 960, H = 240, top = 16, bottom = 26, left = 64;
  const chartH = H - top - bottom;
  const max = Math.max(1, ...data.map((d) => Math.max(0, d.netProducts) + d.shipping));
  const slot = (W - left) / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(36, slot * 0.7));
  const stride = Math.max(1, Math.ceil(data.length / 12));
  const y = (v: number) => (v / max) * chartH;
  const h = hover !== null ? data[hover] : null;

  if (data.every((d) => d.orders === 0)) return <p className="py-6 text-center text-sm text-neutral-500">Sin ventas en este período.</p>;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_PRODUCTS }} /> Neto productos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_SHIPPING }} /> Envío
        </span>
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="relative min-w-[640px]">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Neto recibido por ${unit}, productos y envío apilados`} onMouseLeave={() => setHover(null)}>
            {[0.5, 1].map((f) => (
              <g key={f}>
                <line x1={left} x2={W} y1={top + chartH - chartH * f} y2={top + chartH - chartH * f} stroke="#262626" strokeDasharray="3 4" />
                <text x={left - 8} y={top + chartH - chartH * f + 3} textAnchor="end" fontSize="10" fill="#737373">
                  {formatCLP(Math.round(max * f))}
                </text>
              </g>
            ))}
            <line x1={left} x2={W} y1={top + chartH} y2={top + chartH} stroke="#333" />
            {data.map((d, i) => {
              const cx = left + i * slot + slot / 2;
              const x = cx - barW / 2;
              const hp = y(Math.max(0, d.netProducts));
              const hs = y(d.shipping);
              const base = top + chartH;
              const r = Math.min(3, barW / 3);
              return (
                <g key={i} opacity={hover !== null && hover !== i ? 0.45 : 1}>
                  {hp > 0 && <rect x={x} y={base - hp} width={barW} height={hp} fill={C_PRODUCTS} rx={r} />}
                  {hs > 0 && <rect x={x} y={base - hp - hs - (hp > 0 ? 2 : 0)} width={barW} height={hs} fill={C_SHIPPING} rx={r} />}
                  {i % stride === 0 && (
                    <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="#737373">
                      {d.label}
                    </text>
                  )}
                  <rect x={left + i * slot} y={0} width={slot} height={H} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
          {h && hover !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-48 rounded-xl border border-[#333] bg-black/95 p-3 text-xs shadow-xl"
              style={{ left: `clamp(0px, calc(${((left + hover * slot + slot / 2) / W) * 100}% - 96px), calc(100% - 192px))` }}
            >
              <p className="mb-1.5 font-bold uppercase tracking-wider text-white">
                {h.label} · {h.orders} pedido{h.orders === 1 ? "" : "s"}
              </p>
              <Row c={C_PRODUCTS} k="Neto productos" v={formatCLP(h.netProducts)} />
              <Row c={C_SHIPPING} k="Envío" v={formatCLP(h.shipping)} />
              <div className="mt-1.5 flex justify-between border-t border-[#333] pt-1.5 font-bold text-white">
                <span>Neto</span>
                <span>{formatCLP(h.netProducts + h.shipping)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ c, k, v }: { c: string; k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-neutral-300">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm" style={{ background: c }} />
        {k}
      </span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
