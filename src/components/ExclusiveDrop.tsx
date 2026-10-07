"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatCLP } from "@/lib/money";
import type { LimitedCardData } from "@/lib/limited";
import { Countdown } from "@/components/LimitedEditionCard";

const TEASED_KEY = "pope-exclusive-teased";

// The exclusive pieces are not on display: a small "Exclusive" button in the corner (with a badge, a slow pulse and, once
// per visit, a hint) that unveils them when pressed. Nothing shows when there is no exclusive on sale.
export default function ExclusiveDrop() {
  const pathname = usePathname() ?? "";
  const [items, setItems] = useState<LimitedCardData[]>([]);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const hidden =
    pathname.startsWith("/admin") || pathname.startsWith("/checkout") || pathname.startsWith("/carrito") || items.some((c) => pathname === `/productos/${c.slug}`);

  useEffect(() => {
    let alive = true;
    fetch("/api/exclusives")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => {
        if (!alive) return;
        const list: LimitedCardData[] = d.items ?? [];
        setItems(list);
        // Warm the pictures so the reveal shows the piece, not an empty frame.
        for (const c of list) if (c.image) new Image().src = c.image;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Once per visit, a few seconds in: "something exclusive is waiting".
  useEffect(() => {
    if (items.length === 0 || hidden) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(TEASED_KEY) === "1";
    } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      setHint(true);
      try {
        sessionStorage.setItem(TEASED_KEY, "1");
      } catch {}
    }, 7000);
    const t2 = setTimeout(() => setHint(false), 16000);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [items.length, hidden]);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") setI((n) => (n + 1) % items.length);
      if (e.key === "ArrowLeft") setI((n) => (n - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, items.length]);

  if (items.length === 0 || hidden) return null;
  const it = items[i] ?? items[0];
  const onProduct = pathname.startsWith("/productos/");

  return (
    <>
      <div className={`fixed left-4 z-30 sm:left-5 ${onProduct ? "bottom-24 lg:bottom-5" : "bottom-5"}`}>
        {hint && !open && (
          <button
            type="button"
            onClick={() => {
              setHint(false);
              setOpen(true);
            }}
            className="pope-excl-hint absolute bottom-[calc(100%+12px)] left-0 w-max max-w-[15rem] rounded-2xl rounded-bl-sm border border-neon/40 bg-black/90 px-4 py-2.5 text-left text-xs font-semibold text-white shadow-2xl"
          >
            Hay algo que no está en la tienda… <span className="text-neon">¿lo ves?</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setHint(false);
            setOpen(true);
          }}
          aria-haspopup="dialog"
          aria-label={`Exclusive: ${items.length} ${items.length === 1 ? "pieza exclusiva" : "piezas exclusivas"}`}
          className="pope-excl-btn group relative flex h-14 items-center gap-2 rounded-full border border-neon/60 bg-black pl-2 pr-4 text-white shadow-[0_8px_30px_rgba(0,0,0,0.6)] transition hover:border-neon"
        >
          <span aria-hidden="true" className="pope-excl-ring absolute inset-0 rounded-full" />
          <span className="relative grid h-10 w-10 place-items-center rounded-full bg-neon text-black">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 transition group-hover:rotate-12" aria-hidden="true">
              <path d="M6 3h12l3 6-9 12L3 9z" />
              <path d="M3 9h18M9 3l3 18M15 3l-3 18" />
            </svg>
          </span>
          <span className="relative font-display text-xl font-bold uppercase leading-none tracking-wide">Exclusive</span>
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white ring-2 ring-black">{items.length}</span>
        </button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Piezas exclusivas" className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button type="button" aria-label="Cerrar" tabIndex={-1} onClick={() => setOpen(false)} className="pope-excl-backdrop absolute inset-0 bg-black/85 backdrop-blur-md" />

          <div key={it.slug} className="pope-excl-panel relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-neon/40 bg-neutral-950 text-white shadow-[0_0_80px_-20px_var(--neon)] md:grid md:grid-cols-2">
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-2xl leading-none text-white transition hover:bg-black"
            >
              ×
            </button>

            <div className="relative aspect-square overflow-hidden bg-white md:aspect-auto md:min-h-[26rem]">
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt={it.name} className="pope-excl-reveal absolute inset-0 h-full w-full object-contain p-4" />
              )}
              <span aria-hidden="true" className="pope-excl-curtain absolute inset-0 bg-black" />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-lg">
                <span aria-hidden="true">●</span> Edición limitada
              </span>
            </div>

            <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
              <p className="pope-excl-line text-[11px] font-bold uppercase tracking-[0.35em] text-neon" style={{ animationDelay: "0.55s" }}>
                Acceso exclusivo · Solo en POPE
              </p>
              <h2 className="pope-excl-line font-display text-5xl font-bold uppercase leading-[0.9]" style={{ animationDelay: "0.65s" }}>
                {it.name}
              </h2>
              <p className="pope-excl-line flex items-baseline gap-3" style={{ animationDelay: "0.75s" }}>
                <span className="font-display text-4xl font-bold text-neon">{formatCLP(it.price)}</span>
                {it.compareAtPrice != null && it.compareAtPrice > it.price && <span className="text-lg text-neutral-500 line-through">{formatCLP(it.compareAtPrice)}</span>}
              </p>
              {(it.remaining != null || it.until) && (
                <p className="pope-excl-line flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-wide text-neutral-300" style={{ animationDelay: "0.85s" }}>
                  {it.remaining != null && <span className="text-white">Quedan {it.remaining} de {it.units}</span>}
                  {it.until && (
                    <span>
                      Cierra en <Countdown untilIso={it.until} className="font-display text-xl text-white" />
                    </span>
                  )}
                </p>
              )}
              <p className="pope-excl-line text-sm text-neutral-400" style={{ animationDelay: "0.9s" }}>
                No está en el catálogo. No se personaliza: llega tal como la ves.
              </p>
              <Link
                href={`/productos/${it.slug}`}
                onClick={() => setOpen(false)}
                className="pope-excl-line inline-flex min-h-12 items-center justify-center rounded-full bg-neon px-8 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:brightness-90"
                style={{ animationDelay: "1s" }}
              >
                Ver la pieza →
              </Link>

              {items.length > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button type="button" onClick={() => setI((n) => (n - 1 + items.length) % items.length)} aria-label="Anterior" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 text-white hover:border-neon">
                    ←
                  </button>
                  <div className="flex gap-1.5" aria-hidden="true">
                    {items.map((x, n) => (
                      <span key={x.slug} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-neon" : "w-1.5 bg-white/30"}`} />
                    ))}
                  </div>
                  <button type="button" onClick={() => setI((n) => (n + 1) % items.length)} aria-label="Siguiente" className="grid h-10 w-10 place-items-center rounded-full border border-white/25 text-white hover:border-neon">
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
