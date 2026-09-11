import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import DeleteOrderButton from "@/components/admin/DeleteOrderButton";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  IN_PRODUCTION: "En producción",
  SHIPPED: "Enviado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  IN_PRODUCTION: "bg-sky-100 text-sky-800",
  SHIPPED: "bg-violet-100 text-violet-800",
  CANCELLED: "bg-neutral-200 text-neutral-600",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <Link href="/admin" className="text-sm font-medium text-neutral-700 hover:underline">
          ← Productos
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-neutral-500">Aún no hay pedidos.</p>
      ) : (
        <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {orders.map((o) => (
            <div key={o.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    #{o.id.slice(0, 8)} · {o.customerName}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {o.customerEmail} · {o.items.length} producto(s) · {formatCLP(o.totalAmount)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  <DeleteOrderButton orderId={o.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
