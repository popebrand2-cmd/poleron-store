"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCLP } from "@/lib/money";
import type { LimitedCardData } from "@/lib/limited";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Time left to the closing date, ticking every second. null until the browser has the clock (no server/browser mismatch).
export function useTimeLeft(untilIso: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!untilIso) return;
    const target = new Date(untilIso).getTime();
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [untilIso]);
  if (!untilIso || left == null) return null;
  return {
    over: left === 0,
    days: Math.floor(left / 86400000),
    hours: Math.floor((left % 86400000) / 3600000),
    minutes: Math.floor((left % 3600000) / 60000),
    seconds: Math.floor((left % 60000) / 1000),
  };
}

export function Countdown({ untilIso, className = "" }: { untilIso: string | null; className?: string }) {
  const t = useTimeLeft(untilIso);
  if (!t || t.over) return null;
  return (
    <span className={`tabular-nums ${className}`} aria-live="off">
      {t.days > 0 && `${t.days}d `}
      {pad(t.hours)}h {pad(t.minutes)}m {pad(t.seconds)}s
    </span>
  );
}

// The special card of a limited-edition product: bigger than the garment cards, with a "limited edition" tag, a units-left
// bar, the closing countdown and a straight "Comprar" button. Sold out or closed, it stays visible but says so.
export default function LimitedEditionCard({ item, className = "" }: { item: LimitedCardData; className?: string }) {
  const t = useTimeLeft(item.until);
  const over = item.soldOut || item.closed || !!t?.over;
  const sold = item.units > 0 && item.remaining != null ? item.units - item.remaining : 0;
  const pct = item.units > 0 ? Math.min(100, Math.round((sold / item.units) * 100)) : 0;
  const sale = item.compareAtPrice != null && item.compareAtPrice > item.price;
  const low = item.remaining != null && item.remaining > 0 && item.remaining <= Math.max(3, Math.ceil(item.units * 0.2));

  return (
    <article
      aria-label={`${item.name}, edición limitada`}
      className={`relative isolate overflow-hidden rounded-3xl border-2 bg-neutral-950 text-white md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] ${over ? "border-neutral-700" : "border-neon shadow-[0_0_40px_-8px_color-mix(in_srgb,var(--neon)_70%,transparent)]"} ${className}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-neon/15 blur-3xl" />

      <Link href={`/productos/${item.slug}`} aria-label={`Ver ${item.name}`} className="relative block min-h-[16rem] bg-[radial-gradient(ellipse_at_50%_40%,#ffffff_0%,#f3f3f3_55%,#dcdcdc_100%)]">
        {item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} loading="lazy" decoding="async" className={`absolute inset-0 h-full w-full object-contain p-4 drop-shadow-[0_10px_12px_rgba(0,0,0,0.25)] ${over ? "grayscale" : ""}`} />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-lg">
          <span aria-hidden="true">●</span> Edición limitada
        </span>
        {over && (
          <span className="absolute inset-x-0 bottom-6 mx-auto w-fit -rotate-6 rounded-md border-4 border-white px-5 py-1 font-display text-4xl font-bold uppercase text-white shadow-xl [text-shadow:0_2px_6px_rgba(0,0,0,0.6)]">
            {item.soldOut ? "Agotada" : "Cerrada"}
          </span>
        )}
      </Link>

      <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-neon">POPE · Solo una tirada</p>
          <h3 className="mt-2 font-display text-4xl font-bold uppercase leading-[0.95] sm:text-5xl">{item.name}</h3>
          {item.description && <p className="mt-2 line-clamp-3 text-sm text-neutral-300">{item.description}</p>}
        </div>

        <p className="flex items-baseline gap-3">
          <span className="font-display text-4xl font-bold text-neon">{formatCLP(item.price)}</span>
          {sale && <span className="text-lg text-neutral-500 line-through">{formatCLP(item.compareAtPrice as number)}</span>}
        </p>

        {item.units > 0 && (
          <div>
            <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-wide">
              <span className={low ? "text-red-400" : "text-neutral-300"}>
                {item.soldOut ? "Se agotaron las unidades" : `Quedan ${item.remaining} de ${item.units}`}
              </span>
              <span className="text-neutral-500">{pct}% vendido</span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Unidades vendidas" className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-all ${low ? "bg-red-500" : "bg-neon"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {item.until && !over && (
          <p className="flex flex-wrap items-baseline gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-300">
            Cierra en <Countdown untilIso={item.until} className="font-display text-2xl leading-none text-white" />
          </p>
        )}

        <Link
          href={`/productos/${item.slug}`}
          aria-disabled={over}
          className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-8 text-sm font-bold uppercase tracking-wide transition sm:w-fit ${over ? "border-2 border-neutral-600 text-neutral-400" : "bg-neon text-black hover:brightness-90"}`}
        >
          {over ? "Ver producto" : "Comprar ahora →"}
        </Link>
      </div>
    </article>
  );
}
