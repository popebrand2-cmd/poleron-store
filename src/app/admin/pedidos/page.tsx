import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import DeleteOrderButton from "@/components/admin/DeleteOrderButton";
import AdminNav from "@/components/admin/AdminNav";

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
        <AdminNav current="/admin/pedidos" />
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
                  <p className="text-sm text-neutral-500">
                    {o.shippingMethod === "PICKUP" ? (
                      "Retiro en tienda"
                    ) : (
                      <>
                        Envío a {o.shippingComuna || "—"} ({formatCLP(o.shippingCost)}) · {o.shippingAddr}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  <DeleteOrderButton orderId={o.id} />
                </div>
              </div>
              <div className="mt-2 space-y-3">
                {o.items.map((it) => {
                  let placement: Record<string, { designUrl?: string; originalDesignUrl?: string }> = {};
                  try {
                    placement = JSON.parse(it.designPlacement);
                  } catch {
                    // malformed/legacy data — just skip the images below
                  }
                  const originals = Object.entries(placement)
                    .map(([viewLabel, p]) => ({ viewLabel, url: p.originalDesignUrl ?? p.designUrl }))
                    .filter((v): v is { viewLabel: string; url: string } => Boolean(v.url));

                  return (
                    <div key={it.id} className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
                      <p className="text-xs text-neutral-500">
                        {it.quantity}x {it.colorName} · Talla {it.sizeLabel}
                        {it.materialLabel && ` · ${it.materialLabel}`}
                      </p>
                      {originals.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                            Imagen original (sin editar)
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-3">
                            {originals.map(({ viewLabel, url }) => (
                              <a
                                key={viewLabel}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block w-24 text-center"
                                title={`Descargar imagen original (${viewLabel})`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Imagen original subida por el cliente — ${viewLabel}`}
                                  className="h-24 w-24 rounded-md border border-neutral-200 bg-white object-contain group-hover:border-fuchsia-400"
                                />
                                <span className="mt-1 block text-xs font-medium text-fuchsia-600 group-hover:underline">
                                  {viewLabel} — Descargar
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
