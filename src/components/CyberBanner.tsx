import Link from "next/link";
import Txt from "@/components/edit/Txt";
import { formatCLP } from "@/lib/money";

export type CyberProduct = { id: string; slug: string; name: string; basePrice: number; compareAtPrice: number | null };

// The Cyber date the owner asked to match (see scripts/cyber-sale.js). Bump this — or just ask me to
// — if the campaign gets extended; the banner (and the per-product strike-through price) otherwise
// hides itself the moment every product's compareAtPrice is cleared in Admin > Productos, so ending
// the sale never depends on remembering to touch this file.
const CYBER_ENDS_AT = new Date("2026-10-08T02:59:59-03:00"); // end of Oct 7, Chile time

// Homepage Cyber promo: only renders while at least one product is actually on sale (has a
// compareAtPrice) AND we're still before the cutoff above — so it disappears on its own either when
// the owner clears the sale prices, or once the campaign date passes, whichever comes first.
export default function CyberBanner({ products }: { products: CyberProduct[] }) {
  const onSale = products.filter((p) => p.compareAtPrice != null && p.compareAtPrice > p.basePrice).slice(0, 3);
  if (onSale.length === 0 || Date.now() > CYBER_ENDS_AT.getTime()) return null;

  return (
    <section aria-label="Oferta Cyber POPE" className="relative overflow-hidden border-y border-white/10 bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 140% at 50% 0%, color-mix(in srgb, var(--neon) 16%, transparent), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-5xl px-6 py-10 text-center sm:py-14">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          🔥 <Txt k="cyber.badge" as="span" />
        </span>

        <h2 className="mt-4 font-display text-4xl font-bold uppercase leading-[0.95] sm:text-6xl">
          <Txt k="cyber.headline" as="span" />
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm text-neutral-300">
          <Txt k="cyber.subtext" as="span" multiline />
        </p>

        <div className="mx-auto mt-7 flex max-w-xl flex-wrap items-stretch justify-center gap-3">
          {onSale.map((p) => {
            const pct = Math.round(100 - (p.basePrice / (p.compareAtPrice as number)) * 100);
            return (
              <Link
                key={p.id}
                href={`/productos/${p.slug}`}
                className="group flex min-w-[150px] flex-1 flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 transition hover:border-neon hover:bg-white/10"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{p.name}</span>
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold text-neon">{formatCLP(p.basePrice)}</span>
                  <span className="text-xs text-neutral-500 line-through">{formatCLP(p.compareAtPrice as number)}</span>
                </span>
                <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">-{pct}%</span>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          <Txt k="cyber.until" as="span" />
        </p>

        <a
          href="#tienda"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-neon px-8 text-sm font-bold uppercase tracking-wide text-black transition hover:brightness-90"
        >
          <Txt k="cyber.cta" as="span" />
        </a>
      </div>
    </section>
  );
}
