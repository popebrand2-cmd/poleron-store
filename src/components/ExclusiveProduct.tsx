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
  // The free back of the piece, where the customer can add their own design for `delta` more (null = nothing to add).
  backOption?: { label: string; delta: number; imageUrl: string; zone: { x: number; y: number; w: number; h: number }; cm: { w: number; h: number } } | null;
  sizes: { label: string; priceDelta: number; lengthCm: number | null; widthCm: number | null }[];
  versions: { name: string; hex: string; imageUrl: string; thumbUrl: string }[];
  units: number;
  remaining: number | null;
  until: string | null;
  soldOut: boolean;
  closed: boolean;
};

const MAX_PER_ORDER = 3;

// The page of a limited-edition piece: pick the version and the size, buy it. A dark stage with the piece under a spotlight,
// the units left as the main number and the closing countdown. A piece with a free back (backOption) also lets the customer
// upload their own design for the back, at its higher price.
export default function ExclusiveProduct({ p }: { p: ExclusiveData }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [vi, setVi] = useState(0);
  const [size, setSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const back = p.backOption ?? null;
  const [withBack, setWithBack] = useState(false);
  const [backUrl, setBackUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [backError, setBackError] = useState("");

  async function uploadBack(file: File) {
    setUploading(true);
    setBackError("");
    try {
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) throw new Error(d.error || "No se pudo subir la imagen. Intenta de nuevo.");
      setBackUrl(d.url);
    } catch (e) {
      setBackError(e instanceof Error ? e.message : "No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  const v = p.versions[vi] ?? p.versions[0];
  // An Iron Maiden piece: its picture fills the stage, on a dark red backdrop instead of white.
  const iron = /iron maiden/i.test(p.name);
  const over = p.soldOut || p.closed;
  const maxQty = Math.max(1, Math.min(MAX_PER_ORDER, p.remaining ?? MAX_PER_ORDER));
  const sizeObj = p.sizes.find((s) => s.label === size);
  const unit = p.basePrice + (sizeObj?.priceDelta ?? 0) + p.materialDelta + (back && withBack ? back.delta : 0);
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
    if (back && withBack && !backUrl) {
      setBackError("Sube tu diseño para la espalda, o elige «Solo adelante».");
      document.getElementById("espalda")?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      materialLabel: back && withBack ? back.label : p.materialLabel,
      unitPrice: unit,
      quantity: qty,
      previewImageUrl: v.thumbUrl,
      // The customer's back design, as the editor stores it: production downloads the original from the order.
      designPlacement:
        back && withBack && backUrl
          ? { Espalda: { designUrl: backUrl, originalDesignUrl: backUrl, xPct: 50, yPct: 0, widthPct: 100, rotationDeg: 0, zoneWidthCm: back.cm.w, zoneHeightCm: back.cm.h } }
          : {},
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
          <div className={`relative aspect-square overflow-hidden rounded-[2rem] border border-white/15 ${iron ? "bg-[radial-gradient(circle_at_50%_45%,#d0343d_0%,#8e1820_45%,#3a0a0e_100%)]" : "bg-white"} shadow-[0_0_60px_-12px_color-mix(in_srgb,var(--neon)_45%,transparent)]`}>
            {/* Corner marks, like a plate on a display case */}
            {["left-4 top-4 border-l-2 border-t-2", "right-4 top-4 border-r-2 border-t-2", "left-4 bottom-4 border-l-2 border-b-2", "right-4 bottom-4 border-r-2 border-b-2"].map((c) => (
              <span key={c} aria-hidden="true" className={`absolute z-[1] h-6 w-6 ${iron ? "border-white/40" : "border-black/35"} ${c}`} />
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.imageUrl} alt={`${p.name} — ${v.name}`} className={`absolute inset-0 h-full w-full ${iron ? "object-cover" : "object-contain p-3 sm:p-6"} ${over ? "grayscale" : ""}`} />
            <span className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-lg">
              <span aria-hidden="true">●</span> Edición limitada
            </span>
            <span className={`absolute bottom-6 right-7 text-[10px] font-semibold uppercase tracking-[0.25em] ${iron ? "text-white/50" : "text-black/35"}`}>Imagen referencial</span>
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
          {p.description && <p className="mt-4 max-w-md whitespace-pre-line text-sm leading-relaxed text-neutral-300">{p.description}</p>}

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

          {p.sizes.some((z) => z.lengthCm || z.widthCm) && (
            <details className="group mt-3 max-w-md rounded-xl border border-white/15">
              <summary className="cursor-pointer select-none list-none px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white/70 [&::-webkit-details-marker]:hidden">
                Guía de tallas <span aria-hidden="true" className="float-right transition group-open:rotate-180">⌄</span>
              </summary>
              <div className="px-4 pb-4">
                <table className="w-full text-center text-sm tabular-nums">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                      <th className="py-2 text-left font-bold">Talla</th>
                      <th className="py-2 font-bold">Alto (cm)</th>
                      <th className="py-2 font-bold">Ancho (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.sizes.map((z) => (
                      <tr key={z.label} className={`border-t border-white/10 ${size === z.label ? "text-neon" : "text-white"}`}>
                        <td className="py-2 text-left font-bold">{z.label}</td>
                        <td className="py-2">{z.lengthCm ?? "—"}</td>
                        <td className="py-2">{z.widthCm ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-white/50">Las medidas pueden variar entre 1 y 2 cm.</p>
              </div>
            </details>
          )}

          {/* The free back: plain, or the customer's own design for a bit more */}
          {back && !over && (
            <div id="espalda" className="mt-7 scroll-mt-28">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/50">
                La espalda {backError && <span className="ml-2 normal-case tracking-normal text-red-400">{backError}</span>}
              </p>
              <div role="radiogroup" aria-label="La espalda" className="grid gap-2 sm:grid-cols-2">
                {[
                  { on: false, title: "Solo adelante", text: "El estampado grande adelante, la espalda lisa.", price: p.basePrice + (sizeObj?.priceDelta ?? 0) + p.materialDelta },
                  { on: true, title: "Agregar mi diseño atrás", text: "Sube tu imagen y la estampamos en la espalda.", price: p.basePrice + (sizeObj?.priceDelta ?? 0) + p.materialDelta + back.delta },
                ].map((o) => (
                  <button
                    key={o.title}
                    type="button"
                    role="radio"
                    aria-checked={withBack === o.on}
                    onClick={() => {
                      setWithBack(o.on);
                      setBackError("");
                    }}
                    className={`rounded-xl border-2 p-4 text-left transition ${withBack === o.on ? "border-neon bg-neon/10" : "border-white/20 hover:border-white/60"}`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-bold uppercase tracking-wide text-white">{o.title}</span>
                      <span className="font-display text-2xl font-bold leading-none text-neon">{formatCLP(o.price)}</span>
                    </span>
                    <span className="mt-1 block text-xs text-white/60">{o.text}</span>
                  </button>
                ))}
              </div>

              {withBack && (
                <div className="mt-3 flex items-center gap-4 rounded-xl border border-white/15 bg-white/[0.04] p-3">
                  {/* The back of the tee with the customer's design laid over its print zone */}
                  <div className="relative w-28 shrink-0 overflow-hidden rounded-lg bg-white sm:w-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={back.imageUrl} alt="Espalda de la polera" className="block h-auto w-full" />
                    {backUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={backUrl}
                        alt="Tu diseño en la espalda"
                        className="absolute object-contain object-top"
                        style={{ left: `${back.zone.x}%`, top: `${back.zone.y}%`, width: `${back.zone.w}%`, height: `${back.zone.h}%` }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{backUrl ? "Así va tu diseño atrás" : "Sube tu diseño para la espalda"}</p>
                    <p className="mt-0.5 text-xs text-white/50">PNG, JPG o WEBP. Mejor con fondo transparente. Lo revisamos antes de estampar.</p>
                    <label className={`mt-2 inline-flex min-h-10 cursor-pointer items-center rounded-full bg-neon px-4 text-xs font-bold uppercase tracking-wide text-black transition hover:brightness-95 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                      {uploading ? "Subiendo…" : backUrl ? "Cambiar imagen" : "Subir imagen"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) uploadBack(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
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
              {back ? `El estampado de adelante no se cambia. La espalda va lisa, o con tu diseño por ${formatCLP(back.delta)} más.` : "Sin personalización: llega tal como la ves, no se le cambia nada."}
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
