import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCLP } from "@/lib/money";
import ClearCartOnMount from "@/components/ClearCartOnMount";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; external_reference?: string }>;
}) {
  const { orderId, external_reference } = await searchParams;
  const id = orderId ?? external_reference;
  const order = id ? await prisma.order.findUnique({ where: { id } }) : null;

  return (
    <main className="bg-black px-6 py-16">
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl bg-white p-10 text-center text-neutral-900">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-neon" />
        <ClearCartOnMount />
        <h1 className="mb-3 text-2xl font-semibold">¡Pago recibido!</h1>
        <p className="text-neutral-600">
          Gracias{order ? ` ${order.customerName}` : ""}, tu pedido está confirmado
          {order ? ` (#${order.id.slice(0, 8)})` : ""} por {order ? formatCLP(order.totalAmount) : ""}.
        </p>
        <p className="mt-2 text-neutral-600">Te enviaremos la confirmación de envío por email.</p>
        <Link href="/" className="mt-8 inline-block text-green-700 hover:underline">
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
