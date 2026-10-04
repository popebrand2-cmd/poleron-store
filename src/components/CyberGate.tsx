"use client";

import { useEffect, useState } from "react";
import Txt from "@/components/edit/Txt";
import { formatCLP } from "@/lib/money";
import { getCyberSaleItems, CYBER_ENDS_AT, type CyberProduct } from "@/lib/cyber";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Ticks down to CYBER_ENDS_AT every second. Returns null once it's passed (the strip itself also
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
  if (left == null || left === 0) return null;
  return {
    days: Math.floor(left / 86400000),
    hours: Math.floor((left % 86400000) / 3600000),
    minutes: Math.floor((left % 3600000) / 60000),
    seconds: Math.floor((left % 60000) / 1000),
  };
}

// The Cyber offer as a strip at the top of the homepage: prices, countdown and a button down to the
// products. It used to be a full-screen intro every visitor had to click through before seeing the
// store — one more step between arriving and shopping. Auto-hides with the rest of the campaign the
// moment isCyberActive(...) goes false.
export default function CyberGate({ products, active }: { products: CyberProduct[]; active: boolean }) {
  const countdown = useCountdown(CYBER_ENDS_AT);
  if (!active) return null;

  const onSale = getCyberSaleItems(products).slice(0, 3);

  return (
    <section aria-label="Cyber POPE" className="border-b border-red-600/40 bg-gradient-to-r from-[#2a0606] via-black to-[#2a0606] text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-4 py-2.5 sm:py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
          🔥 <Txt k="cyber.badge" as="span" />
        </span>

        {/* Phones: one "from" price instead of three stacked lines, so the strip stays short */}
        {onSale.length > 0 && (
          <p className="flex items-baseline gap-1.5 text-sm font-semibold text-neutral-300 sm:hidden">
            Desde
            <span className="font-display text-xl font-bold leading-none text-neon">{formatCLP(Math.min(...onSale.map((p) => p.basePrice)))}</span>
          </p>
        )}
        {onSale.length > 0 && (
          <ul className="hidden flex-wrap items-baseline justify-center gap-x-4 gap-y-1 sm:flex">
            {onSale.map((p) => (
              <li key={p.id} className="flex items-baseline gap-1.5 text-sm">
                <span className="font-semibold text-neutral-300">{p.name}</span>
                <span className="font-display text-xl font-bold leading-none text-neon">{formatCLP(p.basePrice)}</span>
                <span className="hidden text-xs text-neutral-500 line-through 2xl:inline">{formatCLP(p.compareAtPrice as number)}</span>
              </li>
            ))}
          </ul>
        )}

        {countdown && (
          <p className="flex items-baseline gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400" aria-live="off">
            <Txt k="cyber.endsIn" as="span" />
            <span className="font-display text-lg tabular-nums leading-none text-white">
              {countdown.days > 0 && `${countdown.days}d `}
              {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
            </span>
          </p>
        )}

        <a
          href="#tienda"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-neon px-4 text-xs font-bold uppercase tracking-wide text-black transition hover:brightness-90"
        >
          <Txt k="cyber.stripCta" as="span" />
          <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
