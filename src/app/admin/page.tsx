import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [products, pendingOrders] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" }, include: { colors: true, sizes: true } }),
    prisma.order.count({ where: { status: { in: ["PENDING_PAYMENT", "PAID", "IN_PRODUCTION"] } } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/pedidos" className="text-sm font-medium text-neutral-700 hover:underline">
            Pedidos ({pendingOrders})
          </Link>
          <Link href="/admin/envios" className="text-sm font-medium text-neutral-700 hover:underline">
            Envíos
          </Link>
          <Link href="/admin/portada" className="text-sm font-medium text-neutral-700 hover:underline">
            Portada
          </Link>
          <Link
            href="/admin/productos/nuevo"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-neutral-500">Aún no tienes productos. Crea el primero.</p>
      ) : (
        <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">
                  {p.name}{" "}
                  {!p.active && (
                    <span className="ml-2 rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
                      Oculto
                    </span>
                  )}
                </p>
                <p className="text-sm text-neutral-500">
                  {formatCLP(p.basePrice)} · {p.colors.length} color(es) · {p.sizes.length} talla(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/productos/${p.slug}`}
                  target="_blank"
                  className="text-sm text-neutral-600 hover:underline"
                >
                  Ver
                </Link>
                <Link href={`/admin/productos/${p.id}`} className="text-sm text-fuchsia-600 hover:underline">
                  Editar
                </Link>
                <DeleteProductButton productId={p.id} productName={p.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
