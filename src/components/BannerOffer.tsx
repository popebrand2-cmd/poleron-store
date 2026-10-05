import Txt from "@/components/edit/Txt";
import { formatCLP } from "@/lib/money";
import { FREE_SHIPPING_MIN } from "@/lib/shipping-rules";

export type BannerSaleItem = { id: string; name: string; basePrice: number; compareAtPrice: number };

// The offer that goes on top of the banner photo: the biggest discount, each sale price next to the one it replaces, the
// free-shipping rule and the deadline. Same numbers as the products themselves (nothing invented).
export default function BannerOffer({ sale, className = "", size = "md" }: { sale: BannerSaleItem[]; className?: string; size?: "sm" | "md" }) {
  if (sale.length === 0) return null;
  const bestPct = Math.max(...sale.map((p) => Math.round(100 - (p.basePrice / p.compareAtPrice) * 100)));
  const small = size === "sm";
  return (
    <div className={className}>
      <p className={`font-display font-bold uppercase leading-none text-[#ff5a5f] ${small ? "text-2xl" : "text-3xl xl:text-4xl"}`}>Hasta {bestPct}% de descuento</p>
      <ul className={`grid grid-cols-[1fr_auto_auto] items-baseline ${small ? "mt-2 gap-x-3 gap-y-1" : "mt-3 max-w-md gap-x-4 gap-y-1.5"}`}>
        {sale.map((p) => (
          <li key={p.id} className="col-span-3 grid grid-cols-subgrid items-baseline">
            <span className={`font-display font-semibold uppercase leading-none text-white ${small ? "text-base" : "text-xl xl:text-2xl"}`}>{p.name}</span>
            <span className={`text-neutral-300 line-through ${small ? "text-xs" : "text-sm xl:text-base"}`}>{formatCLP(p.compareAtPrice)}</span>
            <span className={`font-display font-bold leading-none text-[#ff5a5f] ${small ? "text-xl" : "text-2xl xl:text-3xl"}`}>{formatCLP(p.basePrice)}</span>
          </li>
        ))}
      </ul>
      <p className={`text-neutral-200 ${small ? "mt-2 text-[11px] leading-snug" : "mt-3 max-w-sm text-sm"}`}>
        Envío gratis desde {formatCLP(FREE_SHIPPING_MIN)} en la Región Metropolitana · <Txt k="cyber.until" as="span" />
      </p>
    </div>
  );
}
