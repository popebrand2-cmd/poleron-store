"use client";

import { useEffect, useState } from "react";
import Txt from "@/components/edit/Txt";
import { formatCLP } from "@/lib/money";
import { getCyberSaleItems, type CyberProduct } from "@/lib/cyber";

const SEEN_KEY = "pope-cyber-gate";

// Full-screen Cyber intro: the very first thing a visitor sees on the homepage. It only goes away
// once they press the button (or the small skip link, for anyone who arrives via keyboard/screen
// reader and needs an escape hatch) — pressing either reveals the real homepage underneath, which is
// still fully rendered in the page (nothing here blocks it, so it isn't hidden from search engines).
// Shown once per browser tab session; auto-disabled together with the rest of the campaign the moment
// isCyberActive(...) goes false.
export default function CyberGate({ products, active }: { products: CyberProduct[]; active: boolean }) {
  const [show, setShow] = useState(false);

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
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [show]);

  function dismiss() {
    setShow(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
  }

  if (!active || !show) return null;

  const onSale = getCyberSaleItems(products).slice(0, 3);

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black text-white" role="dialog" aria-modal="true" aria-label="Cyber POPE">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 30%, color-mix(in srgb, var(--neon) 20%, transparent), transparent 70%)" }}
      />
      <button
        type="button"
        onClick={dismiss}
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl text-white/70 transition hover:border-white/40 hover:text-white"
        aria-label="Cerrar"
      >
        ×
      </button>

      <div className="relative mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          🔥 <Txt k="cyber.badge" as="span" />
        </span>

        <h1 className="mt-4 font-display text-3xl font-bold uppercase leading-none sm:text-4xl">
          <Txt k="cyber.headline" as="span" />
        </h1>

        {/* Scrabble-tile "CYBER", blank tiles bookending it like a tally board. Purely decorative. */}
        <div aria-hidden="true" className="mt-7 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {["–", "C", "Y", "B", "E", "R", "–"].map((ch, i) => (
            <span
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-neutral-900 font-display text-2xl font-bold text-neon shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.5)] sm:h-14 sm:w-14 sm:text-3xl"
            >
              {ch}
            </span>
          ))}
        </div>

        {onSale.length > 0 && (
          <div className="mx-auto mt-8 flex w-full max-w-xl flex-wrap items-stretch justify-center gap-3">
            {onSale.map((p) => {
              const pct = Math.round(100 - (p.basePrice / (p.compareAtPrice as number)) * 100);
              return (
                <div key={p.id} className="flex min-w-[140px] flex-1 flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
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

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          <Txt k="cyber.until" as="span" />
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-neon px-10 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90"
        >
          <Txt k="cyber.cta" as="span" />
        </button>
      </div>
    </div>
  );
}
