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
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <ClearCartOnMount />
      <h1 className="mb-3 text-2xl font-semibold">¡Pago recibido!</h1>
      <p className="text-neutral-600">
        Gracias{order ? ` ${order.customerName}` : ""}, tu pedido está confirmado
        {order ? ` (#${order.id.slice(0, 8)})` : ""} por {order ? formatCLP(order.totalAmount) : ""}.
      </p>
      <p className="mt-2 text-neutral-600">Te enviaremos la confirmación de envío por email.</p>
      <Link href="/" className="mt-8 inline-block text-fuchsia-600 hover:underline">
        Seguir comprando
      </Link>
    </main>
  );
}
