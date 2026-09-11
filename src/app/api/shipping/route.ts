import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: powers the checkout page's shipping method + comuna
// selector. Only returns comunas that have an admin-configured price —
// unconfigured comunas are left out entirely rather than silently
// defaulting to a price (which could mean free shipping somewhere the
// admin never intended).
export async function GET() {
  const [rates, storeSettings] = await Promise.all([
    prisma.shippingComunaRate.findMany({ orderBy: [{ region: "asc" }, { comuna: "asc" }] }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  return NextResponse.json({
    rates: rates.map((r) => ({ region: r.region, comuna: r.comuna, priceCLP: r.priceCLP })),
    pickup: {
      enabled: storeSettings?.pickupEnabled ?? false,
      address: storeSettings?.pickupAddress ?? "",
      hours: storeSettings?.pickupHours ?? "",
    },
  });
}
