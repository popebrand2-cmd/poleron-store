"use client";

import { useEffect, useRef, useState } from "react";
import Txt from "@/components/edit/Txt";
import { formatCLP } from "@/lib/money";
import { getCyberSaleItems, CYBER_ENDS_AT, type CyberProduct } from "@/lib/cyber";

const SEEN_KEY = "pope-cyber-intro";
const TILES = ["–", "C", "Y", "B", "E", "R", "–"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Ticks down to CYBER_ENDS_AT every second. Returns null once it's passed (the gate itself also
// stops showing at that point via isCyberActive, but this keeps the number from ever going negative
// if a visitor already has the page open when the clock runs out).
function useCountdown(target: Date) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  if (left == null) return null;
  const days = Math.floor(left / 86400000);
  const hours = Math.floor((left % 86400000) / 3600000);
  const minutes = Math.floor((left % 3600000) / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

// Full-screen Cyber intro (brought back from the original CyberGate): the very first thing a visitor sees on the homepage. It only goes away
// once they press the button, the close button, or Escape — pressing any of them reveals the real
// homepage underneath, which is still fully rendered in the page (nothing here blocks it, so it isn't
// hidden from search engines). Shown once per browser tab session; auto-disabled together with the
// rest of the campaign the moment isCyberActive(...) goes false.
export default function CyberIntro({ products, active }: { products: CyberProduct[]; active: boolean }) {
  const [show, setShow] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const countdown = useCountdown(CYBER_ENDS_AT);

  useEffect(() => {
    if (!active) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    if (!seen) setShow(true);
  }, [active]);

  useEffect(() => {
    if (!show) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    ctaRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function dismiss() {
    setShow(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
  }

  if (!active || !show) return null;

  const onSale = getCyberSaleItems(products).slice(0, 3);
  const bestPct =
    onSale.length > 0 ? Math.max(...onSale.map((p) => Math.round(100 - (p.basePrice / (p.compareAtPrice as number)) * 100))) : 0;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black text-white" role="dialog" aria-modal="true" aria-label="Cyber POPE">
      {/* Backdrop: the campaign photo, heavily dimmed and blurred, plus the brand's green glow and a
          faint grain — same materials as the rest of the site (see PopeHero, .pcol), not a one-off. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* The cropped, text-free version — the original (cyber-banner.webp) has its own logo/headline
            baked into its left side, which showed through as a ghost behind the hero's real headline
            (see that fix in PopeHero.tsx); this avoids the same issue here. */}
        <img src="/promo/cyber-lookbook.webp" alt="" className="h-full w-full scale-110 object-cover opacity-25 blur-sm" />
        <div className="absolute inset-0 bg-black/55" />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(60% 55% at 50% 26%, color-mix(in srgb, var(--neon) 22%, transparent), transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.9)]" />
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="glass fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-xl text-white/80 transition hover:text-white"
        aria-label="Cerrar"
      >
        ×
      </button>

      <div className="relative mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-6 pb-[max(3rem,env(safe-area-inset-bottom))] pt-20 text-center">
        <span
          className="pope-rise inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_18px_rgba(220,38,38,0.5)]"
          style={{ animationDelay: "0.05s" }}
        >
          🔥 <Txt k="cyber.badge" as="span" />
        </span>

        <h1
          className="pope-rise mt-4 font-display text-4xl font-bold uppercase leading-[0.95] sm:text-5xl"
          style={{ animationDelay: "0.15s" }}
        >
          <Txt k="cyber.headline" as="span" />
        </h1>

        {/* Scrabble-tile "CYBER", blank tiles bookending it like a tally board — dealt in one by one. */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2" aria-hidden="true">
          {TILES.map((ch, i) => (
            <span
              key={i}
              className="pope-rise flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-neutral-900 font-display text-2xl font-bold text-neon shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_-2px_color-mix(in_srgb,var(--neon)_55%,transparent),0_4px_10px_rgba(0,0,0,0.5)] sm:h-14 sm:w-14 sm:text-3xl"
              style={{ animationDelay: `${0.3 + i * 0.06}s` }}
            >
              {ch}
            </span>
          ))}
        </div>

        {onSale.length > 0 && (
          <div className="pope-rise mx-auto mt-8 flex w-full max-w-xl flex-wrap items-stretch justify-center gap-3" style={{ animationDelay: "0.75s" }}>
            {onSale.map((p) => {
              const pct = Math.round(100 - (p.basePrice / (p.compareAtPrice as number)) * 100);
              const isBest = pct === bestPct;
              return (
                <div
                  key={p.id}
                  className={`relative flex min-w-[140px] flex-1 flex-col items-center gap-1 rounded-xl border px-4 py-3 ${
                    isBest ? "border-neon bg-white/[0.08] shadow-[0_0_22px_-6px_color-mix(in_srgb,var(--neon)_65%,transparent)]" : "border-white/15 bg-white/5"
                  }`}
                >
                  {isBest && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-neon px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black">
                      Mejor oferta
                    </span>
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{p.name}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-xl font-bold text-neon">{formatCLP(p.basePrice)}</span>
                    <span className="text-xs text-neutral-500 line-through">{formatCLP(p.compareAtPrice as number)}</span>
                  </span>
                  <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">-{pct}%</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="pope-rise mt-6 flex flex-col items-center gap-1.5" style={{ animationDelay: "0.9s" }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            <Txt k="cyber.until" as="span" />
          </p>
          {countdown && (countdown.days > 0 || countdown.hours > 0 || countdown.minutes > 0 || countdown.seconds > 0) && (
            <div className="flex items-center gap-1 font-display text-lg tabular-nums text-neon" aria-live="off">
              {countdown.days > 0 && <span>{countdown.days}d</span>}
              <span>{pad(countdown.hours)}h</span>
              <span>:</span>
              <span>{pad(countdown.minutes)}m</span>
              <span>:</span>
              <span>{pad(countdown.seconds)}s</span>
            </div>
          )}
        </div>

        <button
          ref={ctaRef}
          type="button"
          onClick={dismiss}
          className="cyber-cta mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-neon px-10 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <Txt k="cyber.cta" as="span" />
        </button>
      </div>
    </div>
  );
}
