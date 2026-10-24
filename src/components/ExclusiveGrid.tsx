import Link from "next/link";
import { formatCLP } from "@/lib/money";
import type { LimitedCardData } from "@/lib/limited";

// The exclusive pieces as a compact grid (picture, name, price): the Iron Maiden section and "Más piezas exclusivas" under
// an exclusive piece. A sold-out or closed piece stays, greyed out, with its label.
export default function ExclusiveGrid({ items, stripPrefix = "" }: { items: LimitedCardData[]; stripPrefix?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
      {items.map((c) => {
        const over = c.soldOut || c.closed;
        const name = stripPrefix && c.name.startsWith(stripPrefix) ? c.name.slice(stripPrefix.length) : c.name;
        return (
          <li key={c.slug}>
            <Link
              href={`/productos/${c.slug}`}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d] transition duration-300 hover:-translate-y-1 hover:border-[#e11d2a]/70 hover:shadow-[0_18px_40px_-18px_rgba(225,29,42,0.65)]"
            >
              <div className="relative aspect-square overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#d0343d_0%,#8e1820_45%,#3a0a0e_100%)]">
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image}
                    alt={c.name}
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 h-full w-full object-cover drop-shadow-[0_10px_18px_rgba(0,0,0,0.7)] transition duration-500 group-hover:scale-105 ${over ? "grayscale" : ""}`}
                  />
                )}
                {over && (
                  <span className="absolute left-2 top-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-black">
                    {c.soldOut ? "Agotada" : "Cerrada"}
                  </span>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <p className="line-clamp-2 font-display text-xl font-bold uppercase leading-[0.95] text-white sm:text-2xl">{name}</p>
                <p className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-display text-2xl font-bold leading-none text-white">{formatCLP(c.price)}</span>
                  <span className="rounded-md bg-[#e11d2a] px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-white transition group-hover:bg-[#ff2a38] sm:px-4 sm:text-sm">
                    {over ? "Ver" : "Comprar"}
                  </span>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
