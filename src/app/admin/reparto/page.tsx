import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatOrderNumber } from "@/lib/order-number";
import AdminNav from "@/components/admin/AdminNav";
import { reconcilePendingOrders } from "@/lib/order-payment";
import RouteBuilder, { type DeliveryOrder } from "@/components/admin/RouteBuilder";

export const dynamic = "force-dynamic";

// Orders that are paid and not delivered yet: the ones that go out in the next delivery round.
export default async function DeliveryPage() {
  // An order already paid whose payment notice never arrived shows up as paid here too (same check as Pedidos).
  await reconcilePendingOrders().catch(() => 0);
  const [orders, settings] = await Promise.all([
    prisma.order.findMany({
      // Paid and in production go out; recent orders still waiting for payment are listed too (unchecked) so none goes missing
      // from the list without explanation.
      where: {
        OR: [
          { status: { in: ["PAID", "IN_PRODUCTION"] } },
          { status: "PENDING_PAYMENT", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: { items: { select: { id: true } } },
    }),
    prisma.storeSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const rows: DeliveryOrder[] = orders.map((o) => ({
    id: o.id,
    number: formatOrderNumber(o),
    name: o.customerName,
    comuna: o.shippingComuna,
    address: o.shippingAddr,
    status: o.status,
    items: o.items.length,
    delivery: o.shippingMethod !== "PICKUP",
  }));

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Reparto y etiquetas</h1>
        <AdminNav current="/admin/reparto" />
      </div>
      <p className="mb-6 max-w-2xl text-sm text-neutral-500">
        Elige los pedidos que salen, genera la ruta más corta para quien los entrega (con el enlace de Google Maps listo para el teléfono) e
        imprime las etiquetas con el número de pedido y los productos.{" "}
        <Link href="/admin/pedidos" className="underline">
          Volver a Pedidos
        </Link>
      </p>
      <RouteBuilder orders={rows} defaultStart={settings?.pickupAddress ?? ""} />
    </main>
  );
}
