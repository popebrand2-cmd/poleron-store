import { formatOrderNumber } from "@/lib/order-number";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import DeleteOrderButton from "@/components/admin/DeleteOrderButton";
import AdminNav from "@/components/admin/AdminNav";
import OrderStatusControl from "@/components/admin/OrderStatusControl";
import PendingPaymentActions from "@/components/admin/PendingPaymentActions";
import { reconcilePendingOrders } from "@/lib/order-payment";
import { CHILE_COMUNAS } from "@/lib/chile-comunas";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAID: "Pagado",
  IN_PRODUCTION: "En producción",
  SHIPPED: "Terminado",
  CANCELLED: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  IN_PRODUCTION: "bg-sky-100 text-sky-800",
  SHIPPED: "bg-violet-100 text-violet-800",
  CANCELLED: "bg-neutral-200 text-neutral-600",
};

// The WhatsApp message for this order, ready to send (the owner only taps "send"): the same text as the e-mail.
function whatsappMessage(o: { customerName: string; status: string; shippingMethod: string; trackingCode: string; totalAmount: number; number: number | null; id: string; items: { quantity: number; product: { name: string }; colorName: string; sizeLabel: string }[] }): string {
  const first = o.customerName.trim().split(/\s+/)[0] || "";
  const num = formatOrderNumber(o);
  const items = o.items.map((it) => `${it.quantity}× ${it.product.name} (${it.colorName}, talla ${it.sizeLabel})`).join(", ");
  const pickup = o.shippingMethod === "PICKUP";
  if (o.status === "SHIPPED") {
    return pickup
      ? `Hola ${first}! Tu pedido ${num} de POPE ya está listo para retirar. ¡Gracias por tu compra!`
      : `Hola ${first}! Tu pedido ${num} de POPE ya salió de nuestro taller.${o.trackingCode ? ` Código de seguimiento: ${o.trackingCode}.` : ""} ¡Gracias por tu compra!`;
  }
  if (o.status === "IN_PRODUCTION") return `Hola ${first}! Tu pedido ${num} de POPE ya está en producción. Te avisamos apenas esté listo.`;
  if (o.status === "PAID") return `Hola ${first}! Recibimos tu pedido ${num} de POPE por ${formatCLP(o.totalAmount)}: ${items}. Ya estamos preparándolo, te avisamos cuando esté listo. ¡Gracias por tu compra!`;
  return `Hola ${first}! Te escribimos de POPE por tu pedido ${num}.`;
}

// A Chilean mobile number typed as 9 digits (9XXXXXXXX) or with +56: the wa.me link needs the country code and nothing else.
function whatsappLink(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const full = d.length === 9 ? `56${d}` : d;
  return `https://wa.me/${full}`;
}

export default async function AdminOrdersPage() {
  // Orders whose payment already arrived but whose notification did not: confirm them with Mercado Pago before listing.
  await reconcilePendingOrders().catch(() => 0);
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { include: { product: { select: { name: true } } } } },
  });

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <AdminNav current="/admin/pedidos" />
      </div>

      <a
        href="/admin/reparto"
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white"
      >
        🚚 Reparto: ruta óptima y etiquetas →
      </a>

      {orders.length === 0 ? (
        <p className="text-neutral-500">Aún no hay pedidos.</p>
      ) : (
        <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {orders.map((o) => (
            <div key={o.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold">
                    {formatOrderNumber(o)} · {o.customerName}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {o.createdAt.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" })}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </div>

              {/* Who bought and where it goes: readable on a phone (one column) and on a computer (two). */}
              <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-lg border border-neutral-100 bg-neutral-50 p-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Cliente</dt>
                  <dd className="break-words">{o.customerName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Correo</dt>
                  <dd className="break-all">
                    <a href={`mailto:${o.customerEmail}`} className="text-fuchsia-600 hover:underline">
                      {o.customerEmail}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Teléfono</dt>
                  <dd>
                    {o.customerPhone ? (
                      <span className="flex flex-wrap items-center gap-x-3">
                        <a href={`tel:${o.customerPhone.replace(/[^\d+]/g, "")}`} className="text-fuchsia-600 hover:underline">
                          {o.customerPhone}
                        </a>
                        <a href={`${whatsappLink(o.customerPhone)}?text=${encodeURIComponent(whatsappMessage(o))}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                          Avisar por WhatsApp
                        </a>
                      </span>
                    ) : (
                      <span className="text-neutral-400">No lo dejó</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Entrega</dt>
                  <dd className="break-words">
                    {o.shippingMethod === "PICKUP" ? (
                      "Retiro en tienda"
                    ) : (
                      <>
                        Envío a {o.shippingComuna || "—"}
                        {CHILE_COMUNAS.find((c) => c.comuna === o.shippingComuna)?.region ? `, ${CHILE_COMUNAS.find((c) => c.comuna === o.shippingComuna)?.region}` : ""}
                        {o.shippingAddr ? ` · ${o.shippingAddr}` : ""}
                      </>
                    )}
                  </dd>
                </div>
                {o.trackingCode && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Seguimiento</dt>
                    <dd className="break-all">{o.trackingCode}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Total</dt>
                  <dd className="font-semibold">
                    {formatCLP(o.totalAmount)}
                    {o.shippingMethod !== "PICKUP" && o.shippingCost > 0 && (
                      <span className="ml-1 text-xs font-normal text-neutral-500">(incluye envío {formatCLP(o.shippingCost)})</span>
                    )}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Lo que compró</p>
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
                      <div className="flex items-start gap-3">
                        {it.previewImageUrl && !it.previewImageUrl.startsWith("data:") && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.previewImageUrl} alt="" className="h-16 w-16 shrink-0 rounded-md border border-neutral-200 bg-white object-contain" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {it.quantity}× {it.product.name}
                          </p>
                          <p className="mt-0.5 text-sm text-neutral-500">
                            {it.colorName} · Talla {it.sizeLabel}
                            {it.materialLabel && ` · ${it.materialLabel}`}
                          </p>
                          <p className="mt-0.5 text-sm">
                            {formatCLP(it.unitPrice)} c/u
                            {it.quantity > 1 && <span className="font-semibold"> · {formatCLP(it.unitPrice * it.quantity)}</span>}
                          </p>
                        </div>
                      </div>
                      {originals.length === 0 && (o.status === "SHIPPED" || o.status === "CANCELLED") && (
                        <p className="mt-1 text-xs text-neutral-500">Imagen original y mockup eliminados al cerrar el pedido.</p>
                      )}
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

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <OrderStatusControl orderId={o.id} status={o.status} isDelivery={o.shippingMethod !== "PICKUP"} />
                {o.status === "PENDING_PAYMENT" && <PendingPaymentActions orderId={o.id} />}
                <span className="ml-auto">
                  <DeleteOrderButton orderId={o.id} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
