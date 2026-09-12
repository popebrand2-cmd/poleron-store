import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ShippingForm from "@/components/admin/ShippingForm";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const [rates, storeSettings] = await Promise.all([
    prisma.shippingComunaRate.findMany(),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Envíos</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/pedidos" className="text-sm font-medium text-neutral-700 hover:underline">
            Pedidos
          </Link>
          <Link href="/admin/portada" className="text-sm font-medium text-neutral-700 hover:underline">
            Portada
          </Link>
          <Link href="/admin" className="text-sm font-medium text-neutral-700 hover:underline">
            ← Productos
          </Link>
        </div>
      </div>
      <ShippingForm
        initialRates={rates.map((r) => ({ comuna: r.comuna, priceCLP: r.priceCLP }))}
        initialSettings={{
          pickupEnabled: storeSettings?.pickupEnabled ?? true,
          pickupAddress: storeSettings?.pickupAddress ?? "",
          pickupHours: storeSettings?.pickupHours ?? "",
        }}
      />
    </main>
  );
}
