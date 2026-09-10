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
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <ClearCartOnMount />
      <div className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
        Modo de prueba — Flow.cl no está configurado
      </div>
      <h1 className="mb-3 text-2xl font-semibold">Pedido creado (sin cobrar)</h1>
      <p className="text-neutral-600">
        Tu pedido{order ? ` #${order.id.slice(0, 8)}` : ""} quedó guardado por{" "}
        {order ? formatCLP(order.totalAmount) : ""}, pero no se realizó ningún cobro real.
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Agrega tus credenciales de Flow.cl en el archivo <code>.env</code> (FLOW_API_KEY, FLOW_SECRET_KEY) para
        activar pagos reales.
      </p>
      <Link href="/" className="mt-8 inline-block text-fuchsia-600 hover:underline">
        Seguir comprando
      </Link>
    </main>
  );
}
