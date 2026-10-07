import { prisma } from "@/lib/prisma";
import { thumb } from "@/lib/thumb";

// Limited-edition products: how many units are left and whether the sale is still open. Units count every order that is
// paid, in production or shipped, plus unpaid ones made in the last 45 minutes (so two people cannot take the last unit at
// the same time, but an abandoned checkout does not hold a unit forever).
const HOLD_MS = 45 * 60 * 1000;

export type LimitedState = {
  units: number; // 0 = no cap
  sold: number;
  remaining: number | null; // null = no cap
  until: Date | null;
  soldOut: boolean;
  closed: boolean; // the closing date has passed
  open: boolean;
};

export async function soldUnits(productIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (productIds.length === 0) return out;
  const rows = await prisma.orderItem.findMany({
    where: {
      productId: { in: productIds },
      order: {
        OR: [{ status: { in: ["PAID", "IN_PRODUCTION", "SHIPPED"] } }, { status: "PENDING_PAYMENT", createdAt: { gt: new Date(Date.now() - HOLD_MS) } }],
      },
    },
    select: { productId: true, quantity: true },
  });
  for (const r of rows) out.set(r.productId, (out.get(r.productId) ?? 0) + r.quantity);
  return out;
}

export function limitedState(p: { limitedUnits: number; limitedUntil: Date | null }, sold: number, now = new Date()): LimitedState {
  const remaining = p.limitedUnits > 0 ? Math.max(0, p.limitedUnits - sold) : null;
  const soldOut = remaining === 0;
  const closed = !!p.limitedUntil && p.limitedUntil.getTime() <= now.getTime();
  return { units: p.limitedUnits, sold, remaining, until: p.limitedUntil, soldOut, closed, open: !soldOut && !closed };
}

export type LimitedCardData = {
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  units: number;
  remaining: number | null;
  until: string | null; // ISO
  soldOut: boolean;
  closed: boolean;
};

// The active limited-edition products, ready for the special card (still listed when sold out or closed, so the card can say so).
export async function loadLimitedCards(): Promise<LimitedCardData[]> {
  const products = await prisma.product.findMany({
    where: { active: true, limitedEdition: true },
    orderBy: { createdAt: "desc" },
    include: { colors: { orderBy: { sortOrder: "asc" }, take: 1, include: { views: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
  });
  const sold = await soldUnits(products.map((p) => p.id));
  return products.map((p) => {
    const st = limitedState(p, sold.get(p.id) ?? 0);
    const img = p.colors[0]?.views[0]?.imageUrl ?? "";
    return {
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.basePrice,
      compareAtPrice: p.compareAtPrice,
      image: img ? thumb(img, 640) : "",
      units: st.units,
      remaining: st.remaining,
      until: p.limitedUntil ? p.limitedUntil.toISOString() : null,
      soldOut: st.soldOut,
      closed: st.closed,
    };
  });
}
