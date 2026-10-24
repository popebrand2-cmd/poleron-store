"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatCLP } from "@/lib/money";
import type { LimitedCardData } from "@/lib/limited";
import { Countdown } from "@/components/LimitedEditionCard";
import { useSiteImage } from "@/components/SiteContentProvider";

// The little speech bubble under the button comes back every so often, on every page, with a different line each time.
const HINT_FIRST_MS = 6000;
const HINT_EVERY_MS = 35000;
const HINT_SHOW_MS = 7000;

// The exclusive pieces are not on display: a floating "Exclusive" button at the top, right under the menu, with the logo of
// the band or character of the drop, a spinning neon edge, a badge and, once per visit, a hint. It shrinks to the logo
// alone once the visitor scrolls (so it never covers the page) and unveils the pieces when pressed. When every piece is
// sold out it stays up saying so. Nothing shows when there is no exclusive at all.
export default function ExclusiveDrop() {
  const pathname = usePathname() ?? "";
  const [items, setItems] = useState<LimitedCardData[]>([]);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [hint, setHint] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const logo = useSiteImage("image.exclusiveLogo");
  // Where the menu ends (announcement bar + header), so the button floats right under it.
  const [top, setTop] = useState(0);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const header = document.querySelector("header");
    const bar = header?.parentElement;
    const measure = () => setTop(Math.round((bar ?? header)?.getBoundingClientRect().bottom ?? 0));
    const onScroll = () => setCompact(window.scrollY > 220);
    measure();
    onScroll();
    const ro = bar ? new ResizeObserver(measure) : null;
    if (bar && ro) ro.observe(bar);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Everywhere in the store — home, collections, every garment, the exclusive pieces themselves — except the admin, the
  // cart and the checkout (the customer is paying) and the Iron Maiden section (it already is the exclusive page).
  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/checkout") || pathname.startsWith("/carrito") || pathname.startsWith("/iron-maiden");
  const iron = items.some((c) => /iron maiden/i.test(c.name));
  const hints = iron
    ? ["Hay algo que no está en la tienda… ¿lo ves?", "🤘 Colección exclusiva Iron Maiden", "Iron Maiden desde $11.999 · tallas S a 3XL", "Up the Irons! Mira las poleras de Eddie"]
    : ["Hay algo que no está en la tienda… ¿lo ves?", "Pieza exclusiva: solo en POPE"];
  const [hintN, setHintN] = useState(0);

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

  // A few seconds into every page, then again every ~35 s: a short line recommending the exclusives.
  useEffect(() => {
    if (items.length === 0 || hidden || open) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const show = () => {
      setHintN((n) => n + 1);
      setHint(true);
      timers.push(setTimeout(() => setHint(false), HINT_SHOW_MS));
    };
    timers.push(setTimeout(show, HINT_FIRST_MS));
    const every = setInterval(() => {
      if (!document.hidden) show();
    }, HINT_EVERY_MS);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(every);
      setHint(false);
    };
  }, [items.length, hidden, open, pathname]);

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

  // Tells the page the button is up (the home cover makes room for it on a phone).
  const showing = items.length > 0 && !hidden;
  useEffect(() => {
    if (!showing) return;
    document.documentElement.dataset.excl = "1";
    return () => {
      delete document.documentElement.dataset.excl;
    };
  }, [showing]);

  if (items.length === 0 || hidden) return null;
  const it = items[i] ?? items[0];
  const onSale = items.filter((c) => !c.soldOut && !c.closed).length;
  // On an Iron Maiden piece the whole page is red, the button too.
  const onIronPiece = items.some((c) => /iron maiden/i.test(c.name) && pathname === `/productos/${c.slug}`);
  const first = items[0];
  const badgeImg = logo || first.image;
  const subtitle =
    onSale === 0 ? "Agotada · vuelve pronto" : items.length === 1 ? first.name : iron ? `Iron Maiden · ${onSale} poleras` : `${items.length} piezas · edición limitada`;

  return (
    <>
      <div className="fixed left-3 z-30 sm:left-5" style={{ top: top + 12, ...(onIronPiece ? { ["--neon" as string]: "#e11d2a" } : {}) }}>
        <button
          type="button"
          onClick={() => {
            setHint(false);
            setI(0);
            setOpen(true);
          }}
          aria-haspopup="dialog"
          aria-label={`Exclusive: ${subtitle}`}
          className="pope-excl-float group relative block rounded-full p-[2px] shadow-[0_10px_40px_-6px_rgba(0,0,0,0.75),0_0_28px_-6px_var(--neon)] transition-transform duration-300 hover:scale-[1.04]"
        >
          {/* Spinning neon/red edge */}
          <span aria-hidden="true" className="pope-excl-edge absolute inset-0 overflow-hidden rounded-full" />
          <span className={`relative flex items-center rounded-full bg-black transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${compact ? "gap-0 p-1" : "gap-2.5 py-1.5 pl-1.5 pr-4 sm:gap-3 sm:pr-5"}`}>
            <span className={`relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full sm:h-12 sm:w-12 ${logo ? "bg-black" : "bg-neon"}`}>
              <span aria-hidden="true" className="pope-excl-ring absolute inset-0 rounded-full" />
              {badgeImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={badgeImg} alt="" className={`h-full w-full object-cover transition duration-500 group-hover:scale-110`} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-black transition group-hover:rotate-12" aria-hidden="true">
                  <path d="M6 3h12l3 6-9 12L3 9z" />
                  <path d="M3 9h18M9 3l3 18M15 3l-3 18" />
                </svg>
              )}
            </span>
            <span className={`grid overflow-hidden text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${compact ? "max-w-0 opacity-0" : "max-w-[13rem] opacity-100"}`}>
              <span className="flex items-center gap-1.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.25em] text-red-500 sm:text-[10px]">
                <span aria-hidden="true" className="pope-excl-live h-1.5 w-1.5 rounded-full bg-red-500" />
                {onSale === 0 ? "Agotado" : "Solo en POPE"}
              </span>
              <span className="pope-excl-shine whitespace-nowrap font-display text-2xl font-bold uppercase leading-[0.9] tracking-wide sm:text-[1.7rem]">Exclusive</span>
              <span className="max-w-[11rem] truncate text-[10px] font-medium text-white/60 sm:text-[11px]">{subtitle}</span>
            </span>
          </span>
          {onSale > 0 && (
            <span className="absolute -right-1 -top-1 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white ring-2 ring-black">{onSale}</span>
          )}
        </button>
        {hint && !open && onSale > 0 && (
          <button
            type="button"
            onClick={() => {
              setHint(false);
              setI(0);
              setOpen(true);
            }}
            className="pope-excl-hint absolute left-0 top-[calc(100%+12px)] w-max max-w-[15rem] rounded-2xl rounded-tl-sm border border-neon/40 bg-black/90 px-4 py-2.5 text-left text-xs font-semibold text-white shadow-2xl"
          >
            {hints[(hintN - 1 + hints.length) % hints.length]} <span className="text-neon">→</span>
          </button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Piezas exclusivas"
          className="fixed inset-0 z-[90] flex items-end justify-center p-2 sm:items-center sm:p-4"
          style={/iron maiden/i.test(it.name) ? ({ ["--neon" as string]: "#e11d2a" } as React.CSSProperties) : undefined}
        >
          <button type="button" aria-label="Cerrar" tabIndex={-1} onClick={() => setOpen(false)} className="pope-excl-backdrop absolute inset-0 bg-black/85 backdrop-blur-md" />

          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar"
            className="fixed right-3 top-3 z-[95] grid h-11 w-11 place-items-center rounded-full border border-white/30 bg-black/80 text-3xl leading-none text-white shadow-lg transition hover:bg-black sm:right-5 sm:top-5"
          >
            ×
          </button>

          <div
            key={it.slug}
            className="pope-excl-panel relative max-h-[calc(100dvh-4.5rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[1.5rem] border border-neon/40 bg-neutral-950 text-white shadow-[0_0_80px_-20px_var(--neon)] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[2rem] md:grid md:grid-cols-2 md:overflow-hidden"
          >

            <div className={`relative h-[36dvh] overflow-hidden sm:h-auto sm:aspect-square md:aspect-auto md:min-h-[26rem] ${/iron maiden/i.test(it.name) ? "bg-[radial-gradient(circle_at_50%_45%,#5a0f14_0%,#1c0608_55%,#0a0a0a_100%)]" : "bg-white"}`}>
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt={it.name} className={`pope-excl-reveal absolute inset-0 h-full w-full ${/iron maiden/i.test(it.name) ? "object-cover" : "object-contain p-4"}`} />
              )}
              <span aria-hidden="true" className="pope-excl-curtain absolute inset-0 bg-black" />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-lg">
                <span aria-hidden="true">●</span> Edición limitada
              </span>
            </div>

            <div className="flex flex-col justify-center gap-3 p-5 sm:gap-4 sm:p-8">
              <p className="pope-excl-line text-[11px] font-bold uppercase tracking-[0.35em] text-neon" style={{ animationDelay: "0.55s" }}>
                Acceso exclusivo · Solo en POPE
              </p>
              <h2 className="pope-excl-line font-display text-4xl font-bold uppercase leading-[0.9] sm:text-5xl" style={{ animationDelay: "0.65s" }}>
                {it.name}
              </h2>
              {(it.soldOut || it.closed) && (
                <p className="pope-excl-line inline-flex w-max items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white" style={{ animationDelay: "0.7s" }}>
                  {it.soldOut ? "Agotada" : "Cerrada"} · vuelve pronto
                </p>
              )}
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
                {/iron maiden/i.test(it.name)
                  ? "No está en el catálogo. Estampado grande adelante; atrás puedes agregar tu diseño por $17.999."
                  : "No está en el catálogo. No se personaliza: llega tal como la ves."}
              </p>
              <Link
                href={`/productos/${it.slug}`}
                onClick={() => setOpen(false)}
                className="pope-excl-line inline-flex min-h-12 items-center justify-center rounded-full bg-neon px-8 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:brightness-90"
                style={{ animationDelay: "1s" }}
              >
                Ver la pieza →
              </Link>
              {iron && (
                <Link
                  href="/iron-maiden"
                  onClick={() => setOpen(false)}
                  className="pope-excl-line inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#e11d2a] px-8 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#e11d2a]"
                  style={{ animationDelay: "1.05s" }}
                >
                  Ver toda la colección Iron Maiden
                </Link>
              )}

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
