"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useCartStore } from "@/lib/cart-store";
import { formatCLP } from "@/lib/money";
import { trackEvent } from "@/lib/track";
import { Countdown } from "@/components/LimitedEditionCard";

export type ExclusiveData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  compareAtPrice: number | null;
  materialLabel: string;
  materialDelta: number;
  sizes: { label: string; priceDelta: number }[];
  versions: { name: string; hex: string; imageUrl: string; thumbUrl: string }[];
  units: number;
  remaining: number | null;
  until: string | null;
  soldOut: boolean;
  closed: boolean;
};

const MAX_PER_ORDER = 3;

// The page of a limited-edition piece: nothing to customize. Pick the version and the size, buy it. A dark stage with the
// piece under a spotlight, the units left as the main number and the closing countdown.
export default function ExclusiveProduct({ p }: { p: ExclusiveData }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [vi, setVi] = useState(0);
  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");

  const v = p.versions[vi] ?? p.versions[0];
  const over = p.soldOut || p.closed;
  const maxQty = Math.max(1, Math.min(MAX_PER_ORDER, p.remaining ?? MAX_PER_ORDER));
  const sizeObj = p.sizes.find((s) => s.label === size);
  const unit = p.basePrice + (sizeObj?.priceDelta ?? 0) + p.materialDelta;
  const sold = p.units > 0 && p.remaining != null ? p.units - p.remaining : 0;
  const pct = p.units > 0 ? Math.min(100, Math.round((sold / p.units) * 100)) : 0;
  const low = p.remaining != null && p.remaining > 0 && p.remaining <= Math.max(3, Math.ceil(p.units * 0.2));
  const sale = p.compareAtPrice != null && p.compareAtPrice > p.basePrice;

  function add(destination: "/carrito" | "/checkout") {
    if (over) return;
    if (p.sizes.length > 0 && !sizeObj) {
      setError("Elige tu talla para reservar la pieza.");
      document.getElementById("talla")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError("");
    addItem({
      id: uuidv4(),
      productId: p.id,
      productSlug: p.slug,
      productName: p.name,
      colorName: v.name,
      colorHex: v.hex,
      sizeLabel: sizeObj?.label ?? "",
      materialLabel: p.materialLabel,
      unitPrice: unit,
      quantity: qty,
      previewImageUrl: v.thumbUrl,
      designPlacement: {},
    });
    trackEvent("AddToCart", { content_type: "product", content_ids: [p.id], content_name: p.name, value: unit * qty, currency: "CLP" });
    router.push(destination);
  }

  return (
    <div className="relative isolate">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(60%_70%_at_30%_0%,color-mix(in_srgb,var(--neon)_16%,transparent),transparent_70%)]" />

      <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-28 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:pb-16 lg:pt-12">
        {/* Stage */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/15 bg-white shadow-[0_0_60px_-12px_color-mix(in_srgb,var(--neon)_45%,transparent)]">
            {/* Corner marks, like a plate on a display case */}
            {["left-4 top-4 border-l-2 border-t-2", "right-4 top-4 border-r-2 border-t-2", "left-4 bottom-4 border-l-2 border-b-2", "right-4 bottom-4 border-r-2 border-b-2"].map((c) => (
              <span key={c} aria-hidden="true" className={`absolute h-6 w-6 border-black/35 ${c}`} />
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.imageUrl} alt={`${p.name} — ${v.name}`} className={`absolute inset-0 h-full w-full object-contain p-3 sm:p-6 ${over ? "grayscale" : ""}`} />
            <span className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-lg">
              <span aria-hidden="true">●</span> Edición limitada
            </span>
            <span className="absolute bottom-6 right-7 text-[10px] font-semibold uppercase tracking-[0.25em] text-black/35">Imagen referencial</span>
            {over && (
              <span className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 -rotate-6 rounded-md border-4 border-white px-6 py-1 font-display text-6xl font-bold uppercase text-white shadow-2xl [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">
                {p.soldOut ? "Agotada" : "Cerrada"}
              </span>
            )}
          </div>

          {p.versions.length > 1 && (
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">Versión · {v.name}</p>
              <div role="radiogroup" aria-label="Versión" className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {p.versions.map((ver, i) => (
                  <button
                    key={ver.name}
                    type="button"
                    role="radio"
                    aria-checked={i === vi}
                    aria-label={ver.name}
                    onClick={() => setVi(i)}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-white transition ${i === vi ? "border-neon shadow-[0_0_18px_-4px_var(--neon)]" : "border-white/15 opacity-60 hover:opacity-100"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ver.thumbUrl} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-neon">POPE · Pieza exclusiva</p>
          <h1 className="mt-3 font-display text-6xl font-bold uppercase leading-[0.88] sm:text-7xl">{p.name}</h1>
          {p.description && <p className="mt-4 max-w-md text-neutral-300">{p.description}</p>}

          <p className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-5xl font-bold text-neon">{formatCLP(unit)}</span>
            {sale && <span className="text-xl text-neutral-500 line-through">{formatCLP(p.compareAtPrice as number)}</span>}
          </p>

          {/* The units left, as the main number */}
          {p.units > 0 && p.remaining != null && (
            <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.04] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">{p.soldOut ? "Tirada completa" : "Quedan"}</p>
                  <p className={`font-display text-6xl font-bold leading-none ${low ? "text-red-400" : "text-white"}`}>
                    {p.soldOut ? "0" : p.remaining}
                    <span className="ml-2 text-2xl text-white/40">de {p.units}</span>
                  </p>
                </div>
                {p.until && !over && (
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">Cierra en</p>
                    <Countdown untilIso={p.until} className="font-display text-2xl leading-none text-white" />
                  </div>
                )}
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Unidades vendidas" className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full transition-all ${low ? "bg-red-500" : "bg-neon"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          {p.units === 0 && p.until && !over && (
            <p className="mt-6 flex items-baseline gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-white/60">
              Cierra en <Countdown untilIso={p.until} className="font-display text-3xl leading-none tracking-normal text-white" />
            </p>
          )}

          {/* Size */}
          {p.sizes.length > 0 && (
            <div id="talla" className="mt-7 scroll-mt-28">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">Talla {error && <span className="ml-2 normal-case tracking-normal text-red-400">{error}</span>}</p>
              <div role="radiogroup" aria-label="Talla" className="flex flex-wrap gap-2">
                {p.sizes.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    role="radio"
                    aria-checked={size === s.label}
                    onClick={() => {
                      setSize(s.label);
                      setError("");
                    }}
                    className={`h-14 min-w-14 rounded-xl border-2 px-4 text-sm font-bold uppercase transition ${size === s.label ? "border-neon bg-neon text-black" : "border-white/25 text-white hover:border-white"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          {!over && (
            <div className="mt-6 flex items-center gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">Cantidad</p>
              <div className="flex items-center overflow-hidden rounded-full border-2 border-white/25">
                <button type="button" aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-11 w-11 text-xl text-white disabled:opacity-30" disabled={qty <= 1}>
                  −
                </button>
                <span className="w-8 text-center text-lg font-bold tabular-nums">{qty}</span>
                <button type="button" aria-label="Más" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="h-11 w-11 text-xl text-white disabled:opacity-30" disabled={qty >= maxQty}>
                  +
                </button>
              </div>
              <span className="text-xs text-white/40">Máx. {maxQty} por pedido</span>
            </div>
          )}

          {/* Buy */}
          <div className="mt-7 hidden gap-3 lg:grid">
            <button
              type="button"
              onClick={() => add("/checkout")}
              disabled={over}
              className="min-h-14 w-full rounded-full bg-neon px-8 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:brightness-90 disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {over ? (p.soldOut ? "Agotada" : "Venta cerrada") : "Reservar mi pieza"}
            </button>
            {!over && (
              <button type="button" onClick={() => add("/carrito")} className="min-h-12 w-full rounded-full border-2 border-white/30 px-8 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-neon hover:text-neon">
                Agregar al carrito
              </button>
            )}
          </div>

          <ul className="mt-8 space-y-3 border-t border-white/15 pt-6 text-sm text-neutral-300">
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-neon">◆</span>
              Sin personalización: llega tal como la ves, no se le cambia nada.
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-neon">◆</span>
              {p.units > 0 ? `Tirada limitada de ${p.units} unidades.` : "Tirada limitada."} Cuando se agote, termina la tirada.
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-neon">◆</span>
              La imagen es referencial; el producto final puede variar levemente.
            </li>
          </ul>
        </div>
      </div>

      {/* Phone: price and the main button always in reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-neon bg-black px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">{over ? "Edición limitada" : p.remaining != null ? `Quedan ${p.remaining}` : "Edición limitada"}</p>
            <p className="font-display text-3xl font-bold leading-none text-neon">{formatCLP(unit * qty)}</p>
          </div>
          <button
            type="button"
            onClick={() => add("/checkout")}
            disabled={over}
            className="min-h-12 flex-1 rounded-full bg-neon px-4 text-xs font-bold uppercase tracking-[0.15em] text-black disabled:bg-neutral-700 disabled:text-neutral-400"
          >
            {over ? (p.soldOut ? "Agotada" : "Cerrada") : "Reservar mi pieza"}
          </button>
        </div>
      </div>
    </div>
  );
}
