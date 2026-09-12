import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import ClearCartOnMount from "@/components/ClearCartOnMount";

export const dynamic = "force-dynamic";

export default async function CheckoutTestModePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const order = orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null;

  return (
    <main className="bg-black px-6 py-16">
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl bg-white p-10 text-center text-neutral-900">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
        <ClearCartOnMount />
        <div className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
          Modo de prueba — Mercado Pago no está configurado
        </div>
        <h1 className="mb-3 text-2xl font-semibold">Pedido creado (sin cobrar)</h1>
        <p className="text-neutral-600">
          Tu pedido{order ? ` #${order.id.slice(0, 8)}` : ""} quedó guardado por{" "}
          {order ? formatCLP(order.totalAmount) : ""}, pero no se realizó ningún cobro real.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Agrega tu <code>MERCADOPAGO_ACCESS_TOKEN</code> en las variables de entorno para activar pagos reales.
        </p>
        <Link href="/" className="mt-8 inline-block text-green-700 hover:underline">
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
